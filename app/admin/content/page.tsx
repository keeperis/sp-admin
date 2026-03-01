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
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
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

export default function ContentPage() {
  const [selectedSite, setSelectedSite] = useState<SiteKey>('ceramics');
  const contentApiUrl = `/api/admin/content?site=${selectedSite}`;
  const { data, error, isLoading, mutate } = useSWR<AdminContentResponse>(contentApiUrl, fetcher);
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState<number | null>(null);

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

      <Accordion variant="separated" radius="md">
        <Accordion.Item value="hero">
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
        </Accordion.Item>

        {(['oneTime', 'ongoing', 'private'] as const).map((sectionKey) => (
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
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}

        <Accordion.Item value="faq">
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
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="about">
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
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
}
