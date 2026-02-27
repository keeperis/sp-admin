import { z } from 'zod';
import { faq } from '@/src/data/faq';
import { en } from '@/src/i18n/en';
import { lt } from '@/src/i18n/lt';

const localizedTextSchema = z.object({
  lt: z.string(),
  en: z.string(),
});

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

export const siteContentSchema = z.object({
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

export type SiteContent = z.infer<typeof siteContentSchema>;
export type ContentLocale = 'lt' | 'en';
export type FAQTag = z.infer<typeof faqTagSchema>;

export type LocalizedSiteContent = {
  hero: {
    brandName: string;
    lines: [string, string, string][];
  };
  sections: {
    oneTime: { title: string; paragraphs: string[] };
    ongoing: { title: string; paragraphs: string[] };
    private: { title: string; paragraphs: string[] };
  };
  faq: Array<{ id: string; tag: FAQTag; question: string; answer: string }>;
  about: {
    title: string;
    text: string;
  };
};

function padParagraphs(paragraphs: Array<{ lt: string; en: string }>) {
  const filled = paragraphs.slice(0, 5);
  while (filled.length < 5) {
    filled.push({ lt: '', en: '' });
  }
  return filled;
}

export function buildDefaultSiteContent(): SiteContent {
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

export function localizeSiteContent(
  content: SiteContent,
  locale: ContentLocale,
): LocalizedSiteContent {
  return {
    hero: {
      brandName: content.hero.brandName[locale],
      lines: content.hero.lines.map((line) => line[locale]),
    },
    sections: {
      oneTime: {
        title: content.sections.oneTime.title[locale],
        paragraphs: content.sections.oneTime.paragraphs.map((p) => p[locale]).filter(Boolean),
      },
      ongoing: {
        title: content.sections.ongoing.title[locale],
        paragraphs: content.sections.ongoing.paragraphs.map((p) => p[locale]).filter(Boolean),
      },
      private: {
        title: content.sections.private.title[locale],
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
      title: content.about.title[locale],
      text: content.about.text[locale],
    },
  };
}
