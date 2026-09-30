'use client';

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconCalendarEvent,
  IconEdit,
  IconMinus,
  IconPlus,
  IconRefresh,
  IconTicket,
  IconTrash,
} from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import type { ReservationBooking } from '@/lib/reservations/presentation';
import type { SiteKey } from '@/lib/site';
import {
  fetchWorkshopBookings,
  filterWorkshops,
  groupWorkshopBookings,
  vilniusDateTimeKey,
  type WorkshopPeriod,
  workshopPeriod,
} from '@/lib/workshop-reservations';
import { formatWorkshopDuration } from '@/src/lib/workshops/format-duration';
import { ReservationManager } from '../reservations/ReservationManager';
import { ReservationsList } from '../reservations/ReservationsList';

function htmlTitle(raw: string) {
  return raw
    .match(/<title[^>]*>(.*?)<\/title>/is)?.[1]
    ?.replace(/\s+/g, ' ')
    .trim();
}

function apiErrorMessage(response: Response, payload: Record<string, unknown>, fallback: string) {
  const details = payload.details && typeof payload.details === 'object' ? payload.details : null;
  const code = typeof payload.code === 'string' ? payload.code : '';
  const detailParts: string[] = [];

  if (code) detailParts.push(`code=${code}`);
  if (details && 'upstreamStatus' in details) {
    detailParts.push(`upstream=${String(details.upstreamStatus)}`);
  }
  if (details && 'apiBaseOrigin' in details) {
    detailParts.push(`apiBase=${String(details.apiBaseOrigin)}`);
  }

  const detailText = detailParts.length ? ` (${detailParts.join(', ')})` : '';
  return `${typeof payload.error === 'string' ? payload.error : fallback} [HTTP ${
    response.status
  }]${detailText}`;
}

function nonJsonErrorMessage(response: Response, raw: string, fallback: string) {
  const title = htmlTitle(raw);
  const looksLikeHtml = /<!doctype html|<html[\s>]/i.test(raw);
  if (looksLikeHtml) {
    return `${fallback}: serveris grąžino HTML${
      title ? ` (${title})` : ''
    } vietoje JSON [HTTP ${response.status}]. Patikrink, ar production turi naują sp-admin deploy ir ar API_BASE_URL rodo į sp-api.`;
  }
  return raw || `${fallback}: serveris grąžino HTTP ${response.status} be JSON atsakymo.`;
}

const fetcher = async <T = Record<string, unknown>>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: 'no-store' });
  const raw = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(nonJsonErrorMessage(res, raw, 'Nepavyko gauti duomenų'));
  }
  if (!res.ok) {
    throw new Error(apiErrorMessage(res, data, 'Nepavyko gauti duomenų'));
  }
  return data as T;
};

const responsePayload = async (response: Response) => {
  const raw = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(nonJsonErrorMessage(response, raw, 'Nepavyko atlikti veiksmo'));
  }

  if (!response.ok) {
    throw new Error(apiErrorMessage(response, payload, 'Nepavyko atlikti veiksmo'));
  }

  return payload;
};

const adminApiUrl = (
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>,
) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== null && value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${normalizedPath}?${qs}` : normalizedPath;
};

const mutationHeaders = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
};

const formatStartISO = (value: string) => value.replace('T', ' ');

const formatFbEventDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('lt-LT', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
};

type FbEventSummary = {
  fbEventId: string;
  fbEventUrl: string;
  name: string;
  startTime: string;
  endTime: string;
  placeName: string | null;
  coverImageUrl: string | null;
};

type StructuredDescription = {
  intro: string;
  paragraph1: string;
  paragraph2: string;
  paragraph3: string;
  listTitle: string;
  listItems: string[];
  closing1: string;
  closing2: string;
  closing3: string;
};

const emptyStructuredDescription = (): StructuredDescription => ({
  intro: '',
  paragraph1: '',
  paragraph2: '',
  paragraph3: '',
  listTitle: '',
  listItems: [],
  closing1: '',
  closing2: '',
  closing3: '',
});

function normalizeStructuredDescription(value: unknown): StructuredDescription {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const asString = (field: string) => (typeof input[field] === 'string' ? input[field] : '');
  const listItems = Array.isArray(input.listItems)
    ? input.listItems.map((item) => (typeof item === 'string' ? item : String(item ?? '')))
    : [];

  return {
    intro: asString('intro'),
    paragraph1: asString('paragraph1'),
    paragraph2: asString('paragraph2'),
    paragraph3: asString('paragraph3'),
    listTitle: asString('listTitle'),
    listItems,
    closing1: asString('closing1'),
    closing2: asString('closing2'),
    closing3: asString('closing3'),
  };
}

function normalizeWorkshop(workshop: any) {
  return {
    ...workshop,
    id: typeof workshop?.id === 'string' ? workshop.id : String(workshop?.id ?? ''),
    titleLt: typeof workshop?.titleLt === 'string' ? workshop.titleLt : '',
    titleEn: typeof workshop?.titleEn === 'string' ? workshop.titleEn : '',
    startISO: typeof workshop?.startISO === 'string' ? workshop.startISO : '',
    durationMin: Number(workshop?.durationMin ?? 0) || 0,
    eventType:
      workshop?.eventType === 'ongoing' || workshop?.eventType === 'private'
        ? workshop.eventType
        : 'oneTime',
    sessionsCount: Number(workshop?.sessionsCount ?? 1) || 1,
    pricePerSession: Number(workshop?.pricePerSession ?? workshop?.priceEur ?? 0) || 0,
    priceEur: Number(workshop?.priceEur ?? workshop?.pricePerSession ?? 0) || 0,
    subscriptionPriceEur:
      workshop?.subscriptionPriceEur == null ? null : Number(workshop.subscriptionPriceEur) || 0,
    spotsTotal: Number(workshop?.spotsTotal ?? 0) || 0,
    spotsLeft: Number(workshop?.spotsLeft ?? 0) || 0,
    isWeekend: Boolean(workshop?.isWeekend),
    description: typeof workshop?.description === 'string' ? workshop.description : '',
    descriptionStructured: normalizeStructuredDescription(workshop?.descriptionStructured),
  };
}

function workshopTypeLabel(eventType: 'oneTime' | 'ongoing' | 'private') {
  if (eventType === 'oneTime') return 'Vienkart.';
  if (eventType === 'ongoing') return 'Nuolatiniai';
  return 'Privatūs';
}

function workshopPriceLabel(workshop: {
  sessionsCount?: number;
  pricePerSession?: number;
  priceEur?: number;
  subscriptionPriceEur?: number | null;
}) {
  const sessionsCount = workshop.sessionsCount ?? 1;
  const pricePerSession = workshop.pricePerSession ?? workshop.priceEur ?? 0;
  if (sessionsCount === 1) return `${pricePerSession}€`;
  return `${sessionsCount}×${pricePerSession}€${
    workshop.subscriptionPriceEur != null ? ` / abon. ${workshop.subscriptionPriceEur}€` : ''
  }`;
}

const PROJECT_OPTIONS: Array<{ value: SiteKey; label: string }> = [
  { value: 'ceramics', label: 'Keramika' },
  { value: 'yoga', label: 'Joga' },
];

type BookingStatus = 'draft' | 'pending_payment' | 'confirmed' | 'cancelled' | 'expired';

type BookingStats = {
  all: number;
  draft: number;
  pending_payment: number;
  confirmed: number;
  cancelled: number;
  expired: number;
  participants: number;
  draftParticipants: number;
  pendingParticipants: number;
  confirmedParticipants: number;
  cancelledParticipants: number;
  expiredParticipants: number;
};

const EMPTY_BOOKING_STATS: BookingStats = {
  all: 0,
  draft: 0,
  pending_payment: 0,
  confirmed: 0,
  cancelled: 0,
  expired: 0,
  participants: 0,
  draftParticipants: 0,
  pendingParticipants: 0,
  confirmedParticipants: 0,
  cancelledParticipants: 0,
  expiredParticipants: 0,
};

function createEmptyBookingStats(): BookingStats {
  return { ...EMPTY_BOOKING_STATS };
}

function isBookingStatus(value: unknown): value is BookingStatus {
  return (
    value === 'draft' ||
    value === 'pending_payment' ||
    value === 'confirmed' ||
    value === 'cancelled' ||
    value === 'expired'
  );
}

function WorkshopsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSite: SiteKey = searchParams.get('site') === 'yoga' ? 'yoga' : 'ceramics';
  const workshopId = searchParams.get('workshopId') || '';
  const status = searchParams.get('status') || '';
  const [nowKey, setNowKey] = useState(() => vilniusDateTimeKey(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setNowKey(vilniusDateTimeKey(new Date())), 30_000);
    return () => clearInterval(timer);
  }, []);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const updateFilters = (values: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/admin/workshops?${params}`, { scroll: false });
  };
  const [createOpened, setCreateOpened] = useState(false);
  const [createSource, setCreateSource] = useState<'select' | 'facebook' | 'manual'>('select');
  const adminWorkshopsApiUrl = adminApiUrl('/api/admin/workshops', { site: selectedSite });
  const bookingsApiUrl = adminApiUrl('/api/admin/bookings', { site: selectedSite });
  const fbEventsApiUrl = adminApiUrl('/api/admin/workshops/fetch-fb', { site: selectedSite });
  const {
    data,
    error: workshopsError,
    isLoading: workshopsLoading,
    mutate,
  } = useSWR<{ workshops: any[] }>(adminWorkshopsApiUrl, fetcher);
  const {
    data: bookingsData,
    error: bookingsError,
    isLoading: bookingsLoading,
    mutate: mutateBookings,
  } = useSWR<{ bookings: ReservationBooking[] }>(bookingsApiUrl, fetchWorkshopBookings);
  const refreshAll = async () => {
    // Reservation mutations also change available spots.
    await Promise.allSettled([mutateBookings(), mutate()]);
  };
  const {
    data: fbEventsData,
    error: fbEventsError,
    isLoading: fbEventsLoading,
    mutate: mutateFbEvents,
  } = useSWR<{ events: FbEventSummary[] }>(
    createOpened && createSource === 'select' ? fbEventsApiUrl : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const [fetchingFbEventId, setFetchingFbEventId] = useState<string | null>(null);
  const [fbData, setFbData] = useState<any>(null);
  const [editingWorkshop, setEditingWorkshop] = useState<any>(null);
  const [updatingSpots, setUpdatingSpots] = useState<string | null>(null);
  const [parsingDescription, setParsingDescription] = useState(false);
  const [parsingEditDescription, setParsingEditDescription] = useState(false);

  const form = useForm({
    initialValues: {
      titleLt: '',
      titleEn: '',
      startISO: '',
      startDateISO: '',
      endDateISO: '',
      timeOfDay: '18:00',
      durationMin: 0,
      eventType: 'oneTime' as 'oneTime' | 'ongoing' | 'private',
      sessionsCount: 1,
      pricePerSession: 0,
      subscriptionPriceEur: 0 as number | undefined,
      spotsTotal: 0,
      spotsLeft: 0,
      isWeekend: false,
      placeName: '',
      coverImageUrl: '',
      descriptionStructured: emptyStructuredDescription(),
    },
  });

  const editForm = useForm({
    initialValues: {
      titleLt: '',
      titleEn: '',
      startISO: '',
      durationMin: 0,
      eventType: 'oneTime' as 'oneTime' | 'ongoing' | 'private',
      sessionsCount: 1,
      pricePerSession: 0,
      subscriptionPriceEur: 0 as number | undefined,
      spotsTotal: 0,
      spotsLeft: 0,
      isWeekend: false,
      descriptionStructured: emptyStructuredDescription(),
    },
  });

  const openCreateWorkflow = () => {
    form.reset();
    setFbData(null);
    setCreateSource('select');
    setCreateOpened(true);
  };

  const closeCreateWorkflow = () => {
    form.reset();
    setFbData(null);
    setCreateSource('select');
    setCreateOpened(false);
  };

  const openManualCreate = () => {
    form.reset();
    setFbData(null);
    setCreateSource('manual');
  };

  const chooseAnotherSource = () => {
    form.reset();
    setFbData(null);
    setCreateSource('select');
  };

  const handleFetchFb = async (fbEventId: string) => {
    setFetchingFbEventId(fbEventId);
    setFbData(null);
    try {
      const res = await fetch(fbEventsApiUrl, {
        method: 'POST',
        headers: mutationHeaders,
        body: JSON.stringify({ fbEventId }),
      });

      const data = await res.json();

      if (!res.ok) {
        notifications.show({ message: data.error || 'Klaida', color: 'red' });
        return;
      }

      setFbData(data);
      setCreateSource('facebook');
      const startISO = typeof data.startISO === 'string' ? data.startISO : '';
      const startDateISO = startISO.length >= 10 ? startISO.slice(0, 10) : '';
      const timeOfDay = startISO.length >= 16 ? startISO.slice(11, 16) : '18:00';
      form.setValues({
        titleLt: data.name || '',
        titleEn: data.name || '',
        startISO,
        startDateISO,
        endDateISO: '',
        timeOfDay,
        durationMin: data.durationMin || 0,
        eventType: form.values.eventType,
        sessionsCount: form.values.sessionsCount || 1,
        pricePerSession: form.values.pricePerSession || 0,
        subscriptionPriceEur: form.values.subscriptionPriceEur,
        spotsTotal: form.values.spotsTotal || 0,
        spotsLeft: form.values.spotsLeft || 0,
        isWeekend: form.values.isWeekend,
        placeName: data.placeName || '',
        coverImageUrl: data.coverImageUrl || '',
        descriptionStructured: data.description
          ? {
              ...emptyStructuredDescription(),
              intro: data.description,
            }
          : form.values.descriptionStructured,
      });
      notifications.show({ message: 'Duomenys gauti iš FB', color: 'green' });
    } catch (_err) {
      notifications.show({ message: 'Nepavyko gauti duomenų', color: 'red' });
    } finally {
      setFetchingFbEventId(null);
    }
  };

  const parseDescriptionToStructured = async (
    rawText: string,
  ): Promise<StructuredDescription | null> => {
    if (!rawText?.trim()) return null;

    const res = await fetch(adminApiUrl('/api/admin/workshops/parse-description'), {
      method: 'POST',
      headers: mutationHeaders,
      body: JSON.stringify({ rawText }),
    });

    const data = await res.json();
    if (!res.ok) {
      const detailParts: string[] = [];
      if (data?.code) detailParts.push(`code=${data.code}`);
      if (data?.hint) detailParts.push(data.hint);
      if (data?.details?.openaiMessage) detailParts.push(`OpenAI: ${data.details.openaiMessage}`);
      if (data?.details?.openaiCode) detailParts.push(`openaiCode=${data.details.openaiCode}`);
      const details = detailParts.length > 0 ? ` (${detailParts.join(', ')})` : '';
      throw new Error(
        `${data.error || 'Nepavyko suskirstyti aprašymo'} [HTTP ${res.status}]${details}`,
      );
    }

    return data.descriptionStructured as StructuredDescription;
  };

  const handleParseCreateDescription = async () => {
    const raw = fbData?.description || form.values.descriptionStructured.intro || '';
    if (!raw.trim()) {
      notifications.show({ message: 'Nėra teksto skaidymui', color: 'orange' });
      return;
    }

    setParsingDescription(true);
    try {
      const structured = await parseDescriptionToStructured(raw);
      if (!structured) return;
      form.setFieldValue('descriptionStructured', structured);
      notifications.show({ message: 'Aprašymas suskaidytas', color: 'green' });
    } catch (error: any) {
      notifications.show({ message: error?.message || 'Klaida', color: 'red' });
    } finally {
      setParsingDescription(false);
    }
  };

  const handleParseEditDescription = async () => {
    const raw = (editForm.values.descriptionStructured as StructuredDescription)?.intro || '';
    if (!raw.trim()) {
      notifications.show({ message: 'Įžanginiame lauke nėra teksto', color: 'orange' });
      return;
    }
    setParsingEditDescription(true);
    try {
      const structured = await parseDescriptionToStructured(raw);
      if (!structured) return;
      editForm.setFieldValue('descriptionStructured', structured);
      notifications.show({ message: 'Aprašymas suskaidytas', color: 'green' });
    } catch (error: any) {
      notifications.show({ message: error?.message || 'Klaida', color: 'red' });
    } finally {
      setParsingEditDescription(false);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const isOngoingBulk = values.eventType === 'ongoing';
      if (isOngoingBulk && (!values.startDateISO || !values.endDateISO)) {
        notifications.show({ message: 'Pasirinkite pradžios ir pabaigos datas', color: 'orange' });
        return;
      }
      const payload: Record<string, unknown> = {
        titleLt: values.titleLt,
        titleEn: values.titleEn,
        durationMin: values.durationMin,
        eventType: values.eventType,
        sessionsCount: values.sessionsCount != null ? Number(values.sessionsCount) : 1,
        pricePerSession: values.pricePerSession,
        subscriptionPriceEur: values.sessionsCount > 1 ? values.subscriptionPriceEur : undefined,
        spotsTotal: values.spotsTotal,
        spotsLeft: values.spotsLeft,
        isWeekend: values.isWeekend,
        fbEventId: fbData?.fbEventId,
        fbEventUrl: fbData?.fbEventUrl,
        placeName: values.placeName || undefined,
        description: fbData?.description || values.descriptionStructured.intro || undefined,
        descriptionStructured: values.descriptionStructured,
        coverImageUrl: values.coverImageUrl || undefined,
      };

      if (isOngoingBulk) {
        payload.startDateISO = values.startDateISO;
        payload.endDateISO = values.endDateISO;
        payload.timeOfDay = values.timeOfDay || '18:00';
      } else {
        payload.startISO = values.startISO;
      }

      const response = await fetch(adminWorkshopsApiUrl, {
        method: 'POST',
        headers: mutationHeaders,
        body: JSON.stringify({
          ...payload,
          site: selectedSite,
        }),
      });

      const data = await responsePayload(response);
      const count = typeof data.count === 'number' ? data.count : 1;
      notifications.show({
        message: count > 1 ? `Sukurti ${count} užsiėmimai` : 'Užsiėmimas sukurtas',
        color: 'green',
      });
      mutate();
      form.reset();
      setFbData(null);
      setCreateSource('select');
      setCreateOpened(false);
    } catch (error: any) {
      notifications.show({ message: error?.message || 'Nepavyko išsaugoti', color: 'red' });
    }
  };

  const openEditModal = (w: any) => {
    setEditingWorkshop(w);
    editForm.setValues({
      titleLt: w.titleLt,
      titleEn: w.titleEn,
      startISO: w.startISO,
      durationMin: w.durationMin ?? 0,
      eventType: w.eventType ?? 'oneTime',
      sessionsCount: w.sessionsCount ?? 1,
      pricePerSession: w.pricePerSession ?? w.priceEur ?? 0,
      subscriptionPriceEur: w.subscriptionPriceEur ?? 0,
      spotsTotal: w.spotsTotal ?? 0,
      spotsLeft: w.spotsLeft ?? 0,
      isWeekend: w.isWeekend ?? false,
      descriptionStructured: normalizeStructuredDescription(
        w.descriptionStructured || {
          ...emptyStructuredDescription(),
          intro: w.description || '',
        },
      ),
    });
  };

  const handleEditSubmit = async (values: typeof editForm.values) => {
    if (!editingWorkshop) return;
    const payload: Record<string, unknown> = {
      ...values,
      sessionsCount: Number(values.sessionsCount) || 1,
      durationMin: Number(values.durationMin),
      pricePerSession: Number(values.pricePerSession),
      spotsTotal: Number(values.spotsTotal),
      spotsLeft: Number(values.spotsLeft),
      descriptionStructured: values.descriptionStructured,
    };
    if (values.sessionsCount <= 1) {
      payload.subscriptionPriceEur = null;
    }
    try {
      const res = await fetch(
        adminApiUrl(`/api/admin/workshops/${editingWorkshop.id}`, { site: selectedSite }),
        {
          method: 'PATCH',
          headers: mutationHeaders,
          body: JSON.stringify(payload),
        },
      );
      await responsePayload(res);
      notifications.show({ message: 'Atnaujinta', color: 'green' });
      await mutate();
      setEditingWorkshop(null);
    } catch (error: any) {
      notifications.show({ message: error?.message || 'Nepavyko atnaujinti', color: 'red' });
    }
  };

  const handleQuickSpots = async (w: any, delta: number) => {
    const next = Math.max(0, Math.min(w.spotsTotal, w.spotsLeft + delta));
    if (next === w.spotsLeft) return;
    setUpdatingSpots(w.id);
    try {
      const res = await fetch(adminApiUrl(`/api/admin/workshops/${w.id}`, { site: selectedSite }), {
        method: 'PATCH',
        headers: mutationHeaders,
        body: JSON.stringify({ spotsLeft: next }),
      });
      await responsePayload(res);
      mutate();
    } catch (error: any) {
      notifications.show({ message: error?.message || 'Nepavyko atnaujinti', color: 'red' });
    } finally {
      setUpdatingSpots(null);
    }
  };

  const handleDelete = async (w: any) => {
    if (!confirm('Ar tikrai norite ištrinti šį užsiėmimą?')) return;
    try {
      const res = await fetch(adminApiUrl(`/api/admin/workshops/${w.id}`, { site: selectedSite }), {
        method: 'DELETE',
        headers: mutationHeaders,
      });
      await responsePayload(res);
      notifications.show({ message: 'Ištrinta', color: 'green' });
      mutate();
    } catch (error: any) {
      notifications.show({ message: error?.message || 'Nepavyko ištrinti', color: 'red' });
    }
  };

  const allWorkshops = useMemo(
    () => (Array.isArray(data?.workshops) ? data.workshops : []).map(normalizeWorkshop),
    [data?.workshops],
  );
  const selectedWorkshop = allWorkshops.find((w) => w.id === workshopId);
  const period: WorkshopPeriod =
    searchParams.get('period') === 'past'
      ? 'past'
      : searchParams.get('period') === 'upcoming'
        ? 'upcoming'
        : selectedWorkshop
          ? workshopPeriod(selectedWorkshop.startISO, nowKey)
          : 'upcoming';
  const workshops = filterWorkshops(allWorkshops, period, nowKey, workshopId);
  const groupedBookings = useMemo(
    () => groupWorkshopBookings(bookingsData?.bookings || [], allWorkshops),
    [bookingsData, allWorkshops],
  );
  const statusBookings = (bookings: ReservationBooking[]) =>
    status ? bookings.filter((b) => b.status === status) : bookings;
  const bookingStatsByWorkshop = useMemo(() => {
    const statsMap = new Map<string, BookingStats>();
    const bookings = Array.isArray(bookingsData?.bookings) ? bookingsData.bookings : [];

    for (const booking of bookings) {
      const workshopId = booking.workshopId;

      if (!workshopId) continue;

      const stats = statsMap.get(workshopId) || createEmptyBookingStats();
      stats.all += 1;
      const participants = Number(booking?.participantsCount ?? 0);
      const safeParticipants = Number.isFinite(participants) ? participants : 0;
      stats.participants += safeParticipants;

      if (isBookingStatus(booking?.status)) {
        const status: BookingStatus = booking.status;
        stats[status] += 1;
        if (status === 'draft') stats.draftParticipants += safeParticipants;
        if (status === 'pending_payment') stats.pendingParticipants += safeParticipants;
        if (status === 'confirmed') stats.confirmedParticipants += safeParticipants;
        if (status === 'cancelled') stats.cancelledParticipants += safeParticipants;
        if (status === 'expired') stats.expiredParticipants += safeParticipants;
      }

      statsMap.set(workshopId, stats);
    }

    return statsMap;
  }, [bookingsData]);

  return (
    <ReservationManager
      key={selectedSite}
      site={selectedSite}
      workshops={allWorkshops}
      nowKey={nowKey}
      onChanged={refreshAll}
    >
      {({ openBookingDetails, openManualBooking, openMessageTemplate }) => (
        <Container size="xl" py="md" miw={0} px={{ base: 0, sm: 'md' }}>
          <Stack gap="xl">
            <Group justify="space-between" align="end">
              <Stack gap="sm">
                <Title order={2}>Dirbtuvės</Title>
                <Select
                  label="Projektas"
                  data={PROJECT_OPTIONS}
                  value={selectedSite}
                  onChange={(value) => {
                    closeCreateWorkflow();
                    setEditingWorkshop(null);
                    updateFilters({ site: value === 'yoga' ? 'yoga' : 'ceramics', workshopId: '' });
                  }}
                  allowDeselect={false}
                  w={170}
                />
              </Stack>
              <Group gap="sm">
                <Button
                  variant="light"
                  leftSection={<IconEdit size={16} />}
                  onClick={openMessageTemplate}
                >
                  Pranešimo šablonas
                </Button>
                <Button
                  variant="light"
                  leftSection={<IconRefresh size={16} />}
                  onClick={() => void refreshAll()}
                >
                  Atnaujinti
                </Button>
                <Button leftSection={<IconPlus size={16} />} onClick={openCreateWorkflow}>
                  Kurti naują
                </Button>
              </Group>
            </Group>

            <Stack gap="sm">
              <SegmentedControl
                aria-label="Dirbtuvių laikotarpis"
                value={period}
                onChange={(value) => updateFilters({ period: value, workshopId: '' })}
                data={[
                  { value: 'upcoming', label: 'Planuojamos' },
                  { value: 'past', label: 'Praėjusios dirbtuvės' },
                ]}
                fullWidth
              />
              <Text size="xs" c="dimmed">
                Pagal dirbtuvių pradžios laiką (Europe/Vilnius).
              </Text>
              <Group align="end">
                <Select
                  label="Rezervacijos statusas"
                  value={status}
                  allowDeselect={false}
                  onChange={(value) => updateFilters({ status: value || '', period })}
                  data={[
                    { value: '', label: 'Visi statusai' },
                    { value: 'draft', label: 'Juodraštis' },
                    { value: 'pending_payment', label: 'Laukia mokėjimo' },
                    { value: 'confirmed', label: 'Patvirtinta' },
                    { value: 'cancelled', label: 'Atšaukta' },
                    { value: 'expired', label: 'Pasibaigė' },
                  ]}
                />
                {workshopId && (
                  <Button variant="light" onClick={() => updateFilters({ workshopId: '', period })}>
                    Rodyti visas dirbtuves
                  </Button>
                )}
                {groupedBookings.unassigned.length > 0 && (
                  <Button
                    variant="subtle"
                    onClick={() => setShowUnassigned((value) => !value)}
                    aria-expanded={showUnassigned}
                  >
                    Rezervacijos be dirbtuvių ({groupedBookings.unassigned.length})
                  </Button>
                )}
              </Group>
            </Stack>
            {showUnassigned && groupedBookings.unassigned.length > 0 && (
              <Card withBorder p="md" miw={0}>
                <Title order={4} mb="sm">
                  Rezervacijos be dirbtuvių
                </Title>
                <Text size="sm" c="dimmed" mb="sm">
                  Ištrintų arba nebeprieinamų dirbtuvių rezervacijos.
                </Text>
                <ReservationsList
                  bookings={statusBookings(groupedBookings.unassigned)}
                  onView={openBookingDetails}
                />
              </Card>
            )}

            {createOpened && (
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <div>
                      <Title order={4}>
                        {createSource === 'manual'
                          ? 'Kurti renginį rankiniu būdu'
                          : createSource === 'facebook'
                            ? 'Kurti pagal Facebook renginį'
                            : 'Pasirinkite kūrimo būdą'}
                      </Title>
                      <Text size="sm" c="dimmed">
                        Pasirinkus Facebook renginį jo informacija bus perkelta į formą. Taip pat
                        galite visus duomenis suvesti rankiniu būdu.
                      </Text>
                    </div>
                    <Group>
                      {createSource === 'select' ? (
                        <>
                          <Button variant="light" onClick={openManualCreate}>
                            Kurti rankiniu būdu
                          </Button>
                          <Button
                            variant="light"
                            leftSection={<IconRefresh size={16} />}
                            onClick={() => void mutateFbEvents()}
                            loading={fbEventsLoading}
                          >
                            Atnaujinti FB sąrašą
                          </Button>
                        </>
                      ) : (
                        <Button variant="light" onClick={chooseAnotherSource}>
                          Rinktis kitą būdą
                        </Button>
                      )}
                      <Button variant="default" onClick={closeCreateWorkflow}>
                        Uždaryti
                      </Button>
                    </Group>
                  </Group>

                  {createSource === 'select' && (
                    <>
                      {fbEventsLoading && (
                        <Group justify="center" py="md">
                          <Loader size="sm" />
                          <Text size="sm" c="dimmed">
                            Kraunami Facebook renginiai...
                          </Text>
                        </Group>
                      )}

                      {fbEventsError && (
                        <Text c="red" size="sm">
                          {fbEventsError.message || 'Nepavyko gauti Facebook renginių sąrašo'}
                        </Text>
                      )}

                      {!fbEventsLoading && !fbEventsError && fbEventsData?.events.length === 0 && (
                        <Text c="dimmed" size="sm">
                          Artėjančių Facebook renginių nėra. Galite kurti renginį rankiniu būdu.
                        </Text>
                      )}

                      {fbEventsData?.events.map((event) => {
                        const isFetching = fetchingFbEventId === event.fbEventId;

                        return (
                          <Card key={event.fbEventId} padding="sm" radius="md" withBorder>
                            <Group justify="space-between" align="center" wrap="nowrap">
                              <Stack gap={3}>
                                <Text fw={600}>{event.name}</Text>
                                <Text size="sm">{formatFbEventDate(event.startTime)}</Text>
                                {event.placeName && (
                                  <Text size="xs" c="dimmed">
                                    {event.placeName}
                                  </Text>
                                )}
                              </Stack>
                              <Button
                                variant="light"
                                leftSection={<IconCalendarEvent size={16} />}
                                onClick={() => handleFetchFb(event.fbEventId)}
                                loading={isFetching}
                                disabled={Boolean(fetchingFbEventId) && !isFetching}
                              >
                                Pasirinkti
                              </Button>
                            </Group>
                          </Card>
                        );
                      })}
                    </>
                  )}

                  {createSource !== 'select' && (
                    <>
                      <Divider />
                      <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="md">
                          <Title order={5}>
                            {createSource === 'manual'
                              ? 'Renginio duomenys'
                              : 'Patikrinkite ir papildykite'}
                          </Title>
                          <Group grow>
                            <TextInput
                              label="Pavadinimas (LT)"
                              required
                              {...form.getInputProps('titleLt')}
                            />
                            <TextInput
                              label="Pavadinimas (EN)"
                              required
                              {...form.getInputProps('titleEn')}
                            />
                          </Group>
                          <Select
                            label="Rūšis"
                            data={[
                              { value: 'oneTime', label: 'Vienkartiniai užsiėmimai' },
                              { value: 'ongoing', label: 'Nuolatiniai užsiėmimai' },
                              { value: 'private', label: 'Privatūs užsiėmimai' },
                            ]}
                            {...form.getInputProps('eventType')}
                          />
                          {form.values.eventType === 'ongoing' ? (
                            <>
                              <Text size="sm" c="dimmed">
                                Bus sukurti užsiėmimai kiekvienai savaitei (įskaitant pradžios ir
                                pabaigos datas)
                              </Text>
                              <Group grow>
                                <TextInput
                                  label="Pradžios data"
                                  required
                                  type="date"
                                  {...form.getInputProps('startDateISO')}
                                />
                                <TextInput
                                  label="Pabaigos data"
                                  required
                                  type="date"
                                  {...form.getInputProps('endDateISO')}
                                />
                                <TextInput
                                  label="Laikas"
                                  type="time"
                                  {...form.getInputProps('timeOfDay')}
                                />
                              </Group>
                            </>
                          ) : (
                            <TextInput
                              label="Pradžios data ir laikas"
                              required
                              type="datetime-local"
                              {...form.getInputProps('startISO')}
                            />
                          )}
                          <NumberInput
                            label="Trukmė (min)"
                            required
                            min={1}
                            {...form.getInputProps('durationMin')}
                          />
                          <Group grow>
                            <TextInput label="Vieta" {...form.getInputProps('placeName')} />
                            <TextInput
                              label="Viršelio nuotraukos URL"
                              placeholder="https://..."
                              {...form.getInputProps('coverImageUrl')}
                            />
                          </Group>
                          <Group grow>
                            <NumberInput
                              label="Užsiėmimų kiekis"
                              min={1}
                              {...form.getInputProps('sessionsCount')}
                            />
                            <NumberInput
                              label="Kaina vieno (€)"
                              required
                              min={0}
                              {...form.getInputProps('pricePerSession')}
                            />
                            {form.values.sessionsCount > 1 && (
                              <NumberInput
                                label="Abonemento kaina (€)"
                                min={0}
                                {...form.getInputProps('subscriptionPriceEur')}
                              />
                            )}
                          </Group>
                          <Group grow>
                            <NumberInput
                              label="Vietų sk."
                              required
                              min={1}
                              {...form.getInputProps('spotsTotal')}
                            />
                            <NumberInput
                              label="Laisvų vietų"
                              required
                              min={0}
                              {...form.getInputProps('spotsLeft')}
                            />
                          </Group>
                          <Switch
                            label="Savaitgalis"
                            {...form.getInputProps('isWeekend', { type: 'checkbox' })}
                          />
                          <Divider />
                          <Stack gap="sm">
                            <Group justify="space-between">
                              <Title order={6}>Renginio aprašymo struktūra</Title>
                              <Button
                                size="xs"
                                variant="light"
                                onClick={handleParseCreateDescription}
                                loading={parsingDescription}
                              >
                                Suskaidyti iš paprastojo teksto
                              </Button>
                            </Group>
                            <Textarea
                              label="Įžanginis sakinys"
                              minRows={2}
                              autosize
                              {...form.getInputProps('descriptionStructured.intro')}
                            />
                            <Textarea
                              label="Pirma pastraipa"
                              minRows={3}
                              autosize
                              {...form.getInputProps('descriptionStructured.paragraph1')}
                            />
                            <Textarea
                              label="Antra pastraipa"
                              minRows={3}
                              autosize
                              {...form.getInputProps('descriptionStructured.paragraph2')}
                            />
                            <Textarea
                              label="Trečia pastraipa"
                              minRows={3}
                              autosize
                              {...form.getInputProps('descriptionStructured.paragraph3')}
                            />
                            <TextInput
                              label="Sąrašo antraštė"
                              {...form.getInputProps('descriptionStructured.listTitle')}
                            />
                            <Stack gap="xs">
                              <Group justify="space-between">
                                <Text size="sm" fw={500}>
                                  Sąrašo elementai
                                </Text>
                                <Button
                                  size="xs"
                                  variant="subtle"
                                  onClick={() =>
                                    form.setFieldValue('descriptionStructured.listItems', [
                                      ...(form.values.descriptionStructured.listItems || []),
                                      '',
                                    ])
                                  }
                                >
                                  Pridėti elementą
                                </Button>
                              </Group>
                              {(form.values.descriptionStructured.listItems || []).map(
                                (item, index) => (
                                  <Group key={`${String(item)}-${index}`} grow>
                                    <TextInput
                                      value={item}
                                      onChange={(event) => {
                                        const next = [
                                          ...(form.values.descriptionStructured.listItems || []),
                                        ];
                                        next[index] = event.currentTarget.value;
                                        form.setFieldValue('descriptionStructured.listItems', next);
                                      }}
                                    />
                                    <ActionIcon
                                      color="red"
                                      variant="subtle"
                                      onClick={() => {
                                        const next = [
                                          ...(form.values.descriptionStructured.listItems || []),
                                        ];
                                        next.splice(index, 1);
                                        form.setFieldValue('descriptionStructured.listItems', next);
                                      }}
                                    >
                                      <IconTrash size={16} />
                                    </ActionIcon>
                                  </Group>
                                ),
                              )}
                            </Stack>
                            <Textarea
                              label="Pirma baigiamoji pastraipa"
                              minRows={2}
                              autosize
                              {...form.getInputProps('descriptionStructured.closing1')}
                            />
                            <Textarea
                              label="Antra baigiamoji pastraipa"
                              minRows={2}
                              autosize
                              {...form.getInputProps('descriptionStructured.closing2')}
                            />
                            <Textarea
                              label="Trečia baigiamoji pastraipa"
                              minRows={2}
                              autosize
                              {...form.getInputProps('descriptionStructured.closing3')}
                            />
                          </Stack>
                          {createSource === 'facebook' && fbData?.placeName && (
                            <Text size="sm" c="dimmed">
                              Vieta (iš FB): {fbData.placeName}
                            </Text>
                          )}
                          <Group>
                            <Button type="submit" leftSection={<IconPlus size={16} />}>
                              Sukurti užsiėmimą
                            </Button>
                            <Button variant="default" onClick={closeCreateWorkflow}>
                              Atšaukti
                            </Button>
                          </Group>
                        </Stack>
                      </form>
                    </>
                  )}
                </Stack>
              </Card>
            )}

            <Card shadow="sm" p={{ base: 'sm', sm: 'lg' }} radius="md" withBorder miw={0}>
              <Title order={4} mb="md">
                {period === 'past' ? 'Praėjusios dirbtuvės' : 'Planuojamos dirbtuvės'}
              </Title>
              {workshopsError ? (
                <Alert color="red" mb="md" title="Nepavyko gauti užsiėmimų">
                  {workshopsError.message}
                </Alert>
              ) : null}
              {bookingsError ? (
                <Alert color="orange" mb="md" title="Nepavyko gauti rezervacijų">
                  {bookingsError.message}
                </Alert>
              ) : null}
              {workshopsLoading ? (
                <Group>
                  <Loader size="sm" />
                  <Text>Kraunamos dirbtuvės...</Text>
                </Group>
              ) : workshopsError ? null : workshops.length === 0 ? (
                <Text c="dimmed">
                  {workshopId
                    ? 'Pasirinktos dirbtuvės nerastos. Pasirinkite „Rodyti visas dirbtuves“.'
                    : period === 'past'
                      ? 'Praėjusių dirbtuvių nėra.'
                      : 'Planuojamų dirbtuvių nėra.'}
                </Text>
              ) : (
                <Stack gap="md">
                  {workshops.map((w: any) => {
                    const stats = bookingStatsByWorkshop.get(w.id) || EMPTY_BOOKING_STATS;
                    const reservedParticipants =
                      stats.pendingParticipants + stats.confirmedParticipants;
                    const expectedSpotsLeft = Math.max(w.spotsTotal - reservedParticipants, 0);
                    const spotsMismatch = expectedSpotsLeft !== w.spotsLeft;

                    return (
                      <Card
                        key={w.id}
                        withBorder
                        padding="md"
                        miw={0}
                        component="section"
                        aria-label={`Dirbtuvės: ${w.titleLt}`}
                        style={{ overflowWrap: 'anywhere' }}
                      >
                        <Stack gap="sm">
                          <Group justify="space-between" align="start" wrap="nowrap">
                            <Stack gap={4} style={{ flex: 1 }}>
                              <Title order={3} size="h4">
                                {w.titleLt}
                              </Title>
                              <Group gap={6}>
                                <Badge variant="light">{workshopTypeLabel(w.eventType)}</Badge>
                                <Badge variant="light" color={w.isWeekend ? 'blue' : 'gray'}>
                                  {w.isWeekend ? 'Savaitgalis' : 'Darbo diena'}
                                </Badge>
                              </Group>
                            </Stack>
                            <Group gap={4}>
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                onClick={() => openEditModal(w)}
                                aria-label="Redaguoti"
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                              <ActionIcon
                                onClick={() => openManualBooking(w.id)}
                                disabled={period === 'past'}
                                variant="subtle"
                                size="md"
                                aria-label={`Pridėti rezervaciją: ${w.titleLt}`}
                              >
                                <IconTicket size={18} />
                              </ActionIcon>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="sm"
                                onClick={() => handleDelete(w)}
                                aria-label="Ištrinti"
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Group>

                          <Stack gap={2}>
                            <Text size="sm">
                              <Text span c="dimmed">
                                Pradžia:
                              </Text>{' '}
                              {formatStartISO(w.startISO)}
                            </Text>
                            <Text size="sm">
                              <Text span c="dimmed">
                                Trukmė:
                              </Text>{' '}
                              {formatWorkshopDuration(w.durationMin, 'lt')}
                            </Text>
                            <Text size="sm">
                              <Text span c="dimmed">
                                Kiekis:
                              </Text>{' '}
                              {w.sessionsCount ?? 1}
                            </Text>
                            <Text size="sm">
                              <Text span c="dimmed">
                                Kaina:
                              </Text>{' '}
                              {workshopPriceLabel(w)}
                            </Text>
                          </Stack>

                          <Stack gap={6}>
                            <Group gap={4} wrap="nowrap">
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                onClick={() => handleQuickSpots(w, -1)}
                                disabled={w.spotsLeft <= 0 || updatingSpots === w.id}
                                aria-label="Sumažinti laisvų vietų"
                              >
                                <IconMinus size={14} />
                              </ActionIcon>
                              <Badge
                                color={
                                  w.spotsLeft === 0 ? 'red' : w.spotsLeft <= 2 ? 'orange' : 'green'
                                }
                                variant="light"
                              >
                                laisvos {w.spotsLeft} / {w.spotsTotal}
                              </Badge>
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                onClick={() => handleQuickSpots(w, 1)}
                                disabled={w.spotsLeft >= w.spotsTotal || updatingSpots === w.id}
                                aria-label="Padidinti laisvų vietų"
                              >
                                <IconPlus size={14} />
                              </ActionIcon>
                            </Group>
                            {!bookingsLoading && !bookingsError && (
                              <>
                                <Group gap={6}>
                                  <Badge variant="light" color="orange">
                                    laukia dalyvių {stats.pendingParticipants}
                                  </Badge>
                                  <Badge variant="light" color="green">
                                    patvirtintų dalyvių {stats.confirmedParticipants}
                                  </Badge>
                                </Group>
                                <Group gap={6}>
                                  <Badge variant="light" color="blue">
                                    rezervuota {reservedParticipants}
                                  </Badge>
                                  <Badge variant="light" color={spotsMismatch ? 'red' : 'teal'}>
                                    {spotsMismatch
                                      ? `tikėtina ${expectedSpotsLeft}, dabar ${w.spotsLeft}`
                                      : 'sutampa su rezervacijomis'}
                                  </Badge>
                                </Group>
                              </>
                            )}
                          </Stack>

                          {!bookingsLoading && !bookingsError && (
                            <Stack gap={6}>
                              <Group gap={6}>
                                <Badge variant="light" color="blue">
                                  viso {stats.all}
                                </Badge>
                                <Badge variant="light" color="grape">
                                  dalyviai {stats.participants}
                                </Badge>
                              </Group>
                              <Group gap={6}>
                                <Badge variant="light" color="orange">
                                  laukia {stats.pending_payment}
                                </Badge>
                                <Badge variant="light" color="green">
                                  patvirtinta {stats.confirmed}
                                </Badge>
                              </Group>
                              {(stats.cancelled > 0 || stats.expired > 0 || stats.draft > 0) && (
                                <Group gap={6}>
                                  {stats.draft > 0 ? (
                                    <Badge variant="light" color="gray">
                                      juodraščiai {stats.draft}
                                    </Badge>
                                  ) : null}
                                  {stats.cancelled > 0 ? (
                                    <Badge variant="light" color="red">
                                      atšaukta {stats.cancelled}
                                    </Badge>
                                  ) : null}
                                  {stats.expired > 0 ? (
                                    <Badge variant="light" color="dark">
                                      pasibaigę {stats.expired}
                                    </Badge>
                                  ) : null}
                                </Group>
                              )}
                            </Stack>
                          )}
                        </Stack>
                        <Divider my="md" />
                        <Group justify="space-between" mb="sm">
                          <Title order={4} size="h5">
                            Rezervacijos
                          </Title>
                          {period === 'upcoming' && (
                            <Button
                              size="xs"
                              variant="light"
                              onClick={() => openManualBooking(w.id)}
                              leftSection={<IconPlus size={14} />}
                            >
                              Pridėti rezervaciją
                            </Button>
                          )}
                        </Group>
                        {bookingsLoading ? (
                          <Text size="sm" c="dimmed">
                            Kraunamos rezervacijos...
                          </Text>
                        ) : bookingsError ? (
                          <Text c="red" size="sm">
                            Rezervacijų įkelti nepavyko. Bandykite atnaujinti.
                          </Text>
                        ) : statusBookings(groupedBookings.byWorkshop.get(w.id) || []).length ===
                          0 ? (
                          <Text c="dimmed" size="sm">
                            {status
                              ? 'Rezervacijų pagal pasirinktą statusą nėra.'
                              : 'Rezervacijų dar nėra.'}
                          </Text>
                        ) : (
                          <ReservationsList
                            bookings={statusBookings(groupedBookings.byWorkshop.get(w.id) || [])}
                            onView={openBookingDetails}
                          />
                        )}
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </Card>

            <Modal
              opened={!!editingWorkshop}
              onClose={() => setEditingWorkshop(null)}
              title="Redaguoti užsiėmimą"
              size="md"
            >
              <form onSubmit={editForm.onSubmit(handleEditSubmit)}>
                <Stack gap="md">
                  <Group grow>
                    <TextInput
                      label="Pavadinimas (LT)"
                      required
                      {...editForm.getInputProps('titleLt')}
                    />
                    <TextInput
                      label="Pavadinimas (EN)"
                      required
                      {...editForm.getInputProps('titleEn')}
                    />
                  </Group>
                  <Group grow>
                    <TextInput
                      label="Pradžios laikas (ISO)"
                      required
                      {...editForm.getInputProps('startISO')}
                    />
                    <NumberInput
                      label="Trukmė (min)"
                      required
                      min={1}
                      {...editForm.getInputProps('durationMin')}
                    />
                  </Group>
                  <Select
                    label="Rūšis"
                    data={[
                      { value: 'oneTime', label: 'Vienkartiniai užsiėmimai' },
                      { value: 'ongoing', label: 'Nuolatiniai užsiėmimai' },
                      { value: 'private', label: 'Privatūs užsiėmimai' },
                    ]}
                    {...editForm.getInputProps('eventType')}
                  />
                  <Group grow>
                    <NumberInput
                      label="Užsiėmimų kiekis"
                      min={1}
                      {...editForm.getInputProps('sessionsCount')}
                    />
                    <NumberInput
                      label="Kaina vieno (€)"
                      required
                      min={0}
                      {...editForm.getInputProps('pricePerSession')}
                    />
                    {editForm.values.sessionsCount > 1 && (
                      <NumberInput
                        label="Abonemento kaina (€)"
                        min={0}
                        {...editForm.getInputProps('subscriptionPriceEur')}
                      />
                    )}
                    <NumberInput
                      label="Vietų sk."
                      required
                      min={1}
                      {...editForm.getInputProps('spotsTotal')}
                    />
                    <NumberInput
                      label="Laisvų vietų"
                      required
                      min={0}
                      max={editForm.values.spotsTotal}
                      {...editForm.getInputProps('spotsLeft')}
                    />
                  </Group>
                  <Switch
                    label="Savaitgalis"
                    {...editForm.getInputProps('isWeekend', { type: 'checkbox' })}
                  />
                  <Divider />
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Title order={6}>Renginio aprašymo struktūra</Title>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={handleParseEditDescription}
                        loading={parsingEditDescription}
                      >
                        Suskaidyti įžangą
                      </Button>
                    </Group>
                    <Textarea
                      label="Įžanginis sakinys"
                      minRows={2}
                      autosize
                      {...editForm.getInputProps('descriptionStructured.intro')}
                    />
                    <Textarea
                      label="Pirma pastraipa"
                      minRows={3}
                      autosize
                      {...editForm.getInputProps('descriptionStructured.paragraph1')}
                    />
                    <Textarea
                      label="Antra pastraipa"
                      minRows={3}
                      autosize
                      {...editForm.getInputProps('descriptionStructured.paragraph2')}
                    />
                    <Textarea
                      label="Trečia pastraipa"
                      minRows={3}
                      autosize
                      {...editForm.getInputProps('descriptionStructured.paragraph3')}
                    />
                    <TextInput
                      label="Sąrašo antraštė"
                      {...editForm.getInputProps('descriptionStructured.listTitle')}
                    />
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>
                          Sąrašo elementai
                        </Text>
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() =>
                            editForm.setFieldValue('descriptionStructured.listItems', [
                              ...(editForm.values.descriptionStructured.listItems || []),
                              '',
                            ])
                          }
                        >
                          Pridėti elementą
                        </Button>
                      </Group>
                      {(editForm.values.descriptionStructured.listItems || []).map(
                        (item, index) => (
                          <Group key={`${String(item)}-${index}`} grow>
                            <TextInput
                              value={item}
                              onChange={(event) => {
                                const next = [
                                  ...(editForm.values.descriptionStructured.listItems || []),
                                ];
                                next[index] = event.currentTarget.value;
                                editForm.setFieldValue('descriptionStructured.listItems', next);
                              }}
                            />
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => {
                                const next = [
                                  ...(editForm.values.descriptionStructured.listItems || []),
                                ];
                                next.splice(index, 1);
                                editForm.setFieldValue('descriptionStructured.listItems', next);
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        ),
                      )}
                    </Stack>
                    <Textarea
                      label="Pirma baigiamoji pastraipa"
                      minRows={2}
                      autosize
                      {...editForm.getInputProps('descriptionStructured.closing1')}
                    />
                    <Textarea
                      label="Antra baigiamoji pastraipa"
                      minRows={2}
                      autosize
                      {...editForm.getInputProps('descriptionStructured.closing2')}
                    />
                    <Textarea
                      label="Trečia baigiamoji pastraipa"
                      minRows={2}
                      autosize
                      {...editForm.getInputProps('descriptionStructured.closing3')}
                    />
                  </Stack>
                  <Group justify="flex-end" mt="md">
                    <Button variant="subtle" onClick={() => setEditingWorkshop(null)}>
                      Atšaukti
                    </Button>
                    <Button type="submit">Išsaugoti</Button>
                  </Group>
                </Stack>
              </form>
            </Modal>
          </Stack>
        </Container>
      )}
    </ReservationManager>
  );
}

export default function WorkshopsPage() {
  return (
    <Suspense fallback={<Text>Kraunama...</Text>}>
      <WorkshopsPageContent />
    </Suspense>
  );
}
