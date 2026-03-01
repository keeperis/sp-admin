'use client';

import {
  Accordion,
  ActionIcon,
  Button,
  Container,
  Divider,
  Group,
  Paper,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLanguage, IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import type { SiteKey } from '@/lib/site';
import type { FAQTag, SiteContent } from '@/src/lib/content/schema';

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to load content');
  }
  return data;
};

type AdminContentResponse = {
  version: number;
  data: SiteContent;
};

type EditorSection = 'bg' | 'hero' | 'oneTime' | 'ongoing' | 'private' | 'faq' | 'about';

const TAG_OPTIONS: Array<{ value: FAQTag; label: string }> = [
  { value: 'general', label: 'Bendri' },
  { value: 'workshop', label: 'Dirbtuvės' },
  { value: 'ongoing', label: 'Nuolatiniai' },
  { value: 'private', label: 'Privatūs' },
];

const PROJECT_OPTIONS: Array<{ value: SiteKey; label: string }> = [
  { value: 'ceramics', label: 'Ceramics' },
  { value: 'yoga', label: 'Yoga' },
];

function cloneContent(content: SiteContent): SiteContent {
  return JSON.parse(JSON.stringify(content)) as SiteContent;
}

function newFaqItem() {
  return {
    id: crypto.randomUUID(),
    tag: 'general' as FAQTag,
    question: { lt: '', en: '' },
    answer: { lt: '', en: '' },
  };
}

function sectionLabel(key: 'oneTime' | 'ongoing' | 'private') {
  if (key === 'oneTime') return 'Vieno apsilankymo dirbtuvės';
  if (key === 'ongoing') return 'Nuolatiniai užsiėmimai';
  return 'Privatūs užsiėmimai';
}

function withFiveParagraphs(input: Array<{ lt: string; en: string }>) {
  const next = input.slice(0, 5);
  while (next.length < 5) next.push({ lt: '', en: '' });
  return next;
}

const PARAGRAPH_SLOTS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;

async function translateLtToEn(texts: string[]) {
  const res = await fetch('/api/admin/content/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Translation failed');
  return (data?.translations || []) as string[];
}

export default function ContentPage() {
  const [selectedSite, setSelectedSite] = useState<SiteKey>('ceramics');
  const contentApiUrl = `/api/admin/content?site=${selectedSite}`;
  const { data, error, isLoading, mutate } = useSWR<AdminContentResponse>(contentApiUrl, fetcher);
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState<number | null>(null);
  const [translating, setTranslating] = useState<string | null>(null);
  const [bgColumns, setBgColumns] = useState<string[][]>([[], [], [], []]);
  const [bgSaving, setBgSaving] = useState(false);
  const [bgUploadingCol, setBgUploadingCol] = useState<number | null>(null);
  const uploadRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [activeSection, setActiveSection] = useState<EditorSection>('bg');

  const content = useMemo(() => {
    if (draft) return draft;
    if (!data?.data) return null;
    return data.data;
  }, [data, draft]);

  const heroLineRows = useMemo(() => {
    const seen = new Map<string, number>();
    return content?.hero.lines.map((line) => {
      const signature = `${line.lt.join('|')}::${line.en.join('|')}`;
      const count = (seen.get(signature) || 0) + 1;
      seen.set(signature, count);
      return {
        line,
        key: `${signature}#${count}`,
      };
    });
  }, [content]);

  useEffect(() => {
    if (version === null && data?.version !== undefined) {
      setVersion(data.version);
    }
  }, [version, data?.version]);

  useEffect(() => {
    if (selectedSite !== 'ceramics' && selectedSite !== 'yoga') return;
    fetch(`/api/admin/bg-grid?site=${selectedSite}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.columns)) {
          const cols = d.columns.slice(0, 4).map((c: unknown) =>
            Array.isArray(c) ? c.slice(0, 6).filter((v): v is string => typeof v === 'string') : [],
          );
          while (cols.length < 4) cols.push([]);
          setBgColumns(cols);
        }
      })
      .catch(() => setBgColumns([[], [], [], []]));
  }, [selectedSite]);

  const setSectionParagraph = (
    section: 'oneTime' | 'ongoing' | 'private',
    index: number,
    locale: 'lt' | 'en',
    value: string,
  ) => {
    if (!content) return;
    const next = cloneContent(content);
    while (next.sections[section].paragraphs.length < 5) {
      next.sections[section].paragraphs.push({ lt: '', en: '' });
    }
    next.sections[section].paragraphs[index][locale] = value;
    setDraft(next);
  };

  const translateSingle = async (
    key: string,
    ltText: string,
    apply: (translated: string) => void,
  ) => {
    try {
      setTranslating(key);
      const [translated] = await translateLtToEn([ltText || '']);
      apply(translated || '');
      notifications.show({ message: 'Išversta', color: 'green' });
    } catch (error: any) {
      notifications.show({ message: error?.message || 'Vertimas nepavyko', color: 'red' });
    } finally {
      setTranslating(null);
    }
  };

  const removeBgImage = (colIdx: number, imgIdx: number) => {
    setBgColumns((prev) => prev.map((col, i) => (i === colIdx ? col.filter((_, j) => j !== imgIdx) : col)));
  };

  const moveBgImage = (fromCol: number, imgIdx: number, toCol: number) => {
    if (fromCol === toCol) return;
    setBgColumns((prev) => {
      const next = prev.map((c) => [...c]);
      const item = next[fromCol]?.[imgIdx];
      if (!item) return prev;
      if ((next[toCol]?.length || 0) >= 6) {
        notifications.show({ message: 'Tik 6 img viename stulpelyje', color: 'orange' });
        return prev;
      }
      next[fromCol].splice(imgIdx, 1);
      next[toCol].push(item);
      return next;
    });
  };

  const uploadBgImage = async (colIdx: number, file?: File) => {
    if (!file) return;
    if ((bgColumns[colIdx]?.length || 0) >= 6) {
      notifications.show({ message: 'Stulpelis pilnas (max 6)', color: 'orange' });
      return;
    }
    try {
      setBgUploadingCol(colIdx);
      const form = new FormData();
      form.append('site', selectedSite);
      form.append('file', file);
      const res = await fetch('/api/admin/bg-grid/upload', { method: 'POST', body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Upload failed');
      setBgColumns((prev) => prev.map((col, i) => (i === colIdx ? [...col, body.url] : col)));
      notifications.show({ message: 'Image įkelta', color: 'green' });
    } catch (e: any) {
      notifications.show({ message: e?.message || 'Upload nepavyko', color: 'red' });
    } finally {
      setBgUploadingCol(null);
    }
  };

  const saveBgGrid = async () => {
    try {
      setBgSaving(true);
      const res = await fetch('/api/admin/bg-grid', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site: selectedSite, columns: bgColumns }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Save failed');
      notifications.show({ message: 'BG grid išsaugotas', color: 'green' });
    } catch (e: any) {
      notifications.show({ message: e?.message || 'Save nepavyko', color: 'red' });
    } finally {
      setBgSaving(false);
    }
  };

  const save = async () => {
    if (!content || version === null) return;
    setSaving(true);
    try {
      const res = await fetch(contentApiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, data: content }),
      });

      const body = await res.json();
      if (res.status === 409) {
        notifications.show({
          title: 'Konfliktas',
          message: 'Turinys jau buvo pakeistas kitame lange. Perkrauk puslapį.',
          color: 'red',
        });
        return;
      }

      if (!res.ok) {
        throw new Error(body?.error || 'Save failed');
      }

      setDraft(body.data);
      setVersion(body.version);
      await mutate();
      notifications.show({ message: 'Turinys išsaugotas', color: 'green' });
    } catch (error: any) {
      notifications.show({ message: error?.message || 'Nepavyko išsaugoti', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <Container size="lg">
        <Text c="red">Nepavyko užkrauti turinio: {(error as Error).message}</Text>
      </Container>
    );
  }

  if (isLoading || !content) {
    return (
      <Container size="lg">
        <Text>Loading...</Text>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <Group
        justify="space-between"
        mb="md"
        style={{
          position: 'sticky',
          top: 60,
          zIndex: 100,
          background: 'var(--mantine-color-body)',
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        <Title order={1}>Content</Title>
        <Group>
          <Select
            data={PROJECT_OPTIONS}
            value={selectedSite}
            onChange={(value) => {
              const next = value === 'yoga' ? 'yoga' : 'ceramics';
              setSelectedSite(next);
              setDraft(null);
              setVersion(null);
            }}
            label="Project"
            allowDeselect={false}
            w={170}
          />
          <Button onClick={save} loading={saving}>
            Save
          </Button>
        </Group>
      </Group>

      <SegmentedControl
        mb="md"
        fullWidth
        value={activeSection}
        onChange={(value) => setActiveSection(value as EditorSection)}
        data={[
          { label: 'BG', value: 'bg' },
          { label: 'Hero', value: 'hero' },
          { label: 'One-time', value: 'oneTime' },
          { label: 'Ongoing', value: 'ongoing' },
          { label: 'Private', value: 'private' },
          { label: 'DUK', value: 'faq' },
          { label: 'About', value: 'about' },
        ]}
      >
      </SegmentedControl>

      {activeSection === 'bg' && (
        <Paper withBorder p="md" mb="md">
          <Group justify="space-between" mb="sm">
            <Title order={3}>Background grid ({selectedSite})</Title>
            <Button onClick={saveBgGrid} loading={bgSaving}>
              Save BG grid
            </Button>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 4 }}>
            {[0, 1, 2, 3].map((colIdx) => (
              <Paper key={`bg-col-${colIdx}`} withBorder p="xs">
                <Group justify="space-between" mb="xs">
                  <Text fw={600}>Stulpelis {colIdx + 1}</Text>
                  <Text size="xs" c="dimmed">
                    {bgColumns[colIdx]?.length || 0}/6
                  </Text>
                </Group>
                <Stack gap="xs">
                  {(bgColumns[colIdx] || []).map((url, imgIdx) => (
                    <Paper key={`${url}-${imgIdx}`} withBorder p={4}>
                      <Group justify="space-between" mb={4}>
                        <Select
                          size="xs"
                          data={[1, 2, 3, 4].map((n) => ({ value: String(n - 1), label: `Stulpelis ${n}` }))}
                          value={String(colIdx)}
                          onChange={(value) => {
                            if (value == null) return;
                            moveBgImage(colIdx, imgIdx, Number(value));
                          }}
                          w={120}
                        />
                        <ActionIcon color="red" variant="light" onClick={() => removeBgImage(colIdx, imgIdx)}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          url.startsWith('http')
                            ? url
                            : url.startsWith('/bg/')
                              ? `https://${selectedSite === 'yoga' ? 'yoga.soulpoetry.love' : 'ceramics.soulpoetry.love'}${url}`
                              : `https://api.soulpoetry.love${url}`
                        }
                        alt="bg thumb"
                        style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6 }}
                      />
                    </Paper>
                  ))}
                  <input
                    ref={(el) => {
                      uploadRefs.current[colIdx] = el;
                    }}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(event) => uploadBgImage(colIdx, event.currentTarget.files?.[0])}
                  />
                  <Button
                    size="xs"
                    variant="light"
                    loading={bgUploadingCol === colIdx}
                    onClick={() => uploadRefs.current[colIdx]?.click()}
                    disabled={(bgColumns[colIdx]?.length || 0) >= 6}
                  >
                    Upload į stulpelį
                  </Button>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Paper>
      )}

      <Accordion variant="separated" radius="md" value={activeSection === 'bg' ? null : activeSection}>
        {activeSection === 'hero' && <Accordion.Item value="hero">
          <Accordion.Control>
            <Text fw={600}>Hero</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <TextInput
                label="Brand name LT"
                value={content.hero.brandName.lt}
                onChange={(event) => {
                  const next = cloneContent(content);
                  next.hero.brandName.lt = event.currentTarget.value;
                  setDraft(next);
                }}
              />
              <Button
                size="xs"
                variant="light"
                leftSection={<IconLanguage size={14} />}
                loading={translating === 'hero.brandName'}
                onClick={() =>
                  translateSingle('hero.brandName', content.hero.brandName.lt, (translated) => {
                    const next = cloneContent(content);
                    next.hero.brandName.en = translated;
                    setDraft(next);
                  })
                }
              >
                Versti LT → EN
              </Button>
              <TextInput
                label="Brand name EN"
                value={content.hero.brandName.en}
                onChange={(event) => {
                  const next = cloneContent(content);
                  next.hero.brandName.en = event.currentTarget.value;
                  setDraft(next);
                }}
              />
              <Divider />
              <Group justify="space-between">
                <Text fw={600}>Eilutės (max 10, po 3 žodžius)</Text>
                <Button
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  disabled={content.hero.lines.length >= 10}
                  onClick={() => {
                    if (content.hero.lines.length >= 10) return;
                    const next = cloneContent(content);
                    next.hero.lines.push({ lt: ['', '', ''], en: ['', '', ''] });
                    setDraft(next);
                  }}
                >
                  Pridėti eilutę
                </Button>
              </Group>
              {heroLineRows?.map(({ line, key }, rowIndex) => (
                <Paper key={key} withBorder p="sm">
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={600}>
                      Eilutė {rowIndex + 1}
                    </Text>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => {
                        const next = cloneContent(content);
                        next.hero.lines.splice(rowIndex, 1);
                        if (next.hero.lines.length === 0) {
                          next.hero.lines.push({ lt: ['', '', ''], en: ['', '', ''] });
                        }
                        setDraft(next);
                      }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                  <SimpleGrid cols={{ base: 1, md: 3 }}>
                    {[0, 1, 2].map((wordIndex) => (
                      <TextInput
                        key={`lt-${rowIndex}-${wordIndex}`}
                        label={`LT žodis ${wordIndex + 1}`}
                        value={line.lt[wordIndex]}
                        onChange={(event) => {
                          const next = cloneContent(content);
                          next.hero.lines[rowIndex].lt[wordIndex] = event.currentTarget.value;
                          setDraft(next);
                        }}
                      />
                    ))}
                  </SimpleGrid>
                  <Group justify="flex-end" mt="xs">
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconLanguage size={14} />}
                      loading={translating === `hero.line.${rowIndex}`}
                      onClick={() =>
                        translateSingle(
                          `hero.line.${rowIndex}`,
                          line.lt.join(' '),
                          (translated) => {
                            const next = cloneContent(content);
                            const parts = translated.split(/\s+/).filter(Boolean);
                            next.hero.lines[rowIndex].en = [parts[0] || '', parts[1] || '', parts[2] || ''];
                            setDraft(next);
                          },
                        )
                      }
                    >
                      Versti eilutę
                    </Button>
                  </Group>
                  <SimpleGrid cols={{ base: 1, md: 3 }} mt="sm">
                    {[0, 1, 2].map((wordIndex) => (
                      <TextInput
                        key={`en-${rowIndex}-${wordIndex}`}
                        label={`EN word ${wordIndex + 1}`}
                        value={line.en[wordIndex]}
                        onChange={(event) => {
                          const next = cloneContent(content);
                          next.hero.lines[rowIndex].en[wordIndex] = event.currentTarget.value;
                          setDraft(next);
                        }}
                      />
                    ))}
                  </SimpleGrid>
                </Paper>
              ))}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>}

        {(['oneTime', 'ongoing', 'private'] as const)
          .filter((sectionKey) => sectionKey === activeSection)
          .map((sectionKey) => (
          <Accordion.Item key={sectionKey} value={sectionKey}>
            <Accordion.Control>
              <Text fw={600}>{sectionLabel(sectionKey)}</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <TextInput
                  label="Antraštė LT"
                  value={content.sections[sectionKey].title.lt}
                  onChange={(event) => {
                    const next = cloneContent(content);
                    next.sections[sectionKey].title.lt = event.currentTarget.value;
                    setDraft(next);
                  }}
                />
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconLanguage size={14} />}
                  loading={translating === `${sectionKey}.title`}
                  onClick={() =>
                    translateSingle(`${sectionKey}.title`, content.sections[sectionKey].title.lt, (translated) => {
                      const next = cloneContent(content);
                      next.sections[sectionKey].title.en = translated;
                      setDraft(next);
                    })
                  }
                >
                  Versti LT → EN
                </Button>
                <TextInput
                  label="Title EN"
                  value={content.sections[sectionKey].title.en}
                  onChange={(event) => {
                    const next = cloneContent(content);
                    next.sections[sectionKey].title.en = event.currentTarget.value;
                    setDraft(next);
                  }}
                />
                <Divider />
                {PARAGRAPH_SLOTS.map((slot, idx) => {
                  const paragraph = withFiveParagraphs(content.sections[sectionKey].paragraphs)[
                    idx
                  ];
                  return (
                    <SimpleGrid key={`${sectionKey}-${slot}`} cols={{ base: 1, md: 2 }}>
                      <Textarea
                        label={`Pastraipa ${idx + 1} LT`}
                        autosize
                        minRows={3}
                        value={paragraph.lt}
                        onChange={(event) =>
                          setSectionParagraph(sectionKey, idx, 'lt', event.currentTarget.value)
                        }
                      />
                      <Textarea
                        label={`Paragraph ${idx + 1} EN`}
                        autosize
                        minRows={3}
                        value={paragraph.en}
                        onChange={(event) =>
                          setSectionParagraph(sectionKey, idx, 'en', event.currentTarget.value)
                        }
                      />
                    </SimpleGrid>
                  );
                })}
                <Group justify="flex-end">
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconLanguage size={14} />}
                    loading={translating === `${sectionKey}.all`}
                    onClick={async () => {
                      try {
                        setTranslating(`${sectionKey}.all`);
                        const source = [
                          content.sections[sectionKey].title.lt,
                          ...withFiveParagraphs(content.sections[sectionKey].paragraphs).map((p) => p.lt),
                        ];
                        const translated = await translateLtToEn(source);
                        const next = cloneContent(content);
                        next.sections[sectionKey].title.en = translated[0] || '';
                        while (next.sections[sectionKey].paragraphs.length < 5) {
                          next.sections[sectionKey].paragraphs.push({ lt: '', en: '' });
                        }
                        for (let i = 0; i < 5; i += 1) {
                          next.sections[sectionKey].paragraphs[i].en = translated[i + 1] || '';
                        }
                        setDraft(next);
                        notifications.show({ message: 'Skiltis išversta', color: 'green' });
                      } catch (error: any) {
                        notifications.show({ message: error?.message || 'Vertimas nepavyko', color: 'red' });
                      } finally {
                        setTranslating(null);
                      }
                    }}
                  >
                    Versti visą skiltį LT → EN
                  </Button>
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}

        {activeSection === 'faq' && <Accordion.Item value="faq">
          <Accordion.Control>
            <Text fw={600}>DUK</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={600}>Klausimai ir atsakymai</Text>
                <Button
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => {
                    const next = cloneContent(content);
                    next.faq.push(newFaqItem());
                    setDraft(next);
                  }}
                >
                  Pridėti klausimą
                </Button>
              </Group>
              {content.faq.map((item, idx) => (
                <Paper key={item.id} withBorder p="sm">
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>Klausimas #{idx + 1}</Text>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => {
                        const next = cloneContent(content);
                        next.faq = next.faq.filter((f) => f.id !== item.id);
                        setDraft(next);
                      }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                  <TextInput
                    label="ID"
                    value={item.id}
                    onChange={(event) => {
                      const next = cloneContent(content);
                      next.faq[idx].id = event.currentTarget.value;
                      setDraft(next);
                    }}
                  />
                  <Select
                    label="Žyma"
                    data={TAG_OPTIONS}
                    value={item.tag}
                    onChange={(value) => {
                      if (!value) return;
                      const next = cloneContent(content);
                      next.faq[idx].tag = value as FAQTag;
                      setDraft(next);
                    }}
                    mt="sm"
                  />
                  <SimpleGrid cols={{ base: 1, md: 2 }} mt="sm">
                    <TextInput
                      label="Klausimas LT"
                      value={item.question.lt}
                      onChange={(event) => {
                        const next = cloneContent(content);
                        next.faq[idx].question.lt = event.currentTarget.value;
                        setDraft(next);
                      }}
                    />
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconLanguage size={14} />}
                      loading={translating === `faq.q.${idx}`}
                      onClick={() =>
                        translateSingle(`faq.q.${idx}`, item.question.lt, (translated) => {
                          const next = cloneContent(content);
                          next.faq[idx].question.en = translated;
                          setDraft(next);
                        })
                      }
                    >
                      Versti LT → EN
                    </Button>
                    <TextInput
                      label="Question EN"
                      value={item.question.en}
                      onChange={(event) => {
                        const next = cloneContent(content);
                        next.faq[idx].question.en = event.currentTarget.value;
                        setDraft(next);
                      }}
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, md: 2 }} mt="sm">
                    <Textarea
                      autosize
                      minRows={3}
                      label="Atsakymas LT"
                      value={item.answer.lt}
                      onChange={(event) => {
                        const next = cloneContent(content);
                        next.faq[idx].answer.lt = event.currentTarget.value;
                        setDraft(next);
                      }}
                    />
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconLanguage size={14} />}
                      loading={translating === `faq.a.${idx}`}
                      onClick={() =>
                        translateSingle(`faq.a.${idx}`, item.answer.lt, (translated) => {
                          const next = cloneContent(content);
                          next.faq[idx].answer.en = translated;
                          setDraft(next);
                        })
                      }
                    >
                      Versti LT → EN
                    </Button>
                    <Textarea
                      autosize
                      minRows={3}
                      label="Answer EN"
                      value={item.answer.en}
                      onChange={(event) => {
                        const next = cloneContent(content);
                        next.faq[idx].answer.en = event.currentTarget.value;
                        setDraft(next);
                      }}
                    />
                  </SimpleGrid>
                </Paper>
              ))}
              <Group justify="flex-end">
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconLanguage size={14} />}
                  loading={translating === 'faq.all'}
                  onClick={async () => {
                    try {
                      setTranslating('faq.all');
                      const source = content.faq.flatMap((f) => [f.question.lt, f.answer.lt]);
                      const translated = await translateLtToEn(source);
                      const next = cloneContent(content);
                      next.faq = next.faq.map((f, i) => ({
                        ...f,
                        question: { ...f.question, en: translated[i * 2] || '' },
                        answer: { ...f.answer, en: translated[i * 2 + 1] || '' },
                      }));
                      setDraft(next);
                      notifications.show({ message: 'DUK išversta', color: 'green' });
                    } catch (error: any) {
                      notifications.show({ message: error?.message || 'Vertimas nepavyko', color: 'red' });
                    } finally {
                      setTranslating(null);
                    }
                  }}
                >
                  Versti visą DUK LT → EN
                </Button>
              </Group>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>}

        {activeSection === 'about' && <Accordion.Item value="about">
          <Accordion.Control>
            <Text fw={600}>Apie</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <TextInput
                label="Antraštė LT"
                value={content.about.title.lt}
                onChange={(event) => {
                  const next = cloneContent(content);
                  next.about.title.lt = event.currentTarget.value;
                  setDraft(next);
                }}
              />
              <Button
                size="xs"
                variant="light"
                leftSection={<IconLanguage size={14} />}
                loading={translating === 'about.title'}
                onClick={() =>
                  translateSingle('about.title', content.about.title.lt, (translated) => {
                    const next = cloneContent(content);
                    next.about.title.en = translated;
                    setDraft(next);
                  })
                }
              >
                Versti LT → EN
              </Button>
              <TextInput
                label="Title EN"
                value={content.about.title.en}
                onChange={(event) => {
                  const next = cloneContent(content);
                  next.about.title.en = event.currentTarget.value;
                  setDraft(next);
                }}
              />
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <Textarea
                  label="Tekstas LT"
                  autosize
                  minRows={4}
                  value={content.about.text.lt}
                  onChange={(event) => {
                    const next = cloneContent(content);
                    next.about.text.lt = event.currentTarget.value;
                    setDraft(next);
                  }}
                />
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconLanguage size={14} />}
                  loading={translating === 'about.text'}
                  onClick={() =>
                    translateSingle('about.text', content.about.text.lt, (translated) => {
                      const next = cloneContent(content);
                      next.about.text.en = translated;
                      setDraft(next);
                    })
                  }
                >
                  Versti LT → EN
                </Button>
                <Textarea
                  label="Text EN"
                  autosize
                  minRows={4}
                  value={content.about.text.en}
                  onChange={(event) => {
                    const next = cloneContent(content);
                    next.about.text.en = event.currentTarget.value;
                    setDraft(next);
                  }}
                />
              </SimpleGrid>
              <Group justify="flex-end">
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconLanguage size={14} />}
                  loading={translating === 'about.all'}
                  onClick={async () => {
                    try {
                      setTranslating('about.all');
                      const [titleEn, textEn] = await translateLtToEn([
                        content.about.title.lt,
                        content.about.text.lt,
                      ]);
                      const next = cloneContent(content);
                      next.about.title.en = titleEn || '';
                      next.about.text.en = textEn || '';
                      setDraft(next);
                      notifications.show({ message: 'About išversta', color: 'green' });
                    } catch (error: any) {
                      notifications.show({ message: error?.message || 'Vertimas nepavyko', color: 'red' });
                    } finally {
                      setTranslating(null);
                    }
                  }}
                >
                  Versti visą About LT → EN
                </Button>
              </Group>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>}
      </Accordion>
    </Container>
  );
}
