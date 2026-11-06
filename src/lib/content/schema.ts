import { z } from 'zod';
import type { SiteKey } from '@/lib/site';
import { faq } from '@/src/data/faq';
import { en } from '@/src/i18n/en';
import { lt } from '@/src/i18n/lt';
import {
  type EditorialHero,
  type EditorialPresentation,
  heroEditorialSchema,
  joinHeading,
  type LocalizedEditorial,
  localizedTextSchema,
  localizeEditorial,
  presentationSchema,
  upgradeLegacyContent,
} from './editorial';

const heroLineSchema = z.object({
  lt: z.tuple([z.string(), z.string(), z.string()]),
  en: z.tuple([z.string(), z.string(), z.string()]),
});

export const faqTagSchema = z.enum(['general', 'ongoing', 'private', 'workshop']);

const sectionSchema = z.object({
  title: localizedTextSchema,
  paragraphs: z.array(localizedTextSchema).max(5),
});

const faqItemSchema = z.object({
  id: z.string().min(1),
  tag: faqTagSchema,
  question: localizedTextSchema,
  answer: localizedTextSchema,
});

const legacySiteContentSchema = z.object({
  hero: z.object({
    brandName: localizedTextSchema,
    lines: z.array(heroLineSchema).min(1).max(10),
  }),
  sections: z.object({
    oneTime: sectionSchema,
    ongoing: sectionSchema,
    private: sectionSchema,
  }),
  faq: z.array(faqItemSchema),
  about: z.object({
    title: localizedTextSchema,
    text: localizedTextSchema,
  }),
});

export const siteContentSchema = legacySiteContentSchema.extend({
  hero: legacySiteContentSchema.shape.hero.merge(heroEditorialSchema),
  sections: z.object({
    oneTime: sectionSchema.extend({ titleAccent: localizedTextSchema }),
    ongoing: sectionSchema.extend({ titleAccent: localizedTextSchema }),
    private: sectionSchema.extend({ titleAccent: localizedTextSchema }),
  }),
  about: legacySiteContentSchema.shape.about.extend({ titleAccent: localizedTextSchema }),
  presentation: presentationSchema,
});

type LegacySiteContent = z.infer<typeof legacySiteContentSchema>;

export type SiteContent = z.infer<typeof siteContentSchema>;
export type ContentLocale = 'lt' | 'en';
export type FAQTag = z.infer<typeof faqTagSchema>;

export type LocalizedSiteContent = {
  hero: {
    brandName: string;
    lines: [string, string, string][];
  } & LocalizedEditorial<EditorialHero>;
  sections: {
    oneTime: { title: string; heading: { title: string; accent: string }; paragraphs: string[] };
    ongoing: { title: string; heading: { title: string; accent: string }; paragraphs: string[] };
    private: { title: string; heading: { title: string; accent: string }; paragraphs: string[] };
  };
  faq: Array<{ id: string; tag: FAQTag; question: string; answer: string }>;
  about: {
    title: string;
    heading: { title: string; accent: string };
    text: string;
  };
  presentation: LocalizedEditorial<EditorialPresentation>;
};

function padParagraphs(paragraphs: Array<{ lt: string; en: string }>) {
  const filled = paragraphs.slice(0, 5);
  while (filled.length < 5) {
    filled.push({ lt: '', en: '' });
  }
  return filled;
}

function buildYogaDefaultSiteContent(): LegacySiteContent {
  return {
    hero: {
      brandName: { lt: 'SOUL POETRY. YOGA', en: 'SOUL POETRY. YOGA' },
      lines: [
        { lt: ['Judesys', 'kuris', 'išlaisvina.'], en: ['Movement', 'that', 'sets you free.'] },
        { lt: ['Kvėpavimas', 'kuris', 'sugrąžina.'], en: ['Breath', 'that', 'brings you back.'] },
        { lt: ['Ramybė', 'kuri', 'pasilieka.'], en: ['Calm', 'that', 'stays with you.'] },
        { lt: ['Erdvė', 'kuri', 'įkvepia.'], en: ['Space', 'that', 'inspires.'] },
        { lt: ['Praktika', 'kuri', 'augina.'], en: ['Practice', 'that', 'helps you grow.'] },
      ],
    },
    sections: {
      oneTime: {
        title: { lt: 'Vienkartinės jogos praktikos', en: 'Single yoga classes' },
        paragraphs: padParagraphs([
          {
            lt: 'Norite išbandyti jogą, susipažinti su mokytoju ar tiesiog skirti laiko sau?',
            en: 'Want to try yoga, meet the teacher, or simply make time for yourself?',
          },
          {
            lt: 'Prisijunkite prie vienkartinių praktikų ir teminių jogos užsiėmimų.',
            en: 'Join a single class or one of our themed yoga practices.',
          },
          {
            lt: 'Užsiėmimai tinka ir pradedantiesiems – mokytojas pasiūlys saugias pozų variacijas pagal jūsų patirtį.',
            en: 'Classes also suit beginners: the teacher will offer safe pose variations for your experience level.',
          },
          {
            lt: 'Praktikos metu deriname sąmoningą judesį, kvėpavimą ir atsipalaidavimą.',
            en: 'Each practice combines mindful movement, breathing, and relaxation.',
          },
          {
            lt: 'Patogiai apsirenkite, o kilimėliu ir kitomis priemonėmis galėsite naudotis studijoje.',
            en: 'Wear comfortable clothing; mats and other props are available at the studio.',
          },
        ]),
      },
      ongoing: {
        title: { lt: 'Nuolatiniai jogos užsiėmimai', en: 'Ongoing yoga classes' },
        paragraphs: padParagraphs([
          {
            lt: 'Nuolatinė grupė – tai reguliarus savaitinis laikas jūsų praktikai ir vieta pažįstamoje bendruomenėje.',
            en: 'An ongoing group gives you a regular weekly practice time and a place in a familiar community.',
          },
          {
            lt: 'Mokytojas padeda nuosekliai stiprinti kūną, lavinti judrumą ir gilinti kvėpavimo praktiką.',
            en: 'The teacher helps you build strength, improve mobility, and deepen your breathing practice over time.',
          },
          {
            lt: 'Nedidelėse grupėse kiekvienas dalyvis gauna dėmesio, o praktika pritaikoma skirtingai patirčiai.',
            en: 'Small groups allow individual attention and adaptations for different experience levels.',
          },
          {
            lt: 'Abonementas rezervuoja vietą pasirinktoje savaitinėje grupėje visam jo galiojimo laikotarpiui.',
            en: 'A pass reserves your place in the selected weekly group for its full validity period.',
          },
          {
            lt: 'Apie nedalyvavimą pranešus laiku, užsiėmimą galima perplanuoti į kitą laisvą grupę per abonemento laikotarpį.',
            en: 'When you cancel in time, you can reschedule into another available group within the pass period.',
          },
        ]),
      },
      private: {
        title: { lt: 'Privačios jogos praktikos', en: 'Private yoga sessions' },
        paragraphs: padParagraphs([
          {
            lt: 'Privačią jogos praktiką galime parengti jums, draugų grupei ar komandai.',
            en: 'We can create a private yoga practice for you, a group of friends, or a team.',
          },
          {
            lt: 'Praktikos tempą, intensyvumą ir temą pritaikome dalyvių patirčiai bei poreikiams.',
            en: 'We tailor the pace, intensity, and theme to the group’s experience and needs.',
          },
          {
            lt: 'Galime daugiau dėmesio skirti judesiui, kvėpavimui, atsipalaidavimui arba jų deriniui.',
            en: 'The session can focus on movement, breath, relaxation, or a combination of all three.',
          },
          {
            lt: 'Užsiėmimai vyksta jaukioje Soul Poetry studijoje Vilniuje.',
            en: 'Sessions take place at the welcoming Soul Poetry studio in Vilnius.',
          },
          {
            lt: 'Dėl tinkamiausio laiko, grupės dydžio ir kainos susisiekite su mumis.',
            en: 'Contact us to arrange the best time, group size, and price.',
          },
        ]),
      },
    },
    faq: [
      {
        id: 'yoga-experience',
        tag: 'general',
        question: { lt: 'Ar reikia jogos patirties?', en: 'Do I need yoga experience?' },
        answer: {
          lt: 'Ne. Pradedantiesiems mokytojas pasiūlys tinkamas pozų variacijas ir padės saugiai pradėti praktiką.',
          en: 'No. The teacher will offer suitable pose variations and help beginners start safely.',
        },
      },
      {
        id: 'yoga-bring',
        tag: 'general',
        question: { lt: 'Ką reikia atsinešti?', en: 'What should I bring?' },
        answer: {
          lt: 'Apsirenkite patogiai. Jogos kilimėliais ir kitomis praktikai reikalingomis priemonėmis galėsite naudotis studijoje.',
          en: 'Wear comfortable clothing. Yoga mats and other practice props are available at the studio.',
        },
      },
      {
        id: 'yoga-reschedule',
        tag: 'ongoing',
        question: { lt: 'Ar galima perplanuoti užsiėmimą?', en: 'Can I reschedule a class?' },
        answer: {
          lt: 'Taip. Apie nedalyvavimą pranešus ne vėliau kaip prieš 24 valandas, užsiėmimą galima perplanuoti į kitą laisvą grupę per abonemento galiojimo laikotarpį.',
          en: 'Yes. If you cancel at least 24 hours in advance, you can reschedule into another available group within your pass period.',
        },
      },
      {
        id: 'yoga-group-size',
        tag: 'ongoing',
        question: { lt: 'Kokio dydžio grupės?', en: 'How large are the groups?' },
        answer: {
          lt: 'Grupių dydis priklauso nuo salės ir praktikos, o tikslų laisvų vietų skaičių matysite prie pasirinkto užsiėmimo.',
          en: 'Group size depends on the room and practice; the current number of available spots is shown for each class.',
        },
      },
    ],
    about: {
      title: { lt: 'Soul Poetry', en: 'Soul Poetry' },
      text: {
        lt: 'Soul Poetry – jauki studija Vilniuje, kur judesys, kvėpavimas ir dėmesys sau padeda kurti tvirtesnį ryšį su kūnu bei vidine ramybe.',
        en: 'Soul Poetry is a welcoming studio in Vilnius where movement, breath, and mindful attention help build a stronger connection with your body and inner calm.',
      },
    },
  };
}

function buildLegacyDefaultSiteContent(site: SiteKey = 'ceramics'): LegacySiteContent {
  if (site === 'yoga') {
    return buildYogaDefaultSiteContent();
  }

  return {
    hero: {
      brandName: { lt: lt.hero.brandName, en: en.hero.brandName },
      lines: lt.hero.headlineVariations.slice(0, 10).map((line, index) => ({
        lt: [line[0], line[1], line[2]],
        en: en.hero.headlineVariations[index]
          ? [
              en.hero.headlineVariations[index][0],
              en.hero.headlineVariations[index][1],
              en.hero.headlineVariations[index][2],
            ]
          : [line[0], line[1], line[2]],
      })),
    },
    sections: {
      oneTime: {
        title: { lt: lt.oneTimeWorkshops.title, en: en.oneTimeWorkshops.title },
        paragraphs: padParagraphs([
          { lt: lt.oneTimeWorkshops.intro, en: en.oneTimeWorkshops.intro },
          { lt: lt.oneTimeWorkshops.offerIntro, en: en.oneTimeWorkshops.offerIntro },
          { lt: lt.oneTimeWorkshops.paragraph1, en: en.oneTimeWorkshops.paragraph1 },
          {
            lt: `${lt.oneTimeWorkshops.whatWeMakePrefix} ${lt.oneTimeWorkshops.whatWeMakeItems}`,
            en: `${en.oneTimeWorkshops.whatWeMakePrefix} ${en.oneTimeWorkshops.whatWeMakeItems}`,
          },
          { lt: lt.oneTimeWorkshops.paragraph2, en: en.oneTimeWorkshops.paragraph2 },
        ]),
      },
      ongoing: {
        title: { lt: lt.ongoingClasses.title, en: en.ongoingClasses.title },
        paragraphs: padParagraphs([
          { lt: lt.ongoingClasses.paragraph1, en: en.ongoingClasses.paragraph1 },
          { lt: lt.ongoingClasses.paragraph2, en: en.ongoingClasses.paragraph2 },
          { lt: lt.ongoingClasses.paragraph3, en: en.ongoingClasses.paragraph3 },
          {
            lt: lt.ongoingClasses.details[0] || '',
            en: en.ongoingClasses.details[0] || '',
          },
          {
            lt: lt.ongoingClasses.details[1] || '',
            en: en.ongoingClasses.details[1] || '',
          },
        ]),
      },
      private: {
        title: { lt: lt.privateEvents.title, en: en.privateEvents.title },
        paragraphs: padParagraphs([
          { lt: lt.privateEvents.paragraph1, en: en.privateEvents.paragraph1 },
          { lt: lt.privateEvents.paragraph2, en: en.privateEvents.paragraph2 },
          { lt: lt.privateEvents.paragraph3, en: en.privateEvents.paragraph3 },
          { lt: lt.privateEvents.paragraph4, en: en.privateEvents.paragraph4 },
          {
            lt: lt.privateEvents.details.join(' '),
            en: en.privateEvents.details.join(' '),
          },
        ]),
      },
    },
    faq: faq.map((item, index) => ({
      id: item.id || `faq-${index + 1}`,
      tag: 'general',
      question: { lt: item.qLt, en: item.qEn },
      answer: { lt: item.aLt, en: item.aEn },
    })),
    about: {
      title: { lt: lt.about.titleLine2, en: en.about.titleLine2 },
      text: { lt: lt.about.text, en: en.about.text },
    },
  };
}

export function buildDefaultSiteContent(site: SiteKey = 'ceramics'): SiteContent {
  return siteContentSchema.parse(upgradeLegacyContent(buildLegacyDefaultSiteContent(site), site));
}

export function localizeSiteContent(
  content: SiteContent,
  locale: ContentLocale,
): LocalizedSiteContent {
  return {
    hero: {
      ...localizeEditorial(heroEditorialSchema.parse(content.hero), locale),
      brandName: content.hero.brandName[locale],
      lines: content.hero.lines.map((line) => line[locale]),
    },
    sections: {
      oneTime: {
        title: joinHeading(
          content.sections.oneTime.title[locale],
          content.sections.oneTime.titleAccent[locale],
        ),
        heading: {
          title: content.sections.oneTime.title[locale],
          accent: content.sections.oneTime.titleAccent[locale],
        },
        paragraphs: content.sections.oneTime.paragraphs.map((p) => p[locale]).filter(Boolean),
      },
      ongoing: {
        title: joinHeading(
          content.sections.ongoing.title[locale],
          content.sections.ongoing.titleAccent[locale],
        ),
        heading: {
          title: content.sections.ongoing.title[locale],
          accent: content.sections.ongoing.titleAccent[locale],
        },
        paragraphs: content.sections.ongoing.paragraphs.map((p) => p[locale]).filter(Boolean),
      },
      private: {
        title: joinHeading(
          content.sections.private.title[locale],
          content.sections.private.titleAccent[locale],
        ),
        heading: {
          title: content.sections.private.title[locale],
          accent: content.sections.private.titleAccent[locale],
        },
        paragraphs: content.sections.private.paragraphs.map((p) => p[locale]).filter(Boolean),
      },
    },
    faq: content.faq.map((item) => ({
      id: item.id,
      tag: item.tag,
      question: item.question[locale],
      answer: item.answer[locale],
    })),
    about: {
      title: joinHeading(content.about.title[locale], content.about.titleAccent[locale]),
      heading: { title: content.about.title[locale], accent: content.about.titleAccent[locale] },
      text: content.about.text[locale],
    },
    presentation: localizeEditorial(content.presentation, locale),
  };
}
