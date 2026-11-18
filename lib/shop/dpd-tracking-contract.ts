export const dpdTrackingLabels = {
  unknown: 'Būsena dar negauta',
  in_transit: 'Siunta kelyje',
  out_for_delivery: 'Vežama gavėjui',
  at_pickup_point: 'Laukia atsiėmimo paštomate',
  delivered: 'Gavėjas gavo siuntą',
  returning: 'Grąžinama siuntėjui',
  returned: 'Grąžinta siuntėjui',
  attention: 'Reikia patikrinti siuntą',
  unavailable: 'Sekimas laikinai nepasiekiamas',
} as const;
export type DpdTrackingStatus = keyof typeof dpdTrackingLabels;
export type DpdOrderTracking = {
  status: DpdTrackingStatus;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  errorMessage: string | null;
  parcels: {
    parcelNumber: string;
    status: DpdTrackingStatus;
    statusCode: string | null;
    serviceCode: string | null;
    previousStatusCode: string | null;
    eventAt: string | null;
    errorMessage: string | null;
  }[];
};
