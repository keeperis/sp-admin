'use client';

import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconRefresh } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import {
  type EnrollmentPlan,
  enrollmentPlans,
  enrollmentPrice,
  preferredEnrollmentPlan,
} from '@/lib/recurring/enrollment-plans';
import { nextGroupDate, type ParticipantEnrollment } from '@/lib/recurring/participants';
import type { SiteKey } from '@/lib/site';
import { GroupAttendanceTable } from './GroupAttendanceTable';

type Program = { id: string; nameLt: string; status: string };
type ClassGroup = {
  id: string;
  programId: string;
  name: string;
  status: string;
  weekday: number;
  startTime: string;
  durationMin: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
  singleVisitEnabled: boolean;
  singleVisitPriceEur: number | null;
};

const WEEKDAYS = [
  'pirmadieniais',
  'antradieniais',
  'trečiadieniais',
  'ketvirtadieniais',
  'penktadieniais',
  'šeštadieniais',
  'sekmadieniais',
];
const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Nepavyko gauti dalyvių duomenų.');
  return result;
};
const apiUrl = (resource: string, params: Record<string, string>) =>
  `/api/admin/recurring/${resource}?${new URLSearchParams(params)}`;

export function GroupParticipants({
  site,
  programs,
  groups,
  onViewParticipant,
  loadError,
  loading,
}: {
  site: SiteKey;
  programs: Program[];
  groups: ClassGroup[];
  onViewParticipant: (subscriptionId: string) => Promise<void>;
  loadError?: string;
  loading: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [manualOpened, setManualOpened] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualGroupId, setManualGroupId] = useState<string>();
  const [enrollment, setEnrollment] = useState<ParticipantEnrollment>();
  const programById = new Map(programs.map((program) => [program.id, program]));
  const sortedGroups = [...groups].sort(
    (a, b) =>
      (programById.get(a.programId)?.nameLt || '').localeCompare(
        programById.get(b.programId)?.nameLt || '',
        'lt',
      ) ||
      a.weekday - b.weekday ||
      a.startTime.localeCompare(b.startTime) ||
      a.name.localeCompare(b.name, 'lt'),
  );
  const openManual = (groupId?: string, selectedEnrollment?: ParticipantEnrollment) => {
    setManualGroupId(groupId);
    setEnrollment(selectedEnrollment);
    setManualOpened(true);
  };

  return (
    <Card shadow="sm" p={{ base: 6, sm: 'lg' }} radius="md" withBorder style={{ minWidth: 0 }}>
      <Stack gap="lg" style={{ minWidth: 0 }}>
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Title order={4} style={{ minWidth: 0 }}>
              Grupių dalyviai ir lankymas
            </Title>
            <Button
              variant="subtle"
              style={{ flexShrink: 0 }}
              leftSection={<IconRefresh size={16} />}
              onClick={() =>
                void mutate((key) => typeof key === 'string' && key.includes('/attendance?'))
              }
            >
              Atnaujinti
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            Visos grupės ir jų užsiėmimų datos. Paspauskite langelį lankymui pažymėti, o dalyvio
            vardą — jo informacijai peržiūrėti.
          </Text>
        </Stack>
        {loadError ? (
          <Alert color="red" title="Nepavyko įkelti grupių">
            {loadError}
          </Alert>
        ) : loading ? (
          <Loader size="sm" />
        ) : sortedGroups.length === 0 ? (
          <Text c="dimmed">Šiame projekte grupių dar nėra. Sukurkite užsiėmimų ciklą.</Text>
        ) : (
          sortedGroups.map((group) => (
            <GroupAttendanceTable
              key={group.id}
              site={site}
              group={group}
              programName={programById.get(group.programId)?.nameLt || 'Užsiėmimų ciklas'}
              canAdd={
                group.status === 'active' && programById.get(group.programId)?.status === 'active'
              }
              onAddParticipant={() => openManual(group.id)}
              onEnroll={(selected) => openManual(group.id, selected)}
              onViewParticipant={onViewParticipant}
            />
          ))
        )}
      </Stack>
      <Modal
        opened={manualOpened}
        onClose={() => {
          if (!manualSaving) setManualOpened(false);
        }}
        closeOnClickOutside={!manualSaving}
        closeOnEscape={!manualSaving}
        withCloseButton={!manualSaving}
        title={
          enrollment
            ? enrollment.kind === 'pass'
              ? 'Naujas abonemento periodas'
              : 'Vienas apsilankymas'
            : 'Pridėti dalyvį rankiniu būdu'
        }
        size="lg"
      >
        {manualOpened && (
          <ManualParticipantForm
            site={site}
            programs={programs}
            groups={groups}
            initialGroupId={manualGroupId}
            initialDate={enrollment?.date}
            enrollment={enrollment}
            onSavingChange={setManualSaving}
            onSaved={(id) => {
              setManualOpened(false);
              if (!enrollment) void onViewParticipant(id);
            }}
          />
        )}
      </Modal>
    </Card>
  );
}

function ManualParticipantForm({
  site,
  programs,
  groups,
  initialGroupId,
  initialProgramId,
  initialDate,
  enrollment,
  onSavingChange,
  onSaved,
}: {
  site: SiteKey;
  programs: Program[];
  groups: ClassGroup[];
  initialGroupId?: string;
  initialProgramId?: string;
  initialDate?: string;
  enrollment?: ParticipantEnrollment;
  onSavingChange: (saving: boolean) => void;
  onSaved: (id: string, groupId: string) => void;
}) {
  const { mutate } = useSWRConfig();
  const firstGroup = groups.find(
    (group) => group.id === initialGroupId && group.status === 'active',
  );
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState('');
  const form = useForm({
    initialValues: {
      programId: firstGroup?.programId || initialProgramId || '',
      defaultGroupId: firstGroup?.id || '',
      planId: '',
      startDate:
        initialDate ||
        (firstGroup
          ? nextGroupDate(
              firstGroup.weekday,
              firstGroup.effectiveFrom,
              undefined,
              firstGroup.startTime,
            )
          : ''),
      customerName: enrollment?.subscription.customerName || '',
      customerEmail: enrollment?.subscription.customerEmail || '',
      customerPhone: enrollment?.subscription.customerPhone || '',
      priceEur: '' as number | '',
    },
    validate: {
      programId: (value) => (!value ? 'Pasirinkite ciklą.' : null),
      defaultGroupId: (value) => (!value ? 'Pasirinkite grupę.' : null),
      planId: (value) => (!value ? 'Pasirinkite planą.' : null),
      startDate: (value) => (!value ? 'Pasirinkite lankymo pradžią.' : null),
      customerName: (value) => (!value.trim() ? 'Įrašykite dalyvio vardą ir pavardę.' : null),
      customerEmail: (value) =>
        value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
          ? 'Įrašykite teisingą el. paštą arba palikite lauką tuščią.'
          : null,
      priceEur: (value) =>
        typeof value !== 'number' || value < 0 ? 'Įrašykite kainą (gali būti 0).' : null,
    },
  });
  const group = groups.find((item) => item.id === form.values.defaultGroupId);
  const plans = useSWR<{ plans: EnrollmentPlan[] }>(
    form.values.programId
      ? apiUrl('plans', { site, programId: form.values.programId, status: 'active' })
      : null,
    fetcher,
  );
  const availablePlans = enrollmentPlans(plans.data?.plans || [], enrollment?.kind);
  const plan = availablePlans.find((item) => item.id === form.values.planId);
  const setValues = form.setValues;
  useEffect(() => {
    if (!enrollment || !group || form.values.planId) return;
    const selected = preferredEnrollmentPlan(
      enrollmentPlans(plans.data?.plans || [], enrollment.kind),
      enrollment.subscription.planId,
    );
    if (selected)
      setValues({
        planId: selected.id,
        priceEur: enrollmentPrice(selected, group.singleVisitPriceEur),
      });
  }, [enrollment, group, plans.data, form.values.planId, setValues]);

  const submit = form.onSubmit(async (values) => {
    if (submitting.current || !plan || !group) return;
    submitting.current = true;
    setSaving(true);
    onSavingChange(true);
    setError('');
    try {
      const response = await fetch('/api/admin/recurring/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({
          ...values,
          customerName: values.customerName.trim(),
          customerEmail: values.customerEmail.trim().toLowerCase(),
          customerPhone: values.customerPhone.trim(),
          site,
          status: 'active',
          purchaseChannel: 'admin',
          ...(enrollment ? { renewFromSubscriptionId: enrollment.subscription.id } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nepavyko pridėti dalyvio.');
      notifications.show({
        message: enrollment
          ? enrollment.kind === 'single_visit'
            ? 'Vienas apsilankymas užregistruotas.'
            : 'Naujas abonemento periodas ir rezervacijos sukurti.'
          : 'Dalyvis pridėtas. Abonementas ir užsiėmimų rezervacijos sukurtos.',
        color: 'green',
      });
      // Refresh every visible recurring view, including the parent summary and roster.
      void mutate((key) => typeof key === 'string' && key.startsWith('/api/admin/recurring/'));
      onSaved(result.subscription.id, values.defaultGroupId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Nepavyko pridėti dalyvio.');
    } finally {
      submitting.current = false;
      setSaving(false);
      onSavingChange(false);
    }
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Alert color="blue">
          {enrollment && (
            <>
              Registruojamas esamas dalyvis: {enrollment.subscription.customerName}. Ankstesnio
              abonemento istorija ir likutis nebus keičiami.{' '}
            </>
          )}
          {enrollment?.kind === 'single_visit'
            ? 'Bus užregistruotas vienas apsilankymas pasirinktoje datoje.'
            : 'Bus sukurtas aktyvus abonementas ir rezervuotos vietos pagal planą.'}{' '}
          Mokėjimas nebus vykdomas, el. laiškas automatiškai nesiunčiamas.{' '}
          {enrollment
            ? 'Kontaktiniai duomenys perimami iš esamo abonemento.'
            : 'El. paštas neprivalomas; jį nurodžius, prisijungimo nuorodą galėsite išsiųsti iš dalyvio kortelės.'}
        </Alert>
        {plan?.sessionCount === 1 && group && !group.singleVisitEnabled && (
          <Text size="sm" c="dimmed">
            Šioje grupėje vieno apsilankymo pirkimas svetainėje išjungtas. Administratorius gali
            užregistruoti apsilankymą rankiniu būdu; klientams nustatymas nepasikeis.
          </Text>
        )}
        {error && (
          <Alert color="red" title="Dalyvis nepridėtas">
            {error}
          </Alert>
        )}
        <Select
          label="Dalyvio užsiėmimų ciklas"
          required
          disabled={saving || Boolean(enrollment)}
          data={programs
            .filter((item) => item.status === 'active')
            .map((item) => ({ value: item.id, label: item.nameLt }))}
          {...form.getInputProps('programId')}
          onChange={(value) =>
            form.setValues({
              programId: value || '',
              defaultGroupId: '',
              planId: '',
              startDate: '',
              priceEur: '',
            })
          }
        />
        <Select
          label="Dalyvio grupė"
          required
          disabled={saving || Boolean(enrollment) || !form.values.programId}
          data={groups
            .filter((item) => item.programId === form.values.programId && item.status === 'active')
            .map((item) => ({ value: item.id, label: `${item.name} · ${item.startTime}` }))}
          {...form.getInputProps('defaultGroupId')}
          onChange={(value) => {
            const nextGroup = groups.find((item) => item.id === value);
            form.setValues({
              defaultGroupId: value || '',
              planId: '',
              priceEur: '',
              startDate: nextGroup
                ? nextGroupDate(
                    nextGroup.weekday,
                    nextGroup.effectiveFrom,
                    undefined,
                    nextGroup.startTime,
                  )
                : '',
            });
          }}
        />
        {plans.error && <Alert color="red">Nepavyko įkelti planų. Pabandykite dar kartą.</Alert>}
        <Select
          label={enrollment?.kind === 'single_visit' ? 'Apsilankymo planas' : 'Abonemento planas'}
          required
          disabled={saving || !group || plans.isLoading}
          placeholder={plans.isLoading ? 'Kraunama…' : 'Pasirinkite planą'}
          data={availablePlans.map((item) => ({
            value: item.id,
            label: `${item.nameLt} · ${item.sessionCount} užs. / ${item.validityDays} d.`,
          }))}
          {...form.getInputProps('planId')}
          onChange={(value) => {
            const selected = availablePlans.find((item) => item.id === value);
            form.setValues({
              planId: value || '',
              priceEur: selected ? enrollmentPrice(selected, group?.singleVisitPriceEur) : '',
            });
          }}
        />
        {group && !plans.isLoading && !plans.error && availablePlans.length === 0 && (
          <Text c="dimmed">Šiai grupei aktyvių planų nėra.</Text>
        )}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            type="date"
            label={enrollment?.kind === 'single_visit' ? 'Apsilankymo data' : 'Lankymo pradžia'}
            required
            disabled={saving}
            max={group?.effectiveUntil || undefined}
            description={
              group ? `Užsiėmimai ${WEEKDAYS[group.weekday - 1]}, ${group.startTime}.` : undefined
            }
            {...form.getInputProps('startDate')}
          />
          <NumberInput
            label="Sutarta kaina, EUR"
            required
            disabled={saving}
            min={0}
            max={100000}
            decimalScale={2}
            {...form.getInputProps('priceEur')}
          />
        </SimpleGrid>
        <TextInput
          label="Vardas ir pavardė"
          readOnly={Boolean(enrollment)}
          required
          maxLength={200}
          disabled={saving}
          autoComplete="name"
          {...form.getInputProps('customerName')}
        />
        <TextInput
          label="El. paštas"
          readOnly={Boolean(enrollment)}
          type="email"
          description="Neprivalomas. Reikalingas prisijungimui prie savitarnos."
          disabled={saving}
          autoComplete="email"
          {...form.getInputProps('customerEmail')}
        />
        <TextInput
          label="Telefonas"
          readOnly={Boolean(enrollment)}
          maxLength={50}
          disabled={saving}
          autoComplete="tel"
          {...form.getInputProps('customerPhone')}
        />
        <Button type="submit" loading={saving} disabled={!plan || !group || Boolean(plans.error)}>
          {enrollment
            ? enrollment.kind === 'single_visit'
              ? 'Užregistruoti vieną apsilankymą'
              : 'Sukurti naują abonemento periodą'
            : 'Pridėti dalyvį ir rezervuoti vietas'}
        </Button>
      </Stack>
    </form>
  );
}
