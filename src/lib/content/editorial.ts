import { z } from 'zod';

export const localizedTextSchema = z.object({ lt: z.string(), en: z.string() });
export type LocalizedText = z.infer<typeof localizedTextSchema>;

const headingSchema = z.object({ title: localizedTextSchema, accent: localizedTextSchema });
const choiceSchema = z.object({ title: localizedTextSchema, detail: localizedTextSchema });
const comparisonSchema = z.object({
  title: localizedTextSchema,
  audience: localizedTextSchema,
  format: localizedTextSchema,
  duration: localizedTextSchema,
  price: localizedTextSchema,
  groupSize: localizedTextSchema,
  included: localizedTextSchema,
  // Keep the legacy CTA copy when older admin clients save the full document.
  participation: localizedTextSchema,
});
const socialUrlSchema = z.string().refine((value) => {
  if (!value) return true;
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'Use a full http or https URL, or leave empty');

export const heroEditorialSchema = z.object({
  title: localizedTextSchema,
  titleAccent: localizedTextSchema,
  welcome: localizedTextSchema,
  welcomeDetail: localizedTextSchema,
  choices: z.object({ workshops: choiceSchema, recurring: choiceSchema, private: choiceSchema }),
});

export const presentationSchema = z.object({
  serviceMessages: z.object({
    recurringContactHeading: headingSchema,
    recurringContactText: localizedTextSchema,
    privateEnquiryHeading: headingSchema,
    privateEnquiryText: localizedTextSchema,
    privateQuote: localizedTextSchema,
  }),
  headings: z.object({
    upcoming: headingSchema,
    services: headingSchema,
    faq: headingSchema,
    contact: headingSchema,
  }),
  comparison: z.object({
    workshops: comparisonSchema,
    recurring: comparisonSchema,
    private: comparisonSchema,
  }),
  studio: z.object({
    peopleTitle: localizedTextSchema,
    peopleText: localizedTextSchema,
    peopleLink: localizedTextSchema,
    galleryTitle: localizedTextSchema,
    galleryText: localizedTextSchema,
    photos: z
      .array(z.object({ file: z.number().int().min(1).max(99), alt: localizedTextSchema }))
      .max(12),
  }),
  contact: z.object({
    description: localizedTextSchema,
    address: z.string(),
    email: z.union([z.literal(''), z.string().email()]),
    instagramUrl: socialUrlSchema,
    facebookUrl: socialUrlSchema,
    footerTagline: localizedTextSchema,
  }),
});

export type EditorialHero = z.infer<typeof heroEditorialSchema>;
export type EditorialPresentation = z.infer<typeof presentationSchema>;
export type LocalizedEditorial<T> = T extends LocalizedText
  ? string
  : T extends Array<infer Item>
    ? Array<LocalizedEditorial<Item>>
    : T extends object
      ? { [Key in keyof T]: LocalizedEditorial<T[Key]> }
      : T;

const text = (lt: string, en: string): LocalizedText => ({ lt, en });

/** Defaults are only used for newly introduced fields, never to replace saved editorial text. */
export function buildDefaultEditorialContent(site: string = 'ceramics'): {
  hero: EditorialHero;
  presentation: EditorialPresentation;
} {
  const yoga = site === 'yoga';
  return {
    hero: {
      title: text(
        yoga ? 'Jogos užsiėmimai' : 'Keramikos užsiėmimai',
        yoga ? 'Yoga classes' : 'Ceramics workshops',
      ),
      titleAccent: text('Vilniuje', 'in Vilnius'),
      welcome: text(
        yoga ? 'Jauki jogos studija Žvėryne.' : 'Jauki keramikos studija Žvėryne.',
        yoga ? 'A welcoming yoga studio in Žvėrynas.' : 'A welcoming ceramics studio in Žvėrynas.',
      ),
      welcomeDetail: text(
        'Atradimo džiaugsmui ir potyriams, kurie neišdilsta.',
        yoga
          ? 'Make time for movement, breath and yourself.'
          : 'Try ceramics, spend time together or join regular classes.',
      ),
      choices: {
        workshops: {
          title: text(yoga ? 'Atrask jogą' : 'Atrask keramiką', yoga ? 'Try yoga' : 'Try ceramics'),
          detail: text(
            yoga ? 'Vieno apsilankymo praktikos' : 'Vieno apsilankymo dirbtuvės',
            yoga ? 'Single-visit classes' : 'Single-visit workshops',
          ),
        },
        recurring: {
          title: text(
            yoga ? 'Praktikuok reguliariai' : 'Kurk reguliariai',
            yoga ? 'Practise regularly' : 'Create regularly',
          ),
          detail: text('Nuolatiniai užsiėmimai', 'Ongoing classes'),
        },
        private: {
          title: text('Dalinkis potyriais', 'Bring your group'),
          detail: text('Privatūs užsiėmimai', yoga ? 'Private classes' : 'Private workshops'),
        },
      },
    },
    presentation: {
      serviceMessages: {
        recurringContactHeading: {
          title: text('Neradote', 'Looking for'),
          accent: text('tinkamos grupės?', 'a different group?'),
        },
        recurringContactText: text(
          yoga
            ? 'Parašykite, kuriomis dienomis ir kokiu laiku norėtumėte praktikuoti.'
            : 'Parašykite, kuriomis dienomis ir kokiu laiku norėtumėte lipdyti.',
          'Tell us which days and times would suit you.',
        ),
        privateEnquiryHeading: {
          title: text('Pasiteirauti', 'Enquire about'),
          accent: text('dėl datos', 'a date'),
        },
        privateEnquiryText: text(
          'Parašykite norimą datą ir planuojamą dalyvių skaičių.',
          'Tell us your preferred date and the number of people in your group.',
        ),
        privateQuote: text(
          'Dėl Jūsų grupės dydžio, užsiėmimo trukmės ir kainos kviečiame susisiekti su studija.',
          'Please contact the studio to discuss your group size, workshop duration and price.',
        ),
      },
      headings: {
        upcoming: { title: text('Artėjantys', 'Upcoming'), accent: text('užsiėmimai', 'classes') },
        services: {
          title: text('Kurie užsiėmimai', yoga ? 'Which yoga classes' : 'Which ceramics classes'),
          accent: text('jums tinka?', 'suit you?'),
        },
        faq: { title: text('Prieš', 'Before'), accent: text('susitinkant', 'we meet') },
        contact: { title: text('Vieta ir', 'Location &'), accent: text('kontaktai', 'Contact') },
      },
      comparison: {
        workshops: {
          title: text(
            yoga ? 'Vienkartinės praktikos' : 'Vienkartinės dirbtuvės',
            yoga ? 'Single classes' : 'One-time workshops',
          ),
          audience: text(
            yoga ? 'Norintiems išbandyti jogą.' : 'Norintiems išbandyti keramiką.',
            yoga ? 'For those who want to try yoga.' : 'For those who want to try ceramics.',
          ),
          format: text(
            yoga ? 'Vienkartinė praktika.' : 'Vienkartinės teminės dirbtuvės.',
            yoga ? 'A single practice.' : 'A one-time themed workshop.',
          ),
          duration: text('', ''),
          price: text('', ''),
          groupSize: text('', ''),
          included: text('', ''),
          participation: text(
            yoga ? 'Rinkitės praktiką ir datą.' : 'Rinkitės dirbtuves ir datą.',
            yoga ? 'Choose a class and date.' : 'Choose a workshop and date.',
          ),
        },
        recurring: {
          title: text('Nuolatiniai užsiėmimai', 'Regular classes'),
          audience: text(
            'Norintiems mokytis ir tobulėti reguliariai.',
            'For those who want to learn and improve regularly.',
          ),
          format: text('Reguliarūs užsiėmimai grupėje.', 'Regular classes in a group.'),
          duration: text('', ''),
          price: text('', ''),
          groupSize: text('', ''),
          included: text('', ''),
          participation: text('Rinkitės programą ir grupę.', 'Choose a programme and group.'),
        },
        private: {
          title: text('Privatūs užsiėmimai', yoga ? 'Private classes' : 'Private workshops'),
          audience: text('Draugams, šeimai ar kolegoms.', 'For friends, family or colleagues.'),
          format: text(
            'Užsiėmimas Jūsų kompanijai.',
            yoga ? 'A practice for your own group.' : 'A workshop for your own group.',
          ),
          duration: text('', ''),
          price: text('', ''),
          groupSize: text('', ''),
          included: text('', ''),
          participation: text(
            'Pasiteiraukite dėl norimos datos.',
            'Enquire about your preferred date.',
          ),
        },
      },
      studio: {
        peopleTitle: text(
          yoga ? 'Praktikuokite kartu' : 'Lipdykite kartu',
          yoga ? 'Practise with us' : 'Create with us',
        ),
        peopleText: text(
          yoga
            ? 'Mokytojai, su kuriais susitiksite studijoje.'
            : 'Mokytojai, su kuriais susitiksite prie lipdymo stalo.',
          yoga
            ? 'The teachers you can meet at the studio.'
            : 'The teachers you can meet at the ceramics table.',
        ),
        peopleLink: text('Pasirinkti mokytoją ir grupės laiką', 'Find a teacher and a class time'),
        galleryTitle: text(
          yoga ? 'Studijos akimirkos' : 'Molio akimirkos',
          yoga ? 'Studio moments' : 'Moments in clay',
        ),
        galleryText: text(
          yoga
            ? 'Akimirkos iš mūsų studijos.'
            : 'Rankos, molis ir daiktai, kuriuose pasilieka prisilietimas. Akimirkos iš mūsų studijos.',
          yoga
            ? 'Moments from our studio.'
            : 'Hands, clay and pieces that hold the trace of a touch. Moments from our studio.',
        ),
        photos: yoga
          ? []
          : [
              {
                file: 2,
                alt: text(
                  'Rankomis formuojamas keraminis puodelis',
                  'A ceramic cup being shaped by hand',
                ),
              },
              {
                file: 14,
                alt: text(
                  'Keraminė vaza su augalų kompozicija',
                  'A ceramic vase with a plant arrangement',
                ),
              },
              {
                file: 16,
                alt: text(
                  'Lipdymas prie bendro studijos stalo',
                  'Making ceramics at the shared studio table',
                ),
              },
            ],
      },
      contact: {
        description: text(
          'Soul Poetry studija įsikūrusi Vilniuje, Žvėryne, adresu Vytauto g. 48.',
          'We are located in Vilnius, in Zverynas, at Vytauto St. 48.',
        ),
        address: 'Vytauto g. 48, Žvėrynas, Vilnius',
        email: 'info@soulpoetry.lt',
        instagramUrl: 'https://www.instagram.com/soulpoetry.love',
        facebookUrl: 'https://www.facebook.com/potterylikepoetry',
        footerTagline: text(
          yoga
            ? 'Jogos namai – jaukiam laikui su savimi'
            : 'Keramikos ir jogos namai – jaukiam laikui su savimi',
          yoga
            ? 'A home for yoga – time to reconnect with yourself'
            : 'A home for ceramics and yoga – time to reconnect with yourself',
        ),
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Fills absent fields only. Explicit empty strings, arrays and malformed values remain for validation. */
function fillMissing(value: unknown, fallback: unknown): unknown {
  if (value === undefined) return structuredClone(fallback);
  if (!isRecord(value) || !isRecord(fallback)) return value;
  const result = { ...value };
  for (const key of Object.keys(fallback)) {
    result[key] = fillMissing(value[key], fallback[key]);
  }
  return result;
}

function splitLegacyHeading(value: unknown): unknown {
  if (!isRecord(value) || value.titleAccent !== undefined || !isRecord(value.title)) return value;
  const title = { ...value.title };
  const accent: Record<string, unknown> = {};
  for (const locale of ['lt', 'en']) {
    if (typeof title[locale] !== 'string') continue;
    const original = title[locale] as string;
    const boundary = original.indexOf(' ');
    title[locale] = boundary < 0 ? original : original.slice(0, boundary);
    accent[locale] = boundary < 0 ? '' : original.slice(boundary + 1);
  }
  return { ...value, title, titleAccent: accent };
}

/** Pure, idempotent read migration: it never writes a database or replaces legacy content. */
export function upgradeLegacyContent(raw: unknown, site: string = 'ceramics'): unknown {
  if (!isRecord(raw)) return raw;
  const defaults = buildDefaultEditorialContent(site);
  const sections = isRecord(raw.sections)
    ? Object.fromEntries(
        Object.entries(raw.sections).map(([key, value]) => [key, splitLegacyHeading(value)]),
      )
    : raw.sections;
  return {
    ...raw,
    hero: fillMissing(raw.hero, defaults.hero),
    presentation: fillMissing(raw.presentation, defaults.presentation),
    sections,
    about: splitLegacyHeading(raw.about),
  };
}

/** Old admin clients omit new fields; keep their current values while validating submitted data. */
export function preserveEditorialFields(raw: unknown, current: unknown): unknown {
  if (!isRecord(raw) || !isRecord(current)) return raw;
  const result = { ...raw };
  if (isRecord(raw.hero) && isRecord(current.hero)) {
    const newHeroFields = Object.fromEntries(
      Object.entries(current.hero).filter(([key]) => !['brandName', 'lines'].includes(key)),
    );
    result.hero = fillMissing(raw.hero, newHeroFields);
  }
  result.presentation = fillMissing(raw.presentation, current.presentation);
  const preserveHeading = (incoming: unknown, previous: unknown) => {
    if (!isRecord(incoming) || !isRecord(previous) || incoming.titleAccent !== undefined)
      return incoming;
    const title = isRecord(incoming.title) ? { ...incoming.title } : incoming.title;
    if (isRecord(title) && isRecord(previous.title) && isRecord(previous.titleAccent)) {
      for (const locale of ['lt', 'en']) {
        const combined = joinHeading(
          String(previous.title[locale] ?? ''),
          String(previous.titleAccent[locale] ?? ''),
        );
        if (title[locale] === combined) title[locale] = previous.title[locale];
      }
    }
    return { ...incoming, title, titleAccent: previous.titleAccent };
  };
  if (isRecord(raw.sections) && isRecord(current.sections)) {
    const currentSections = current.sections;
    result.sections = Object.fromEntries(
      Object.entries(raw.sections).map(([key, section]) => [
        key,
        preserveHeading(section, currentSections[key]),
      ]),
    );
  }
  result.about = preserveHeading(raw.about, current.about);
  return result;
}

export function joinHeading(title: string, accent: string): string {
  return title && accent ? `${title} ${accent}` : title || accent;
}

export function localizeEditorial<T>(value: T, locale: 'lt' | 'en'): LocalizedEditorial<T> {
  if (Array.isArray(value))
    return value.map((item) => localizeEditorial(item, locale)) as LocalizedEditorial<T>;
  if (isRecord(value)) {
    if (typeof value.lt === 'string' && typeof value.en === 'string')
      return value[locale] as LocalizedEditorial<T>;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, localizeEditorial(item, locale)]),
    ) as LocalizedEditorial<T>;
  }
  return value as LocalizedEditorial<T>;
}
