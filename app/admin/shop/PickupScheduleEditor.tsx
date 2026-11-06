'use client';
import { Alert, Button, Group, Paper, Stack, Switch, Text, TextInput, Title } from '@mantine/core';
import type { CommerceSettings } from '@/lib/shop/commerce-contract';

type PickupSchedule = CommerceSettings['delivery']['pickupSchedule'];
type Interval = PickupSchedule['weekly'][number]['intervals'][number];
const days = [
  'Pirmadienis',
  'Antradienis',
  'Trečiadienis',
  'Ketvirtadienis',
  'Penktadienis',
  'Šeštadienis',
  'Sekmadienis',
];
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function intervalProblem(intervals: Interval[]) {
  if (intervals.some(({ start, end }) => !timePattern.test(start) || !timePattern.test(end)))
    return 'Užpildyk kiekvieno intervalo pradžią ir pabaigą.';
  if (intervals.some(({ start, end }) => end <= start))
    return 'Pabaiga turi būti vėlesnė už pradžią tą pačią dieną.';
  const sorted = [...intervals].sort((a, b) => a.start.localeCompare(b.start));
  if (sorted.some((interval, index) => index > 0 && interval.start < sorted[index - 1].end))
    return 'Laiko intervalai negali persidengti.';
  return '';
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function pickupScheduleProblem(schedule: PickupSchedule) {
  for (const { day, intervals } of schedule.weekly) {
    const error = intervalProblem(intervals);
    if (error) return `${days[day - 1]}: ${error}`;
  }
  const usedDates = new Set<string>();
  for (const exception of schedule.exceptions) {
    if (!validDate(exception.date)) return 'Kiekvienai atsiėmimo laiko išimčiai pasirink datą.';
    if (usedDates.has(exception.date)) return 'Tai pačiai datai gali būti tik viena išimtis.';
    usedDates.add(exception.date);
    if (!exception.closed) {
      if (!exception.intervals.length)
        return `${exception.date}: pridėk bent vieną laiko intervalą.`;
      const error = intervalProblem(exception.intervals);
      if (error) return `${exception.date}: ${error}`;
    }
  }
  return '';
}

function TimeIntervals({
  label,
  intervals,
  onChange,
}: {
  label: string;
  intervals: Interval[];
  onChange: (next: Interval[]) => void;
}) {
  const error = intervalProblem(intervals);
  return (
    <Stack gap="xs">
      {intervals.map((interval, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: All fields are controlled; intervals have no persisted identity or reordering operation.
        <Group key={index} align="end" gap="sm" wrap="wrap">
          <TextInput
            label="Nuo"
            aria-label={`${label}, ${index + 1} intervalo pradžia`}
            type="time"
            required
            value={interval.start}
            onChange={(event) =>
              onChange(
                intervals.map((item, i) =>
                  i === index ? { ...item, start: event.currentTarget.value } : item,
                ),
              )
            }
            style={{ flex: '1 1 110px' }}
          />
          <TextInput
            label="Iki"
            aria-label={`${label}, ${index + 1} intervalo pabaiga`}
            type="time"
            required
            value={interval.end}
            onChange={(event) =>
              onChange(
                intervals.map((item, i) =>
                  i === index ? { ...item, end: event.currentTarget.value } : item,
                ),
              )
            }
            style={{ flex: '1 1 110px' }}
          />
          <Button
            color="red"
            variant="subtle"
            size="xs"
            aria-label={`${label}: pašalinti ${index + 1} intervalą`}
            onClick={() => onChange(intervals.filter((_, i) => i !== index))}
          >
            Pašalinti
          </Button>
        </Group>
      ))}
      {error && (
        <Text size="xs" c="red" role="alert">
          {error}
        </Text>
      )}
      <Button
        variant="subtle"
        size="xs"
        onClick={() => onChange([...intervals, { start: '', end: '' }])}
        disabled={intervals.length >= 8}
        style={{ alignSelf: 'flex-start' }}
      >
        Pridėti laiko intervalą
      </Button>
    </Stack>
  );
}

export function PickupScheduleEditor({
  value,
  onChange,
}: {
  value: PickupSchedule;
  onChange: (next: PickupSchedule) => void;
}) {
  function changeDay(day: number, intervals: Interval[]) {
    onChange({
      ...value,
      weekly: days.map((_, index) => ({
        day: index + 1,
        intervals:
          index + 1 === day
            ? intervals
            : value.weekly.find((entry) => entry.day === index + 1)?.intervals || [],
      })),
    });
  }

  function changeException(index: number, change: Partial<PickupSchedule['exceptions'][number]>) {
    onChange({
      ...value,
      exceptions: value.exceptions.map((entry, i) =>
        i === index ? { ...entry, ...change } : entry,
      ),
    });
  }

  return (
    <Stack gap="md">
      <div>
        <Title order={4}>Atsiėmimo studijoje laikas</Title>
        <Text size="sm" c="dimmed">
          Įprastos savaitės valandos Lietuvos laiku. Dienomis be intervalų atsiėmimas nenumatytas.
        </Text>
      </div>
      {value.weekly.every((entry) => !entry.intervals.length) && (
        <Alert color="yellow">Įprastos savaitės atsiėmimo valandos dar neužpildytos.</Alert>
      )}
      <Stack gap="xs">
        {days.map((label, index) => {
          const day = index + 1;
          const intervals = value.weekly.find((entry) => entry.day === day)?.intervals || [];
          return (
            <Paper key={day} withBorder radius="sm" p="sm">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={600} size="sm">
                    {label}
                  </Text>
                  <Switch
                    label={intervals.length ? 'Galima atsiimti' : 'Atsiėmimo nėra'}
                    aria-label={`${label}: galima atsiimti`}
                    checked={intervals.length > 0}
                    onChange={(event) =>
                      changeDay(day, event.currentTarget.checked ? [{ start: '', end: '' }] : [])
                    }
                  />
                </Group>
                {intervals.length > 0 && (
                  <TimeIntervals
                    label={label}
                    intervals={intervals}
                    onChange={(next) => changeDay(day, next)}
                  />
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
      <div>
        <Title order={5}>Konkrečių datų išimtys</Title>
        <Text size="sm" c="dimmed">
          Šventės, atostogos ar pakeistos valandos. Šios datos pakeičia įprastą savaitės grafiką;
          pirkėjui jos rodomos po įprastomis valandomis.
        </Text>
      </div>
      {value.exceptions.map((exception, index) => {
        const duplicate =
          !!exception.date &&
          value.exceptions.some((entry, i) => i !== index && entry.date === exception.date);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: Date and note remain controlled while editing, including before a date exists.
          <Paper key={index} withBorder radius="sm" p="sm">
            <Stack gap="sm">
              <Group align="end" justify="space-between">
                <TextInput
                  label="Data"
                  aria-label={`${index + 1} išimties data`}
                  type="date"
                  required
                  value={exception.date}
                  error={
                    duplicate
                      ? 'Ši data jau turi išimtį.'
                      : exception.date && !validDate(exception.date)
                        ? 'Pasirink galiojančią datą.'
                        : undefined
                  }
                  onChange={(event) => changeException(index, { date: event.currentTarget.value })}
                />
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={() =>
                    onChange({
                      ...value,
                      exceptions: value.exceptions.filter((_, i) => i !== index),
                    })
                  }
                >
                  Pašalinti išimtį
                </Button>
              </Group>
              <Switch
                label="Šią dieną atsiimti negalima"
                checked={exception.closed}
                onChange={(event) =>
                  changeException(index, {
                    closed: event.currentTarget.checked,
                    intervals: event.currentTarget.checked ? [] : [{ start: '', end: '' }],
                  })
                }
              />
              {!exception.closed && (
                <>
                  <TimeIntervals
                    label={exception.date || `${index + 1} išimtis`}
                    intervals={exception.intervals}
                    onChange={(intervals) => changeException(index, { intervals })}
                  />
                  {!exception.intervals.length && (
                    <Text size="xs" c="red">
                      Pridėk laiką arba pažymėk, kad atsiimti negalima.
                    </Text>
                  )}
                </>
              )}
              <TextInput
                label="Pastaba pirkėjui (nebūtina)"
                placeholder="Pvz., šventinė diena"
                value={exception.note}
                maxLength={200}
                onChange={(event) => changeException(index, { note: event.currentTarget.value })}
              />
            </Stack>
          </Paper>
        );
      })}
      <Button
        variant="light"
        onClick={() =>
          onChange({
            ...value,
            exceptions: [...value.exceptions, { date: '', closed: true, intervals: [], note: '' }],
          })
        }
        disabled={value.exceptions.length >= 366}
        style={{ alignSelf: 'flex-start' }}
      >
        Pridėti datos išimtį
      </Button>
    </Stack>
  );
}
