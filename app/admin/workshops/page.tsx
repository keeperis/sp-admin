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
  Select,
  Stack,
  Switch,
  Table,
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
import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import type { SiteKey } from '@/lib/site';
import { formatWorkshopDuration } from '@/src/lib/workshops/format-duration';

const fetcher = async <T = Record<string, unknown>>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: 'no-store' });
  const raw = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(raw || `Serveris grąžino HTTP ${res.status} be JSON atsakymo.`);
  }
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : `Nepavyko gauti duomenų (HTTP ${res.status})`,
    );
  }
  return data as T;
};

const responsePayload = async (response: Response) => {
  const raw = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(raw || `Serveris grąžino HTTP ${response.status} be JSON klaidos.`);
  }

  if (!response.ok) {
    throw new Error(
      typeof payload.error === 'string' ? payload.error : `Klaida (HTTP ${response.status})`,
    );
  }

  return payload;
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

const PROJECT_OPTIONS: Array<{ value: SiteKey; label: string }> = [
  { value: 'ceramics', label: 'Ceramics' },
  { value: 'yoga', label: 'Yoga' },
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

export default function WorkshopsPage() {
  const [selectedSite, setSelectedSite] = useState<SiteKey>('ceramics');
  const [createOpened, setCreateOpened] = useState(false);
  const [createSource, setCreateSource] = useState<'select' | 'facebook' | 'manual'>('select');
  const adminWorkshopsApiUrl = `/api/admin/workshops?site=${selectedSite}`;
  const bookingsApiUrl = `/api/admin/bookings?site=${selectedSite}`;
  const fbEventsApiUrl = `/api/admin/workshops/fetch-fb?site=${selectedSite}`;
  const { data, error: workshopsError, mutate } = useSWR<{ workshops: any[] }>(
    adminWorkshopsApiUrl,
    fetcher,
  );
  const { data: bookingsData, error: bookingsError } = useSWR<{ bookings: any[] }>(
    bookingsApiUrl,
    fetcher,
  );
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
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
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

    const res = await fetch('/api/admin/workshops/parse-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
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
        `/api/admin/workshops/${editingWorkshop.id}?site=${selectedSite}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
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
      const res = await fetch(`/api/admin/workshops/${w.id}?site=${selectedSite}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
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
      const res = await fetch(`/api/admin/workshops/${w.id}?site=${selectedSite}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      await responsePayload(res);
      notifications.show({ message: 'Ištrinta', color: 'green' });
      mutate();
    } catch (error: any) {
      notifications.show({ message: error?.message || 'Nepavyko ištrinti', color: 'red' });
    }
  };

  const workshops = useMemo(
    () =>
      (Array.isArray(data?.workshops) ? data.workshops : [])
        .map((workshop: any) => normalizeWorkshop(workshop))
        .sort((left: any, right: any) => {
        const leftStart = Date.parse(left.startISO || '');
        const rightStart = Date.parse(right.startISO || '');
        if (Number.isNaN(leftStart)) return 1;
        if (Number.isNaN(rightStart)) return -1;
        return rightStart - leftStart;
      }),
    [data?.workshops],
  );
  const bookingStatsByWorkshop = useMemo(() => {
    const statsMap = new Map<string, BookingStats>();
    const bookings = Array.isArray(bookingsData?.bookings) ? bookingsData.bookings : [];

    for (const booking of bookings) {
      const workshopId =
        typeof booking?.workshopId === 'string'
          ? booking.workshopId
          : booking?.workshop?.id || booking?.workshop?._id;

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
    <Container size="xl" py="md">
      <Stack gap="xl">
        <Group justify="space-between" align="end">
          <Stack gap="sm">
            <Title order={2}>Workshops</Title>
            <Select
              label="Project"
              data={PROJECT_OPTIONS}
              value={selectedSite}
              onChange={(value) => setSelectedSite(value === 'yoga' ? 'yoga' : 'ceramics')}
              allowDeselect={false}
              w={170}
            />
          </Stack>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateWorkflow}>
            Kurti naują
          </Button>
        </Group>

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
                    Pasirinkus Facebook renginį jo informacija bus perkelta į formą. Taip pat galite
                    visus duomenis suvesti rankiniu būdu.
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
                          { value: 'oneTime', label: 'Vienkartiniai dirbtuvės' },
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
                            label="Abonimento kaina (€)"
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
                            Suskaidyti iš plain teksto
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
                          label="Listo antraštė"
                          {...form.getInputProps('descriptionStructured.listTitle')}
                        />
                        <Stack gap="xs">
                          <Group justify="space-between">
                            <Text size="sm" fw={500}>
                              Listo elementai
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

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={4} mb="md">
            Esami užsiėmimai
          </Title>
          {workshopsError ? (
            <Alert color="red" mb="md" title="Nepavyko gauti užsiėmimų">
              {workshopsError.message}
            </Alert>
          ) : null}
          {bookingsError ? (
            <Alert color="orange" mb="md" title="Nepavyko gauti registracijų statistikos">
              {bookingsError.message}
            </Alert>
          ) : null}
          {workshops.length === 0 ? (
            <Text c="dimmed">Užsiėmimų dar nėra.</Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Pavadinimas</Table.Th>
                  <Table.Th>Tipas</Table.Th>
                  <Table.Th>Pradžia</Table.Th>
                  <Table.Th>Trukmė</Table.Th>
                  <Table.Th>Užsiėmimų kiekis</Table.Th>
                  <Table.Th>Kaina</Table.Th>
                  <Table.Th>Vietos</Table.Th>
                  <Table.Th>Registracijos</Table.Th>
                  <Table.Th>Savaitgalis</Table.Th>
                  <Table.Th>Veiksmai</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {workshops.map((w: any) => {
                  const stats = bookingStatsByWorkshop.get(w.id) || EMPTY_BOOKING_STATS;
                  const reservedParticipants =
                    stats.pendingParticipants + stats.confirmedParticipants;
                  const expectedSpotsLeft = Math.max(w.spotsTotal - reservedParticipants, 0);
                  const spotsMismatch = expectedSpotsLeft !== w.spotsLeft;

                  return (
                    <Table.Tr key={w.id}>
                      <Table.Td>{w.titleLt}</Table.Td>
                      <Table.Td>
                        {w.eventType === 'oneTime'
                          ? 'Vienkart.'
                          : w.eventType === 'ongoing'
                            ? 'Nuolatiniai'
                            : 'Privatūs'}
                      </Table.Td>
                      <Table.Td>{formatStartISO(w.startISO)}</Table.Td>
                      <Table.Td>{formatWorkshopDuration(w.durationMin, 'lt')}</Table.Td>
                      <Table.Td>{w.sessionsCount ?? 1}</Table.Td>
                      <Table.Td>
                        {(w.sessionsCount ?? 1) === 1
                          ? `${w.pricePerSession ?? w.priceEur ?? 0}€`
                          : `${w.sessionsCount}×${w.pricePerSession ?? w.priceEur ?? 0}€${w.subscriptionPriceEur != null ? ` / abon. ${w.subscriptionPriceEur}€` : ''}`}
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
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
                          <Group gap={6}>
                            <Badge variant="light" color="orange">
                              pending dal. {stats.pendingParticipants}
                            </Badge>
                            <Badge variant="light" color="green">
                              confirmed dal. {stats.confirmedParticipants}
                            </Badge>
                          </Group>
                          <Group gap={6}>
                            <Badge variant="light" color="blue">
                              rezervuota {reservedParticipants}
                            </Badge>
                            <Badge variant="light" color={spotsMismatch ? 'red' : 'teal'}>
                              {spotsMismatch
                                ? `tikėtina ${expectedSpotsLeft}, dabar ${w.spotsLeft}`
                                : 'sutampa su booking'}
                            </Badge>
                          </Group>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
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
                                  draft {stats.draft}
                                </Badge>
                              ) : null}
                              {stats.cancelled > 0 ? (
                                <Badge variant="light" color="red">
                                  atšaukta {stats.cancelled}
                                </Badge>
                              ) : null}
                              {stats.expired > 0 ? (
                                <Badge variant="light" color="dark">
                                  expired {stats.expired}
                                </Badge>
                              ) : null}
                            </Group>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>{w.isWeekend ? 'Taip' : 'Ne'}</Table.Td>
                      <Table.Td>
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
                            component={Link}
                            href={`/admin/bookings?site=${selectedSite}&workshopId=${w.id}`}
                            variant="subtle"
                            size="sm"
                            aria-label="Registracijos"
                          >
                            <IconTicket size={16} />
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
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
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
                  { value: 'oneTime', label: 'Vienkartiniai dirbtuvės' },
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
                    label="Abonimento kaina (€)"
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
                  label="Listo antraštė"
                  {...editForm.getInputProps('descriptionStructured.listTitle')}
                />
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>
                      Listo elementai
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
                  {(editForm.values.descriptionStructured.listItems || []).map((item, index) => (
                    <Group key={`${String(item)}-${index}`} grow>
                      <TextInput
                        value={item}
                        onChange={(event) => {
                          const next = [...(editForm.values.descriptionStructured.listItems || [])];
                          next[index] = event.currentTarget.value;
                          editForm.setFieldValue('descriptionStructured.listItems', next);
                        }}
                      />
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => {
                          const next = [...(editForm.values.descriptionStructured.listItems || [])];
                          next.splice(index, 1);
                          editForm.setFieldValue('descriptionStructured.listItems', next);
                        }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  ))}
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
  );
}
