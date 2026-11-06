'use client';

import {
  ActionIcon,
  Button,
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
import { IconLanguage, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import type { SiteKey } from '@/lib/site';
import type { FAQTag, SiteContent } from '@/src/lib/content/schema';

type LocalizedText = { lt: string; en: string };
type Locale = keyof LocalizedText;
export type EditorSection =
  | 'hero'
  | 'oneTime'
  | 'ongoing'
  | 'private'
  | 'headings'
  | 'comparison'
  | 'faq'
  | 'about'
  | 'contact';

const SECTION_OPTIONS: Array<{ value: EditorSection; label: string; ceramicsOnly?: boolean }> = [
  { value: 'hero', label: 'Pradžia' },
  { value: 'oneTime', label: 'Vieno apsilankymo dirbtuvės' },
  { value: 'ongoing', label: 'Nuolatiniai užsiėmimai' },
  { value: 'private', label: 'Privatūs užsiėmimai' },
  { value: 'headings', label: 'Skyrių antraštės', ceramicsOnly: true },
  { value: 'comparison', label: 'Užsiėmimų palyginimas', ceramicsOnly: true },
  { value: 'faq', label: 'DUK' },
  { value: 'about', label: 'Apie studiją' },
  { value: 'contact', label: 'Kontaktai ir poraštė', ceramicsOnly: true },
];
const EXPERIENCE_OPTIONS = [
  { key: 'workshops', label: 'Vieno apsilankymo dirbtuvės' },
  { key: 'recurring', label: 'Nuolatiniai užsiėmimai' },
  { key: 'private', label: 'Privatūs užsiėmimai' },
] as const;
const HEADING_OPTIONS = [
  { key: 'upcoming', label: 'Artėjančių dirbtuvių skyrius' },
  { key: 'services', label: 'Užsiėmimų pasirinkimo skyrius' },
  { key: 'faq', label: 'Dažniausių klausimų skyrius' },
  { key: 'contact', label: 'Kontaktų skyrius' },
] as const;
const COMPARISON_FIELDS = [
  {
    key: 'audience',
    label: 'Kam tinka (patirtis ir amžius)',
    description: 'Aprašykite dalyvių patirtį ir patvirtintas dalyvavimo amžiaus sąlygas.',
    multiline: true,
  },
  {
    key: 'format',
    label: 'Formatas',
    description: 'Trumpai aprašykite, kaip vyksta šie užsiėmimai.',
    multiline: true,
  },
  {
    key: 'duration',
    label: 'Trukmė',
    description:
      'Tuščias laukas: rodoma trukmė iš užsiėmimų katalogo. Įrašydami savo tekstą nurodykite ir laiko vienetus.',
    multiline: false,
  },
  {
    key: 'price',
    label: 'Kaina',
    description:
      'Tuščias laukas: rodoma kaina iš užsiėmimų katalogo. Įrašydami savo tekstą nurodykite valiutą ir už ką mokama: apsilankymą, asmenį ar abonementą.',
    multiline: false,
  },
  {
    key: 'groupSize',
    label: 'Grupės dydis',
    description:
      'Tuščias laukas: rodomas grupės dydis iš užsiėmimų katalogo. Galite įrašyti savo dalyvių skaičių ar paaiškinimą.',
    multiline: false,
  },
  {
    key: 'included',
    label: 'Kas įskaičiuota',
    description:
      'Išvardykite į šių užsiėmimų kainą įtrauktas priemones ir paslaugas. Tuščią lauką svetainėje pakeis kvietimas patikslinti registruojantis.',
    multiline: true,
  },
] as const;
const TAG_OPTIONS: Array<{ value: FAQTag; label: string }> = [
  { value: 'general', label: 'Bendri' },
  { value: 'workshop', label: 'Dirbtuvės' },
  { value: 'ongoing', label: 'Nuolatiniai' },
  { value: 'private', label: 'Privatūs' },
];
const PARAGRAPH_SLOTS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;
const PHOTO_OPTIONS = [...Array.from({ length: 16 }, (_, index) => index + 1), 20].map((file) => ({
  value: String(file),
  label: `Studijos nuotrauka ${file}`,
}));

function cloneContent(content: SiteContent): SiteContent {
  return JSON.parse(JSON.stringify(content)) as SiteContent;
}

function withFiveParagraphs(input: LocalizedText[]) {
  const result = input.slice(0, 5);
  while (result.length < 5) result.push({ lt: '', en: '' });
  return result;
}

async function translateLtToEn(texts: string[]) {
  const res = await fetch('/api/admin/content/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Vertimas nepavyko');
  return (data?.translations || []) as string[];
}

type LocalizedFieldProps = {
  label: string;
  description?: string;
  value: LocalizedText;
  multiline?: boolean;
  translating: boolean;
  onChange: (locale: Locale, value: string) => void;
  onTranslate: () => void;
};

function LocalizedField({
  label,
  description,
  value,
  multiline,
  translating,
  onChange,
  onTranslate,
}: LocalizedFieldProps) {
  return (
    <Stack gap={6}>
      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {(['lt', 'en'] as const).map((locale) =>
          multiline ? (
            <Textarea
              key={locale}
              label={`${label} (${locale.toUpperCase()})`}
              value={value[locale]}
              autosize
              minRows={3}
              onChange={(event) => onChange(locale, event.currentTarget.value)}
            />
          ) : (
            <TextInput
              key={locale}
              label={`${label} (${locale.toUpperCase()})`}
              value={value[locale]}
              onChange={(event) => onChange(locale, event.currentTarget.value)}
            />
          ),
        )}
      </SimpleGrid>
      <Group justify="flex-end">
        <Button
          size="xs"
          variant="subtle"
          leftSection={<IconLanguage size={14} />}
          loading={translating}
          onClick={onTranslate}
        >
          Versti LT → EN
        </Button>
      </Group>
    </Stack>
  );
}

function HeadingPreview({ title, accent }: { title: LocalizedText; accent: LocalizedText }) {
  return (
    <Paper p="sm" bg="gray.0" withBorder>
      <Text size="xs" c="dimmed" mb="xs">
        Antraštės dalių peržiūra
      </Text>
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {(['lt', 'en'] as const).map((locale) => (
          <div key={locale}>
            <Text size="xs" c="dimmed">
              {locale.toUpperCase()}
            </Text>
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 28,
                lineHeight: 1.2,
                color: '#342e27',
              }}
            >
              {title[locale] && <div>{title[locale]}</div>}
              {accent[locale] && (
                <div style={{ fontStyle: 'italic', color: '#70634d' }}>{accent[locale]}</div>
              )}
            </div>
          </div>
        ))}
      </SimpleGrid>
    </Paper>
  );
}

type ContentEditorProps = {
  site: SiteKey;
  content: SiteContent;
  onChange: (content: SiteContent) => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  initialSection?: EditorSection;
};

export default function ContentEditor({
  site,
  content,
  onChange,
  disabled = false,
  onBusyChange,
  initialSection = 'hero',
}: ContentEditorProps) {
  const [activeSection, setActiveSection] = useState<EditorSection>(initialSection);
  const [translating, setTranslating] = useState<string | null>(null);
  const ceramics = site === 'ceramics';
  const options = SECTION_OPTIONS.filter((item) => ceramics || !item.ceramicsOnly);

  const update = (apply: (next: SiteContent) => void) => {
    const next = cloneContent(content);
    apply(next);
    onChange(next);
  };

  const translate = async (
    key: string,
    source: string[],
    apply: (next: SiteContent, values: string[]) => void,
  ) => {
    setTranslating(key);
    onBusyChange?.(true);
    try {
      const values = await translateLtToEn(source);
      update((next) => apply(next, values));
      notifications.show({ message: 'Išversta', color: 'green' });
    } catch (error) {
      notifications.show({
        message: error instanceof Error ? error.message : 'Vertimas nepavyko',
        color: 'red',
      });
    } finally {
      setTranslating(null);
      onBusyChange?.(false);
    }
  };

  const field = (
    key: string,
    label: string,
    value: LocalizedText,
    apply: (next: SiteContent, locale: Locale, value: string) => void,
    multiline = false,
    description?: string,
  ) => (
    <LocalizedField
      key={key}
      label={label}
      description={description}
      value={value}
      multiline={multiline}
      translating={translating === key}
      onChange={(locale, text) => update((next) => apply(next, locale, text))}
      onTranslate={() =>
        translate(key, [value.lt], (next, values) => apply(next, 'en', values[0] || ''))
      }
    />
  );

  const heading = (
    key: string,
    title: LocalizedText,
    accent: LocalizedText,
    apply: (next: SiteContent, part: 'title' | 'accent', locale: Locale, value: string) => void,
  ) => (
    <Stack gap="sm">
      {field(`${key}.title`, 'Pagrindinė antraštės dalis', title, (next, locale, value) =>
        apply(next, 'title', locale, value),
      )}
      {field(
        `${key}.accent`,
        'Akcentinė antraštės dalis (kursyvu)',
        accent,
        (next, locale, value) => apply(next, 'accent', locale, value),
      )}
      <Text size="xs" c="dimmed">
        Dalys svetainėje sujungiamos į vieną antraštę. Palikite akcentinę dalį tuščią, jei visa
        antraštė turi būti vieno stiliaus.
      </Text>
      <HeadingPreview title={title} accent={accent} />
    </Stack>
  );

  return (
    <fieldset
      disabled={disabled || Boolean(translating)}
      style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
    >
      <Group gap="xs" mb="md" wrap="wrap">
        {options.map((item) => (
          <Button
            key={item.value}
            size="xs"
            variant={activeSection === item.value ? 'filled' : 'light'}
            onClick={() => setActiveSection(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </Group>
      <Paper withBorder radius="md" p={{ base: 'sm', sm: 'lg' }}>
        <Title order={2} size="h3" mb="lg">
          {options.find((item) => item.value === activeSection)?.label}
        </Title>

        {activeSection === 'hero' && ceramics && (
          <Stack gap="md">
            {heading(
              'hero',
              content.hero.title,
              content.hero.titleAccent,
              (next, part, locale, value) => {
                next.hero[part === 'title' ? 'title' : 'titleAccent'][locale] = value;
              },
            )}
            <Divider />
            {field(
              'hero.welcome',
              'Įvadinis sakinys',
              content.hero.welcome,
              (next, locale, value) => {
                next.hero.welcome[locale] = value;
              },
            )}
            {field(
              'hero.welcomeDetail',
              'Antras įvado sakinys',
              content.hero.welcomeDetail,
              (next, locale, value) => {
                next.hero.welcomeDetail[locale] = value;
              },
            )}
            <Divider label="Pradžios mygtukai" />
            {EXPERIENCE_OPTIONS.map(({ key, label }) => (
              <Paper key={key} p="sm" withBorder>
                <Text fw={600} mb="sm">
                  {label}
                </Text>
                <Stack gap="sm">
                  {field(
                    `hero.choices.${key}.title`,
                    'Mygtuko antraštė',
                    content.hero.choices[key].title,
                    (next, locale, value) => {
                      next.hero.choices[key].title[locale] = value;
                    },
                  )}
                  {field(
                    `hero.choices.${key}.detail`,
                    'Mygtuko paaiškinimas',
                    content.hero.choices[key].detail,
                    (next, locale, value) => {
                      next.hero.choices[key].detail[locale] = value;
                    },
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        {activeSection === 'hero' && !ceramics && (
          <Stack gap="md">
            {field(
              'hero.brandName',
              'Prekės ženklo pavadinimas',
              content.hero.brandName,
              (next, locale, value) => {
                next.hero.brandName[locale] = value;
              },
            )}
            <Group justify="space-between">
              <Text fw={600}>Besikeičiančios eilutės (po 3 žodžius)</Text>
              <Button
                size="xs"
                leftSection={<IconPlus size={14} />}
                disabled={content.hero.lines.length >= 10}
                onClick={() =>
                  update((next) => {
                    next.hero.lines.push({ lt: ['', '', ''], en: ['', '', ''] });
                  })
                }
              >
                Pridėti eilutę
              </Button>
            </Group>
            {content.hero.lines.map((line, row) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Legacy lines have no IDs; all fields are controlled.
              <Paper key={`line-${row}`} withBorder p="sm">
                <Group justify="space-between" mb="sm">
                  <Text fw={600}>Eilutė {row + 1}</Text>
                  <ActionIcon
                    aria-label={`Pašalinti eilutę ${row + 1}`}
                    color="red"
                    variant="subtle"
                    disabled={content.hero.lines.length === 1}
                    onClick={() =>
                      update((next) => {
                        next.hero.lines.splice(row, 1);
                      })
                    }
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
                <Stack gap="sm">
                  {(['lt', 'en'] as const).map((locale) => (
                    <SimpleGrid key={locale} cols={{ base: 1, sm: 3 }}>
                      {([0, 1, 2] as const).map((word) => (
                        <TextInput
                          key={word}
                          label={`${locale.toUpperCase()} žodis ${word + 1}`}
                          value={line[locale][word]}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            update((next) => {
                              next.hero.lines[row][locale][word] = value;
                            });
                          }}
                        />
                      ))}
                    </SimpleGrid>
                  ))}
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconLanguage size={14} />}
                    loading={translating === `hero.line.${row}`}
                    onClick={() =>
                      translate(`hero.line.${row}`, [line.lt.join(' ')], (next, values) => {
                        const words = (values[0] || '').split(/\s+/);
                        next.hero.lines[row].en = [words[0] || '', words[1] || '', words[2] || ''];
                      })
                    }
                  >
                    Versti eilutę LT → EN
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        {(['oneTime', 'ongoing', 'private'] as const)
          .filter((key) => key === activeSection)
          .map((key) => (
            <Stack key={key} gap="md">
              {ceramics
                ? heading(
                    key,
                    content.sections[key].title,
                    content.sections[key].titleAccent,
                    (next, part, locale, value) => {
                      next.sections[key][part === 'title' ? 'title' : 'titleAccent'][locale] =
                        value;
                    },
                  )
                : field(
                    `${key}.title`,
                    'Antraštė',
                    content.sections[key].title,
                    (next, locale, value) => {
                      next.sections[key].title[locale] = value;
                    },
                  )}
              <Divider />
              <Text size="sm" c="dimmed">
                Pirma pastraipa rodoma iškart po antrašte kaip įvadas. Tuščios pastraipos svetainėje
                nerodomos.
              </Text>
              {PARAGRAPH_SLOTS.map((slot, index) =>
                field(
                  `${key}.${slot}`,
                  index === 0 ? 'Įvadinė pastraipa' : `Pastraipa ${index + 1}`,
                  withFiveParagraphs(content.sections[key].paragraphs)[index],
                  (next, locale, value) => {
                    next.sections[key].paragraphs = withFiveParagraphs(
                      next.sections[key].paragraphs,
                    );
                    next.sections[key].paragraphs[index][locale] = value;
                  },
                  true,
                ),
              )}
              <Button
                variant="light"
                leftSection={<IconLanguage size={14} />}
                loading={translating === `${key}.all`}
                onClick={() =>
                  translate(
                    `${key}.all`,
                    [
                      content.sections[key].title.lt,
                      content.sections[key].titleAccent.lt,
                      ...withFiveParagraphs(content.sections[key].paragraphs).map((p) => p.lt),
                    ],
                    (next, values) => {
                      next.sections[key].title.en = values[0] || '';
                      next.sections[key].titleAccent.en = values[1] || '';
                      next.sections[key].paragraphs = withFiveParagraphs(
                        next.sections[key].paragraphs,
                      ).map((p, index) => ({ ...p, en: values[index + 2] || '' }));
                    },
                  )
                }
              >
                Versti visą skiltį LT → EN
              </Button>
              {ceramics && key === 'ongoing' && (
                <>
                  <Divider label="Susisiekimo blokas" />
                  {heading(
                    'serviceMessages.recurringContactHeading',
                    content.presentation.serviceMessages.recurringContactHeading.title,
                    content.presentation.serviceMessages.recurringContactHeading.accent,
                    (next, part, locale, value) => {
                      next.presentation.serviceMessages.recurringContactHeading[part][locale] =
                        value;
                    },
                  )}
                  {field(
                    'serviceMessages.recurringContactText',
                    'Susisiekimo bloko aprašymas',
                    content.presentation.serviceMessages.recurringContactText,
                    (next, locale, value) => {
                      next.presentation.serviceMessages.recurringContactText[locale] = value;
                    },
                    true,
                  )}
                </>
              )}
              {ceramics && key === 'private' && (
                <>
                  <Divider label="Užklausos blokas" />
                  {heading(
                    'serviceMessages.privateEnquiryHeading',
                    content.presentation.serviceMessages.privateEnquiryHeading.title,
                    content.presentation.serviceMessages.privateEnquiryHeading.accent,
                    (next, part, locale, value) => {
                      next.presentation.serviceMessages.privateEnquiryHeading[part][locale] = value;
                    },
                  )}
                  {field(
                    'serviceMessages.privateEnquiryText',
                    'Užklausos bloko aprašymas',
                    content.presentation.serviceMessages.privateEnquiryText,
                    (next, locale, value) => {
                      next.presentation.serviceMessages.privateEnquiryText[locale] = value;
                    },
                    true,
                  )}
                  {field(
                    'serviceMessages.privateQuote',
                    'Citata',
                    content.presentation.serviceMessages.privateQuote,
                    (next, locale, value) => {
                      next.presentation.serviceMessages.privateQuote[locale] = value;
                    },
                    true,
                  )}
                </>
              )}
            </Stack>
          ))}

        {activeSection === 'headings' && ceramics && (
          <Stack gap="lg">
            {HEADING_OPTIONS.map(({ key, label }) => (
              <Paper key={key} p="sm" withBorder>
                <Text fw={600} mb="sm">
                  {label}
                </Text>
                {heading(
                  `headings.${key}`,
                  content.presentation.headings[key].title,
                  content.presentation.headings[key].accent,
                  (next, part, locale, value) => {
                    next.presentation.headings[key][part][locale] = value;
                  },
                )}
              </Paper>
            ))}
          </Stack>
        )}

        {activeSection === 'comparison' && ceramics && (
          <Stack gap="lg">
            <Text size="sm" c="dimmed">
              Kiekviena kortelė turi šešis palyginimo punktus. Trukmės, kainos ir grupės dydžio
              laukus galite palikti tuščius, kad duomenys būtų imami iš užsiėmimų katalogo. Įrašytas
              tekstas pakeičia automatinę reikšmę tik pasirinkta kalba.
            </Text>
            {EXPERIENCE_OPTIONS.map(({ key, label }) => (
              <Paper key={key} p={{ base: 'sm', sm: 'md' }} withBorder radius="md">
                <Text fw={600} mb="sm">
                  {label}
                </Text>
                <Stack gap="md">
                  {field(
                    `comparison.${key}.title`,
                    'Kortelės antraštė',
                    content.presentation.comparison[key].title,
                    (next, locale, value) => {
                      next.presentation.comparison[key].title[locale] = value;
                    },
                  )}
                  <Divider label="Palyginimo punktai" />
                  {COMPARISON_FIELDS.map(
                    ({ key: property, label: fieldLabel, description, multiline }) => (
                      <Paper key={property} p="sm" withBorder radius="sm">
                        {field(
                          `comparison.${key}.${property}`,
                          fieldLabel,
                          content.presentation.comparison[key][property],
                          (next, locale, value) => {
                            next.presentation.comparison[key][property][locale] = value;
                          },
                          multiline,
                          description,
                        )}
                      </Paper>
                    ),
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        {activeSection === 'faq' && (
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Klausimai rodomi pagal pasirinktą žymą.
              </Text>
              <Button
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={() =>
                  update((next) => {
                    next.faq.push({
                      id: crypto.randomUUID(),
                      tag: 'general',
                      question: { lt: '', en: '' },
                      answer: { lt: '', en: '' },
                    });
                  })
                }
              >
                Pridėti klausimą
              </Button>
            </Group>
            {content.faq.map((item, index) => (
              <Paper key={item.id} withBorder p="sm">
                <Group justify="space-between" mb="sm">
                  <Text fw={600}>Klausimas {index + 1}</Text>
                  <ActionIcon
                    aria-label={`Pašalinti klausimą ${index + 1}`}
                    color="red"
                    variant="subtle"
                    onClick={() =>
                      update((next) => {
                        next.faq.splice(index, 1);
                      })
                    }
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
                <Stack gap="sm">
                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <TextInput
                      label="Klausimo ID"
                      value={item.id}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        update((next) => {
                          next.faq[index].id = value;
                        });
                      }}
                    />
                    <Select
                      label="Žyma"
                      data={TAG_OPTIONS}
                      value={item.tag}
                      allowDeselect={false}
                      onChange={(value) => {
                        if (value)
                          update((next) => {
                            next.faq[index].tag = value as FAQTag;
                          });
                      }}
                    />
                  </SimpleGrid>
                  {field(
                    `faq.${index}.question`,
                    'Klausimas',
                    item.question,
                    (next, locale, value) => {
                      next.faq[index].question[locale] = value;
                    },
                  )}
                  {field(
                    `faq.${index}.answer`,
                    'Atsakymas',
                    item.answer,
                    (next, locale, value) => {
                      next.faq[index].answer[locale] = value;
                    },
                    true,
                  )}
                </Stack>
              </Paper>
            ))}
            <Button
              variant="light"
              leftSection={<IconLanguage size={14} />}
              loading={translating === 'faq.all'}
              onClick={() =>
                translate(
                  'faq.all',
                  content.faq.flatMap((item) => [item.question.lt, item.answer.lt]),
                  (next, values) => {
                    next.faq.forEach((item, index) => {
                      item.question.en = values[index * 2] || '';
                      item.answer.en = values[index * 2 + 1] || '';
                    });
                  },
                )
              }
            >
              Versti visą DUK LT → EN
            </Button>
          </Stack>
        )}

        {activeSection === 'about' && (
          <Stack gap="md">
            {ceramics
              ? heading(
                  'about',
                  content.about.title,
                  content.about.titleAccent,
                  (next, part, locale, value) => {
                    next.about[part === 'title' ? 'title' : 'titleAccent'][locale] = value;
                  },
                )
              : field('about.title', 'Antraštė', content.about.title, (next, locale, value) => {
                  next.about.title[locale] = value;
                })}
            {field(
              'about.text',
              'Aprašymas',
              content.about.text,
              (next, locale, value) => {
                next.about.text[locale] = value;
              },
              true,
            )}
            {ceramics && (
              <>
                <Divider label="Studijos žmonės ir galerija" />
                {(
                  [
                    'peopleTitle',
                    'peopleText',
                    'peopleLink',
                    'galleryTitle',
                    'galleryText',
                  ] as const
                ).map((property) =>
                  field(
                    `studio.${property}`,
                    {
                      peopleTitle: 'Žmonių skyriaus antraštė',
                      peopleText: 'Žmonių skyriaus aprašymas',
                      peopleLink: 'Nuorodos į studijos žmones tekstas',
                      galleryTitle: 'Galerijos antraštė',
                      galleryText: 'Galerijos aprašymas',
                    }[property],
                    content.presentation.studio[property],
                    (next, locale, value) => {
                      next.presentation.studio[property][locale] = value;
                    },
                    property.endsWith('Text'),
                  ),
                )}
                <Divider label="Galerijos nuotraukos" />
                {content.presentation.studio.photos.map((photo, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Photo entries have no IDs and can reuse the same file; fields are controlled.
                  <Paper key={`photo-${index}`} withBorder p="sm">
                    <Group justify="space-between" mb="sm">
                      <Text fw={600}>Nuotrauka {index + 1}</Text>
                      <ActionIcon
                        aria-label={`Pašalinti nuotrauką ${index + 1}`}
                        color="red"
                        variant="subtle"
                        onClick={() =>
                          update((next) => {
                            next.presentation.studio.photos.splice(index, 1);
                          })
                        }
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                    <Stack gap="sm">
                      <Select
                        label="Studijos nuotrauka"
                        data={PHOTO_OPTIONS}
                        allowDeselect={false}
                        value={String(photo.file)}
                        onChange={(value) => {
                          if (value)
                            update((next) => {
                              next.presentation.studio.photos[index].file = Number(value);
                            });
                        }}
                      />
                      {field(
                        `studio.photos.${index}.alt`,
                        'Alternatyvus nuotraukos tekstas',
                        photo.alt,
                        (next, locale, value) => {
                          next.presentation.studio.photos[index].alt[locale] = value;
                        },
                      )}
                    </Stack>
                  </Paper>
                ))}
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconPlus size={14} />}
                  disabled={content.presentation.studio.photos.length >= 12}
                  onClick={() =>
                    update((next) => {
                      next.presentation.studio.photos.push({ file: 1, alt: { lt: '', en: '' } });
                    })
                  }
                >
                  Pridėti nuotrauką
                </Button>
              </>
            )}
          </Stack>
        )}

        {activeSection === 'contact' && ceramics && (
          <Stack gap="md">
            {field(
              'contact.description',
              'Kontaktų skyriaus aprašymas',
              content.presentation.contact.description,
              (next, locale, value) => {
                next.presentation.contact.description[locale] = value;
              },
              true,
            )}
            {(['address', 'email', 'instagramUrl', 'facebookUrl'] as const).map((property) => (
              <TextInput
                key={property}
                label={
                  {
                    address: 'Adresas',
                    email: 'El. paštas',
                    instagramUrl: 'Instagram nuoroda',
                    facebookUrl: 'Facebook nuoroda',
                  }[property]
                }
                value={content.presentation.contact[property]}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  update((next) => {
                    next.presentation.contact[property] = value;
                  });
                }}
              />
            ))}
            <Divider label="Poraštė" />
            {field(
              'contact.footerTagline',
              'Poraštės tekstas',
              content.presentation.contact.footerTagline,
              (next, locale, value) => {
                next.presentation.contact.footerTagline[locale] = value;
              },
            )}
          </Stack>
        )}
      </Paper>
    </fieldset>
  );
}
