export type PrivateWorkshopDescriptionText = { text: string; bold?: boolean };

export type PrivateWorkshopDescriptionDocument = {
  version: 1;
  blocks: Array<
    | { type: 'paragraph' | 'heading'; content: PrivateWorkshopDescriptionText[] }
    | { type: 'bulletList'; items: PrivateWorkshopDescriptionText[][] }
  >;
};

export type PrivateWorkshopSettings = {
  enabled: boolean;
  titleLt: string;
  titleEn: string;
  descriptionLt: string;
  descriptionEn: string;
  descriptionDocumentLt?: PrivateWorkshopDescriptionDocument | null;
  descriptionDocumentEn?: PrivateWorkshopDescriptionDocument | null;
  coverImageUrl: string;
  cancellationTermsLt: string;
  cancellationTermsEn: string;
  reschedulingTermsLt: string;
  reschedulingTermsEn: string;
  memoLt: string;
  memoEn: string;
  placeName: string;
  holdHours: number | null;
  startStepMin: 15 | 30;
  wholeWindow: boolean;
  bufferMin: number;
  addonsDueNow: boolean;
};

export type PrivateWorkshopType = {
  id: string;
  active: boolean;
  titleLt: string;
  titleEn: string;
  thumbnailUrl: string;
  durationMin: number;
  minParticipants: number;
  maxParticipants: number;
  pricePerPersonEur: number;
};

export type PrivateWorkshopAddon = {
  id: string;
  active: boolean;
  titleLt: string;
  titleEn: string;
  priceEur: number;
  durationMin: number;
};

export type PrivateWorkshopWindow = {
  id: string;
  active: boolean;
  dates: string[];
  startTime: string;
  endTime: string;
  typeIds: string[];
  addonIds: string[];
};

export type PrivateWorkshopConfig = {
  version: number;
  settings: PrivateWorkshopSettings;
  types: PrivateWorkshopType[];
  addons: PrivateWorkshopAddon[];
  windows: PrivateWorkshopWindow[];
};

export type PrivateWorkshopSelection = {
  windowId: string;
  date: string;
  startTime: string;
  typeId: string;
  participantsCount: number;
  addonIds: string[];
};

export type PrivateWorkshopQuote = {
  selection: PrivateWorkshopSelection;
  workshopType: PrivateWorkshopType;
  addons: PrivateWorkshopAddon[];
  startISO: string;
  endISO: string;
  durationMin: number;
  minimumParticipants: number;
  pricePerPersonEur: number;
  addonsTotalEur: number;
  depositEur: number;
  estimatedTotalEur: number;
  remainingEstimateEur: number;
  termsVersion: number;
};

export type PrivateWorkshopTimeOption = {
  windowId: string;
  startTime: string;
  typeIds: string[];
  addonIds: string[];
};

export type PrivateWorkshopAvailability = {
  dates: string[];
  date: string | null;
  times: PrivateWorkshopTimeOption[];
};

export type PrivateWorkshopCustomer = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  buyerType: 'consumer' | 'business';
  billingDetails?: {
    companyName: string;
    companyCode: string;
    vatCode?: string;
    companyAddress: string;
  };
  notes?: string;
};

export type PrivateWorkshopBookingStatus =
  | 'pending_transfer'
  | 'confirmed'
  | 'cancelled'
  | 'expired'
  | 'completed';

export type PrivateWorkshopBankDetails = {
  beneficiaryName: string;
  beneficiaryCode: string;
  iban: string;
  bankName: string;
  paymentPurpose: string;
  amount: number;
  currency: 'EUR';
};

export type PrivateWorkshopBooking = PrivateWorkshopCustomer & {
  id: string;
  reference: string;
  site: 'ceramics';
  locale: 'lt' | 'en';
  status: PrivateWorkshopBookingStatus;
  quote: PrivateWorkshopQuote;
  placeName: string;
  cancellationTerms: string;
  reschedulingTerms: string;
  legalAcceptance?: {
    termsVersion: string;
    privacyNoticeVersion: string;
    termsDocumentHash: string;
    termsAcceptedAt: string;
    operatorSnapshot: Record<string, unknown>;
    termsSnapshot: {
      title: string;
      version: string;
      effectiveDate: string;
      sections: Array<{ title: string; paragraphs: string[] }>;
    };
    privacyNoticeSnapshot: Record<string, unknown>;
  };
  createdAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  bankTransfer: PrivateWorkshopBankDetails;
  actualParticipants: number | null;
  finalTotalEur: number | null;
  balanceDueEur: number | null;
  adminNotes: string;
  emails?: {
    requested?: { status: string; lastError?: string | null };
    confirmed?: { status: string; lastError?: string | null };
  };
};

export type PrivateWorkshopCreateRequest = PrivateWorkshopSelection &
  PrivateWorkshopCustomer & {
    locale: 'lt' | 'en';
    idempotencyKey: string;
    acceptedTerms: true;
    termsVersion: number;
    expectedDepositEur: number;
    expectedTotalEur: number;
  };
