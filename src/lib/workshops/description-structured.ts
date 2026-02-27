import { z } from 'zod';

export const workshopDescriptionStructuredSchema = z.object({
  intro: z.string().optional(),
  paragraph1: z.string().optional(),
  paragraph2: z.string().optional(),
  paragraph3: z.string().optional(),
  listTitle: z.string().optional(),
  listItems: z.array(z.string()).optional(),
  closing1: z.string().optional(),
  closing2: z.string().optional(),
  closing3: z.string().optional(),
});

export type WorkshopDescriptionStructured = z.infer<typeof workshopDescriptionStructuredSchema>;

export function emptyWorkshopDescriptionStructured(): WorkshopDescriptionStructured {
  return {
    intro: '',
    paragraph1: '',
    paragraph2: '',
    paragraph3: '',
    listTitle: '',
    listItems: [],
    closing1: '',
    closing2: '',
    closing3: '',
  };
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeWorkshopDescriptionStructured(
  input: unknown,
): WorkshopDescriptionStructured | undefined {
  if (!input || typeof input !== 'object') return undefined;

  const source = input as Record<string, unknown>;
  const normalized: WorkshopDescriptionStructured = {
    intro: cleanText(source.intro),
    paragraph1: cleanText(source.paragraph1),
    paragraph2: cleanText(source.paragraph2),
    paragraph3: cleanText(source.paragraph3),
    listTitle: cleanText(source.listTitle),
    listItems: Array.isArray(source.listItems)
      ? source.listItems.map((item) => cleanText(item)).filter(Boolean)
      : [],
    closing1: cleanText(source.closing1),
    closing2: cleanText(source.closing2),
    closing3: cleanText(source.closing3),
  };

  const hasAnyValue = Object.values(normalized).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );

  if (!hasAnyValue) return undefined;
  return normalized;
}
