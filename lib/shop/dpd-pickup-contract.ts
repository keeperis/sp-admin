export type DpdPickupSender = {
  contact: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  additionalInfo: string;
};

export type DpdPickupCandidate = {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  parcelNumbers: string[];
  parcelCount: number;
  weightKg: number;
};

export type DpdPickup = {
  id: string;
  requestId: string;
  state: 'creating' | 'confirmed' | 'uncertain' | 'rejected' | 'external';
  source: 'api' | 'external';
  environment: 'production' | 'sandbox';
  orderIds: string[];
  orderNumbers: string[];
  parcelCount: number;
  weightKg: number;
  pickupTime: string;
  senderWorkUntil: string;
  sender: DpdPickupSender;
  comment: string;
  createdAt: string;
  updatedAt: string;
  reference: string;
  errorMessage: string | null;
  canResolve: boolean;
  claimActive: boolean;
  closedAt: string | null;
  closedBy: string | null;
  handedOverOrderIds?: string[];
  handedOverAt?: string | null;
};

export type DpdPickupsData = {
  settings: {
    environment: 'production' | 'sandbox';
    credentialsConfigured: boolean;
    revision: number;
  };
  sender: DpdPickupSender | null;
  senderRevision: number;
  candidates: DpdPickupCandidate[];
  pickups: DpdPickup[];
};

export type DpdPickupInput = {
  requestId: string;
  settingsRevision: number;
  environment: 'production' | 'sandbox';
  orderIds: string[];
  sender: DpdPickupSender;
  pickupTime: string;
  senderWorkUntil: string;
  comment: string;
  confirmProduction: boolean;
  source: 'api' | 'external';
  externalReference: string;
};
