export interface Workshop {
  id: string;
  titleLt: string;
  titleEn: string;
  startISO: string;
  durationMin: number;
  eventType?: 'oneTime' | 'ongoing' | 'private';
  sessionsCount?: number;
  pricePerSession?: number;
  subscriptionPriceEur?: number;
  priceEur?: number;
  description?: string;
  descriptionStructured?: {
    intro?: string;
    paragraph1?: string;
    paragraph2?: string;
    paragraph3?: string;
    listTitle?: string;
    listItems?: string[];
    closing1?: string;
    closing2?: string;
    closing3?: string;
  };
  spotsTotal: number;
  spotsLeft: number;
  isWeekend: boolean;
  coverImageUrl?: string;
  fbEventUrl?: string | null;
  placeName?: string | null;
}

export const workshops: Workshop[] = [
  {
    id: '1',
    titleLt: 'Keramikos pradžia',
    titleEn: 'Ceramics Basics',
    startISO: '2026-02-15T10:00:00',
    durationMin: 180,
    sessionsCount: 1,
    pricePerSession: 45,
    spotsTotal: 8,
    spotsLeft: 3,
    isWeekend: false,
  },
  {
    id: '2',
    titleLt: 'Savaitgalio keramika',
    titleEn: 'Weekend Ceramics',
    startISO: '2026-02-16T14:00:00',
    durationMin: 240,
    sessionsCount: 1,
    pricePerSession: 55,
    spotsTotal: 6,
    spotsLeft: 0,
    isWeekend: true,
  },
  {
    id: '3',
    titleLt: 'Nuolatinės klasės',
    titleEn: 'Ongoing Classes',
    startISO: '2026-02-18T18:00:00',
    durationMin: 90,
    sessionsCount: 4,
    pricePerSession: 40,
    subscriptionPriceEur: 140,
    spotsTotal: 10,
    spotsLeft: 7,
    isWeekend: false,
  },
  {
    id: '4',
    titleLt: 'Ratuko keramika',
    titleEn: 'Wheel Throwing',
    startISO: '2026-02-22T10:00:00',
    durationMin: 180,
    sessionsCount: 1,
    pricePerSession: 50,
    spotsTotal: 6,
    spotsLeft: 2,
    isWeekend: false,
  },
  {
    id: '5',
    titleLt: 'Savaitgalio intensyvus kursas',
    titleEn: 'Weekend Intensive',
    startISO: '2026-02-23T10:00:00',
    durationMin: 300,
    sessionsCount: 1,
    pricePerSession: 75,
    spotsTotal: 8,
    spotsLeft: 5,
    isWeekend: true,
  },
  {
    id: '6',
    titleLt: 'Vakarinis užsiėmimas',
    titleEn: 'Evening Session',
    startISO: '2026-02-25T18:00:00',
    durationMin: 120,
    sessionsCount: 1,
    pricePerSession: 35,
    spotsTotal: 8,
    spotsLeft: 4,
    isWeekend: false,
  },
];
