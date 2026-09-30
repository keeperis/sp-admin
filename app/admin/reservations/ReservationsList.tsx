'use client';

import { Badge, Box, Button, Text } from '@mantine/core';
import { IconChevronRight, IconUsers } from '@tabler/icons-react';
import { type ReservationBooking, statusColor, statusLabel } from '@/lib/reservations/presentation';

export function ReservationsList({
  bookings,
  onView,
}: {
  bookings: ReservationBooking[];
  onView: (id: string) => void;
}) {
  return (
    <Box
      component="ul"
      aria-label="Rezervacijos į dirbtuves"
      m={0}
      p={0}
      miw={0}
      style={{
        listStyle: 'none',
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-sm)',
        overflow: 'hidden',
      }}
    >
      {bookings.map((booking, index) => (
        <Box
          component="li"
          key={booking.id}
          style={{ borderTop: index ? '1px solid var(--mantine-color-default-border)' : undefined }}
        >
          <Button
            variant="subtle"
            color="gray"
            fullWidth
            h={52}
            px="xs"
            radius={0}
            styles={{
              root: { color: 'var(--mantine-color-text)' },
              label: { width: '100%', display: 'block' },
            }}
            aria-label={`Rezervacijos detalės: ${booking.customerName}`}
            aria-haspopup="dialog"
            onClick={() => onView(booking.id)}
          >
            <Box
              component="span"
              style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}
            >
              <Box component="span" style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <Text
                  component="span"
                  display="block"
                  size="sm"
                  fw={500}
                  lh="18px"
                  truncate="end"
                  title={booking.customerName}
                >
                  {booking.customerName}
                </Text>
                <Badge size="xs" variant="light" color={statusColor(booking.status)}>
                  {statusLabel(booking.status)}
                </Badge>
              </Box>
              <Box
                component="span"
                aria-label={`Dalyviai: ${booking.participantsCount}`}
                style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
              >
                <IconUsers size={14} aria-hidden="true" />
                <Text component="span" size="xs" fw={500}>
                  {booking.participantsCount}
                </Text>
              </Box>
              <IconChevronRight size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
            </Box>
          </Button>
        </Box>
      ))}
    </Box>
  );
}
