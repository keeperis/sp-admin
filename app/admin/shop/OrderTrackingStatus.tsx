import { Stack, Text } from '@mantine/core';
import { type DpdOrderTracking, dpdTrackingLabels } from '@/lib/shop/dpd-tracking-contract';
export function OrderTrackingStatus({ tracking }: { tracking?: DpdOrderTracking | null }) {
  if (!tracking) return null;
  return (
    <Stack gap={2}>
      <Text
        size="xs"
        c={
          tracking.status === 'delivered'
            ? 'teal'
            : ['attention', 'returned', 'returning', 'unavailable'].includes(tracking.status)
              ? 'orange'
              : 'dimmed'
        }
      >
        {dpdTrackingLabels[tracking.status] || 'DPD būsena tikrinama'}
      </Text>
      {tracking.lastCheckedAt && (
        <Text size="xs" c="dimmed">
          Tikrinta {new Date(tracking.lastCheckedAt).toLocaleString('lt-LT')}
        </Text>
      )}
      {tracking.errorMessage && (
        <Text size="xs" c="orange">
          {tracking.errorMessage}
        </Text>
      )}
    </Stack>
  );
}
