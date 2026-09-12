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
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconBrandFacebook,
  IconCalendarEvent,
  IconCheck,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type RecurringSite = 'ceramics' | 'yoga';
type NumberValue = number | '';

type GroupDraft = {
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
  onClose: () => void;
  onCreated: () => void | Promise<void>;
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
  onClose,
  onCreated,
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
  const [descriptionLt, setDescriptionLt] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(dateOnlyToday());
  const [effectiveUntil, setEffectiveUntil] = useState(addDays(dateOnlyToday(), 84));
  const [groups, setGroups] = useState<GroupDraft[]>([newGroup()]);
  const [plans, setPlans] = useState<PlanDraft[]>([newPlan()]);
  const [isSaving, setIsSaving] = useState(false);

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
    setDescriptionLt('');
    setDescriptionEn('');
    setEffectiveFrom(dateOnlyToday());
    setEffectiveUntil(addDays(dateOnlyToday(), 84));
    setGroups([newGroup()]);
    setPlans([newPlan()]);
    setIsSaving(false);
  }, []);

  useEffect(() => {
    if (opened) reset();
  }, [opened, reset]);

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
    setDescriptionLt(series.description);
    setDescriptionEn(series.description);
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

  const createCycle = async () => {
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
      const response = await fetch('/api/admin/recurring/cycles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          site: initialSite,
          slug,
          nameLt: nameLt.trim(),
          nameEn: nameEn.trim(),
          descriptionLt: descriptionLt.trim() || undefined,
          descriptionEn: descriptionEn.trim() || undefined,
          effectiveFrom,
          effectiveUntil,
          publish: true,
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
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nepavyko sukurti užsiėmimų ciklo');

      notifications.show({
        message: `Ciklas sukurtas. Sugeneruota ${result.occurrencesCreated} užsiėmimų.`,
        color: 'green',
      });
      await onCreated();
      onClose();
    } catch (error) {
      notifications.show({
        message: error instanceof Error ? error.message : 'Nepavyko sukurti užsiėmimų ciklo',
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
      title="Naujas užsiėmimų ciklas"
      size="xl"
      fullScreen={Boolean(isMobile)}
      closeOnClickOutside={!isSaving}
      closeOnEscape={!isSaving}
    >
      <Stack gap="lg">
        <Alert color="blue" icon={<IconCalendarEvent size={18} />}>
          Kuriama tikroji abonementų programa, jos savaitinės grupės, planai ir visi pasirinkto
          laikotarpio užsiėmimai.
        </Alert>

        <Stepper active={activeStep} allowNextStepsSelect={false} size="sm">
          <Stepper.Step label="Ciklas">
            <Stack gap="md" mt="lg">
              <SegmentedControl
                fullWidth
                value={source}
                onChange={changeSource}
                data={[
                  { value: 'manual', label: 'Pildyti rankiniu būdu' },
                  { value: 'facebook', label: 'Užpildyti iš Facebook' },
                ]}
              />

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
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <Textarea
                  label="Aprašymas lietuviškai"
                  minRows={3}
                  value={descriptionLt}
                  onChange={(event) => setDescriptionLt(event.currentTarget.value)}
                />
                <Textarea
                  label="Aprašymas angliškai"
                  minRows={3}
                  value={descriptionEn}
                  onChange={(event) => setDescriptionEn(event.currentTarget.value)}
                />
              </SimpleGrid>
              <Alert color="green" icon={<IconCheck size={18} />}>
                Sukurtas ciklas bus iš karto paskelbtas ir matomas klientams.
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
                        onClick={() =>
                          setGroups((current) => current.filter((item) => item.key !== group.key))
                        }
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
                        onClick={() =>
                          setPlans((current) => current.filter((item) => item.key !== plan.key))
                        }
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
                    <Badge color="green" variant="light">
                      Bus paskelbtas
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

              <Alert color="green" icon={<IconCheck size={18} />}>
                Patvirtinus ciklas ir jo laikai iš karto taps matomi klientų svetainėje.
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
          {activeStep < 3 ? (
            <Button onClick={next}>Toliau</Button>
          ) : (
            <Button loading={isSaving} leftSection={<IconCheck size={17} />} onClick={createCycle}>
              Sukurti ciklą
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
