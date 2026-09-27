'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import {
  bookingPaymentStatus,
  bookingPaymentStatusLabel,
  bookingWorkshopName,
  bookingWorkshopStartISO,
  deletedWorkshopLabel,
  formatDateTime,
  paymentMethodLabel,
  type ReservationBooking,
  statusColor,
  statusLabel,
} from '@/lib/reservations/presentation';

function Workshop({ booking }: { booking: ReservationBooking }) {
  return (
    <Stack gap={2} align="flex-start">
      <Text size="sm" fw={500}>
        {bookingWorkshopName(booking)}
      </Text>
      {booking.workshop === null && (
        <Badge color="red" variant="light" size="xs">
          {deletedWorkshopLabel}
        </Badge>
      )}
      <Text size="xs" c="dimmed">
        {bookingWorkshopStartISO(booking).replace('T', ' ') || '-'}
      </Text>
    </Stack>
  );
}

function Payment({ booking }: { booking: ReservationBooking }) {
  return (
    <Stack gap={4} align="flex-start">
      <Text size="sm">{paymentMethodLabel(booking.paymentMethod)}</Text>
      <Badge
        color={statusColor(bookingPaymentStatus(booking))}
        variant="light"
        maw="100%"
        h="auto"
        py={4}
        styles={{ label: { whiteSpace: 'normal', overflow: 'visible', lineHeight: 1.3 } }}
      >
        {bookingPaymentStatusLabel(booking)}
      </Badge>
    </Stack>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={3} miw={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      {children}
    </Stack>
  );
}

export function ReservationsList({
  bookings,
  onView,
}: {
  bookings: ReservationBooking[];
  onView: (id: string) => void;
}) {
  return (
    <Box miw={0} maw="100%">
      <Stack hiddenFrom="lg" gap="md" role="list" aria-label="Rezervacijos į dirbtuves">
        {bookings.map((booking) => (
          <Paper
            key={booking.id}
            withBorder
            p="md"
            radius="sm"
            role="listitem"
            miw={0}
            style={{ overflowWrap: 'anywhere' }}
          >
            <Stack gap="md">
              <Group justify="space-between" align="flex-start" gap="xs">
                <Stack gap={2} miw={0} style={{ flex: '1 1 10rem' }}>
                  <Text fw={600}>{booking.customerName}</Text>
                  <Text size="xs" c="dimmed">
                    {booking.source}
                  </Text>
                </Stack>
                <Badge
                  color={statusColor(booking.status)}
                  variant="light"
                  style={{ flexShrink: 0 }}
                >
                  {statusLabel(booking.status)}
                </Badge>
              </Group>
              <Field label="Kontaktai">
                <Text size="sm">{booking.customerEmail || 'El. paštas nenurodytas'}</Text>
                <Text size="sm">{booking.customerPhone || 'Telefonas nenurodytas'}</Text>
              </Field>
              <Field label="Renginys">
                <Workshop booking={booking} />
              </Field>
              <SimpleGrid cols={2} spacing="sm">
                <Field label="Dalyviai">
                  <Text size="sm">{booking.participantsCount}</Text>
                </Field>
                <Field label="Suma">
                  <Text size="sm">
                    {booking.totalAmount} {booking.currency}
                  </Text>
                </Field>
              </SimpleGrid>
              <Field label="Mokėjimas">
                <Payment booking={booking} />
              </Field>
              <Field label="Registruota (Vilniaus laiku)">
                <Text size="sm">{formatDateTime(booking.createdAt)}</Text>
              </Field>
              <Button
                variant="light"
                fullWidth
                leftSection={<IconEye size={16} />}
                aria-label={`Rezervacijos detalės: ${booking.customerName}`}
                onClick={() => onView(booking.id)}
              >
                Rezervacijos detalės
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
      <Stack visibleFrom="lg" gap="xs" miw={0}>
        <Text size="xs" c="dimmed">
          Jei lentelė netelpa, ją galite slinkti į šonus.
        </Text>
        <Table.ScrollContainer
          minWidth={1150}
          type="native"
          w="100%"
          role="region"
          tabIndex={0}
          aria-label="Rezervacijos: slenkama lentelė"
        >
          <Table
            striped
            highlightOnHover
            aria-label="Rezervacijos į dirbtuves"
            styles={{
              th: { whiteSpace: 'nowrap' },
              td: { verticalAlign: 'top' },
              table: { wordBreak: 'normal', overflowWrap: 'normal' },
            }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Klientas</Table.Th>
                <Table.Th>Kontaktai</Table.Th>
                <Table.Th>Renginys</Table.Th>
                <Table.Th>Dalyviai</Table.Th>
                <Table.Th>Suma</Table.Th>
                <Table.Th>Mokėjimas</Table.Th>
                <Table.Th>Statusas</Table.Th>
                <Table.Th>Registruota</Table.Th>
                <Table.Th>Veiksmai</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {bookings.map((booking) => (
                <Table.Tr key={booking.id}>
                  <Table.Td miw={140}>
                    <Text fw={500}>{booking.customerName}</Text>
                    <Text size="xs" c="dimmed">
                      {booking.source}
                    </Text>
                  </Table.Td>
                  <Table.Td miw={185} maw={260} style={{ overflowWrap: 'anywhere' }}>
                    <Text size="sm">{booking.customerEmail || 'El. paštas nenurodytas'}</Text>
                    <Text size="sm">{booking.customerPhone || 'Telefonas nenurodytas'}</Text>
                  </Table.Td>
                  <Table.Td miw={170}>
                    <Workshop booking={booking} />
                  </Table.Td>
                  <Table.Td>{booking.participantsCount}</Table.Td>
                  <Table.Td style={{ whiteSpace: 'nowrap' }}>
                    {booking.totalAmount} {booking.currency}
                  </Table.Td>
                  <Table.Td miw={150}>
                    <Payment booking={booking} />
                  </Table.Td>
                  <Table.Td>
                    <Badge color={statusColor(booking.status)} variant="light">
                      {statusLabel(booking.status)}
                    </Badge>
                  </Table.Td>
                  <Table.Td miw={155}>{formatDateTime(booking.createdAt)}</Table.Td>
                  <Table.Td>
                    <Tooltip label="Rezervacijos detalės">
                      <ActionIcon
                        variant="subtle"
                        aria-label={`Rezervacijos detalės: ${booking.customerName}`}
                        onClick={() => onView(booking.id)}
                      >
                        <IconEye size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Stack>
    </Box>
  );
}
