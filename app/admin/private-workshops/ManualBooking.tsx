'use client';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  MultiSelect,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconMail } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import {
  manualBookingPreview,
  money,
  PRIVATE_API,
  PrivateRequestError,
  privateRequest,
} from '@/lib/private-workshops/admin';
import type {
  PrivateWorkshopBooking,
  PrivateWorkshopConfig,
  PrivateWorkshopManualCreateRequest,
} from '@/lib/private-workshops/types';

export function ManualBooking({
  config,
  onCreated,
  onCancel,
  onBusyChange,
}: {
  config: PrivateWorkshopConfig;
  onCreated: (booking: PrivateWorkshopBooking) => void;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retryPayload, setRetryPayload] = useState<PrivateWorkshopManualCreateRequest | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const firstType = config.types[0];
  const form = useForm({
    initialValues: {
      typeId: firstType?.id || '',
      participantsCount: firstType?.minParticipants || 1,
      addonIds: [] as string[],
      date: '',
      startTime: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      buyerType: 'consumer' as 'consumer' | 'business',
      companyName: '',
      companyCode: '',
      companyAddress: '',
      vatCode: '',
      locale: 'lt' as 'lt' | 'en',
      notes: '',
      adminNotes: '',
      paymentReceived: false,
    },
    validate: {
      typeId: (value) => (!value ? 'Pasirinkite dirbtuvių tipą.' : null),
      participantsCount: (value, values) => {
        const type = config.types.find((item) => item.id === values.typeId);
        return !type ||
          !Number.isInteger(value) ||
          value < type.minParticipants ||
          value > type.maxParticipants
          ? `Dalyvių skaičius turi būti nuo ${type?.minParticipants || 1} iki ${type?.maxParticipants || 200}.`
          : null;
      },
      date: (value) => (!value ? 'Pasirinkite datą.' : null),
      startTime: (value) => (!value ? 'Pasirinkite pradžios laiką.' : null),
      customerName: (value) => (!value.trim() ? 'Įveskite užsakovo vardą ir pavardę.' : null),
      customerEmail: (value) =>
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? 'Įveskite el. pašto adresą.' : null,
      companyName: (value, values) =>
        values.buyerType === 'business' && !value.trim() ? 'Įveskite įmonės pavadinimą.' : null,
      companyCode: (value, values) =>
        values.buyerType === 'business' && !value.trim() ? 'Įveskite įmonės kodą.' : null,
      companyAddress: (value, values) =>
        values.buyerType === 'business' && !value.trim() ? 'Įveskite įmonės adresą.' : null,
    },
  });
  const selectedType = config.types.find((item) => item.id === form.values.typeId);
  const preview = manualBookingPreview(
    config,
    form.values.typeId,
    form.values.participantsCount,
    form.values.addonIds,
  );

  async function submit(values: typeof form.values) {
    if (busy || !preview) return;
    setBusy(true);
    onBusyChange(true);
    setError('');
    idempotencyKey.current ||= crypto.randomUUID();
    const payload: PrivateWorkshopManualCreateRequest = retryPayload || {
      idempotencyKey: idempotencyKey.current,
      typeId: values.typeId,
      participantsCount: values.participantsCount,
      addonIds: values.addonIds,
      date: values.date,
      startTime: values.startTime,
      customerName: values.customerName.trim(),
      customerEmail: values.customerEmail.trim(),
      customerPhone: values.customerPhone.trim(),
      buyerType: values.buyerType,
      ...(values.buyerType === 'business'
        ? {
            billingDetails: {
              companyName: values.companyName.trim(),
              companyCode: values.companyCode.trim(),
              companyAddress: values.companyAddress.trim(),
              vatCode: values.vatCode.trim(),
            },
          }
        : {}),
      locale: values.locale,
      notes: values.notes.trim(),
      adminNotes: values.adminNotes.trim(),
      paymentReceived: values.paymentReceived,
      configVersion: config.version,
      expectedDepositEur: preview.depositEur,
      expectedTotalEur: preview.estimatedTotalEur,
    };
    try {
      const result = await privateRequest<{ booking: PrivateWorkshopBooking }>(
        `${PRIVATE_API}/bookings`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );
      onCreated(result.booking);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Nepavyko sukurti rezervacijos.');
      if (!(failure instanceof PrivateRequestError) || failure.status >= 500) {
        setRetryPayload(payload);
      } else {
        setRetryPayload(null);
      }
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack>
        <Text size="sm" c="dimmed">
          Datą ir pradžios laiką galite parinkti laisvai, nepriklausomai nuo registracijos grafikų.
          Laikas nurodomas Vilniaus laiku.
        </Text>
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        {retryPayload && (
          <Alert color="orange">
            Nepavyko patvirtinti išsaugojimo rezultato. Kartosime tą patį užsakymą, kad nesukurtume
            dublikato. Taip pat galite grįžti į rezervacijų sąrašą ir jį atnaujinti.
          </Alert>
        )}
        {!config.types.length && (
          <Alert color="orange">
            Pirmiausia pridėkite ir išsaugokite bent vieną dirbtuvių tipą.
          </Alert>
        )}
        <fieldset
          disabled={busy || !!retryPayload}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          <Stack>
            <Select
              label="Dirbtuvių tipas"
              required
              searchable
              data={config.types.map((item) => ({
                value: item.id,
                label: `${item.titleLt}${item.active ? '' : ' (neaktyvus)'}`,
              }))}
              value={form.values.typeId}
              error={form.errors.typeId}
              onChange={(value) => {
                const type = config.types.find((item) => item.id === value);
                form.setFieldValue('typeId', value || '');
                if (type)
                  form.setFieldValue(
                    'participantsCount',
                    Math.max(
                      type.minParticipants,
                      Math.min(type.maxParticipants, form.values.participantsCount),
                    ),
                  );
              }}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput type="date" label="Data" required {...form.getInputProps('date')} />
              <TextInput
                type="time"
                label="Pradžios laikas"
                step={60}
                required
                {...form.getInputProps('startTime')}
              />
            </SimpleGrid>
            <NumberInput
              label="Dalyvių skaičius"
              required
              min={selectedType?.minParticipants || 1}
              max={selectedType?.maxParticipants || 200}
              allowDecimal={false}
              {...form.getInputProps('participantsCount')}
            />
            {config.addons.length > 0 && (
              <MultiSelect
                label="Papildomos paslaugos"
                data={config.addons.map((item) => ({
                  value: item.id,
                  label: `${item.titleLt} · ${money(item.priceEur)}${item.active ? '' : ' (neaktyvi)'}`,
                }))}
                {...form.getInputProps('addonIds')}
              />
            )}
            {preview && (
              <Text size="sm" c="dimmed">
                Trukmė su papildomomis paslaugomis: {preview.durationMin} min. ·{' '}
                {config.settings.placeName || 'Vieta nenustatyta'}
              </Text>
            )}
            <Divider label="Užsakovo duomenys" />
            <SegmentedControl
              fullWidth
              data={[
                { value: 'consumer', label: 'Fizinis asmuo' },
                { value: 'business', label: 'Įmonė' },
              ]}
              {...form.getInputProps('buyerType')}
            />
            <TextInput
              label="Vardas ir pavardė"
              required
              maxLength={200}
              {...form.getInputProps('customerName')}
            />
            <TextInput
              type="email"
              label="El. paštas"
              description="Šiuo adresu išsiųsime privataus užsiėmimo užsakymo informaciją."
              required
              maxLength={254}
              {...form.getInputProps('customerEmail')}
            />
            <TextInput
              type="tel"
              label="Telefonas"
              maxLength={60}
              {...form.getInputProps('customerPhone')}
            />
            {form.values.buyerType === 'business' && (
              <>
                <TextInput
                  label="Įmonės pavadinimas"
                  required
                  maxLength={200}
                  {...form.getInputProps('companyName')}
                />
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    label="Įmonės kodas"
                    required
                    maxLength={60}
                    {...form.getInputProps('companyCode')}
                  />
                  <TextInput label="PVM kodas" maxLength={60} {...form.getInputProps('vatCode')} />
                </SimpleGrid>
                <TextInput
                  label="Įmonės adresas"
                  required
                  maxLength={300}
                  {...form.getInputProps('companyAddress')}
                />
              </>
            )}
            <Select
              label="Laiško kalba"
              allowDeselect={false}
              data={[
                { value: 'lt', label: 'Lietuvių' },
                { value: 'en', label: 'Anglų' },
              ]}
              {...form.getInputProps('locale')}
            />
            <Textarea
              label="Pastabos užsakovui"
              description="Įtraukiamos į laišką."
              autosize
              minRows={2}
              maxLength={2000}
              {...form.getInputProps('notes')}
            />
            <Textarea
              label="Vidinės administratoriaus pastabos"
              autosize
              minRows={2}
              maxLength={2000}
              {...form.getInputProps('adminNotes')}
            />
            {preview && (
              <Card withBorder>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text>Preliminari bendra suma</Text>
                    <Text fw={600}>{money(preview.estimatedTotalEur)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Rezervacijos mokėjimas</Text>
                    <Text size="sm">{money(preview.depositEur)}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    Kainos ir trukmė skaičiuojamos pagal išsaugotą dirbtuvių tipą ir papildomas
                    paslaugas.
                  </Text>
                </Stack>
              </Card>
            )}
            <Checkbox
              label="Rezervacijos mokėjimas jau gautas"
              description={
                preview ? `Pažymėkite tik gavę ${money(preview.depositEur)} mokėjimą.` : undefined
              }
              {...form.getInputProps('paymentReceived', { type: 'checkbox' })}
            />
            <Text size="sm">
              Rezervacija bus patvirtinta ir pasirinktas laikas rezervuotas. Užsakovui išsiųsime
              laišką su užsakymo informacija.
            </Text>
          </Stack>
        </fieldset>
        <Group justify="flex-end">
          <Button variant="default" disabled={busy} onClick={onCancel}>
            {retryPayload ? 'Grįžti į rezervacijas' : 'Atšaukti'}
          </Button>
          <Button
            type="submit"
            loading={busy}
            disabled={!preview || !config.settings.placeName.trim()}
            leftSection={<IconMail size={16} />}
          >
            {retryPayload ? 'Kartoti išsaugojimą' : 'Sukurti ir išsiųsti laišką'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
