'use client';

import { Alert, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPencil } from '@tabler/icons-react';
import { useState } from 'react';
import {
  type ContactDetails,
  normalizeContactDetails,
  validateContactDetails,
} from '@/lib/recurring/contact-details';

export function SubscriptionContactDetails({
  contact,
  emailRequired = false,
  onSave,
}: {
  contact: ContactDetails;
  emailRequired?: boolean;
  onSave: (values: ContactDetails) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    initialValues: contact,
    validate: (values) => validateContactDetails(values, emailRequired),
  });

  if (!editing) {
    return (
      <Stack gap="xs">
        <Text>
          <strong>Klientas:</strong> {contact.customerName}
        </Text>
        <Text>
          <strong>El. paštas:</strong> {contact.customerEmail || 'Nenurodytas'}
        </Text>
        <Text>
          <strong>Telefonas:</strong> {contact.customerPhone || '-'}
        </Text>
        <Group>
          <Button
            variant="light"
            size="sm"
            leftSection={<IconPencil size={16} />}
            onClick={() => {
              form.setValues(contact);
              form.clearErrors();
              setError(null);
              setEditing(true);
            }}
          >
            Redaguoti asmens informaciją
          </Button>
        </Group>
      </Stack>
    );
  }

  const emailChanged =
    normalizeContactDetails(form.values).customerEmail !==
    normalizeContactDetails(contact).customerEmail;
  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        setSaving(true);
        setError(null);
        try {
          await onSave(normalizeContactDetails(values));
          setEditing(false);
        } catch (error) {
          setError(
            error instanceof Error ? error.message : 'Nepavyko išsaugoti asmens informacijos.',
          );
        } finally {
          setSaving(false);
        }
      })}
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Redaguojami šio abonemento dalyvio duomenys. Kitų abonementų ir mokėjimų informacija
          nekeičiama.
        </Text>
        {error && (
          <Alert color="red" title="Nepavyko išsaugoti">
            {error}
          </Alert>
        )}
        <TextInput
          label="Vardas ir pavardė"
          required
          maxLength={200}
          disabled={saving}
          autoComplete="name"
          {...form.getInputProps('customerName')}
        />
        <TextInput
          label="El. paštas"
          type="email"
          required={emailRequired}
          maxLength={254}
          disabled={saving}
          autoComplete="email"
          description={
            emailRequired
              ? 'Reikalingas prisijungimui prie savitarnos.'
              : 'Neprivalomas. Reikalingas prisijungimui prie savitarnos.'
          }
          {...form.getInputProps('customerEmail')}
        />
        <TextInput
          label="Telefonas"
          type="tel"
          maxLength={50}
          disabled={saving}
          autoComplete="tel"
          {...form.getInputProps('customerPhone')}
        />
        {emailChanged && (
          <Alert color="yellow">
            Pakeitus el. paštą pasikeis šio abonemento savitarnos prieiga. Ankstesnės šiam
            abonementui išduotos prisijungimo nuorodos nebegalios. Laiškas automatiškai
            nesiunčiamas.
          </Alert>
        )}
        <Group>
          <Button type="submit" loading={saving}>
            Išsaugoti asmens informaciją
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={saving}
            onClick={() => setEditing(false)}
          >
            Atšaukti redagavimą
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
