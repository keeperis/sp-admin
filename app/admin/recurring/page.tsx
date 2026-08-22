'use client';

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowsExchange,
  IconCancel,
  IconCopy,
  IconEye,
  IconLink,
  IconMail,
  IconPlayerPause,
  IconPlayerPlay,
  IconReceiptRefund,
  IconRefresh,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import type { SiteKey } from '@/lib/site';

type RefundReason = 'requested_by_customer' | 'duplicate' | 'fraudulent';

const PROJECT_OPTIONS: Array<{ value: SiteKey; label: string }> = [
  { value: 'ceramics', label: 'Ceramics' },
  { value: 'yoga', label: 'Yoga' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Visi statusai' },
  { value: 'pending_payment', label: 'Laukia mokėjimo' },
  { value: 'active', label: 'Aktyvus' },
  { value: 'paused', label: 'Pristabdytas' },
  { value: 'completed', label: 'Užbaigtas' },
  { value: 'expired', label: 'Pasibaigęs' },
  { value: 'cancelled', label: 'Atšauktas' },
];

const REFUND_STATUS_OPTIONS = [
  { value: 'not_applicable', label: 'Netaikoma' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
];

const REFUND_REASON_OPTIONS: Array<{ value: RefundReason; label: string }> = [
  { value: 'requested_by_customer', label: 'Requested by customer' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'fraudulent', label: 'Fraudulent' },
];

const REFUND_EXCEPTION_OPTIONS = [
  { value: 'manual_refund_required', label: 'Manual refund required' },
  { value: 'bank_side_followup', label: 'Bank side follow-up' },
  { value: 'stripe_refund_failed', label: 'Stripe refund failed' },
];

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Nepavyko gauti recurring duomenų');
  }
  return data;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('lt-LT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

function statusColor(status: string | null | undefined) {
  if (status === 'active' || status === 'completed') return 'green';
  if (status === 'paused' || status === 'pending') return 'yellow';
  if (status === 'pending_payment') return 'orange';
  if (status === 'cancelled' || status === 'declined') return 'red';
  if (status === 'expired') return 'gray';
  if (status === 'succeeded' || status === 'completed') return 'green';
  return 'blue';
}

function asTextList(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return '-';
  return value.join(', ');
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function formatAgeMinutes(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

async function copyToClipboard(value: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function RecurringAdminPage() {
  const [site, setSite] = useState<SiteKey>('ceramics');
  const [status, setStatus] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [cancelRefundStatus, setCancelRefundStatus] = useState('not_applicable');
  const [cancelRefundAmount, setCancelRefundAmount] = useState('');
  const [cancelRefundReference, setCancelRefundReference] = useState('');
  const [changePlanId, setChangePlanId] = useState('');
  const [refundReason, setRefundReason] = useState<RefundReason>('requested_by_customer');
  const [refundExceptionCode, setRefundExceptionCode] = useState('manual_refund_required');
  const [refundExceptionMessage, setRefundExceptionMessage] = useState('');
  const [reservationActionNotes, setReservationActionNotes] = useState('');
  const [reservationCancelReason, setReservationCancelReason] = useState('');
  const [manualMagicLinkRequest, setManualMagicLinkRequest] = useState<null | {
    subscriptionId: string;
  }>(null);
  const [manualMagicLinkReason, setManualMagicLinkReason] = useState('');
  const [isGeneratedMagicLinkVisible, setIsGeneratedMagicLinkVisible] = useState(false);
  const [generatedMagicLink, setGeneratedMagicLink] = useState<null | {
    consumeUrl: string;
    customerEmail: string;
    expiresAt: string;
    subscriptionId: string | null;
    operatorReason: string;
  }>(null);

  const subscriptionsApiUrl = useMemo(() => {
    const params = new URLSearchParams({ site });
    if (status) params.set('status', status);
    if (customerEmail.trim()) params.set('customerEmail', customerEmail.trim().toLowerCase());
    return `/api/admin/recurring/subscriptions?${params.toString()}`;
  }, [customerEmail, site, status]);
  const observabilityApiUrl = useMemo(() => {
    const params = new URLSearchParams({ site });
    return `/api/admin/recurring/observability?${params.toString()}`;
  }, [site]);

  const { data, error, isLoading, mutate } = useSWR(subscriptionsApiUrl, fetcher);
  const {
    data: observabilityData,
    error: observabilityError,
    isLoading: isLoadingObservability,
    mutate: mutateObservability,
  } = useSWR(observabilityApiUrl, fetcher);
  const subscriptions = data?.subscriptions || [];
  const observabilitySummary = observabilityData?.summary || null;
  const observabilityQueues = observabilityData?.queues || {};
  const selectedSubscriptionId = selectedSubscription?.subscription?.id || null;
  const selectedSubscriptionSite = selectedSubscription?.subscription?.site || site;
  const selectedGroupId = selectedSubscription?.subscription?.defaultGroupId || null;
  const selectedReservationsApiUrl = useMemo(() => {
    if (!selectedSubscriptionId) return null;
    const params = new URLSearchParams({
      site: selectedSubscriptionSite,
      subscriptionId: selectedSubscriptionId,
      dateFrom: todayDateOnly(),
    });
    return `/api/admin/recurring/reservations?${params.toString()}`;
  }, [selectedSubscriptionId, selectedSubscriptionSite]);
  const selectedOccurrencesApiUrl = useMemo(() => {
    if (!selectedGroupId) return null;
    const params = new URLSearchParams({
      site: selectedSubscriptionSite,
      groupId: selectedGroupId,
      dateFrom: todayDateOnly(),
    });
    return `/api/admin/recurring/occurrences?${params.toString()}`;
  }, [selectedGroupId, selectedSubscriptionSite]);
  const {
    data: selectedReservationsData,
    error: selectedReservationsError,
    isLoading: isLoadingSelectedReservations,
    mutate: mutateSelectedReservations,
  } = useSWR(selectedReservationsApiUrl, fetcher);
  const {
    data: selectedOccurrencesData,
    error: selectedOccurrencesError,
    isLoading: isLoadingSelectedOccurrences,
    mutate: mutateSelectedOccurrences,
  } = useSWR(selectedOccurrencesApiUrl, fetcher);

  const selectedPlanOptions = selectedSubscription?.lifecycle?.planOptions || [];
  const selectedPlanOption =
    selectedPlanOptions.find((option: any) => option.plan.id === changePlanId) || null;
  const selectedReservations = selectedReservationsData?.reservations || [];
  const selectedOccurrences = selectedOccurrencesData?.occurrences || [];
  const reservationActionNotesTrimmed = reservationActionNotes.trim();
  const reservationCancelReasonTrimmed = reservationCancelReason.trim();
  const hasReservationActionNotes = reservationActionNotesTrimmed.length > 0;
  const manualMagicLinkReasonTrimmed = manualMagicLinkReason.trim();
  const canConfirmManualMagicLinkReveal = manualMagicLinkReasonTrimmed.length >= 8;

  const resetActionInputs = (detail: any) => {
    const firstEligiblePlan = detail?.lifecycle?.planOptions?.find(
      (option: any) => option.eligible,
    );
    setActionNotes('');
    setCancelRefundStatus('not_applicable');
    setCancelRefundAmount('');
    setCancelRefundReference('');
    setChangePlanId(firstEligiblePlan?.plan?.id || '');
    setRefundReason('requested_by_customer');
    setRefundExceptionCode('manual_refund_required');
    setRefundExceptionMessage('');
    setReservationActionNotes('');
    setReservationCancelReason('');
  };

  const openSubscriptionDetails = async (subscriptionId: string) => {
    setIsLoadingDetails(true);
    setSelectedSubscription({ subscription: { id: subscriptionId } });
    try {
      const response = await fetch(`/api/admin/recurring/subscriptions/${subscriptionId}`, {
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok || !result.subscription) {
        throw new Error(result.error || 'Nepavyko gauti recurring abonimento');
      }
      setSelectedSubscription(result);
      resetActionInputs(result);
    } catch (nextError: any) {
      setSelectedSubscription(null);
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const postRecurringAction = async ({
    path,
    body,
    successMessage,
    loadingKey,
  }: {
    path: string;
    body: Record<string, unknown>;
    successMessage: string;
    loadingKey: string;
  }) => {
    if (!selectedSubscription?.subscription?.id) return;
    setActionLoading(loadingKey);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Veiksmas nepavyko');
      }
      notifications.show({ message: successMessage, color: 'green' });
      await Promise.all([mutate(), mutateObservability()]);
      await openSubscriptionDetails(selectedSubscription.subscription.id);
    } catch (nextError: any) {
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setActionLoading(null);
    }
  };

  const runLifecycleAction = async (
    action: 'pause' | 'resume' | 'cancel' | 'regenerate-schedule',
  ) => {
    if (!selectedSubscription?.subscription?.id) return;

    const body: Record<string, unknown> = {};
    if (actionNotes.trim()) body.notes = actionNotes.trim();
    if (action === 'cancel') {
      if (cancelRefundStatus) body.refundStatus = cancelRefundStatus;
      if (cancelRefundAmount.trim()) body.refundAmountEur = Number(cancelRefundAmount);
      if (cancelRefundReference.trim()) body.refundReference = cancelRefundReference.trim();
    }

    await postRecurringAction({
      path: `/api/admin/recurring/subscriptions/${selectedSubscription.subscription.id}/${action}`,
      body,
      successMessage:
        action === 'pause'
          ? 'Abonimentas pristabdytas'
          : action === 'resume'
            ? 'Abonimentas atnaujintas'
            : action === 'cancel'
              ? 'Abonimentas atšauktas'
              : 'Grafikas pergeneruotas',
      loadingKey: action,
    });
  };

  const runPlanChange = async () => {
    if (!selectedSubscription?.subscription?.id || !changePlanId) return;
    await postRecurringAction({
      path: `/api/admin/recurring/subscriptions/${selectedSubscription.subscription.id}/change-plan`,
      body: {
        planId: changePlanId,
        ...(actionNotes.trim() ? { notes: actionNotes.trim() } : {}),
      },
      successMessage: 'Planas pakeistas',
      loadingKey: 'change-plan',
    });
  };

  const runRefundExecute = async () => {
    if (!selectedSubscription?.subscription?.id) return;
    await postRecurringAction({
      path: `/api/admin/recurring/subscriptions/${selectedSubscription.subscription.id}/refund`,
      body: {
        mode: 'execute',
        reason: refundReason,
        ...(actionNotes.trim() ? { notes: actionNotes.trim() } : {}),
      },
      successMessage: 'Refund inicijuotas',
      loadingKey: 'refund-execute',
    });
  };

  const runRefundException = async () => {
    if (!selectedSubscription?.subscription?.id) return;
    await postRecurringAction({
      path: `/api/admin/recurring/subscriptions/${selectedSubscription.subscription.id}/refund`,
      body: {
        mode: 'record_exception',
        exceptionCode: refundExceptionCode,
        exceptionMessage: refundExceptionMessage.trim() || undefined,
        ...(actionNotes.trim() ? { notes: actionNotes.trim() } : {}),
      },
      successMessage: 'Refund exception įrašyta',
      loadingKey: 'refund-exception',
    });
  };

  const issueAdminMagicLink = async ({
    subscriptionId,
    deliveryMode,
    reason,
  }: {
    subscriptionId: string;
    deliveryMode: 'manual' | 'email';
    reason?: string;
  }) => {
    setActionLoading(`issue-magic-link-${deliveryMode}-${subscriptionId}`);
    try {
      const response = await fetch(
        `/api/admin/recurring/subscriptions/${subscriptionId}/issue-magic-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({
            deliveryMode,
            ...(reason?.trim() ? { reason: reason.trim() } : {}),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Nepavyko išduoti magic link');
      }

      if (deliveryMode === 'manual') {
        if (!result.magicLink) {
          throw new Error('Magic link negrąžintas');
        }

        setGeneratedMagicLink({
          ...result.magicLink,
          operatorReason: reason?.trim() || '',
        });
        setIsGeneratedMagicLinkVisible(false);
        setManualMagicLinkRequest(null);
        setManualMagicLinkReason('');
        notifications.show({
          message: 'Manual magic link paruoštas saugiai peržiūrai',
          color: 'green',
        });
      } else {
        setGeneratedMagicLink(null);
        setIsGeneratedMagicLinkVisible(false);
        notifications.show({
          message: 'Recurring magic link išsiųstas klientui el. paštu',
          color: 'green',
        });
      }

      await Promise.all([mutate(), mutateObservability()]);
      if (selectedSubscriptionId === subscriptionId) {
        await openSubscriptionDetails(subscriptionId);
      }
    } catch (nextError: any) {
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setActionLoading(null);
    }
  };

  const requestManualMagicLinkReveal = (subscriptionId: string) => {
    setManualMagicLinkRequest({ subscriptionId });
    setManualMagicLinkReason('');
  };

  const refreshSelectedOperationalContext = async () => {
    if (!selectedSubscriptionId) return;
    await Promise.all([
      mutate(),
      mutateObservability(),
      mutateSelectedReservations(),
      mutateSelectedOccurrences(),
    ]);
    await openSubscriptionDetails(selectedSubscriptionId);
  };

  const postReservationOperationalAction = async ({
    path,
    body,
    successMessage,
    loadingKey,
  }: {
    path: string;
    body: Record<string, unknown>;
    successMessage: string;
    loadingKey: string;
  }) => {
    setActionLoading(loadingKey);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Veiksmas nepavyko');
      }
      notifications.show({ message: successMessage, color: 'green' });
      setReservationActionNotes('');
      setReservationCancelReason('');
      await refreshSelectedOperationalContext();
    } catch (nextError: any) {
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setActionLoading(null);
    }
  };

  const runReservationCannotAttend = async (reservationId: string, timing: 'early' | 'late') => {
    if (!hasReservationActionNotes) {
      notifications.show({
        message: 'Įrašyk attendance / cancel notes prieš atlikdamas admin override',
        color: 'yellow',
      });
      return;
    }

    await postReservationOperationalAction({
      path: `/api/admin/recurring/reservations/${reservationId}/cannot-attend`,
      body: {
        timing,
        notes: reservationActionNotesTrimmed,
        ...(reservationCancelReasonTrimmed ? { cancelReason: reservationCancelReasonTrimmed } : {}),
      },
      successMessage: timing === 'early' ? 'Pažymėtas early cancel' : 'Pažymėtas late cancel',
      loadingKey: `${reservationId}-${timing}`,
    });
  };

  const runReservationAttendance = async ({
    occurrenceId,
    reservationId,
    result,
  }: {
    occurrenceId: string;
    reservationId: string;
    result: 'attended' | 'late_cancel' | 'no_show' | 'cancelled_early';
  }) => {
    if (!hasReservationActionNotes) {
      notifications.show({
        message: 'Įrašyk attendance / cancel notes prieš atlikdamas admin override',
        color: 'yellow',
      });
      return;
    }

    await postReservationOperationalAction({
      path: `/api/admin/recurring/occurrences/${occurrenceId}/attendance`,
      body: {
        reservationId,
        result,
        notes: reservationActionNotesTrimmed,
      },
      successMessage: `Attendance rezultatas įrašytas: ${result}`,
      loadingKey: `${reservationId}-${result}`,
    });
  };

  const clearFilters = () => {
    setStatus('');
    setCustomerEmail('');
  };

  const openSubscriptionFromAttention = async (subscriptionId: string | null | undefined) => {
    if (!subscriptionId) {
      notifications.show({
        message: 'Šis signalas dar neturi susieto subscription įrašo',
        color: 'yellow',
      });
      return;
    }

    await openSubscriptionDetails(subscriptionId);
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={2}>Recurring</Title>
            <Text size="sm" c="dimmed" mt={4}>
              Admin lifecycle, refund ir audit valdymas recurring abonimentams
            </Text>
          </div>
          <Button variant="light" onClick={clearFilters}>
            Išvalyti filtrus
          </Button>
        </Group>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group align="flex-end" wrap="wrap">
            <Select
              label="Projektas"
              data={PROJECT_OPTIONS}
              value={site}
              onChange={(value) => setSite(value === 'yoga' ? 'yoga' : 'ceramics')}
              allowDeselect={false}
              w={170}
            />
            <Select
              label="Statusas"
              data={STATUS_OPTIONS}
              value={status}
              onChange={(value) => setStatus(value || '')}
              allowDeselect={false}
              w={220}
            />
            <TextInput
              label="Customer email"
              placeholder="vardas@example.com"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.currentTarget.value)}
              style={{ flex: 1, minWidth: 280 }}
            />
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="lg">
            <Group justify="space-between" align="center">
              <div>
                <Title order={4}>Recurring observability</Title>
                <Text size="sm" c="dimmed">
                  Minimalus purchase, fulfillment, access delivery, refund ir lifecycle dėmesio
                  vaizdas
                </Text>
              </div>
              <Text size="sm" c="dimmed">
                {isLoadingObservability
                  ? 'Kraunama...'
                  : `Atnaujinta ${formatDateTime(observabilityData?.generatedAt)}`}
              </Text>
            </Group>

            {observabilityError ? (
              <Alert color="red" title="Observability klaida">
                {observabilityError.message}
              </Alert>
            ) : (
              <>
                <SimpleGrid cols={{ base: 2, md: 3, xl: 6 }}>
                  <Card withBorder>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Aktyvūs abonimentai
                      </Text>
                      <Text fw={700} size="xl">
                        {observabilitySummary?.activeSubscriptions ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Iš viso {observabilitySummary?.totalSubscriptions ?? '-'}
                      </Text>
                    </Stack>
                  </Card>
                  <Card withBorder>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Paid to fulfillment attention
                      </Text>
                      <Text fw={700} size="xl">
                        {observabilitySummary?.paidAwaitingFulfillment ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Reikia webhook / provisioning patikros
                      </Text>
                    </Stack>
                  </Card>
                  <Card withBorder>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Access delivery attention
                      </Text>
                      <Text fw={700} size="xl">
                        {observabilitySummary?.accessAttention ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Failed / unavailable / stale
                      </Text>
                    </Stack>
                  </Card>
                  <Card withBorder>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Refund attention
                      </Text>
                      <Text fw={700} size="xl">
                        {observabilitySummary?.refundAttention ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Pending arba exception
                      </Text>
                    </Stack>
                  </Card>
                  <Card withBorder>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Payment failures 24h
                      </Text>
                      <Text fw={700} size="xl">
                        {observabilitySummary?.recentPaymentFailures ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Failed / expired
                      </Text>
                    </Stack>
                  </Card>
                  <Card withBorder>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Lifecycle attention 24h
                      </Text>
                      <Text fw={700} size="xl">
                        {observabilitySummary?.recentLifecycleAttention ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Refund pending / exception
                      </Text>
                    </Stack>
                  </Card>
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, xl: 2 }}>
                  <Card withBorder>
                    <Stack gap="sm">
                      <Title order={5}>Fulfillment attention</Title>
                      {observabilityQueues.fulfillmentAttention?.length ? (
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Klientas</Table.Th>
                              <Table.Th>Būsena</Table.Th>
                              <Table.Th>Amžius</Table.Th>
                              <Table.Th>Veiksmai</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {observabilityQueues.fulfillmentAttention.map((item: any) => (
                              <Table.Tr key={item.purchase.id}>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Text size="sm" fw={600}>
                                      {item.purchase.customerName}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {item.purchase.customerEmail}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Badge color="orange" variant="light">
                                      {item.purchase.paymentStatus} /{' '}
                                      {item.purchase.fulfillmentState}
                                    </Badge>
                                    <Text size="xs" c="dimmed">
                                      {item.stripe?.lastEventType || item.reason}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Text size="sm">{formatAgeMinutes(item.ageMinutes)}</Text>
                                    <Code>{item.purchase.id}</Code>
                                  </Stack>
                                </Table.Td>
                                <Table.Td>
                                  <Group gap="xs" wrap="wrap">
                                    <Button
                                      size="xs"
                                      variant="light"
                                      leftSection={<IconEye size={14} />}
                                      disabled={!item.purchase.subscriptionId}
                                      onClick={() =>
                                        void openSubscriptionFromAttention(
                                          item.purchase.subscriptionId,
                                        )
                                      }
                                    >
                                      Atidaryti
                                    </Button>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      ) : (
                        <Text c="dimmed">Nėra paid-but-not-fulfilled purchase'ų.</Text>
                      )}
                    </Stack>
                  </Card>

                  <Card withBorder>
                    <Stack gap="sm">
                      <Title order={5}>Access delivery attention</Title>
                      {observabilityQueues.accessAttention?.length ? (
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Klientas</Table.Th>
                              <Table.Th>Delivery</Table.Th>
                              <Table.Th>Paskutinė klaida</Table.Th>
                              <Table.Th>Veiksmai</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {observabilityQueues.accessAttention.map((item: any) => (
                              <Table.Tr key={item.purchase.id}>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Text size="sm" fw={600}>
                                      {item.purchase.customerName}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {item.purchase.customerEmail}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Badge
                                      color={statusColor(item.access?.deliveryState)}
                                      variant="light"
                                    >
                                      {item.access?.deliveryState || '-'}
                                    </Badge>
                                    <Text size="xs" c="dimmed">
                                      {formatAgeMinutes(item.ageMinutes)}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Text size="sm">{item.access?.lastError || '-'}</Text>
                                    <Code>{item.purchase.id}</Code>
                                  </Stack>
                                </Table.Td>
                                <Table.Td>
                                  <Group gap="xs" wrap="wrap">
                                    <Button
                                      size="xs"
                                      variant="light"
                                      leftSection={<IconEye size={14} />}
                                      disabled={!item.purchase.subscriptionId}
                                      onClick={() =>
                                        void openSubscriptionFromAttention(
                                          item.purchase.subscriptionId,
                                        )
                                      }
                                    >
                                      Atidaryti
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="light"
                                      leftSection={<IconMail size={14} />}
                                      loading={
                                        actionLoading ===
                                        `issue-magic-link-email-${item.purchase.subscriptionId}`
                                      }
                                      disabled={!item.purchase.subscriptionId}
                                      onClick={() =>
                                        item.purchase.subscriptionId
                                          ? void issueAdminMagicLink({
                                              subscriptionId: item.purchase.subscriptionId,
                                              deliveryMode: 'email',
                                            })
                                          : undefined
                                      }
                                    >
                                      Send email
                                    </Button>
                                    <Button
                                      size="xs"
                                      leftSection={<IconLink size={14} />}
                                      loading={
                                        actionLoading ===
                                        `issue-magic-link-manual-${item.purchase.subscriptionId}`
                                      }
                                      disabled={!item.purchase.subscriptionId}
                                      onClick={() =>
                                        item.purchase.subscriptionId
                                          ? requestManualMagicLinkReveal(
                                              item.purchase.subscriptionId,
                                            )
                                          : undefined
                                      }
                                    >
                                      Issue link
                                    </Button>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      ) : (
                        <Text c="dimmed">Access delivery problemų šiuo metu nėra.</Text>
                      )}
                    </Stack>
                  </Card>

                  <Card withBorder>
                    <Stack gap="sm">
                      <Title order={5}>Refund attention</Title>
                      {observabilityQueues.refundAttention?.length ? (
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Klientas</Table.Th>
                              <Table.Th>Refund state</Table.Th>
                              <Table.Th>Signalas</Table.Th>
                              <Table.Th>Veiksmai</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {observabilityQueues.refundAttention.map((item: any) => (
                              <Table.Tr key={item.purchase.id}>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Text size="sm" fw={600}>
                                      {item.purchase.customerName}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {item.purchase.customerEmail}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Badge color={statusColor(item.refund?.state)} variant="light">
                                      {item.refund?.state || '-'}
                                    </Badge>
                                    <Text size="xs" c="dimmed">
                                      {item.refund?.providerStatus || '-'}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Text size="sm">{item.refund?.lastError || '-'}</Text>
                                    <Text size="xs" c="dimmed">
                                      {formatDateTime(item.refund?.updatedAt)}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                                <Table.Td>
                                  <Button
                                    size="xs"
                                    variant="light"
                                    leftSection={<IconEye size={14} />}
                                    disabled={!item.purchase.subscriptionId}
                                    onClick={() =>
                                      void openSubscriptionFromAttention(
                                        item.purchase.subscriptionId,
                                      )
                                    }
                                  >
                                    Atidaryti
                                  </Button>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      ) : (
                        <Text c="dimmed">Refund pending/exception įrašų nėra.</Text>
                      )}
                    </Stack>
                  </Card>

                  <Card withBorder>
                    <Stack gap="sm">
                      <Title order={5}>Recent payment failures</Title>
                      {observabilityQueues.recentPaymentFailures?.length ? (
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Klientas</Table.Th>
                              <Table.Th>Statusas</Table.Th>
                              <Table.Th>Stripe signalas</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {observabilityQueues.recentPaymentFailures.map((item: any) => (
                              <Table.Tr key={item.purchase.id}>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Text size="sm" fw={600}>
                                      {item.purchase.customerName}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {item.purchase.customerEmail}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Badge
                                      color={statusColor(item.purchase.status)}
                                      variant="light"
                                    >
                                      {item.purchase.status}
                                    </Badge>
                                    <Text size="xs" c="dimmed">
                                      {item.purchase.paymentStatus}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Text size="sm">{item.stripe?.lastEventType || '-'}</Text>
                                    <Text size="xs" c="dimmed">
                                      {formatAgeMinutes(item.ageMinutes)}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      ) : (
                        <Text c="dimmed">Per paskutines 24h payment failure signalų nėra.</Text>
                      )}
                    </Stack>
                  </Card>
                </SimpleGrid>

                <Card withBorder>
                  <Stack gap="sm">
                    <Title order={5}>Recent lifecycle attention</Title>
                    {observabilityQueues.recentLifecycleAttention?.length ? (
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Klientas</Table.Th>
                            <Table.Th>Veiksmas</Table.Th>
                            <Table.Th>Refund</Table.Th>
                            <Table.Th>Laikas</Table.Th>
                            <Table.Th>Veiksmai</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {observabilityQueues.recentLifecycleAttention.map((entry: any) => (
                            <Table.Tr
                              key={`${entry.subscriptionId}-${entry.createdAt}-${entry.action}`}
                            >
                              <Table.Td>
                                <Stack gap={2}>
                                  <Text size="sm" fw={600}>
                                    {entry.customerName}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {entry.customerEmail}
                                  </Text>
                                </Stack>
                              </Table.Td>
                              <Table.Td>
                                <Stack gap={2}>
                                  <Badge color={statusColor(entry.action)} variant="light">
                                    {entry.action}
                                  </Badge>
                                  <Text size="xs" c="dimmed">
                                    {entry.actorLabel}
                                  </Text>
                                </Stack>
                              </Table.Td>
                              <Table.Td>
                                <Stack gap={2}>
                                  <Badge color={statusColor(entry.refundStatus)} variant="light">
                                    {entry.refundStatus}
                                  </Badge>
                                  <Text size="xs">{formatMoney(entry.refundAmountEur)}</Text>
                                </Stack>
                              </Table.Td>
                              <Table.Td>
                                <Stack gap={2}>
                                  <Text size="sm">{formatDateTime(entry.createdAt)}</Text>
                                  <Text size="xs" c="dimmed">
                                    {entry.notes || '-'}
                                  </Text>
                                </Stack>
                              </Table.Td>
                              <Table.Td>
                                <Button
                                  size="xs"
                                  variant="light"
                                  leftSection={<IconEye size={14} />}
                                  disabled={!entry.subscriptionId}
                                  onClick={() =>
                                    void openSubscriptionFromAttention(entry.subscriptionId)
                                  }
                                >
                                  Atidaryti
                                </Button>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text c="dimmed">
                        Per paskutines 24h refund-related lifecycle attention įrašų nėra.
                      </Text>
                    )}
                  </Stack>
                </Card>
              </>
            )}
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Recurring abonimentai</Title>
            <Text size="sm" c="dimmed">
              {isLoading ? 'Kraunama...' : `${subscriptions.length} įrašai`}
            </Text>
          </Group>

          {error ? (
            <Alert color="red" title="Klaida">
              {error.message}
            </Alert>
          ) : subscriptions.length === 0 && !isLoading ? (
            <Text c="dimmed">Recurring abonimentų pagal pasirinktus filtrus nėra.</Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Klientas</Table.Th>
                  <Table.Th>Statusas</Table.Th>
                  <Table.Th>Langas</Table.Th>
                  <Table.Th>Likutis</Table.Th>
                  <Table.Th>Paskutinis įvykis</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {subscriptions.map((subscription: any) => (
                  <Table.Tr key={subscription.id}>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text fw={600}>{subscription.customerName}</Text>
                        <Text size="sm" c="dimmed">
                          {subscription.customerEmail}
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={statusColor(subscription.status)} variant="light">
                        {subscription.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm">
                          {subscription.startDate} → {subscription.validUntil}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {subscription.site} · {formatMoney(subscription.priceEur)}
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      {subscription.remainingSessions} / {subscription.totalSessions}
                    </Table.Td>
                    <Table.Td>
                      {subscription.latestLifecycleEvent ? (
                        <Stack gap={2}>
                          <Badge
                            color={statusColor(subscription.latestLifecycleEvent.refundStatus)}
                            variant="light"
                          >
                            {subscription.latestLifecycleEvent.action}
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {formatDateTime(subscription.latestLifecycleEvent.createdAt)}
                          </Text>
                        </Stack>
                      ) : (
                        <Text size="sm" c="dimmed">
                          -
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        aria-label="Peržiūrėti"
                        onClick={() => openSubscriptionDetails(subscription.id)}
                      >
                        <IconEye size={18} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="teal"
                        aria-label="Send magic link email"
                        loading={actionLoading === `issue-magic-link-email-${subscription.id}`}
                        onClick={() =>
                          void issueAdminMagicLink({
                            subscriptionId: subscription.id,
                            deliveryMode: 'email',
                          })
                        }
                      >
                        <IconMail size={18} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="grape"
                        aria-label="Issue magic link"
                        loading={actionLoading === `issue-magic-link-manual-${subscription.id}`}
                        onClick={() => requestManualMagicLinkReveal(subscription.id)}
                      >
                        <IconLink size={18} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}

          {isLoading ? (
            <Group justify="center" mt="lg">
              <Loader size="sm" />
            </Group>
          ) : null}
        </Card>

        <Modal
          opened={Boolean(selectedSubscription)}
          onClose={() => setSelectedSubscription(null)}
          title="Recurring abonimento detalė"
          size="90%"
        >
          {isLoadingDetails ? (
            <Group justify="center" py="xl">
              <Loader />
            </Group>
          ) : selectedSubscription?.subscription ? (
            <Stack gap="lg">
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <Card withBorder>
                  <Stack gap="xs">
                    <Title order={5}>Santrauka</Title>
                    <Text>
                      <strong>Klientas:</strong> {selectedSubscription.subscription.customerName}
                    </Text>
                    <Text>
                      <strong>Email:</strong> {selectedSubscription.subscription.customerEmail}
                    </Text>
                    <Text>
                      <strong>Telefonas:</strong>{' '}
                      {selectedSubscription.subscription.customerPhone || '-'}
                    </Text>
                    <Text>
                      <strong>Statusas:</strong>{' '}
                      <Badge
                        color={statusColor(selectedSubscription.subscription.status)}
                        variant="light"
                      >
                        {selectedSubscription.subscription.status}
                      </Badge>
                    </Text>
                    <Text>
                      <strong>Startas:</strong> {selectedSubscription.subscription.startDate}
                    </Text>
                    <Text>
                      <strong>Validumas:</strong> {selectedSubscription.subscription.validFrom} →{' '}
                      {selectedSubscription.subscription.validUntil}
                    </Text>
                    <Text>
                      <strong>Kaina:</strong>{' '}
                      {formatMoney(selectedSubscription.subscription.priceEur)}
                    </Text>
                    <Text>
                      <strong>Likutis:</strong>{' '}
                      {selectedSubscription.subscription.remainingSessions} /{' '}
                      {selectedSubscription.subscription.totalSessions}
                    </Text>
                    <Text>
                      <strong>Source purchase:</strong>{' '}
                      {selectedSubscription.subscription.sourcePurchaseId || '-'}
                    </Text>
                    <Text>
                      <strong>Paskutinis magic link:</strong>{' '}
                      {formatDateTime(selectedSubscription.subscription.latestMagicLinkIssuedAt)}
                    </Text>
                  </Stack>
                </Card>

                <Card withBorder>
                  <Stack gap="xs">
                    <Title order={5}>Provisioning / makeup</Title>
                    <Text>
                      <strong>Planned count:</strong>{' '}
                      {selectedSubscription.provisioning?.schedule?.plannedCount ?? '-'}
                    </Text>
                    <Text>
                      <strong>Scheduled through:</strong>{' '}
                      {selectedSubscription.provisioning?.schedule?.scheduledThrough || '-'}
                    </Text>
                    <Text>
                      <strong>Generation version:</strong>{' '}
                      {selectedSubscription.provisioning?.schedule?.generationVersion ?? '-'}
                    </Text>
                    <Text>
                      <strong>Makeup balance:</strong>{' '}
                      {selectedSubscription.makeup?.remainingCredits ?? '-'}
                    </Text>
                    <Text>
                      <strong>Releasable future dates:</strong>{' '}
                      {asTextList(selectedSubscription.lifecycle?.releasePreview?.releasableDates)}
                    </Text>
                    <Text>
                      <strong>Blocked reservations:</strong>{' '}
                      {selectedSubscription.lifecycle?.releasePreview?.blockedReservations
                        ?.length || 0}
                    </Text>
                    <Group pt="xs">
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconMail size={14} />}
                        loading={
                          actionLoading ===
                          `issue-magic-link-email-${selectedSubscription.subscription.id}`
                        }
                        onClick={() =>
                          void issueAdminMagicLink({
                            subscriptionId: selectedSubscription.subscription.id,
                            deliveryMode: 'email',
                          })
                        }
                      >
                        Send magic link email
                      </Button>
                      <Button
                        size="xs"
                        leftSection={<IconLink size={14} />}
                        loading={
                          actionLoading ===
                          `issue-magic-link-manual-${selectedSubscription.subscription.id}`
                        }
                        onClick={() =>
                          requestManualMagicLinkReveal(selectedSubscription.subscription.id)
                        }
                      >
                        Issue magic link
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              </SimpleGrid>

              <Card withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={5}>Lifecycle veiksmai</Title>
                    <Badge variant="light">
                      audit įrašų: {selectedSubscription.lifecycleAudit?.length || 0}
                    </Badge>
                  </Group>

                  <Textarea
                    label="Notes"
                    placeholder="Admin pastabos lifecycle arba refund veiksmui"
                    value={actionNotes}
                    onChange={(event) => setActionNotes(event.currentTarget.value)}
                    minRows={3}
                  />

                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <Card withBorder>
                      <Stack gap="sm">
                        <Text fw={600}>Greiti lifecycle veiksmai</Text>
                        <Group wrap="wrap">
                          <Button
                            leftSection={<IconPlayerPause size={16} />}
                            disabled={!selectedSubscription.lifecycle?.actions?.pause?.eligible}
                            loading={actionLoading === 'pause'}
                            onClick={() => runLifecycleAction('pause')}
                          >
                            Pause
                          </Button>
                          <Button
                            leftSection={<IconPlayerPlay size={16} />}
                            disabled={!selectedSubscription.lifecycle?.actions?.resume?.eligible}
                            loading={actionLoading === 'resume'}
                            onClick={() => runLifecycleAction('resume')}
                          >
                            Resume
                          </Button>
                          <Button
                            leftSection={<IconRefresh size={16} />}
                            loading={actionLoading === 'regenerate-schedule'}
                            onClick={() => runLifecycleAction('regenerate-schedule')}
                          >
                            Regenerate schedule
                          </Button>
                        </Group>
                        <Text size="xs" c="dimmed">
                          Pause:{' '}
                          {selectedSubscription.lifecycle?.actions?.pause?.reason || 'leidžiama'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Resume:{' '}
                          {selectedSubscription.lifecycle?.actions?.resume?.reason || 'leidžiama'}
                        </Text>
                      </Stack>
                    </Card>

                    <Card withBorder>
                      <Stack gap="sm">
                        <Text fw={600}>Cancel su refund apskaita</Text>
                        <Group grow align="flex-end">
                          <Select
                            label="Refund status"
                            data={REFUND_STATUS_OPTIONS}
                            value={cancelRefundStatus}
                            onChange={(value) => setCancelRefundStatus(value || 'not_applicable')}
                            allowDeselect={false}
                          />
                          <TextInput
                            label="Refund amount EUR"
                            placeholder="48.00"
                            value={cancelRefundAmount}
                            onChange={(event) => setCancelRefundAmount(event.currentTarget.value)}
                          />
                        </Group>
                        <TextInput
                          label="Refund reference"
                          placeholder="re_..."
                          value={cancelRefundReference}
                          onChange={(event) => setCancelRefundReference(event.currentTarget.value)}
                        />
                        <Button
                          color="red"
                          leftSection={<IconCancel size={16} />}
                          disabled={!selectedSubscription.lifecycle?.actions?.cancel?.eligible}
                          loading={actionLoading === 'cancel'}
                          onClick={() => runLifecycleAction('cancel')}
                        >
                          Cancel subscription
                        </Button>
                        <Text size="xs" c="dimmed">
                          Cancel:{' '}
                          {selectedSubscription.lifecycle?.actions?.cancel?.reason || 'leidžiama'}
                        </Text>
                      </Stack>
                    </Card>
                  </SimpleGrid>

                  <Card withBorder>
                    <Stack gap="sm">
                      <Text fw={600}>Plan change</Text>
                      <Select
                        label="Kitas planas"
                        data={selectedPlanOptions.map((option: any) => ({
                          value: option.plan.id,
                          label: `${option.plan.nameLt} · ${formatMoney(option.plan.priceEur)} · ${
                            option.eligible ? 'eligible' : option.reason || 'blocked'
                          }`,
                        }))}
                        value={changePlanId}
                        onChange={(value) => setChangePlanId(value || '')}
                        placeholder="Pasirink planą"
                        searchable
                      />
                      <Group>
                        <Button
                          leftSection={<IconArrowsExchange size={16} />}
                          disabled={!selectedPlanOption?.eligible}
                          loading={actionLoading === 'change-plan'}
                          onClick={runPlanChange}
                        >
                          Change plan
                        </Button>
                        <Text size="xs" c="dimmed">
                          {selectedPlanOption?.reason || 'Galima keisti tik į eligible planą'}
                        </Text>
                      </Group>
                    </Stack>
                  </Card>
                </Stack>
              </Card>

              <Card withBorder>
                <Stack gap="md">
                  <Title order={5}>Refund execution / exception</Title>
                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <Card withBorder>
                      <Stack gap="xs">
                        <Text>
                          <strong>Provider:</strong>{' '}
                          {selectedSubscription.refund?.paymentProvider || '-'}
                        </Text>
                        <Text>
                          <strong>Payment status:</strong>{' '}
                          <Badge
                            color={statusColor(selectedSubscription.refund?.paymentStatus)}
                            variant="light"
                          >
                            {selectedSubscription.refund?.paymentStatus || '-'}
                          </Badge>
                        </Text>
                        <Text>
                          <strong>Execution state:</strong>{' '}
                          <Badge
                            color={statusColor(selectedSubscription.refund?.execution?.state)}
                            variant="light"
                          >
                            {selectedSubscription.refund?.execution?.state || '-'}
                          </Badge>
                        </Text>
                        <Text>
                          <strong>Refund amount:</strong>{' '}
                          {formatMoney(selectedSubscription.refund?.amountEur)}
                        </Text>
                        <Text>
                          <strong>Refund ref:</strong>{' '}
                          {selectedSubscription.refund?.execution?.refundReference || '-'}
                        </Text>
                        <Text>
                          <strong>Provider status:</strong>{' '}
                          {selectedSubscription.refund?.execution?.providerStatus || '-'}
                        </Text>
                        <Text>
                          <strong>Last error:</strong>{' '}
                          {selectedSubscription.refund?.execution?.lastError || '-'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {selectedSubscription.refund?.reason || 'Refund execution available'}
                        </Text>
                      </Stack>
                    </Card>

                    <Card withBorder>
                      <Stack gap="sm">
                        <Select
                          label="Stripe refund reason"
                          data={REFUND_REASON_OPTIONS}
                          value={refundReason}
                          onChange={(value) =>
                            setRefundReason((value as RefundReason) || 'requested_by_customer')
                          }
                          allowDeselect={false}
                        />
                        <Button
                          leftSection={<IconReceiptRefund size={16} />}
                          disabled={!selectedSubscription.refund?.eligible}
                          loading={actionLoading === 'refund-execute'}
                          onClick={runRefundExecute}
                        >
                          Vykdyti Stripe refund
                        </Button>
                        <Divider />
                        <Select
                          label="Exception code"
                          data={REFUND_EXCEPTION_OPTIONS}
                          value={refundExceptionCode}
                          onChange={(value) =>
                            setRefundExceptionCode(value || 'manual_refund_required')
                          }
                          allowDeselect={false}
                        />
                        <Textarea
                          label="Exception message"
                          placeholder="Kodėl refund negalima įvykdyti automatiškai"
                          value={refundExceptionMessage}
                          onChange={(event) => setRefundExceptionMessage(event.currentTarget.value)}
                          minRows={3}
                        />
                        <Button
                          variant="light"
                          loading={actionLoading === 'refund-exception'}
                          onClick={runRefundException}
                        >
                          Žymėti refund exception
                        </Button>
                      </Stack>
                    </Card>
                  </SimpleGrid>
                </Stack>
              </Card>

              <Card withBorder>
                <Stack gap="md">
                  <Title order={5}>Lifecycle audit</Title>
                  {selectedSubscription.lifecycleAudit?.length ? (
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Laikas</Table.Th>
                          <Table.Th>Veiksmas</Table.Th>
                          <Table.Th>Actor</Table.Th>
                          <Table.Th>Refund</Table.Th>
                          <Table.Th>Notes / metadata</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {selectedSubscription.lifecycleAudit.map((entry: any, index: number) => (
                          <Table.Tr key={`${entry.createdAt}-${entry.action}-${index}`}>
                            <Table.Td>{formatDateTime(entry.createdAt)}</Table.Td>
                            <Table.Td>
                              <Badge color={statusColor(entry.action)} variant="light">
                                {entry.action}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text size="sm">{entry.actorLabel}</Text>
                                <Text size="xs" c="dimmed">
                                  {entry.actorType}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={2}>
                                <Badge color={statusColor(entry.refundStatus)} variant="light">
                                  {entry.refundStatus}
                                </Badge>
                                <Text size="xs">{formatMoney(entry.refundAmountEur)}</Text>
                                <Text size="xs" c="dimmed">
                                  {entry.refundReference || '-'}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={6}>
                                <Text size="sm">{entry.notes || '-'}</Text>
                                {entry.metadata ? (
                                  <Code block style={{ whiteSpace: 'pre-wrap' }}>
                                    {JSON.stringify(entry.metadata, null, 2)}
                                  </Code>
                                ) : null}
                              </Stack>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  ) : (
                    <Text c="dimmed">Audit įrašų dar nėra.</Text>
                  )}
                </Stack>
              </Card>

              <Card withBorder>
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <div>
                      <Title order={5}>Operacinės rezervacijos</Title>
                      <Text size="sm" c="dimmed">
                        Būsimi šio abonimento recurring reservation veiksmai
                      </Text>
                    </div>
                    <Button
                      variant="light"
                      leftSection={<IconRefresh size={16} />}
                      onClick={() => void refreshSelectedOperationalContext()}
                    >
                      Atnaujinti
                    </Button>
                  </Group>

                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <Textarea
                      label="Attendance / cancel notes"
                      withAsterisk
                      description="Admin override veiksmams pastaba privaloma; po sėkmingo veiksmo laukas išvalomas."
                      placeholder="Pastaba artimiausiam attendance arba cannot-attend veiksmui"
                      value={reservationActionNotes}
                      onChange={(event) => setReservationActionNotes(event.currentTarget.value)}
                      minRows={3}
                    />
                    <TextInput
                      label="Cancel reason"
                      placeholder="Pvz. customer sickness"
                      value={reservationCancelReason}
                      onChange={(event) => setReservationCancelReason(event.currentTarget.value)}
                    />
                  </SimpleGrid>

                  {selectedReservationsError ? (
                    <Alert color="red" title="Klaida">
                      {selectedReservationsError.message}
                    </Alert>
                  ) : isLoadingSelectedReservations ? (
                    <Group justify="center" py="md">
                      <Loader size="sm" />
                    </Group>
                  ) : selectedReservations.length ? (
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Data</Table.Th>
                          <Table.Th>Tipas</Table.Th>
                          <Table.Th>Statusas</Table.Th>
                          <Table.Th>Usage</Table.Th>
                          <Table.Th>Cancel reason</Table.Th>
                          <Table.Th>Veiksmai</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {selectedReservations.map((reservation: any) => {
                          const isScheduled = reservation.status === 'scheduled';
                          return (
                            <Table.Tr key={reservation.id}>
                              <Table.Td>
                                <Stack gap={2}>
                                  <Text size="sm">
                                    {formatDateTime(reservation.occurrence?.startISO)}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {reservation.group?.name || '-'}
                                  </Text>
                                </Stack>
                              </Table.Td>
                              <Table.Td>
                                <Badge variant="light">{reservation.reservationType}</Badge>
                              </Table.Td>
                              <Table.Td>
                                <Badge color={statusColor(reservation.status)} variant="light">
                                  {reservation.status}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm">
                                  {reservation.countsTowardsUsage ? 'Counts' : 'No count'}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm">{reservation.cancelReason || '-'}</Text>
                              </Table.Td>
                              <Table.Td>
                                {isScheduled && reservation.occurrenceId ? (
                                  <Group gap="xs" wrap="wrap">
                                    <Button
                                      size="xs"
                                      variant="light"
                                      disabled={!hasReservationActionNotes}
                                      loading={actionLoading === `${reservation.id}-early`}
                                      onClick={() =>
                                        void runReservationCannotAttend(reservation.id, 'early')
                                      }
                                    >
                                      Early cancel
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="light"
                                      color="orange"
                                      disabled={!hasReservationActionNotes}
                                      loading={actionLoading === `${reservation.id}-late`}
                                      onClick={() =>
                                        void runReservationCannotAttend(reservation.id, 'late')
                                      }
                                    >
                                      Late cancel
                                    </Button>
                                    <Button
                                      size="xs"
                                      color="green"
                                      disabled={!hasReservationActionNotes}
                                      loading={actionLoading === `${reservation.id}-attended`}
                                      onClick={() =>
                                        void runReservationAttendance({
                                          occurrenceId: reservation.occurrenceId,
                                          reservationId: reservation.id,
                                          result: 'attended',
                                        })
                                      }
                                    >
                                      Attended
                                    </Button>
                                    <Button
                                      size="xs"
                                      color="red"
                                      variant="light"
                                      disabled={!hasReservationActionNotes}
                                      loading={actionLoading === `${reservation.id}-no_show`}
                                      onClick={() =>
                                        void runReservationAttendance({
                                          occurrenceId: reservation.occurrenceId,
                                          reservationId: reservation.id,
                                          result: 'no_show',
                                        })
                                      }
                                    >
                                      No-show
                                    </Button>
                                  </Group>
                                ) : (
                                  <Text size="xs" c="dimmed">
                                    Reservation jau nebe scheduled.
                                  </Text>
                                )}
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                      </Table.Tbody>
                    </Table>
                  ) : (
                    <Text c="dimmed">Būsimų rezervacijų šiam abonimentui kol kas nėra.</Text>
                  )}
                </Stack>
              </Card>

              <Card withBorder>
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <div>
                      <Title order={5}>Artimiausi group occurrence'ai</Title>
                      <Text size="sm" c="dimmed">
                        Gyvas selected group tvarkaraščio vaizdas su reservation summary
                      </Text>
                    </div>
                    <Badge variant="light">{selectedOccurrences.length} įrašai</Badge>
                  </Group>

                  {selectedOccurrencesError ? (
                    <Alert color="red" title="Klaida">
                      {selectedOccurrencesError.message}
                    </Alert>
                  ) : isLoadingSelectedOccurrences ? (
                    <Group justify="center" py="md">
                      <Loader size="sm" />
                    </Group>
                  ) : selectedOccurrences.length ? (
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Data</Table.Th>
                          <Table.Th>Statusas</Table.Th>
                          <Table.Th>Capacity</Table.Th>
                          <Table.Th>Reservation summary</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {selectedOccurrences.map((occurrence: any) => (
                          <Table.Tr key={occurrence.id}>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text size="sm">{formatDateTime(occurrence.startISO)}</Text>
                                <Text size="xs" c="dimmed">
                                  {occurrence.group?.locationName || '-'}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={statusColor(occurrence.status)} variant="light">
                                {occurrence.status}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">
                                {occurrence.reservedCount}/{occurrence.capacity} · free{' '}
                                {occurrence.availableCount}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs" wrap="wrap">
                                {Object.entries(occurrence.reservationSummary || {}).map(
                                  ([summaryStatus, count]) => (
                                    <Badge key={summaryStatus} variant="outline">
                                      {summaryStatus}: {String(count)}
                                    </Badge>
                                  ),
                                )}
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  ) : (
                    <Text c="dimmed">Artimiausių occurrence įrašų šiai grupei dar nėra.</Text>
                  )}
                </Stack>
              </Card>
            </Stack>
          ) : null}
        </Modal>

        <Modal
          opened={Boolean(manualMagicLinkRequest)}
          onClose={() => {
            setManualMagicLinkRequest(null);
            setManualMagicLinkReason('');
          }}
          title="Break-glass manual magic link reveal"
          size="md"
        >
          {manualMagicLinkRequest ? (
            <Stack gap="md">
              <Alert color="red" title="Naudok tik išimtiniu atveju">
                Šis kelias skirtas tik tada, kai saugus email resend netinka, pavyzdžiui klientas
                yra gyvame support pokalbyje arba negali pasiekti savo pašto.
              </Alert>
              <Textarea
                label="Operatoriaus priežastis"
                withAsterisk
                description="Ši priežastis pateks į recurring lifecycle audit."
                placeholder="Pvz. Customer is on the phone with support and cannot access email"
                value={manualMagicLinkReason}
                onChange={(event) => setManualMagicLinkReason(event.currentTarget.value)}
                minRows={3}
              />
              <Group justify="space-between">
                <Button
                  variant="default"
                  onClick={() => {
                    setManualMagicLinkRequest(null);
                    setManualMagicLinkReason('');
                  }}
                >
                  Atšaukti
                </Button>
                <Button
                  color="red"
                  leftSection={<IconLink size={16} />}
                  loading={
                    actionLoading ===
                    `issue-magic-link-manual-${manualMagicLinkRequest.subscriptionId}`
                  }
                  disabled={!canConfirmManualMagicLinkReveal}
                  onClick={() =>
                    void issueAdminMagicLink({
                      subscriptionId: manualMagicLinkRequest.subscriptionId,
                      deliveryMode: 'manual',
                      reason: manualMagicLinkReasonTrimmed,
                    })
                  }
                >
                  Išduoti manual reveal
                </Button>
              </Group>
            </Stack>
          ) : null}
        </Modal>

        <Modal
          opened={Boolean(generatedMagicLink)}
          onClose={() => {
            setGeneratedMagicLink(null);
            setIsGeneratedMagicLinkVisible(false);
          }}
          title="Išduotas recurring magic link"
          size="lg"
        >
          {generatedMagicLink ? (
            <Stack gap="md">
              <Alert color="grape" title="Gyvas prisijungimo linkas">
                Šį linką naudok tik tada, kai tikrai reikia rankiniu būdu nusiųsti klientui. Linkas
                nebėra kopijuojamas automatiškai ir pirmiausia rodomas paslėptas.
              </Alert>
              <Text size="sm">
                <strong>Klientas:</strong> {generatedMagicLink.customerEmail}
              </Text>
              <Text size="sm">
                <strong>Operatoriaus priežastis:</strong> {generatedMagicLink.operatorReason}
              </Text>
              <Text size="sm">
                <strong>Galioja iki:</strong> {formatDateTime(generatedMagicLink.expiresAt)}
              </Text>
              <Textarea
                label="Consume URL"
                value={
                  isGeneratedMagicLinkVisible
                    ? generatedMagicLink.consumeUrl
                    : '[Paslėpta iki sąmoningo reveal veiksmo]'
                }
                readOnly
                minRows={4}
                autosize
              />
              <Group justify="space-between">
                <Button
                  variant="light"
                  leftSection={<IconEye size={16} />}
                  disabled={isGeneratedMagicLinkVisible}
                  onClick={() => setIsGeneratedMagicLinkVisible(true)}
                >
                  Parodyti linką
                </Button>
                <Group>
                  <Button
                    variant="light"
                    leftSection={<IconCopy size={16} />}
                    disabled={!isGeneratedMagicLinkVisible}
                    onClick={async () => {
                      const copied = await copyToClipboard(generatedMagicLink.consumeUrl);
                      notifications.show({
                        message: copied
                          ? 'Magic link nukopijuotas'
                          : 'Nepavyko nukopijuoti magic link',
                        color: copied ? 'green' : 'red',
                      });
                    }}
                  >
                    Kopijuoti
                  </Button>
                  <Button
                    disabled={!isGeneratedMagicLinkVisible}
                    onClick={() =>
                      window.open(generatedMagicLink.consumeUrl, '_blank', 'noopener,noreferrer')
                    }
                  >
                    Atidaryti linką
                  </Button>
                </Group>
              </Group>
            </Stack>
          ) : null}
        </Modal>
      </Stack>
    </Container>
  );
}
