'use client';

import {
  ActionIcon,
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
import { IconCalendarEvent, IconEdit, IconMinus, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import useSWR from 'swr';
import { buildApiUrl } from '@/lib/api';
import type { SiteKey } from '@/lib/site';

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch workshops');
  }
  return res.json();
};

const formatStartISO = (value: string) => value.replace('T', ' ');

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

const PROJECT_OPTIONS: Array<{ value: SiteKey; label: string }> = [
  { value: 'ceramics', label: 'Ceramics' },
  { value: 'yoga', label: 'Yoga' },
];

export default function WorkshopsPage() {
  const [selectedSite, setSelectedSite] = useState<SiteKey>('ceramics');
  const workshopsApiUrl = buildApiUrl('/api/workshops', { site: selectedSite });
  const { data, mutate } = useSWR(workshopsApiUrl, fetcher);
  const [fetching, setFetching] = useState(false);
  const [fbData, setFbData] = useState<any>(null);
  const [editingWorkshop, setEditingWorkshop] = useState<any>(null);
  const [updatingSpots, setUpdatingSpots] = useState<string | null>(null);
  const [parsingDescription, setParsingDescription] = useState(false);
  const [parsingEditDescription, setParsingEditDescription] = useState(false);

  const form = useForm({
    initialValues: {
      fbEventUrl: '',
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

  const handleFetchFb = async () => {
    const url = form.values.fbEventUrl.trim();
    if (!url) {
      notifications.show({ message: 'Įveskite FB renginio nuorodą', color: 'orange' });
      return;
    }

    setFetching(true);
    setFbData(null);
    try {
      const res = await fetch(buildApiUrl('/api/workshops/fetch-fb'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fbEventUrl: url }),
      });

      const data = await res.json();

      if (!res.ok) {
        notifications.show({ message: data.error || 'Klaida', color: 'red' });
        return;
      }

      setFbData(data);
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
      setFetching(false);
    }
  };

  const parseDescriptionToStructured = async (
    rawText: string,
  ): Promise<StructuredDescription | null> => {
    if (!rawText?.trim()) return null;

    const res = await fetch(buildApiUrl('/api/admin/workshops/parse-description'), {
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
        fbEventUrl: values.fbEventUrl || fbData?.fbEventUrl,
        placeName: fbData?.placeName,
        description: fbData?.description,
        descriptionStructured: values.descriptionStructured,
        coverImageUrl: fbData?.coverImageUrl,
      };

      if (isOngoingBulk) {
        payload.startDateISO = values.startDateISO;
        payload.endDateISO = values.endDateISO;
        payload.timeOfDay = values.timeOfDay || '18:00';
      } else {
        payload.startISO = values.startISO;
      }

      const response = await fetch(workshopsApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          site: selectedSite,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        notifications.show({ message: data.error || 'Klaida', color: 'red' });
        return;
      }

      const count = data.count ?? 1;
      notifications.show({
        message: count > 1 ? `Sukurti ${count} užsiėmimai` : 'Užsiėmimas sukurtas',
        color: 'green',
      });
      mutate();
      form.reset();
      setFbData(null);
    } catch (_err) {
      notifications.show({ message: 'Nepavyko išsaugoti', color: 'red' });
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
      descriptionStructured: w.descriptionStructured || {
        ...emptyStructuredDescription(),
        intro: w.description || '',
      },
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
        buildApiUrl(`/api/workshops/${editingWorkshop.id}`, { site: selectedSite }),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        notifications.show({ message: data.error || 'Klaida', color: 'red' });
        return;
      }
      notifications.show({ message: 'Atnaujinta', color: 'green' });
      await mutate();
      setEditingWorkshop(null);
    } catch (_err) {
      notifications.show({ message: 'Nepavyko atnaujinti', color: 'red' });
    }
  };

  const handleQuickSpots = async (w: any, delta: number) => {
    const next = Math.max(0, Math.min(w.spotsTotal, w.spotsLeft + delta));
    if (next === w.spotsLeft) return;
    setUpdatingSpots(w.id);
    try {
      const res = await fetch(buildApiUrl(`/api/workshops/${w.id}`, { site: selectedSite }), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotsLeft: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        notifications.show({ message: data.error || 'Klaida', color: 'red' });
        return;
      }
      mutate();
    } catch (_err) {
      notifications.show({ message: 'Nepavyko atnaujinti', color: 'red' });
    } finally {
      setUpdatingSpots(null);
    }
  };

  const handleDelete = async (w: any) => {
    if (!confirm('Ar tikrai norite ištrinti šį užsiėmimą?')) return;
    try {
      const res = await fetch(buildApiUrl(`/api/workshops/${w.id}`, { site: selectedSite }), {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        notifications.show({ message: data.error || 'Klaida', color: 'red' });
        return;
      }
      notifications.show({ message: 'Ištrinta', color: 'green' });
      mutate();
    } catch (_err) {
      notifications.show({ message: 'Nepavyko ištrinti', color: 'red' });
    }
  };

  const workshops = data?.workshops || [];

  return (
    <Container size="xl" py="md">
      <Stack gap="xl">
        <Title order={2}>Workshops</Title>
        <Select
          label="Project"
          data={PROJECT_OPTIONS}
          value={selectedSite}
          onChange={(value) => setSelectedSite(value === 'yoga' ? 'yoga' : 'ceramics')}
          allowDeselect={false}
          w={170}
        />

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={4}>Pridėti iš Facebook renginio</Title>
            <Text size="sm" c="dimmed">
              Įklijuokite FB renginio nuorodą (pvz.
              https://www.facebook.com/events/1572151530598250/...) ir spauskite „Gauti duomenis“.
              Pavadinimas, laikas ir trukmė bus užpildyti automatiškai. Pridėkite vietų skaičių,
              kainą ir kitus laukus.
            </Text>
            <Group align="flex-end">
              <TextInput
                label="FB renginio nuoroda"
                placeholder="https://www.facebook.com/events/..."
                style={{ flex: 1, minWidth: 300 }}
                {...form.getInputProps('fbEventUrl')}
              />
              <Button
                leftSection={fetching ? <Loader size="sm" /> : <IconCalendarEvent size={16} />}
                onClick={handleFetchFb}
                loading={fetching}
              >
                Gauti duomenis
              </Button>
            </Group>

            {fbData && (
              <>
                <Divider />
                <form onSubmit={form.onSubmit(handleSubmit)}>
                  <Stack gap="md">
                    <Title order={5}>Trūkstami laukai</Title>
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
                          Bus sukurti užsiėmimai kiekvienai savaitei (įskaitant pradžios ir pabaigos
                          datas)
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
                        label="Pradžios laikas (ISO)"
                        required
                        placeholder="2026-02-15T10:00:00"
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
                        {(form.values.descriptionStructured.listItems || []).map((item, index) => (
                          <Group key={`${item}-${item.length}`} grow>
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
                        ))}
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
                    {fbData.placeName && (
                      <Text size="sm" c="dimmed">
                        Vieta (iš FB): {fbData.placeName}
                      </Text>
                    )}
                    <Group>
                      <Button type="submit" leftSection={<IconPlus size={16} />}>
                        Sukurti užsiėmimą
                      </Button>
                    </Group>
                  </Stack>
                </form>
              </>
            )}
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={4} mb="md">
            Esami užsiėmimai
          </Title>
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
                  <Table.Th>Savaitgalis</Table.Th>
                  <Table.Th>Veiksmai</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {workshops.map((w: any) => (
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
                    <Table.Td>{w.durationMin} min</Table.Td>
                    <Table.Td>{w.sessionsCount ?? 1}</Table.Td>
                    <Table.Td>
                      {(w.sessionsCount ?? 1) === 1
                        ? `${w.pricePerSession ?? w.priceEur ?? 0}€`
                        : `${w.sessionsCount}×${w.pricePerSession ?? w.priceEur ?? 0}€${w.subscriptionPriceEur != null ? ` / abon. ${w.subscriptionPriceEur}€` : ''}`}
                    </Table.Td>
                    <Table.Td>
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
                          color={w.spotsLeft === 0 ? 'red' : w.spotsLeft <= 2 ? 'orange' : 'green'}
                          variant="light"
                        >
                          {w.spotsLeft} / {w.spotsTotal}
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
                ))}
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
                    <Group key={`${item}-${item.length}`} grow>
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
