'use client';

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconBrandFacebook,
  IconCalendarEvent,
  IconCheck,
  IconLanguage,
  IconPlus,
  IconRefresh,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  emptyStructuredDescription,
  type StructuredDescription,
  StructuredDescriptionEditor,
  structuredDescriptionToText,
} from './StructuredDescriptionEditor';

type RecurringSite = 'ceramics' | 'yoga';
type NumberValue = number | '';

type GroupDraft = {
  id?: string;
  key: number;
  name: string;
  weekday: number;
  startTime: string;
  durationMin: NumberValue;
  capacity: NumberValue;
  locationName: string;
  teacherName: string;
  singleVisitEnabled: boolean;
  singleVisitPriceEur: NumberValue;
};

type PlanDraft = {
  id?: string;
  key: number;
  code: string;
  nameLt: string;
  nameEn: string;
  priceEur: NumberValue;
  sessionCount: NumberValue;
  validityDays: NumberValue;
  makeupLimit: NumberValue;
  lateCancelCountsAsUsed: boolean;
  noShowCountsAsUsed: boolean;
};

type FacebookSeries = {
  fbEventId: string;
  fbEventUrl: string;
  name: string;
  description: string;
  placeName: string | null;
  coverImageUrl: string | null;
  occurrences: Array<{
    id: string;
    startTime: string;
    endTime: string | null;
  }>;
};

type FacebookSeriesResponse = {
  series: FacebookSeries[];
  diagnostics?: {
    receivedEvents: number;
    futureEvents: number;
    recurringSeries: number;
  };
};

type RecurringCycleWizardProps = {
  opened: boolean;
  initialSite: RecurringSite;
  cycleId?: string | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

type RecurringCycleDetail = {
  program: {
    id: string;
    slug: string;
    nameLt: string;
    nameEn: string;
    visibility: string;
    descriptionLt: string | null;
    descriptionEn: string | null;
    descriptionStructuredLt: StructuredDescription | null;
    descriptionStructuredEn: StructuredDescription | null;
  };
  effectiveFrom: string;
  effectiveUntil: string;
  groups: Array<{
    id: string;
    name: string;
    weekday: number;
    startTime: string;
    durationMin: number;
    capacity: number;
    locationName: string;
    teacherName: string | null;
    singleVisitEnabled: boolean;
    singleVisitPriceEur: number | null;
  }>;
  plans: Array<{
    id: string;
    code: string;
    nameLt: string;
    nameEn: string;
    priceEur: number;
    sessionCount: number;
    validityDays: number;
    makeupLimit: number | null;
    lateCancelCountsAsUsed: boolean;
    noShowCountsAsUsed: boolean;
  }>;
};

const WEEKDAYS = [
  { value: '1', label: 'Pirmadienis', groupName: 'Pirmadienio' },
  { value: '2', label: 'Antradienis', groupName: 'Antradienio' },
  { value: '3', label: 'Trečiadienis', groupName: 'Trečiadienio' },
  { value: '4', label: 'Ketvirtadienis', groupName: 'Ketvirtadienio' },
  { value: '5', label: 'Penktadienis', groupName: 'Penktadienio' },
  { value: '6', label: 'Šeštadienis', groupName: 'Šeštadienio' },
  { value: '7', label: 'Sekmadienis', groupName: 'Sekmadienio' },
];

let draftKey = 0;

function nextDraftKey() {
  draftKey += 1;
  return draftKey;
}

function dateOnlyToday() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function cycleDayCount(from: string, until: string) {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${until}T00:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase('lt-LT')
    .replaceAll('ą', 'a')
    .replaceAll('č', 'c')
    .replaceAll('ę', 'e')
    .replaceAll('ė', 'e')
    .replaceAll('į', 'i')
    .replaceAll('š', 's')
    .replaceAll('ų', 'u')
    .replaceAll('ū', 'u')
    .replaceAll('ž', 'z')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function localFacebookDateTime(value: string) {
  const direct = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (direct) return { date: direct[1], time: direct[2] };

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat('lt-LT', {
    timeZone: 'Europe/Vilnius',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(parsed);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || '';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
  };
}

function isoWeekday(date: string) {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function eventDurationMinutes(startTime: string, endTime: string | null) {
  if (!endTime) return 90;
  const start = Date.parse(startTime);
  const end = Date.parse(endTime);
  const minutes = Math.round((end - start) / 60000);
  return Number.isFinite(minutes) && minutes > 0 && minutes <= 1440 ? minutes : 90;
}

function newGroup(patch: Partial<GroupDraft> = {}): GroupDraft {
  return {
    key: nextDraftKey(),
    name: '',
    weekday: 1,
    startTime: '18:00',
    durationMin: 90,
    capacity: 12,
    locationName: 'Soul Poetry studija',
    teacherName: '',
    singleVisitEnabled: false,
    singleVisitPriceEur: '',
    ...patch,
  };
}

function newPlan(patch: Partial<PlanDraft> = {}): PlanDraft {
  return {
    key: nextDraftKey(),
    code: '4KARTAI',
    nameLt: '4 užsiėmimai / 5 savaitės',
    nameEn: '4 classes / 5 weeks',
    priceEur: '',
    sessionCount: 4,
    validityDays: 35,
    makeupLimit: 4,
    lateCancelCountsAsUsed: true,
    noShowCountsAsUsed: true,
    ...patch,
  };
}

function formatFacebookRange(series: FacebookSeries) {
  const first = localFacebookDateTime(series.occurrences[0]?.startTime || '');
  const last = localFacebookDateTime(series.occurrences.at(-1)?.startTime || '');
  if (!first || !last) return '-';
  return first.date === last.date ? `${first.date} ${first.time}` : `${first.date} – ${last.date}`;
}

function numeric(value: string | number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : '';
}

export function RecurringCycleWizard({
  opened,
  initialSite,
  cycleId,
  onClose,
  onSaved,
}: RecurringCycleWizardProps) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [activeStep, setActiveStep] = useState(0);
  const [source, setSource] = useState<'manual' | 'facebook'>('manual');
  const [facebookData, setFacebookData] = useState<FacebookSeriesResponse | null>(null);
  const [facebookError, setFacebookError] = useState('');
  const [isLoadingFacebook, setIsLoadingFacebook] = useState(false);
  const [selectedFacebookEventId, setSelectedFacebookEventId] = useState('');
  const [nameLt, setNameLt] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const [descriptionLt, setDescriptionLt] = useState<StructuredDescription>(
    emptyStructuredDescription,
  );
  const [descriptionEn, setDescriptionEn] = useState<StructuredDescription>(
    emptyStructuredDescription,
  );
  const [effectiveFrom, setEffectiveFrom] = useState(dateOnlyToday());
  const [effectiveUntil, setEffectiveUntil] = useState(addDays(dateOnlyToday(), 84));
  const [publish, setPublish] = useState(true);
  const [groups, setGroups] = useState<GroupDraft[]>([newGroup()]);
  const [plans, setPlans] = useState<PlanDraft[]>([newPlan()]);
  const [isParsingDescription, setIsParsingDescription] = useState(false);
  const [isTranslatingDescription, setIsTranslatingDescription] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCycle, setIsLoadingCycle] = useState(false);
  const [cycleLoadError, setCycleLoadError] = useState('');

  const reset = useCallback(() => {
    setActiveStep(0);
    setSource('manual');
    setFacebookData(null);
    setFacebookError('');
    setIsLoadingFacebook(false);
    setSelectedFacebookEventId('');
    setNameLt('');
    setNameEn('');
    setSlug('');
    setSlugWasEdited(false);
    setDescriptionLt(emptyStructuredDescription());
    setDescriptionEn(emptyStructuredDescription());
    setEffectiveFrom(dateOnlyToday());
    setEffectiveUntil(addDays(dateOnlyToday(), 84));
    setPublish(true);
    setGroups([newGroup()]);
    setPlans([newPlan()]);
    setIsParsingDescription(false);
    setIsTranslatingDescription(false);
    setIsSaving(false);
    setIsLoadingCycle(false);
    setCycleLoadError('');
  }, []);

  const loadCycle = useCallback(async (id: string, signal?: AbortSignal) => {
    setIsLoadingCycle(true);
    setCycleLoadError('');
    try {
      const response = await fetch(`/api/admin/recurring/cycles/${id}`, {
        cache: 'no-store',
        signal,
      });
      const result = (await response.json()) as { cycle?: RecurringCycleDetail; error?: string };
      if (!response.ok || !result.cycle) {
        throw new Error(result.error || 'Nepavyko gauti užsiėmimų ciklo');
      }

      const cycle = result.cycle;
      setNameLt(cycle.program.nameLt);
      setNameEn(cycle.program.nameEn);
      setSlug(cycle.program.slug);
      setSlugWasEdited(true);
      setDescriptionLt({
        ...emptyStructuredDescription(),
        ...(cycle.program.descriptionStructuredLt || {}),
        intro: cycle.program.descriptionStructuredLt?.intro || cycle.program.descriptionLt || '',
        listItems: cycle.program.descriptionStructuredLt?.listItems || [],
      });
      setDescriptionEn({
        ...emptyStructuredDescription(),
        ...(cycle.program.descriptionStructuredEn || {}),
        intro: cycle.program.descriptionStructuredEn?.intro || cycle.program.descriptionEn || '',
        listItems: cycle.program.descriptionStructuredEn?.listItems || [],
      });
      setEffectiveFrom(cycle.effectiveFrom);
      setEffectiveUntil(cycle.effectiveUntil);
      setPublish(cycle.program.visibility === 'public');
      setGroups(
        cycle.groups.map((group) =>
          newGroup({
            id: group.id,
            name: group.name,
            weekday: group.weekday,
            startTime: group.startTime,
            durationMin: group.durationMin,
            capacity: group.capacity,
            locationName: group.locationName,
            teacherName: group.teacherName || '',
            singleVisitEnabled: group.singleVisitEnabled,
            singleVisitPriceEur: group.singleVisitPriceEur ?? '',
          }),
        ),
      );
      setPlans(
        cycle.plans.map((plan) =>
          newPlan({
            id: plan.id,
            code: plan.code,
            nameLt: plan.nameLt,
            nameEn: plan.nameEn,
            priceEur: plan.priceEur,
            sessionCount: plan.sessionCount,
            validityDays: plan.validityDays,
            makeupLimit: plan.makeupLimit ?? 0,
            lateCancelCountsAsUsed: plan.lateCancelCountsAsUsed,
            noShowCountsAsUsed: plan.noShowCountsAsUsed,
          }),
        ),
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setCycleLoadError(error instanceof Error ? error.message : 'Nepavyko gauti užsiėmimų ciklo');
    } finally {
      if (!signal?.aborted) setIsLoadingCycle(false);
    }
  }, []);

  useEffect(() => {
    if (!opened) return;
    reset();
    const controller = new AbortController();
    if (cycleId) void loadCycle(cycleId, controller.signal);
    return () => controller.abort();
  }, [cycleId, loadCycle, opened, reset]);

  const occurrenceEstimate = useMemo(() => {
    const days = cycleDayCount(effectiveFrom, effectiveUntil);
    return days > 0 ? groups.length * (Math.floor((days - 1) / 7) + 1) : 0;
  }, [effectiveFrom, effectiveUntil, groups.length]);

  const close = () => {
    if (isSaving) return;
    onClose();
  };

  const updateNameLt = (value: string) => {
    setNameLt(value);
    if (!slugWasEdited) setSlug(slugify(value));
  };

  const updateGroup = (key: number, patch: Partial<GroupDraft>) => {
    setGroups((current) =>
      current.map((group) => (group.key === key ? { ...group, ...patch } : group)),
    );
  };

  const updatePlan = (key: number, patch: Partial<PlanDraft>) => {
    setPlans((current) => current.map((plan) => (plan.key === key ? { ...plan, ...patch } : plan)));
  };

  const removeGroup = (group: GroupDraft) => {
    if (
      group.id &&
      !window.confirm(`Pašalinti grupę „${group.name}“ iš ciklo? Išsaugojus ji bus archyvuota.`)
    ) {
      return;
    }
    setGroups((current) => current.filter((item) => item.key !== group.key));
  };

  const removePlan = (plan: PlanDraft) => {
    if (
      plan.id &&
      !window.confirm(`Pašalinti planą „${plan.nameLt}“ iš ciklo? Išsaugojus jis bus archyvuotas.`)
    ) {
      return;
    }
    setPlans((current) => current.filter((item) => item.key !== plan.key));
  };

  const loadFacebookSeries = async () => {
    setIsLoadingFacebook(true);
    setFacebookError('');
    try {
      const response = await fetch('/api/admin/recurring/facebook-events', {
        cache: 'no-store',
      });
      const result = (await response.json()) as FacebookSeriesResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Nepavyko gauti Facebook ciklų');
      setFacebookData(result);
    } catch (error) {
      setFacebookError(error instanceof Error ? error.message : 'Nepavyko gauti Facebook ciklų');
    } finally {
      setIsLoadingFacebook(false);
    }
  };

  const changeSource = (value: string) => {
    const nextSource = value === 'facebook' ? 'facebook' : 'manual';
    setSource(nextSource);
    if (nextSource === 'facebook' && !facebookData && !isLoadingFacebook) {
      void loadFacebookSeries();
    }
  };

  const applyFacebookSeries = (series: FacebookSeries) => {
    const parsedOccurrences = series.occurrences
      .map((occurrence) => {
        const local = localFacebookDateTime(occurrence.startTime);
        return local ? { occurrence, ...local } : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (parsedOccurrences.length === 0) {
      notifications.show({ message: 'Facebook cikle nėra tinkamų būsimų datų', color: 'yellow' });
      return;
    }

    const generatedSlug = slugify(series.name);
    const scheduleBySlot = new Map<string, GroupDraft>();
    for (const item of parsedOccurrences) {
      const weekday = isoWeekday(item.date);
      const key = `${weekday}:${item.time}`;
      if (!scheduleBySlot.has(key)) {
        const weekdayName = WEEKDAYS.find((option) => Number(option.value) === weekday)?.groupName;
        scheduleBySlot.set(
          key,
          newGroup({
            name: `${weekdayName || 'Savaitinė'} ${item.time} grupė`,
            weekday,
            startTime: item.time,
            durationMin: eventDurationMinutes(item.occurrence.startTime, item.occurrence.endTime),
            locationName: series.placeName || 'Soul Poetry studija',
          }),
        );
      }
    }

    const firstDate = parsedOccurrences[0]?.date || dateOnlyToday();
    const lastDate = parsedOccurrences.at(-1)?.date || firstDate;
    const eventCount = parsedOccurrences.length;
    const validityDays = Math.max(cycleDayCount(firstDate, lastDate), 1);
    const planCode = `${generatedSlug.replaceAll('-', '_').toUpperCase().slice(0, 40)}_${eventCount}`;

    setSelectedFacebookEventId(series.fbEventId);
    setNameLt(series.name);
    setNameEn(series.name);
    setSlug(generatedSlug);
    setSlugWasEdited(false);
    setDescriptionLt({ ...emptyStructuredDescription(), intro: series.description });
    setDescriptionEn(emptyStructuredDescription());
    setEffectiveFrom(firstDate);
    setEffectiveUntil(lastDate);
    setGroups([...scheduleBySlot.values()]);
    setPlans([
      newPlan({
        code: planCode,
        nameLt: `${eventCount} užsiėmimų ciklas`,
        nameEn: `${eventCount}-class cycle`,
        sessionCount: eventCount,
        validityDays,
        makeupLimit: eventCount,
      }),
    ]);
    notifications.show({ message: 'Ciklo duomenys užpildyti iš Facebook', color: 'green' });
  };

  const parseDescription = async () => {
    const rawText = structuredDescriptionToText(descriptionLt);
    if (!rawText) {
      notifications.show({ message: 'Nėra lietuviško teksto skaidymui', color: 'yellow' });
      return;
    }

    setIsParsingDescription(true);
    try {
      const response = await fetch('/api/admin/workshops/parse-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ rawText }),
      });
      const result = (await response.json()) as {
        descriptionStructured?: StructuredDescription;
        error?: string;
      };
      if (!response.ok || !result.descriptionStructured) {
        throw new Error(result.error || 'Nepavyko suskaidyti aprašymo');
      }

      setDescriptionLt(result.descriptionStructured);
      notifications.show({ message: 'Lietuviškas aprašymas suskaidytas su DI', color: 'green' });
    } catch (error) {
      notifications.show({
        message: error instanceof Error ? error.message : 'Nepavyko suskaidyti aprašymo',
        color: 'red',
      });
    } finally {
      setIsParsingDescription(false);
    }
  };

  const translateToEnglish = async () => {
    const sourceValues = [
      nameLt,
      descriptionLt.intro,
      descriptionLt.paragraph1,
      descriptionLt.paragraph2,
      descriptionLt.paragraph3,
      descriptionLt.listTitle,
      ...descriptionLt.listItems,
      descriptionLt.closing1,
      descriptionLt.closing2,
      descriptionLt.closing3,
    ];
    const texts = sourceValues.map((value) => value.trim()).filter(Boolean);
    if (texts.length === 0) {
      notifications.show({ message: 'Nėra lietuviško teksto vertimui', color: 'yellow' });
      return;
    }

    setIsTranslatingDescription(true);
    try {
      const response = await fetch('/api/admin/content/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ texts }),
      });
      const result = (await response.json()) as { translations?: string[]; error?: string };
      if (!response.ok || !Array.isArray(result.translations)) {
        throw new Error(result.error || 'Nepavyko išversti aprašymo');
      }

      let translationIndex = 0;
      const translated = (sourceValue: string) =>
        sourceValue.trim() ? result.translations?.[translationIndex++] || '' : '';

      setNameEn(translated(nameLt));
      setDescriptionEn({
        intro: translated(descriptionLt.intro),
        paragraph1: translated(descriptionLt.paragraph1),
        paragraph2: translated(descriptionLt.paragraph2),
        paragraph3: translated(descriptionLt.paragraph3),
        listTitle: translated(descriptionLt.listTitle),
        listItems: descriptionLt.listItems.map(translated),
        closing1: translated(descriptionLt.closing1),
        closing2: translated(descriptionLt.closing2),
        closing3: translated(descriptionLt.closing3),
      });
      notifications.show({
        message: 'Pavadinimas ir aprašymas išversti į anglų kalbą',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        message: error instanceof Error ? error.message : 'Nepavyko išversti aprašymo',
        color: 'red',
      });
    } finally {
      setIsTranslatingDescription(false);
    }
  };

  const validateStep = (step: number) => {
    if (step === 0) {
      if (!nameLt.trim() || !nameEn.trim()) return 'Įrašykite ciklo pavadinimą abiem kalbomis';
      if (!/^[a-z0-9-]{2,120}$/.test(slug)) return 'Patikrinkite URL identifikatorių';
      const days = cycleDayCount(effectiveFrom, effectiveUntil);
      if (days < 1) return 'Pabaigos data negali būti ankstesnė už pradžios datą';
      if (days > 365) return 'Ciklo laikotarpis negali būti ilgesnis nei 365 dienos';
    }

    if (step === 1) {
      const invalid = groups.find(
        (group) =>
          !group.name.trim() ||
          !group.locationName.trim() ||
          typeof group.durationMin !== 'number' ||
          group.durationMin <= 0 ||
          typeof group.capacity !== 'number' ||
          group.capacity <= 0 ||
          (group.singleVisitEnabled &&
            (typeof group.singleVisitPriceEur !== 'number' || group.singleVisitPriceEur <= 0)),
      );
      if (invalid) return 'Užpildykite visus privalomus grupių laukus';
      const slots = groups.map((group) => `${group.weekday}:${group.startTime}`);
      if (new Set(slots).size !== slots.length)
        return 'Grupių savaitės diena ir laikas turi skirtis';
    }

    if (step === 2) {
      const invalid = plans.find(
        (plan) =>
          !/^[A-Za-z0-9_-]{1,50}$/.test(plan.code) ||
          !plan.nameLt.trim() ||
          !plan.nameEn.trim() ||
          typeof plan.priceEur !== 'number' ||
          plan.priceEur < 0 ||
          typeof plan.sessionCount !== 'number' ||
          plan.sessionCount <= 0 ||
          typeof plan.validityDays !== 'number' ||
          plan.validityDays <= 0 ||
          typeof plan.makeupLimit !== 'number' ||
          plan.makeupLimit < 0 ||
          plan.makeupLimit > plan.sessionCount ||
          plan.sessionCount > Math.floor((plan.validityDays - 1) / 7) + 1,
      );
      if (invalid) {
        return 'Patikrinkite planą: kainą, užsiėmimų skaičių, galiojimą ir perkėlimų limitą';
      }
      const codes = plans.map((plan) => plan.code.trim().toUpperCase());
      if (new Set(codes).size !== codes.length) return 'Planų kodai turi būti skirtingi';
    }

    return null;
  };

  const next = () => {
    const error = validateStep(activeStep);
    if (error) {
      notifications.show({ message: error, color: 'yellow' });
      return;
    }
    setActiveStep((current) => Math.min(current + 1, 3));
  };

  const saveCycle = async () => {
    for (let step = 0; step <= 2; step += 1) {
      const error = validateStep(step);
      if (error) {
        setActiveStep(step);
        notifications.show({ message: error, color: 'yellow' });
        return;
      }
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        cycleId ? `/api/admin/recurring/cycles/${cycleId}` : '/api/admin/recurring/cycles',
        {
          method: cycleId ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({
            ...(cycleId ? {} : { site: initialSite }),
            slug,
            nameLt: nameLt.trim(),
            nameEn: nameEn.trim(),
            descriptionLt: descriptionLt.intro.trim() || undefined,
            descriptionEn: descriptionEn.intro.trim() || undefined,
            descriptionStructuredLt: descriptionLt,
            descriptionStructuredEn: descriptionEn,
            effectiveFrom,
            effectiveUntil,
            publish,
            groups: groups.map(({ key: _key, ...group }) => ({
              ...group,
              teacherName: group.teacherName.trim() || undefined,
              singleVisitPriceEur: group.singleVisitEnabled
                ? Number(group.singleVisitPriceEur)
                : undefined,
              durationMin: Number(group.durationMin),
              capacity: Number(group.capacity),
            })),
            plans: plans.map(({ key: _key, ...plan }) => ({
              ...plan,
              code: plan.code.trim().toUpperCase(),
              priceEur: Number(plan.priceEur),
              sessionCount: Number(plan.sessionCount),
              validityDays: Number(plan.validityDays),
              makeupLimit: Number(plan.makeupLimit),
            })),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error ||
            (cycleId ? 'Nepavyko atnaujinti užsiėmimų ciklo' : 'Nepavyko sukurti užsiėmimų ciklo'),
        );
      }

      notifications.show({
        message: cycleId
          ? `Ciklas atnaujintas. Sukurta ${result.occurrencesCreated || 0}, atnaujinta ${result.occurrencesUpdated || 0} būsimų užsiėmimų.`
          : `Ciklas sukurtas. Sugeneruota ${result.occurrencesCreated} užsiėmimų.`,
        color: 'green',
      });
      await onSaved();
      onClose();
    } catch (error) {
      notifications.show({
        message:
          error instanceof Error
            ? error.message
            : cycleId
              ? 'Nepavyko atnaujinti užsiėmimų ciklo'
              : 'Nepavyko sukurti užsiėmimų ciklo',
        color: 'red',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={cycleId ? 'Redaguoti užsiėmimų ciklą' : 'Naujas užsiėmimų ciklas'}
      size="xl"
      fullScreen={Boolean(isMobile)}
      closeOnClickOutside={!isSaving}
      closeOnEscape={!isSaving}
    >
      <Stack gap="lg">
        <Alert color="blue" icon={<IconCalendarEvent size={18} />}>
          {cycleId
            ? 'Galite pakeisti ciklo turinį, grupes, planus ir būsimų užsiėmimų laikotarpį. Laiko pakeitimai su esamomis rezervacijomis bus saugiai sustabdyti.'
            : 'Kuriama tikroji abonementų programa, jos savaitinės grupės, planai ir visi pasirinkto laikotarpio užsiėmimai.'}
        </Alert>

        {isLoadingCycle ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : null}
        {cycleLoadError ? <Alert color="red">{cycleLoadError}</Alert> : null}

        <Stepper
          active={activeStep}
          allowNextStepsSelect={false}
          size="sm"
          style={{ display: isLoadingCycle || cycleLoadError ? 'none' : undefined }}
        >
          <Stepper.Step label="Ciklas">
            <Stack gap="md" mt="lg">
              {!cycleId ? (
                <SegmentedControl
                  fullWidth
                  value={source}
                  onChange={changeSource}
                  data={[
                    { value: 'manual', label: 'Pildyti rankiniu būdu' },
                    { value: 'facebook', label: 'Užpildyti iš Facebook' },
                  ]}
                />
              ) : null}

              {source === 'facebook' ? (
                <Card withBorder padding="md">
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <div>
                        <Text fw={700}>Facebook renginių ciklai</Text>
                        <Text size="sm" c="dimmed">
                          Rodomi ciklai, turintys bent dvi būsimas datas.
                        </Text>
                      </div>
                      <ActionIcon
                        variant="light"
                        aria-label="Atnaujinti Facebook ciklus"
                        onClick={() => void loadFacebookSeries()}
                        loading={isLoadingFacebook}
                      >
                        <IconRefresh size={17} />
                      </ActionIcon>
                    </Group>

                    {facebookError ? <Alert color="red">{facebookError}</Alert> : null}
                    {isLoadingFacebook ? (
                      <Group justify="center" py="md">
                        <Loader size="sm" />
                      </Group>
                    ) : null}
                    {!isLoadingFacebook && facebookData?.series.length === 0 ? (
                      <Text size="sm" c="dimmed">
                        Būsimų Facebook ciklų nerasta. Galite pildyti duomenis rankiniu būdu.
                      </Text>
                    ) : null}

                    <Stack gap="xs" mah={280} style={{ overflowY: 'auto' }}>
                      {facebookData?.series.map((series) => (
                        <Card key={series.fbEventId} withBorder padding="sm">
                          <Group justify="space-between" align="center" wrap="nowrap">
                            <div style={{ minWidth: 0 }}>
                              <Text fw={600} lineClamp={2}>
                                {series.name}
                              </Text>
                              <Text size="sm" c="dimmed">
                                {formatFacebookRange(series)} · {series.occurrences.length} datos
                              </Text>
                            </div>
                            <Button
                              size="xs"
                              variant={
                                selectedFacebookEventId === series.fbEventId ? 'filled' : 'light'
                              }
                              leftSection={<IconBrandFacebook size={15} />}
                              onClick={() => applyFacebookSeries(series)}
                            >
                              {selectedFacebookEventId === series.fbEventId
                                ? 'Pasirinkta'
                                : 'Naudoti'}
                            </Button>
                          </Group>
                        </Card>
                      ))}
                    </Stack>
                  </Stack>
                </Card>
              ) : null}

              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <TextInput
                  label="Pavadinimas lietuviškai"
                  required
                  value={nameLt}
                  onChange={(event) => updateNameLt(event.currentTarget.value)}
                />
                <TextInput
                  label="Pavadinimas angliškai"
                  required
                  value={nameEn}
                  onChange={(event) => setNameEn(event.currentTarget.value)}
                />
              </SimpleGrid>
              <Switch
                checked={publish}
                onChange={(event) => setPublish(event.currentTarget.checked)}
                label="Ciklas matomas klientams"
                description="Išjungus ciklas bus paslėptas nuo naujų pirkėjų."
              />
              <TextInput
                label="URL identifikatorius"
                description="Mažosios raidės, skaičiai ir brūkšneliai"
                required
                value={slug}
                onChange={(event) => {
                  setSlugWasEdited(true);
                  setSlug(slugify(event.currentTarget.value));
                }}
              />
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <TextInput
                  type="date"
                  label="Ciklo pradžia"
                  required
                  value={effectiveFrom}
                  onChange={(event) => setEffectiveFrom(event.currentTarget.value)}
                />
                <TextInput
                  type="date"
                  label="Ciklo pabaiga"
                  required
                  min={effectiveFrom}
                  value={effectiveUntil}
                  onChange={(event) => setEffectiveUntil(event.currentTarget.value)}
                />
              </SimpleGrid>
              <Card withBorder padding="md">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Title order={5}>Aprašymas lietuviškai</Title>
                      <Text size="sm" c="dimmed">
                        Įklijuokite pradinį tekstą ir DI išskaidys jį į svetainės turinio laukus.
                      </Text>
                    </div>
                    <Button
                      type="button"
                      size="xs"
                      variant="light"
                      leftSection={<IconSparkles size={15} />}
                      loading={isParsingDescription}
                      onClick={() => void parseDescription()}
                    >
                      Suskaidyti su DI
                    </Button>
                  </Group>
                  <StructuredDescriptionEditor value={descriptionLt} onChange={setDescriptionLt} />
                </Stack>
              </Card>
              <Card withBorder padding="md">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Title order={5}>Aprašymas angliškai</Title>
                      <Text size="sm" c="dimmed">
                        Vertimo mygtukas užpildo anglišką pavadinimą ir visus aprašymo laukus.
                      </Text>
                    </div>
                    <Button
                      type="button"
                      size="xs"
                      variant="light"
                      leftSection={<IconLanguage size={15} />}
                      loading={isTranslatingDescription}
                      onClick={() => void translateToEnglish()}
                    >
                      Išversti į anglų kalbą
                    </Button>
                  </Group>
                  <StructuredDescriptionEditor value={descriptionEn} onChange={setDescriptionEn} />
                </Stack>
              </Card>
              <Alert color={publish ? 'green' : 'yellow'} icon={<IconCheck size={18} />}>
                {publish
                  ? 'Ciklas bus paskelbtas ir matomas klientams.'
                  : 'Ciklas bus išsaugotas, tačiau klientams nebus rodomas.'}
              </Alert>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Grupės">
            <Stack gap="md" mt="lg">
              <Group justify="space-between">
                <div>
                  <Title order={4}>Savaitinės grupės</Title>
                  <Text size="sm" c="dimmed">
                    Pridėkite visus laikus, tarp kurių klientai galės persikelti.
                  </Text>
                </div>
                <Button
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setGroups((current) => [...current, newGroup()])}
                >
                  Pridėti grupę
                </Button>
              </Group>

              {groups.map((group, index) => (
                <Card key={group.key} withBorder padding="md">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={700}>Grupė {index + 1}</Text>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        aria-label={`Pašalinti ${index + 1} grupę`}
                        disabled={groups.length === 1}
                        onClick={() => removeGroup(group)}
                      >
                        <IconTrash size={17} />
                      </ActionIcon>
                    </Group>
                    <TextInput
                      label="Grupės pavadinimas"
                      required
                      value={group.name}
                      onChange={(event) =>
                        updateGroup(group.key, { name: event.currentTarget.value })
                      }
                    />
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
                      <Select
                        label="Savaitės diena"
                        required
                        allowDeselect={false}
                        data={WEEKDAYS}
                        value={String(group.weekday)}
                        onChange={(value) =>
                          updateGroup(group.key, { weekday: Number(value || 1) })
                        }
                      />
                      <TextInput
                        type="time"
                        label="Pradžios laikas"
                        required
                        value={group.startTime}
                        onChange={(event) =>
                          updateGroup(group.key, { startTime: event.currentTarget.value })
                        }
                      />
                      <NumberInput
                        label="Trukmė"
                        suffix=" min."
                        min={1}
                        max={1440}
                        required
                        value={group.durationMin}
                        onChange={(value) =>
                          updateGroup(group.key, { durationMin: numeric(value) })
                        }
                      />
                      <NumberInput
                        label="Vietų skaičius"
                        min={1}
                        max={1000}
                        required
                        value={group.capacity}
                        onChange={(value) => updateGroup(group.key, { capacity: numeric(value) })}
                      />
                    </SimpleGrid>
                    <SimpleGrid cols={{ base: 1, md: 2 }}>
                      <TextInput
                        label="Vieta"
                        required
                        value={group.locationName}
                        onChange={(event) =>
                          updateGroup(group.key, { locationName: event.currentTarget.value })
                        }
                      />
                      <TextInput
                        label="Mokytojas / vedėjas"
                        value={group.teacherName}
                        onChange={(event) =>
                          updateGroup(group.key, { teacherName: event.currentTarget.value })
                        }
                      />
                    </SimpleGrid>
                    <Group align="flex-end">
                      <Switch
                        checked={group.singleVisitEnabled}
                        onChange={(event) =>
                          updateGroup(group.key, {
                            singleVisitEnabled: event.currentTarget.checked,
                          })
                        }
                        label="Leisti pirkti vieną apsilankymą"
                      />
                      {group.singleVisitEnabled ? (
                        <NumberInput
                          label="Vieno apsilankymo kaina"
                          suffix=" EUR"
                          min={0.01}
                          decimalScale={2}
                          value={group.singleVisitPriceEur}
                          onChange={(value) =>
                            updateGroup(group.key, { singleVisitPriceEur: numeric(value) })
                          }
                          w={220}
                        />
                      ) : null}
                    </Group>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Planai">
            <Stack gap="md" mt="lg">
              <Group justify="space-between">
                <div>
                  <Title order={4}>Abonemento planai</Title>
                  <Text size="sm" c="dimmed">
                    Nurodykite, kiek užsiėmimų klientas įsigyja ir per kiek dienų juos panaudoja.
                  </Text>
                </div>
                <Button
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setPlans((current) => [...current, newPlan({ code: '' })])}
                >
                  Pridėti planą
                </Button>
              </Group>

              {plans.map((plan, index) => (
                <Card key={plan.key} withBorder padding="md">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={700}>Planas {index + 1}</Text>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        aria-label={`Pašalinti ${index + 1} planą`}
                        disabled={plans.length === 1}
                        onClick={() => removePlan(plan)}
                      >
                        <IconTrash size={17} />
                      </ActionIcon>
                    </Group>
                    <SimpleGrid cols={{ base: 1, md: 3 }}>
                      <TextInput
                        label="Plano kodas"
                        description="Raidės, skaičiai, _ arba -"
                        required
                        value={plan.code}
                        onChange={(event) =>
                          updatePlan(plan.key, {
                            code: event.currentTarget.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9_-]/g, ''),
                          })
                        }
                      />
                      <TextInput
                        label="Pavadinimas lietuviškai"
                        required
                        value={plan.nameLt}
                        onChange={(event) =>
                          updatePlan(plan.key, { nameLt: event.currentTarget.value })
                        }
                      />
                      <TextInput
                        label="Pavadinimas angliškai"
                        required
                        value={plan.nameEn}
                        onChange={(event) =>
                          updatePlan(plan.key, { nameEn: event.currentTarget.value })
                        }
                      />
                    </SimpleGrid>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
                      <NumberInput
                        label="Kaina"
                        suffix=" EUR"
                        min={0}
                        decimalScale={2}
                        required
                        value={plan.priceEur}
                        onChange={(value) => updatePlan(plan.key, { priceEur: numeric(value) })}
                      />
                      <NumberInput
                        label="Užsiėmimų skaičius"
                        min={1}
                        required
                        value={plan.sessionCount}
                        onChange={(value) => updatePlan(plan.key, { sessionCount: numeric(value) })}
                      />
                      <NumberInput
                        label="Galiojimas"
                        suffix=" d."
                        min={1}
                        required
                        value={plan.validityDays}
                        onChange={(value) => updatePlan(plan.key, { validityDays: numeric(value) })}
                      />
                      <NumberInput
                        label="Perkėlimų limitas"
                        min={0}
                        required
                        value={plan.makeupLimit}
                        onChange={(value) => updatePlan(plan.key, { makeupLimit: numeric(value) })}
                      />
                    </SimpleGrid>
                    <SimpleGrid cols={{ base: 1, md: 2 }}>
                      <Switch
                        checked={plan.lateCancelCountsAsUsed}
                        onChange={(event) =>
                          updatePlan(plan.key, {
                            lateCancelCountsAsUsed: event.currentTarget.checked,
                          })
                        }
                        label="Pavėluotą atšaukimą skaičiuoti kaip panaudotą"
                      />
                      <Switch
                        checked={plan.noShowCountsAsUsed}
                        onChange={(event) =>
                          updatePlan(plan.key, {
                            noShowCountsAsUsed: event.currentTarget.checked,
                          })
                        }
                        label="Neatvykimą skaičiuoti kaip panaudotą"
                      />
                    </SimpleGrid>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Patvirtinimas">
            <Stack gap="md" mt="lg">
              <Card withBorder padding="md">
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text size="sm" c="dimmed">
                        Ciklas
                      </Text>
                      <Title order={4}>{nameLt}</Title>
                      <Text size="sm" c="dimmed">
                        {initialSite === 'yoga' ? 'Joga' : 'Keramika'} · {effectiveFrom} –{' '}
                        {effectiveUntil}
                      </Text>
                    </div>
                    <Badge color={publish ? 'green' : 'yellow'} variant="light">
                      {publish ? 'Bus paskelbtas' : 'Bus paslėptas'}
                    </Badge>
                  </Group>
                  <Divider />
                  <Text size="sm">
                    {groups.length} grupė(-ės), {plans.length} planas(-ai), apie{' '}
                    {occurrenceEstimate} užsiėmimų.
                  </Text>
                </Stack>
              </Card>

              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <Card withBorder padding="md">
                  <Stack gap="xs">
                    <Text fw={700}>Grupės</Text>
                    {groups.map((group) => (
                      <div key={group.key}>
                        <Text size="sm" fw={600}>
                          {group.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {WEEKDAYS[group.weekday - 1]?.label} {group.startTime} ·{' '}
                          {group.durationMin} min. · {group.capacity} vietų
                        </Text>
                      </div>
                    ))}
                  </Stack>
                </Card>
                <Card withBorder padding="md">
                  <Stack gap="xs">
                    <Text fw={700}>Planai</Text>
                    {plans.map((plan) => (
                      <div key={plan.key}>
                        <Text size="sm" fw={600}>
                          {plan.nameLt}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {plan.sessionCount} užsiėmimai · {plan.validityDays} d. · {plan.priceEur}{' '}
                          EUR
                        </Text>
                      </div>
                    ))}
                  </Stack>
                </Card>
              </SimpleGrid>

              <Alert color={publish ? 'green' : 'yellow'} icon={<IconCheck size={18} />}>
                {publish
                  ? 'Patvirtinus ciklas ir jo laikai taps matomi klientų svetainėje.'
                  : 'Patvirtinus pakeitimai bus išsaugoti, bet ciklas klientams liks paslėptas.'}
              </Alert>
            </Stack>
          </Stepper.Step>
        </Stepper>

        <Divider />
        <Group justify="space-between">
          <Button
            variant="default"
            onClick={activeStep === 0 ? close : () => setActiveStep(activeStep - 1)}
          >
            {activeStep === 0 ? 'Uždaryti' : 'Atgal'}
          </Button>
          {!isLoadingCycle && !cycleLoadError && activeStep < 3 ? (
            <Button onClick={next}>Toliau</Button>
          ) : !isLoadingCycle && !cycleLoadError ? (
            <Button loading={isSaving} leftSection={<IconCheck size={17} />} onClick={saveCycle}>
              {cycleId ? 'Išsaugoti pakeitimus' : 'Sukurti ciklą'}
            </Button>
          ) : null}
        </Group>
      </Stack>
    </Modal>
  );
}
