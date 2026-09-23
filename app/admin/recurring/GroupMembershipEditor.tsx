'use client';

import { Alert, Button, Group, Modal, Stack, Switch, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArmchair } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import type { GroupMembership } from '@/lib/recurring/attendance-register';
import { vilniusDate } from '@/lib/recurring/participants';
import styles from './GroupAttendanceTable.module.css';

export function GroupMembershipEditor({
  membership,
  name,
  groupId,
  site,
}: {
  membership: GroupMembership;
  name: string;
  groupId: string;
  site: string;
}) {
  const [opened, setOpened] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endsOn, setEndsOn] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const { mutate } = useSWRConfig();
  const save = async () => {
    if (lock.current) return;
    if (ending && !endsOn) {
      setError('Pasirinkite datą, nuo kurios dalyvis nebesilanko.');
      return;
    }
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(
        `/api/admin/recurring/groups/${groupId}/membership?${new URLSearchParams({ site })}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({
            subscriptionId: membership.subscriptionIds[0],
            endsOn: ending ? endsOn : null,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nepavyko išsaugoti vietos rezervacijos.');
      await mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/admin/recurring/'),
        undefined,
        { revalidate: true },
      );
      setOpened(false);
      notifications.show({
        color: 'green',
        title: 'Vieta grupėje atnaujinta',
        message: ending
          ? `Dalyvis nebesilanko nuo ${endsOn}. Nuo šios datos vieta laisva.`
          : 'Dalyvio vieta rezervuota neribotai.',
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Nepavyko išsaugoti.');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  const label = membership.endsOn
    ? `Nebesilanko nuo ${membership.endsOn}`
    : 'Vieta rezervuota neribotai';
  return (
    <>
      <Button
        variant="subtle"
        size="compact-xs"
        color={membership.endsOn ? 'orange' : 'gray'}
        leftSection={<IconArmchair size={13} />}
        aria-label={`${name}: ${label}`}
        title={label}
        className={styles.membership}
        style={{
          height: 'auto',
          minHeight: 'var(--membership-control-height, 28px)',
          whiteSpace: 'normal',
          textAlign: 'left',
        }}
        styles={{ label: { whiteSpace: 'normal' } }}
        onClick={() => {
          setEnding(Boolean(membership.endsOn));
          setEndsOn(membership.endsOn || '');
          setError('');
          setOpened(true);
        }}
      >
        <span className={styles.membershipLabel}>{label}</span>
        <span className={styles.membershipCompact} aria-hidden="true">
          {membership.endsOn ? `Iki ${membership.endsOn.slice(5)}` : 'Vieta saugoma'}
        </span>
      </Button>
      <Modal
        opened={opened}
        onClose={() => {
          if (!saving) setOpened(false);
        }}
        title="Dalyvio vieta grupėje"
        closeOnEscape={!saving}
        closeOnClickOutside={!saving}
        withCloseButton={!saving}
      >
        <Stack>
          <Text fw={600}>{name}</Text>
          <Text size="sm" c="dimmed">
            Vieta išsaugoma ir pasibaigus ar neapmokėjus kito abonemento. Vieno užsiėmimo atšaukimas
            nepanaikina nuolatinės vietos.
          </Text>
          <Switch
            label="Dalyvis baigia lankyti šią grupę"
            checked={ending}
            disabled={saving}
            onChange={(event) => setEnding(event.currentTarget.checked)}
          />
          {ending && (
            <TextInput
              type="date"
              required
              label="Nebesilanko nuo"
              value={endsOn}
              disabled={saving}
              min={vilniusDate()}
              onChange={(event) => setEndsOn(event.currentTarget.value)}
              description="Pirma diena, nuo kurios vietą galima skirti kitam žmogui. Iki jos vieta lieka rezervuota."
            />
          )}
          {ending && (
            <Alert color="yellow">
              Nuo pasirinktos datos bus atlaisvintos būsimos šios grupės rezervacijos. Lankymo
              istorija ir apmokėjimai nesikeis; pinigai automatiškai negrąžinami.
            </Alert>
          )}
          {!ending && membership.endsOn && (
            <Alert color="blue">
              Atkurti vietą galėsite tik jei ji dar neužimta. Anksčiau atšauktos užsiėmimų
              rezervacijos automatiškai neatkuriamos.
            </Alert>
          )}
          {error && <Alert color="red">{error}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" disabled={saving} onClick={() => setOpened(false)}>
              Atšaukti
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Išsaugoti
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
