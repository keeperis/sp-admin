'use client';

import {
  Accordion,
  Alert,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconLanguage, IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

type Locale = 'lt' | 'en';
type DocumentKind = 'terms' | 'privacy';

interface LegalDocument {
  effectiveDate: string;
  kind: DocumentKind;
  sections: Array<{ title: string; paragraphs: string[] }>;
  title: string;
  version: string;
}

interface LegalSettingsData {
  operator: {
    address: string;
    code: string;
    email: string;
    name: string;
    phone?: string;
    vatCode?: string;
  };
  privacy: Record<Locale, LegalDocument>;
  terms: Record<Locale, LegalDocument>;
}

interface LegalSettingsResponse {
  data: LegalSettingsData;
  site: 'ceramics' | 'yoga';
  version: number;
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || 'Nepavyko įkelti teisinių nustatymų');
  return data;
};

function cloneSettings(data: LegalSettingsData) {
  return structuredClone(data);
}

function getDocumentTranslationTexts(document: LegalDocument) {
  return [
    document.title,
    ...document.sections.flatMap((section) => [section.title, ...section.paragraphs]),
  ];
}

function buildTranslatedDocument(
  source: LegalDocument,
  currentEnglish: LegalDocument,
  translations: string[],
) {
  let index = 0;
  return {
    ...currentEnglish,
    effectiveDate: source.effectiveDate,
    kind: source.kind,
    title: translations[index++] || currentEnglish.title || source.title,
    sections: source.sections.map((section, sectionIndex) => ({
      title: translations[index++] || currentEnglish.sections[sectionIndex]?.title || section.title,
      paragraphs: section.paragraphs.map(
        (paragraph, paragraphIndex) =>
          translations[index++] ||
          currentEnglish.sections[sectionIndex]?.paragraphs[paragraphIndex] ||
          paragraph,
      ),
    })),
  };
}

async function translateLegalLtToEn(texts: string[]) {
  const translations: string[] = [];
  const batchSize = 20;

  for (let index = 0; index < texts.length; index += batchSize) {
    const batch = texts.slice(index, index + batchSize);
    const response = await fetch('/api/admin/legal/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ texts: batch }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error || 'Vertimas nepavyko');
    translations.push(...((body?.translations || []) as string[]));
  }

  if (translations.length !== texts.length) {
    throw new Error('Vertimo rezultato ilgis nesutampa su dokumento struktūra');
  }

  return translations;
}

function DocumentEditor({
  document,
  isTranslating,
  onChange,
  onTranslateToEnglish,
}: {
  document: LegalDocument;
  isTranslating?: boolean;
  onChange: (next: LegalDocument) => void;
  onTranslateToEnglish?: () => void;
}) {
  const updateSection = (
    sectionIndex: number,
    update: (section: LegalDocument['sections'][number]) => void,
  ) => {
    const next = structuredClone(document);
    update(next.sections[sectionIndex]);
    onChange(next);
  };

  return (
    <Stack gap="md">
      <Group grow align="flex-start">
        <TextInput
          label="Dokumento pavadinimas"
          required
          value={document.title}
          onChange={(event) => onChange({ ...document, title: event.currentTarget.value })}
        />
        <TextInput
          label="Galioja nuo"
          type="date"
          required
          value={document.effectiveDate}
          onChange={(event) => onChange({ ...document, effectiveDate: event.currentTarget.value })}
        />
      </Group>
      {onTranslateToEnglish ? (
        <Group justify="flex-end">
          <Button
            size="xs"
            variant="light"
            leftSection={<IconLanguage size={14} />}
            loading={isTranslating}
            onClick={onTranslateToEnglish}
          >
            Versti į EN ir išsaugoti
          </Button>
        </Group>
      ) : null}
      <Text size="sm" c="dimmed">
        Dabartinė redakcija: {document.version}. Išsaugojus redakcijos numeris bus sugeneruotas
        automatiškai.
      </Text>
      <Accordion multiple variant="separated">
        {document.sections.map((section, sectionIndex) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: legal sections are intentionally ordered and do not have persisted UI identifiers
          <Accordion.Item key={sectionIndex} value={`section-${sectionIndex}`}>
            <Accordion.Control>{section.title || `Skyrius ${sectionIndex + 1}`}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <TextInput
                  label="Skyriaus pavadinimas"
                  required
                  value={section.title}
                  onChange={(event) =>
                    updateSection(sectionIndex, (next) => {
                      next.title = event.currentTarget.value;
                    })
                  }
                />
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: legal paragraphs are intentionally ordered and stored as strings
                  <Group key={`${sectionIndex}-${paragraphIndex}`} align="flex-end" wrap="nowrap">
                    <Textarea
                      label={`Pastraipa ${paragraphIndex + 1}`}
                      required
                      autosize
                      minRows={3}
                      style={{ flex: 1 }}
                      value={paragraph}
                      onChange={(event) =>
                        updateSection(sectionIndex, (next) => {
                          next.paragraphs[paragraphIndex] = event.currentTarget.value;
                        })
                      }
                    />
                    <Button
                      color="red"
                      variant="subtle"
                      disabled={section.paragraphs.length === 1}
                      onClick={() =>
                        updateSection(sectionIndex, (next) => {
                          next.paragraphs.splice(paragraphIndex, 1);
                        })
                      }
                    >
                      <IconTrash size={16} />
                    </Button>
                  </Group>
                ))}
                <Group justify="space-between">
                  <Button
                    variant="light"
                    leftSection={<IconPlus size={16} />}
                    onClick={() =>
                      updateSection(sectionIndex, (next) => {
                        next.paragraphs.push('Nauja pastraipa');
                      })
                    }
                  >
                    Pridėti pastraipą
                  </Button>
                  <Button
                    color="red"
                    variant="subtle"
                    disabled={document.sections.length === 1}
                    leftSection={<IconTrash size={16} />}
                    onClick={() => {
                      const next = structuredClone(document);
                      next.sections.splice(sectionIndex, 1);
                      onChange(next);
                    }}
                  >
                    Šalinti skyrių
                  </Button>
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
      <Button
        variant="light"
        leftSection={<IconPlus size={16} />}
        onClick={() =>
          onChange({
            ...document,
            sections: [
              ...document.sections,
              {
                title: `Naujas skyrius ${document.sections.length + 1}`,
                paragraphs: ['Nauja pastraipa'],
              },
            ],
          })
        }
      >
        Pridėti skyrių
      </Button>
    </Stack>
  );
}

export default function LegalSettingsPage() {
  const [site, setSite] = useState<'ceramics' | 'yoga'>('ceramics');
  const { data, error, isLoading, mutate } = useSWR<LegalSettingsResponse>(
    `/api/admin/legal?site=${site}`,
    fetcher,
  );
  const [draft, setDraft] = useState<LegalSettingsData | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState<DocumentKind | null>(null);

  useEffect(() => {
    if (!data) return;
    setDraft(cloneSettings(data.data));
    setVersion(data.version);
  }, [data]);

  const updateDocument = (kind: DocumentKind, locale: Locale, document: LegalDocument) => {
    if (!draft) return;
    const next = cloneSettings(draft);
    next[kind][locale] = document;
    setDraft(next);
  };

  const saveSettings = async (
    nextDraft: LegalSettingsData,
    successMessage = 'Teisinė informacija išsaugota',
  ) => {
    if (version === null) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/legal?site=${site}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ version, data: nextDraft }),
      });
      const body = await response.json();
      if (!response.ok) {
        const issue = body?.issues?.[0];
        throw new Error(issue ? `${issue.path?.join('.')}: ${issue.message}` : body?.error);
      }
      setDraft(cloneSettings(body.data));
      setVersion(body.version);
      await mutate(body, { revalidate: false });
      notifications.show({ color: 'green', message: successMessage });
    } catch (cause: any) {
      notifications.show({
        color: 'red',
        message: cause?.message || 'Nepavyko išsaugoti',
      });
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    await saveSettings(draft);
  };

  const translateDocumentToEnglish = async (kind: DocumentKind) => {
    if (!draft) return;
    setTranslating(kind);
    try {
      const translations = await translateLegalLtToEn(getDocumentTranslationTexts(draft[kind].lt));
      const next = cloneSettings(draft);
      next[kind].en = buildTranslatedDocument(draft[kind].lt, draft[kind].en, translations);
      setDraft(next);
      await saveSettings(
        next,
        kind === 'terms'
          ? 'Paslaugų teikimo sąlygos išverstos į EN ir išsaugotos'
          : 'Privatumo politika išversta į EN ir išsaugota',
      );
    } catch (cause: any) {
      notifications.show({
        color: 'red',
        message: cause?.message || 'Vertimas nepavyko',
      });
    } finally {
      setTranslating(null);
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1}>Teisinė informacija</Title>
            <Text c="dimmed">Paslaugų teikėjo rekvizitai, sąlygos ir privatumo pranešimas</Text>
          </div>
          <Select
            label="Projektas"
            data={[
              { value: 'ceramics', label: 'Ceramics' },
              { value: 'yoga', label: 'Yoga' },
            ]}
            value={site}
            allowDeselect={false}
            onChange={(value) => {
              setDraft(null);
              setVersion(null);
              setSite(value === 'yoga' ? 'yoga' : 'ceramics');
            }}
          />
        </Group>

        {error ? (
          <Alert color="red" icon={<IconAlertCircle size={18} />}>
            {error.message}
          </Alert>
        ) : null}
        {isLoading || !draft ? (
          <Loader />
        ) : (
          <>
            <Paper withBorder p="lg" radius="md">
              <Stack gap="md">
                <Title order={2} size="h3">
                  Paslaugų teikėjo rekvizitai
                </Title>
                <Group grow align="flex-start">
                  <TextInput
                    label="Pavadinimas"
                    required
                    value={draft.operator.name}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        operator: { ...draft.operator, name: event.currentTarget.value },
                      })
                    }
                  />
                  <TextInput
                    label="Individualios veiklos pažymos Nr."
                    required
                    value={draft.operator.code}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        operator: { ...draft.operator, code: event.currentTarget.value },
                      })
                    }
                  />
                </Group>
                <Group grow align="flex-start">
                  <TextInput
                    label="PVM mokėtojo kodas"
                    value={draft.operator.vatCode || ''}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        operator: { ...draft.operator, vatCode: event.currentTarget.value },
                      })
                    }
                  />
                  <TextInput
                    label="Telefonas"
                    value={draft.operator.phone || ''}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        operator: { ...draft.operator, phone: event.currentTarget.value },
                      })
                    }
                  />
                </Group>
                <TextInput
                  label="Adresas"
                  required
                  value={draft.operator.address}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      operator: { ...draft.operator, address: event.currentTarget.value },
                    })
                  }
                />
                <TextInput
                  label="El. paštas"
                  type="email"
                  required
                  value={draft.operator.email}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      operator: { ...draft.operator, email: event.currentTarget.value },
                    })
                  }
                />
              </Stack>
            </Paper>

            <Tabs defaultValue="terms-lt">
              <Tabs.List>
                <Tabs.Tab value="terms-lt">Sąlygos LT</Tabs.Tab>
                <Tabs.Tab value="terms-en">Sąlygos EN</Tabs.Tab>
                <Tabs.Tab value="privacy-lt">Privatumas LT</Tabs.Tab>
                <Tabs.Tab value="privacy-en">Privatumas EN</Tabs.Tab>
              </Tabs.List>
              {(['terms', 'privacy'] as const).flatMap((kind) =>
                (['lt', 'en'] as const).map((locale) => (
                  <Tabs.Panel key={`${kind}-${locale}`} value={`${kind}-${locale}`} pt="lg">
                    <DocumentEditor
                      document={draft[kind][locale]}
                      isTranslating={translating === kind}
                      onChange={(document) => updateDocument(kind, locale, document)}
                      onTranslateToEnglish={
                        locale === 'lt' ? () => translateDocumentToEnglish(kind) : undefined
                      }
                    />
                  </Tabs.Panel>
                )),
              )}
            </Tabs>

            <Group justify="flex-end">
              <Button loading={saving} onClick={save}>
                Išsaugoti naują redakciją
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Container>
  );
}
