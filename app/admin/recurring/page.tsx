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
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
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
  IconCheck,
  IconCopy,
  IconEye,
  IconLink,
  IconMail,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconReceiptRefund,
  IconRefresh,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import type { SiteKey } from '@/lib/site';
import type { ContactDetails } from '@/lib/recurring/contact-details';
import { GroupParticipants } from './GroupParticipants';
import { RecurringCycleWizard } from './RecurringCycleWizard';
import {
  SubscriptionDetailSection,
  SubscriptionDetailSections,
} from './SubscriptionDetailSections';
import { SubscriptionDetailTable } from './SubscriptionDetailTable';
import { SubscriptionContactDetails } from './SubscriptionContactDetails';

type RefundReason = 'requested_by_customer' | 'duplicate' | 'fraudulent';

type ClassGroupDto = {
  id: string;
  programId: string;
  site: SiteKey;
  name: string;
  status: string;
  weekday: number;
  startTime: string;
  durationMin: number;
  capacity: number;
  locationName: string;
  teacherName: string | null;
  singleVisitEnabled: boolean;
  singleVisitPriceEur: number | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
};

type GroupSingleVisitDraft = {
  singleVisitEnabled: boolean;
  singleVisitPriceEur: number | '';
};

type RecurringProgramDto = {
  id: string;
  site: SiteKey;
  slug: string;
  nameLt: string;
  nameEn: string;
  status: string;
  visibility: string;
  updatedAt: string;
};

const PROJECT_OPTIONS: Array<{ value: SiteKey; label: string }> = [
  { value: 'ceramics', label: 'Keramika' },
  { value: 'yoga', label: 'Joga' },
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
  { value: 'pending', label: 'Laukiama' },
  { value: 'completed', label: 'Atlikta' },
  { value: 'declined', label: 'Atmesta' },
];

const REFUND_REASON_OPTIONS: Array<{ value: RefundReason; label: string }> = [
  { value: 'requested_by_customer', label: 'Kliento prašymu' },
  { value: 'duplicate', label: 'Besidubliuojantis mokėjimas' },
  { value: 'fraudulent', label: 'Galimai apgaulingas mokėjimas' },
];

const REFUND_EXCEPTION_OPTIONS = [
  { value: 'manual_refund_required', label: 'Reikia grąžinti rankiniu būdu' },
  { value: 'bank_side_followup', label: 'Reikia susisiekti su banku' },
  { value: 'stripe_refund_failed', label: '„Stripe“ grąžinimas nepavyko' },
];

const ADMIN_VALUE_LABELS: Record<string, string> = {
  active: 'Aktyvus',
  admin: 'Administratorius',
  archived: 'Archyvuotas',
  attended: 'Dalyvavo',
  cancel: 'Atšaukimas',
  cancelled: 'Atšauktas',
  cancelled_early: 'Atšauktas laiku',
  cancelled_late: 'Atšauktas per vėlai',
  change_plan: 'Plano keitimas',
  completed: 'Užbaigtas',
  default: 'Reguliarus užsiėmimas',
  declined: 'Atmesta',
  delivery_unavailable: 'Pristatymas negalimas',
  email_sent: 'Išsiųsta el. paštu',
  exception: 'Išimtis',
  expired: 'Pasibaigęs',
  failed: 'Nepavyko',
  fulfilled: 'Įvykdytas',
  issue_magic_link: 'Prisijungimo nuorodos išdavimas',
  draft: 'Juodraštis',
  late_cancel: 'Atšauktas per vėlai',
  makeup: 'Perkeltas užsiėmimas',
  manual: 'Pridėta rankiniu būdu',
  manual_reveal: 'Parodyta rankiniu būdu',
  no_show: 'Neatvyko',
  not_applicable: 'Netaikoma',
  not_started: 'Nepradėta',
  open: 'Atviras',
  paid: 'Apmokėtas',
  pause: 'Pristabdymas',
  paused: 'Pristabdytas',
  pending: 'Laukiama',
  pending_payment: 'Laukia mokėjimo',
  refund: 'Pinigų grąžinimas',
  refund_exception: 'Pinigų grąžinimo išimtis',
  refunded: 'Pinigai grąžinti',
  released: 'Vieta atlaisvinta',
  resume: 'Atnaujinimas',
  scheduled: 'Suplanuota',
  self_service: 'Savitarna',
  sent: 'Išsiųsta',
  stale: 'Pasenusi',
  stripe: 'Stripe',
  subscription_created: 'Abonementas sukurtas',
  succeeded: 'Pavyko',
  superseded: 'Pakeistas naujesniu',
  system: 'Sistema',
  unavailable: 'Nepasiekiama',
  unpaid: 'Neapmokėtas',
  update_contact: 'Kontaktų atnaujinimas',
};

const WEEKDAY_LABELS = [
  'Pirmadienis',
  'Antradienis',
  'Trečiadienis',
  'Ketvirtadienis',
  'Penktadienis',
  'Šeštadienis',
  'Sekmadienis',
];

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Nepavyko gauti abonementų duomenų');
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

function adminValueLabel(value: string | null | undefined) {
  if (!value) return '-';
  return ADMIN_VALUE_LABELS[value] || value;
}

function siteLabel(value: SiteKey | string | null | undefined) {
  if (value === 'ceramics') return 'Keramika';
  if (value === 'yoga') return 'Joga';
  return value || '-';
}

function statusColor(status: string | null | undefined) {
  if (status === 'active' || status === 'completed') return 'green';
  if (status === 'paused' || status === 'pending') return 'yellow';
  if (status === 'pending_payment') return 'orange';
  if (status === 'cancelled' || status === 'declined') return 'red';
  if (status === 'expired') return 'gray';
  if (status === 'draft' || status === 'archived') return 'gray';
  if (status === 'succeeded' || status === 'completed') return 'green';
  return 'blue';
}

function asTextList(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return '-';
  return value.join(', ');
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
  const { mutate: refreshRecurringCache } = useSWRConfig();
  const [site, setSite] = useState<SiteKey>('ceramics');
  const [cycleWizardOpened, setCycleWizardOpened] = useState(false);
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [expandedDetailSections, setExpandedDetailSections] = useState<string[]>([]);
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
  const [groupSingleVisitDrafts, setGroupSingleVisitDrafts] = useState<
    Record<string, GroupSingleVisitDraft>
  >({});
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
  const groupsConfigApiUrl = useMemo(() => {
    const params = new URLSearchParams({ site });
    return `/api/admin/recurring/groups?${params.toString()}`;
  }, [site]);
  const programsApiUrl = useMemo(() => {
    const params = new URLSearchParams({ site });
    return `/api/admin/recurring/programs?${params.toString()}`;
  }, [site]);

  const { data, error, isLoading, mutate } = useSWR(subscriptionsApiUrl, fetcher);
  const {
    data: observabilityData,
    error: observabilityError,
    isLoading: isLoadingObservability,
    mutate: mutateObservability,
  } = useSWR(observabilityApiUrl, fetcher);
  const {
    data: groupsConfigData,
    error: groupsConfigError,
    isLoading: isLoadingGroupsConfig,
    mutate: mutateGroupsConfig,
  } = useSWR<{ groups: ClassGroupDto[] }>(groupsConfigApiUrl, fetcher);
  const {
    data: programsData,
    error: programsError,
    isLoading: isLoadingPrograms,
    mutate: mutatePrograms,
  } = useSWR<{ programs: RecurringProgramDto[] }>(programsApiUrl, fetcher);
  const subscriptions = data?.subscriptions || [];
  const recurringGroups = useMemo(
    () => (groupsConfigData?.groups || []).filter((group) => group.status !== 'archived'),
    [groupsConfigData],
  );
  const recurringPrograms = useMemo(() => programsData?.programs || [], [programsData]);
  const observabilitySummary = observabilityData?.summary || null;
  const observabilityQueues = observabilityData?.queues || {};
  const selectedSubscriptionId = selectedSubscription?.subscription?.id || null;
  const selectedSubscriptionSite = selectedSubscription?.subscription?.site || site;
  const selectedReservationsApiUrl = useMemo(() => {
    if (!selectedSubscriptionId) return null;
    const params = new URLSearchParams({
      site: selectedSubscriptionSite,
      subscriptionId: selectedSubscriptionId,
    });
    return `/api/admin/recurring/reservations?${params.toString()}`;
  }, [selectedSubscriptionId, selectedSubscriptionSite]);
  const {
    data: selectedReservationsData,
    error: selectedReservationsError,
    isLoading: isLoadingSelectedReservations,
    mutate: mutateSelectedReservations,
  } = useSWR(selectedReservationsApiUrl, fetcher);

  const selectedPlanOptions = selectedSubscription?.lifecycle?.planOptions || [];
  const selectedPlanOption =
    selectedPlanOptions.find((option: any) => option.plan.id === changePlanId) || null;
  const selectedReservations = selectedReservationsData?.reservations || [];
  const reservationActionNotesTrimmed = reservationActionNotes.trim();
  const reservationCancelReasonTrimmed = reservationCancelReason.trim();
  const hasReservationActionNotes = reservationActionNotesTrimmed.length > 0;
  const manualMagicLinkReasonTrimmed = manualMagicLinkReason.trim();
  const canConfirmManualMagicLinkReveal = manualMagicLinkReasonTrimmed.length >= 8;

  useEffect(() => {
    setGroupSingleVisitDrafts((current) => {
      const next: Record<string, GroupSingleVisitDraft> = {};
      for (const group of recurringGroups) {
        next[group.id] = current[group.id] || {
          singleVisitEnabled: Boolean(group.singleVisitEnabled),
          singleVisitPriceEur:
            typeof group.singleVisitPriceEur === 'number' ? group.singleVisitPriceEur : '',
        };
      }
      return next;
    });
  }, [recurringGroups]);

  const updateGroupSingleVisitDraft = (groupId: string, patch: Partial<GroupSingleVisitDraft>) => {
    setGroupSingleVisitDrafts((current) => ({
      ...current,
      [groupId]: {
        ...(current[groupId] || { singleVisitEnabled: false, singleVisitPriceEur: '' }),
        ...patch,
      },
    }));
  };

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
    if (selectedSubscription?.subscription?.id !== subscriptionId) {
      setExpandedDetailSections([]);
    }
    setIsLoadingDetails(true);
    setSelectedSubscription({ subscription: { id: subscriptionId } });
    try {
      const response = await fetch(`/api/admin/recurring/subscriptions/${subscriptionId}`, {
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok || !result.subscription) {
        throw new Error(result.error || 'Nepavyko gauti abonemento');
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

  const saveContactDetails = async (values: ContactDetails) => {
    const subscriptionId = selectedSubscription?.subscription?.id;
    if (!subscriptionId) throw new Error('Abonementas nepasirinktas.');
    const path = `/api/admin/recurring/subscriptions/${subscriptionId}`;
    const response = await fetch(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    if (!response.ok || !result.subscription) {
      throw new Error(result.error || 'Nepavyko išsaugoti asmens informacijos.');
    }
    setSelectedSubscription((current: any) =>
      current?.subscription?.id === subscriptionId
        ? { ...current, subscription: result.subscription }
        : current,
    );
    notifications.show({ message: 'Asmens informacija atnaujinta', color: 'green' });
    try {
      const [detailResponse] = await Promise.all([
        fetch(path, { cache: 'no-store' }),
        refreshRecurringCache(
          (key) => typeof key === 'string' && key.startsWith('/api/admin/recurring/'),
        ),
      ]);
      if (!detailResponse.ok) throw new Error('Detail refresh failed');
      const details = await detailResponse.json();
      setSelectedSubscription((current: any) =>
        current?.subscription?.id === subscriptionId ? details : current,
      );
    } catch {
      notifications.show({
        message: 'Duomenys išsaugoti, bet sąrašo nepavyko atnaujinti. Atnaujinkite puslapį.',
        color: 'yellow',
      });
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

  const saveGroupSingleVisitConfig = async (groupId: string) => {
    const draft = groupSingleVisitDrafts[groupId];
    if (!draft) return;

    const price =
      typeof draft.singleVisitPriceEur === 'number' ? draft.singleVisitPriceEur : Number.NaN;
    if (draft.singleVisitEnabled && (!Number.isFinite(price) || price <= 0)) {
      notifications.show({
        message: 'Įrašyk teigiamą vieno karto apsilankymo kainą',
        color: 'yellow',
      });
      return;
    }

    setActionLoading(`group-single-visit-${groupId}`);
    try {
      const response = await fetch(`/api/admin/recurring/groups/${groupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          singleVisitEnabled: draft.singleVisitEnabled,
          singleVisitPriceEur: Number.isFinite(price) ? price : 0,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Nepavyko atnaujinti grupės');
      }
      notifications.show({ message: 'Vieno karto apsilankymai atnaujinti', color: 'green' });
      await mutateGroupsConfig();
    } catch (nextError: any) {
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setActionLoading(null);
    }
  };

  const markManualRecurringPurchasePaid = async (purchaseId: string) => {
    setActionLoading(`manual-purchase-paid-${purchaseId}`);
    try {
      const response = await fetch(`/api/admin/recurring/purchases/${purchaseId}/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Nepavyko pažymėti abonemento mokėjimo');
      }
      notifications.show({ message: 'Abonemento pavedimas pažymėtas apmokėtu', color: 'green' });
      await Promise.all([mutate(), mutateObservability()]);
      if (result.subscription?.id) {
        await openSubscriptionDetails(result.subscription.id);
      }
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
      successMessage: 'Pinigų grąžinimas pradėtas',
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
      successMessage: 'Pinigų grąžinimo išimtis įrašyta',
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
        throw new Error(result.error || 'Nepavyko išduoti prisijungimo nuorodos');
      }

      if (deliveryMode === 'manual') {
        if (!result.magicLink) {
          throw new Error('Prisijungimo nuoroda negrąžinta');
        }

        setGeneratedMagicLink({
          ...result.magicLink,
          operatorReason: reason?.trim() || '',
        });
        setIsGeneratedMagicLinkVisible(false);
        setManualMagicLinkRequest(null);
        setManualMagicLinkReason('');
        notifications.show({
          message: 'Rankinė prisijungimo nuoroda paruošta saugiai peržiūrai',
          color: 'green',
        });
      } else {
        setGeneratedMagicLink(null);
        setIsGeneratedMagicLinkVisible(false);
        notifications.show({
          message: 'Abonemento prisijungimo nuoroda išsiųsta klientui el. paštu',
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
        message: 'Prieš keisdamas dalyvavimo būseną įrašyk administratoriaus pastabą',
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
      successMessage:
        timing === 'early' ? 'Pažymėtas atšaukimas laiku' : 'Pažymėtas pavėluotas atšaukimas',
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
        message: 'Prieš keisdamas dalyvavimo būseną įrašyk administratoriaus pastabą',
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
      successMessage: `Dalyvavimo rezultatas įrašytas: ${adminValueLabel(result)}`,
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
        message: 'Šis signalas dar neturi susieto abonemento įrašo',
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
            <Title order={2}>Abonementai</Title>
            <Text size="sm" c="dimmed" mt={4}>
              Abonementų, jų būsenų, pinigų grąžinimų ir veiksmų istorijos valdymas
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={17} />}
            onClick={() => {
              setEditingCycleId(null);
              setCycleWizardOpened(true);
            }}
          >
            Naujas užsiėmimų ciklas
          </Button>
        </Group>

        <Group>
          <SegmentedControl
            aria-label="Projektas"
            data={PROJECT_OPTIONS}
            value={site}
            onChange={(value) => setSite(value === 'yoga' ? 'yoga' : 'ceramics')}
          />
        </Group>

        <RecurringCycleWizard
          opened={cycleWizardOpened}
          initialSite={site === 'yoga' ? 'yoga' : 'ceramics'}
          cycleId={editingCycleId}
          onClose={() => {
            setCycleWizardOpened(false);
            setEditingCycleId(null);
          }}
          onSaved={async () => {
            await Promise.all([
              mutatePrograms(),
              mutateGroupsConfig(),
              mutateObservability(),
              refreshRecurringCache(
                (key) =>
                  typeof key === 'string' &&
                  key.startsWith('/api/admin/recurring/groups/') &&
                  key.includes('/attendance?'),
              ),
            ]);
          }}
        />

        <GroupParticipants
          key={site}
          site={site}
          programs={recurringPrograms}
          groups={recurringGroups}
          loading={isLoadingPrograms || isLoadingGroupsConfig}
          loadError={programsError?.message || groupsConfigError?.message}
          onViewParticipant={openSubscriptionDetails}
        />

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <div>
                <Title order={4}>Esami užsiėmimų ciklai</Title>
                <Text size="sm" c="dimmed">
                  Redaguokite ciklo aprašymą, laikotarpį, savaitines grupes ir abonemento planus.
                </Text>
              </div>
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={() => void Promise.all([mutatePrograms(), mutateGroupsConfig()])}
              >
                Atnaujinti
              </Button>
            </Group>

            {programsError ? (
              <Alert color="red" title="Ciklų sąrašo klaida">
                {programsError.message}
              </Alert>
            ) : isLoadingPrograms ? (
              <Group justify="center" py="md">
                <Loader size="sm" />
              </Group>
            ) : recurringPrograms.length === 0 ? (
              <Text c="dimmed">Šiame projekte užsiėmimų ciklų nėra.</Text>
            ) : (
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                {recurringPrograms.map((program) => {
                  const programGroups = recurringGroups.filter(
                    (group) => group.programId === program.id && group.status !== 'archived',
                  );
                  const starts = programGroups
                    .map((group) => group.effectiveFrom)
                    .filter(Boolean)
                    .sort();
                  const ends = programGroups
                    .map((group) => group.effectiveUntil)
                    .filter((value): value is string => Boolean(value))
                    .sort();
                  return (
                    <Card key={program.id} withBorder padding="md">
                      <Stack gap="sm">
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                          <div style={{ minWidth: 0 }}>
                            <Text fw={700}>{program.nameLt}</Text>
                            <Text size="xs" c="dimmed">
                              /{program.slug}
                            </Text>
                          </div>
                          <Badge color={statusColor(program.status)} variant="light">
                            {adminValueLabel(program.status)}
                          </Badge>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {starts[0] && ends.at(-1)
                            ? `${starts[0]} – ${ends.at(-1)}`
                            : 'Laikotarpis nenurodytas'}{' '}
                          · {programGroups.length} grupė(-ės) ·{' '}
                          {program.visibility === 'public' ? 'Rodomas klientams' : 'Paslėptas'}
                        </Text>
                        <Button
                          variant="light"
                          leftSection={<IconPencil size={16} />}
                          onClick={() => {
                            setEditingCycleId(program.id);
                            setCycleWizardOpened(true);
                          }}
                        >
                          Redaguoti
                        </Button>
                      </Stack>
                    </Card>
                  );
                })}
              </SimpleGrid>
            )}
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <div>
                <Title order={4}>Grupių vieno apsilankymo nustatymai</Title>
                <Text size="sm" c="dimmed">
                  Čia nustatoma, ar konkrečiame savaitės laike galima pirkti vieną apsilankymą ir
                  kokia jam taikoma kaina.
                </Text>
              </div>
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={() => void mutateGroupsConfig()}
              >
                Atnaujinti
              </Button>
            </Group>

            {groupsConfigError ? (
              <Alert color="red" title="Grupių konfigūracijos klaida">
                {groupsConfigError.message}
              </Alert>
            ) : recurringGroups.length === 0 && !isLoadingGroupsConfig ? (
              <Text c="dimmed">Šiame projekte nuolatinių užsiėmimų grupių nėra.</Text>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Grupė</Table.Th>
                    <Table.Th>Laikas</Table.Th>
                    <Table.Th>Vienas apsilankymas</Table.Th>
                    <Table.Th>Kaina</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {recurringGroups.map((group) => {
                    const draft = groupSingleVisitDrafts[group.id] || {
                      singleVisitEnabled: Boolean(group.singleVisitEnabled),
                      singleVisitPriceEur:
                        typeof group.singleVisitPriceEur === 'number'
                          ? group.singleVisitPriceEur
                          : '',
                    };
                    return (
                      <Table.Tr key={group.id}>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text fw={600}>{group.name}</Text>
                            <Text size="xs" c="dimmed">
                              {group.locationName}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text size="sm">
                              {WEEKDAY_LABELS[group.weekday - 1] || group.weekday} ·{' '}
                              {group.startTime}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {group.durationMin} min. · vietų skaičius {group.capacity}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Switch
                            checked={draft.singleVisitEnabled}
                            onChange={(event) =>
                              updateGroupSingleVisitDraft(group.id, {
                                singleVisitEnabled: event.currentTarget.checked,
                              })
                            }
                            label={draft.singleVisitEnabled ? 'Leidžiama' : 'Neleidžiama'}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            aria-label="Vieno karto apsilankymo kaina"
                            value={draft.singleVisitPriceEur}
                            onChange={(value) =>
                              updateGroupSingleVisitDraft(group.id, {
                                singleVisitPriceEur:
                                  typeof value === 'number' && Number.isFinite(value) ? value : '',
                              })
                            }
                            min={0}
                            step={1}
                            suffix=" EUR"
                            disabled={!draft.singleVisitEnabled}
                            w={150}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Button
                            size="xs"
                            loading={actionLoading === `group-single-visit-${group.id}`}
                            onClick={() => void saveGroupSingleVisitConfig(group.id)}
                          >
                            Išsaugoti
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}

            {isLoadingGroupsConfig ? (
              <Group justify="center">
                <Loader size="sm" />
              </Group>
            ) : null}
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="lg">
            <Group justify="space-between" align="center">
              <div>
                <Title order={4}>Abonementų procesų stebėsena</Title>
                <Text size="sm" c="dimmed">
                  Mokėjimų, abonementų sukūrimo, prieigos pristatymo ir pinigų grąžinimo būklė
                </Text>
              </div>
              <Text size="sm" c="dimmed">
                {isLoadingObservability
                  ? 'Kraunama...'
                  : `Atnaujinta ${formatDateTime(observabilityData?.generatedAt)}`}
              </Text>
            </Group>

            {observabilityError ? (
              <Alert color="red" title="Stebėsenos klaida">
                {observabilityError.message}
              </Alert>
            ) : (
              <>
                <SimpleGrid cols={{ base: 2, md: 3, xl: 7 }}>
                  <Card withBorder>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Aktyvūs abonementai
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
                        Apmokėta, bet nesukurta
                      </Text>
                      <Text fw={700} size="xl">
                        {observabilitySummary?.paidAwaitingFulfillment ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Reikia automatinio apdorojimo patikros
                      </Text>
                    </Stack>
                  </Card>
                  <Card withBorder>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Prieigos pristatymo problemos
                      </Text>
                      <Text fw={700} size="xl">
                        {observabilitySummary?.accessAttention ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Nepavyko, nepasiekiama arba pasenusi
                      </Text>
                    </Stack>
                  </Card>
                  <Card withBorder>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Pinigų grąžinimo problemos
                      </Text>
                      <Text fw={700} size="xl">
                        {observabilitySummary?.refundAttention ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Laukiama arba užfiksuota išimtis
                      </Text>
                    </Stack>
                  </Card>
                  <Card withBorder>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Mokėjimų klaidos per 24 val.
                      </Text>
                      <Text fw={700} size="xl">
                        {observabilitySummary?.recentPaymentFailures ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Nepavykę arba pasibaigę
                      </Text>
                    </Stack>
                  </Card>
                  <Card withBorder>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Rankiniai pavedimai
                      </Text>
                      <Text fw={700} size="xl">
                        {observabilitySummary?.manualPendingTransfers ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Laukia įskaitymo
                      </Text>
                    </Stack>
                  </Card>
                  <Card withBorder>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Būsenų problemos per 24 val.
                      </Text>
                      <Text fw={700} size="xl">
                        {observabilitySummary?.recentLifecycleAttention ?? '-'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Laukiamas grąžinimas arba išimtis
                      </Text>
                    </Stack>
                  </Card>
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, xl: 2 }}>
                  <Card withBorder>
                    <Stack gap="sm">
                      <Title order={5}>Rankiniai pavedimai</Title>
                      {observabilityQueues.manualPendingTransfers?.length ? (
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Klientas</Table.Th>
                              <Table.Th>Suma</Table.Th>
                              <Table.Th>Amžius</Table.Th>
                              <Table.Th>Veiksmai</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {observabilityQueues.manualPendingTransfers.map((item: any) => (
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
                                    <Text size="sm">{formatMoney(item.purchase.priceEur)}</Text>
                                    <Text size="xs" c="dimmed">
                                      {item.purchase.selectedStartDate}
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
                                  <Button
                                    size="xs"
                                    leftSection={<IconCheck size={14} />}
                                    loading={
                                      actionLoading === `manual-purchase-paid-${item.purchase.id}`
                                    }
                                    onClick={() =>
                                      void markManualRecurringPurchasePaid(item.purchase.id)
                                    }
                                  >
                                    Pažymėti apmokėta
                                  </Button>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      ) : (
                        <Text c="dimmed">Nėra laukiančių abonementų pavedimų.</Text>
                      )}
                    </Stack>
                  </Card>

                  <Card withBorder>
                    <Stack gap="sm">
                      <Title order={5}>Apmokėta, bet abonementas nesukurtas</Title>
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
                                      {adminValueLabel(item.purchase.paymentStatus)} /{' '}
                                      {adminValueLabel(item.purchase.fulfillmentState)}
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
                        <Text c="dimmed">Nėra apmokėtų, bet nesukurtų abonementų.</Text>
                      )}
                    </Stack>
                  </Card>

                  <Card withBorder>
                    <Stack gap="sm">
                      <Title order={5}>Prieigos pristatymo problemos</Title>
                      {observabilityQueues.accessAttention?.length ? (
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Klientas</Table.Th>
                              <Table.Th>Pristatymas</Table.Th>
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
                                      {adminValueLabel(item.access?.deliveryState)}
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
                                      Siųsti el. paštu
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
                                      Išduoti nuorodą
                                    </Button>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      ) : (
                        <Text c="dimmed">Prieigos pristatymo problemų šiuo metu nėra.</Text>
                      )}
                    </Stack>
                  </Card>

                  <Card withBorder>
                    <Stack gap="sm">
                      <Title order={5}>Pinigų grąžinimo problemos</Title>
                      {observabilityQueues.refundAttention?.length ? (
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Klientas</Table.Th>
                              <Table.Th>Grąžinimo būsena</Table.Th>
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
                                      {adminValueLabel(item.refund?.state)}
                                    </Badge>
                                    <Text size="xs" c="dimmed">
                                      {adminValueLabel(item.refund?.providerStatus)}
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
                        <Text c="dimmed">Laukiančių grąžinimų ar jų išimčių nėra.</Text>
                      )}
                    </Stack>
                  </Card>

                  <Card withBorder>
                    <Stack gap="sm">
                      <Title order={5}>Naujausios mokėjimų klaidos</Title>
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
                                      {adminValueLabel(item.purchase.status)}
                                    </Badge>
                                    <Text size="xs" c="dimmed">
                                      {adminValueLabel(item.purchase.paymentStatus)}
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
                        <Text c="dimmed">Per paskutines 24 val. mokėjimo klaidų neužfiksuota.</Text>
                      )}
                    </Stack>
                  </Card>
                </SimpleGrid>

                <Card withBorder>
                  <Stack gap="sm">
                    <Title order={5}>Naujausios abonementų būsenų problemos</Title>
                    {observabilityQueues.recentLifecycleAttention?.length ? (
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Klientas</Table.Th>
                            <Table.Th>Veiksmas</Table.Th>
                            <Table.Th>Pinigų grąžinimas</Table.Th>
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
                                    {adminValueLabel(entry.action)}
                                  </Badge>
                                  <Text size="xs" c="dimmed">
                                    {entry.actorLabel}
                                  </Text>
                                </Stack>
                              </Table.Td>
                              <Table.Td>
                                <Stack gap={2}>
                                  <Badge color={statusColor(entry.refundStatus)} variant="light">
                                    {adminValueLabel(entry.refundStatus)}
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
                        Per paskutines 24 val. su pinigų grąžinimu susijusių būsenos problemų nėra.
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
            <Title order={4}>Abonementai</Title>
            <Text size="sm" c="dimmed">
              {isLoading ? 'Kraunama...' : `${subscriptions.length} įrašai`}
            </Text>
          </Group>

          <Group align="flex-end" wrap="wrap" mb="md">
            <Select
              label="Abonemento būsena"
              data={STATUS_OPTIONS}
              value={status}
              onChange={(value) => setStatus(value || '')}
              allowDeselect={false}
              style={{ flex: '1 1 180px', minWidth: 0 }}
            />
            <TextInput
              label="Kliento el. paštas"
              placeholder="vardas@example.com"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.currentTarget.value)}
              style={{ flex: '2 1 240px', minWidth: 0 }}
            />
            <Button variant="light" onClick={clearFilters}>
              Išvalyti filtrus
            </Button>
          </Group>

          {error ? (
            <Alert color="red" title="Klaida">
              {error.message}
            </Alert>
          ) : subscriptions.length === 0 && !isLoading ? (
            <Text c="dimmed">Abonementų pagal pasirinktus filtrus nėra.</Text>
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
                        {adminValueLabel(subscription.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm">
                          {subscription.startDate} → {subscription.validUntil}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {siteLabel(subscription.site)} · {formatMoney(subscription.priceEur)}
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
                            {adminValueLabel(subscription.latestLifecycleEvent.action)}
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
                        aria-label="Siųsti prisijungimo nuorodą el. paštu"
                        disabled={!subscription.customerEmail}
                        title={
                          !subscription.customerEmail ? 'Nenurodytas dalyvio el. paštas' : undefined
                        }
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
                        aria-label="Išduoti prisijungimo nuorodą"
                        disabled={!subscription.customerEmail}
                        title={
                          !subscription.customerEmail ? 'Nenurodytas dalyvio el. paštas' : undefined
                        }
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
          onClose={() => {
            setSelectedSubscription(null);
            setExpandedDetailSections([]);
            void refreshRecurringCache(
              (key) => typeof key === 'string' && key.startsWith('/api/admin/recurring/'),
            );
          }}
          title="Abonemento informacija"
          size="90%"
        >
          {isLoadingDetails ? (
            <Group justify="center" py="xl">
              <Loader />
            </Group>
          ) : selectedSubscription?.subscription ? (
            <SubscriptionDetailSections
              value={expandedDetailSections}
              onChange={setExpandedDetailSections}
            >
              <SubscriptionDetailSection value="summary" title="Santrauka">
                <Stack gap="xs">
                  <SubscriptionContactDetails
                    key={selectedSubscription.subscription.id}
                    contact={{
                      customerName: selectedSubscription.subscription.customerName || '',
                      customerEmail: selectedSubscription.subscription.customerEmail || '',
                      customerPhone: selectedSubscription.subscription.customerPhone || '',
                    }}
                    emailRequired={selectedSubscription.subscription.purchaseChannel !== 'admin'}
                    onSave={saveContactDetails}
                  />
                  <Text>
                    <strong>Registracija:</strong>{' '}
                    {selectedSubscription.subscription.purchaseChannel === 'admin'
                      ? 'Pridėta administratoriaus'
                      : selectedSubscription.subscription.purchaseChannel === 'corporate_wallet'
                        ? 'Įmonės abonementas'
                        : 'Per svetainę'}
                  </Text>
                  <Text>
                    <strong>Grupė:</strong>{' '}
                    {recurringGroups.find(
                      (group) => group.id === selectedSubscription.subscription.defaultGroupId,
                    )?.name || '-'}
                  </Text>
                  <Text component="div">
                    <strong>Statusas:</strong>{' '}
                    <Badge
                      color={statusColor(selectedSubscription.subscription.status)}
                      variant="light"
                    >
                      {adminValueLabel(selectedSubscription.subscription.status)}
                    </Badge>
                  </Text>
                  <Text>
                    <strong>Pradžia:</strong> {selectedSubscription.subscription.startDate}
                  </Text>
                  <Text>
                    <strong>Galiojimas:</strong> {selectedSubscription.subscription.validFrom} →{' '}
                    {selectedSubscription.subscription.validUntil}
                  </Text>
                  <Text>
                    <strong>Kaina:</strong>{' '}
                    {formatMoney(selectedSubscription.subscription.priceEur)}
                  </Text>
                  <Text>
                    <strong>Likutis:</strong> {selectedSubscription.subscription.remainingSessions}{' '}
                    / {selectedSubscription.subscription.totalSessions}
                  </Text>
                  <Text>
                    <strong>Susietas pirkimas:</strong>{' '}
                    {selectedSubscription.subscription.sourcePurchaseId || '-'}
                  </Text>
                  <Text>
                    <strong>Paskutinė prisijungimo nuoroda:</strong>{' '}
                    {formatDateTime(selectedSubscription.subscription.latestMagicLinkIssuedAt)}
                  </Text>
                </Stack>
              </SubscriptionDetailSection>

              <SubscriptionDetailSection
                value="schedule"
                title="Tvarkaraštis ir perkelti užsiėmimai"
              >
                <Stack gap="xs">
                  <Text>
                    <strong>Suplanuotų užsiėmimų:</strong>{' '}
                    {selectedSubscription.provisioning?.schedule?.plannedCount ?? '-'}
                  </Text>
                  <Text>
                    <strong>Suplanuota iki:</strong>{' '}
                    {selectedSubscription.provisioning?.schedule?.scheduledThrough || '-'}
                  </Text>
                  <Text>
                    <strong>Generavimo versija:</strong>{' '}
                    {selectedSubscription.provisioning?.schedule?.generationVersion ?? '-'}
                  </Text>
                  <Text>
                    <strong>Perkeliamų užsiėmimų likutis:</strong>{' '}
                    {selectedSubscription.makeup?.remainingCredits ?? '-'}
                  </Text>
                  <Text>
                    <strong>Galimos atlaisvinti būsimos datos:</strong>{' '}
                    {asTextList(selectedSubscription.lifecycle?.releasePreview?.releasableDates)}
                  </Text>
                  <Text>
                    <strong>Blokuojamos rezervacijos:</strong>{' '}
                    {selectedSubscription.lifecycle?.releasePreview?.blockedReservations?.length ||
                      0}
                  </Text>
                  <Group pt="xs">
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconMail size={14} />}
                      disabled={!selectedSubscription.subscription.customerEmail}
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
                      Siųsti prisijungimo nuorodą el. paštu
                    </Button>
                    <Button
                      size="xs"
                      leftSection={<IconLink size={14} />}
                      disabled={!selectedSubscription.subscription.customerEmail}
                      loading={
                        actionLoading ===
                        `issue-magic-link-manual-${selectedSubscription.subscription.id}`
                      }
                      onClick={() =>
                        requestManualMagicLinkReveal(selectedSubscription.subscription.id)
                      }
                    >
                      Išduoti prisijungimo nuorodą
                    </Button>
                  </Group>
                  {!selectedSubscription.subscription.customerEmail && (
                    <Text size="sm" c="dimmed">
                      El. paštas nenurodytas — prisijungimo prie savitarnos nuorodos išduoti
                      negalima.
                    </Text>
                  )}
                </Stack>
              </SubscriptionDetailSection>

              <SubscriptionDetailSection value="actions" title="Abonemento būsenos veiksmai">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Badge variant="light">
                      istorijos įrašų: {selectedSubscription.lifecycleAudit?.length || 0}
                    </Badge>
                  </Group>

                  <Textarea
                    label="Pastabos"
                    placeholder="Administratoriaus pastabos būsenos arba pinigų grąžinimo veiksmui"
                    value={actionNotes}
                    onChange={(event) => setActionNotes(event.currentTarget.value)}
                    minRows={3}
                  />

                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <Card withBorder>
                      <Stack gap="sm">
                        <Text fw={600}>Greiti būsenos veiksmai</Text>
                        <Group wrap="wrap">
                          <Button
                            leftSection={<IconPlayerPause size={16} />}
                            disabled={!selectedSubscription.lifecycle?.actions?.pause?.eligible}
                            loading={actionLoading === 'pause'}
                            onClick={() => runLifecycleAction('pause')}
                          >
                            Pristabdyti
                          </Button>
                          <Button
                            leftSection={<IconPlayerPlay size={16} />}
                            disabled={!selectedSubscription.lifecycle?.actions?.resume?.eligible}
                            loading={actionLoading === 'resume'}
                            onClick={() => runLifecycleAction('resume')}
                          >
                            Atnaujinti
                          </Button>
                          <Button
                            leftSection={<IconRefresh size={16} />}
                            loading={actionLoading === 'regenerate-schedule'}
                            disabled={selectedSubscription.subscription.status !== 'active'}
                            onClick={() => runLifecycleAction('regenerate-schedule')}
                          >
                            Pergeneruoti tvarkaraštį
                          </Button>
                        </Group>
                        <Text size="sm" c="dimmed">
                          Pergeneravimas perskaičiuoja būsimus įprastos grupės vizitus pagal
                          abonemento likutį, galiojimą ir grupės tvarkaraštį. Jau pažymėtas
                          lankymas, atšaukimai ir rankiniu būdu perkelti vizitai nekeičiami.
                          Abonementas nepratęsiamas.
                        </Text>
                        <Text size="xs" c="dimmed">
                          Pristabdymas:{' '}
                          {selectedSubscription.lifecycle?.actions?.pause?.reason || 'leidžiama'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Atnaujinimas:{' '}
                          {selectedSubscription.lifecycle?.actions?.resume?.reason || 'leidžiama'}
                        </Text>
                      </Stack>
                    </Card>

                    <Card withBorder>
                      <Stack gap="sm">
                        <Text fw={600}>Atšaukimas ir pinigų grąžinimo apskaita</Text>
                        <Group grow align="flex-end">
                          <Select
                            label="Pinigų grąžinimo būsena"
                            data={REFUND_STATUS_OPTIONS}
                            value={cancelRefundStatus}
                            onChange={(value) => setCancelRefundStatus(value || 'not_applicable')}
                            allowDeselect={false}
                          />
                          <TextInput
                            label="Grąžinama suma, EUR"
                            placeholder="48.00"
                            value={cancelRefundAmount}
                            onChange={(event) => setCancelRefundAmount(event.currentTarget.value)}
                          />
                        </Group>
                        <TextInput
                          label="Pinigų grąžinimo nuoroda"
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
                          Atšaukti abonementą
                        </Button>
                        <Text size="xs" c="dimmed">
                          Atšaukimas:{' '}
                          {selectedSubscription.lifecycle?.actions?.cancel?.reason || 'leidžiama'}
                        </Text>
                      </Stack>
                    </Card>
                  </SimpleGrid>

                  <Card withBorder>
                    <Stack gap="sm">
                      <Text fw={600}>Plano keitimas</Text>
                      <Select
                        label="Kitas planas"
                        data={selectedPlanOptions.map((option: any) => ({
                          value: option.plan.id,
                          label: `${option.plan.nameLt} · ${formatMoney(option.plan.priceEur)} · ${
                            option.eligible ? 'galima keisti' : option.reason || 'keisti negalima'
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
                          Keisti planą
                        </Button>
                        <Text size="xs" c="dimmed">
                          {selectedPlanOption?.reason || 'Galima keisti tik į tinkamą planą'}
                        </Text>
                      </Group>
                    </Stack>
                  </Card>
                </Stack>
              </SubscriptionDetailSection>

              <SubscriptionDetailSection value="refunds" title="Pinigų grąžinimas ir išimtys">
                <Stack gap="md">
                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <Card withBorder>
                      <Stack gap="xs">
                        <Text>
                          <strong>Mokėjimo paslaugų teikėjas:</strong>{' '}
                          {adminValueLabel(selectedSubscription.refund?.paymentProvider)}
                        </Text>
                        <Text component="div">
                          <strong>Mokėjimo būsena:</strong>{' '}
                          <Badge
                            color={statusColor(selectedSubscription.refund?.paymentStatus)}
                            variant="light"
                          >
                            {adminValueLabel(selectedSubscription.refund?.paymentStatus)}
                          </Badge>
                        </Text>
                        <Text component="div">
                          <strong>Vykdymo būsena:</strong>{' '}
                          <Badge
                            color={statusColor(selectedSubscription.refund?.execution?.state)}
                            variant="light"
                          >
                            {adminValueLabel(selectedSubscription.refund?.execution?.state)}
                          </Badge>
                        </Text>
                        <Text>
                          <strong>Grąžinama suma:</strong>{' '}
                          {formatMoney(selectedSubscription.refund?.amountEur)}
                        </Text>
                        <Text>
                          <strong>Grąžinimo nuoroda:</strong>{' '}
                          {selectedSubscription.refund?.execution?.refundReference || '-'}
                        </Text>
                        <Text>
                          <strong>Teikėjo būsena:</strong>{' '}
                          {adminValueLabel(selectedSubscription.refund?.execution?.providerStatus)}
                        </Text>
                        <Text>
                          <strong>Paskutinė klaida:</strong>{' '}
                          {selectedSubscription.refund?.execution?.lastError || '-'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {selectedSubscription.refund?.reason || 'Pinigus galima grąžinti'}
                        </Text>
                      </Stack>
                    </Card>

                    <Card withBorder>
                      <Stack gap="sm">
                        <Select
                          label="„Stripe“ grąžinimo priežastis"
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
                          Grąžinti per „Stripe“
                        </Button>
                        <Divider />
                        <Select
                          label="Išimties kodas"
                          data={REFUND_EXCEPTION_OPTIONS}
                          value={refundExceptionCode}
                          onChange={(value) =>
                            setRefundExceptionCode(value || 'manual_refund_required')
                          }
                          allowDeselect={false}
                        />
                        <Textarea
                          label="Išimties paaiškinimas"
                          placeholder="Kodėl pinigų negalima grąžinti automatiškai"
                          value={refundExceptionMessage}
                          onChange={(event) => setRefundExceptionMessage(event.currentTarget.value)}
                          minRows={3}
                        />
                        <Button
                          variant="light"
                          loading={actionLoading === 'refund-exception'}
                          onClick={runRefundException}
                        >
                          Užfiksuoti grąžinimo išimtį
                        </Button>
                      </Stack>
                    </Card>
                  </SimpleGrid>
                </Stack>
              </SubscriptionDetailSection>

              <SubscriptionDetailSection value="reservations" title="Operacinės rezervacijos">
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <div>
                      <Text size="sm" c="dimmed">
                        Šio abonemento rezervacijų istorija ir jų valdymas
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
                      label="Dalyvavimo arba atšaukimo pastabos"
                      withAsterisk
                      description="Administratoriaus atliekamam pakeitimui pastaba privaloma; po sėkmingo veiksmo laukas išvalomas."
                      placeholder="Pastaba artimiausiam dalyvavimo arba atšaukimo veiksmui"
                      value={reservationActionNotes}
                      onChange={(event) => setReservationActionNotes(event.currentTarget.value)}
                      minRows={3}
                    />
                    <TextInput
                      label="Atšaukimo priežastis"
                      placeholder="Pvz., klientas susirgo"
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
                    <SubscriptionDetailTable label="Operacinės rezervacijos" minWidth={1100}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Data</Table.Th>
                          <Table.Th>Tipas</Table.Th>
                          <Table.Th>Statusas</Table.Th>
                          <Table.Th>Įskaitoma</Table.Th>
                          <Table.Th>Atšaukimo priežastis</Table.Th>
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
                                  <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
                                    {formatDateTime(reservation.occurrence?.startISO)}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {reservation.group?.name || '-'}
                                  </Text>
                                </Stack>
                              </Table.Td>
                              <Table.Td>
                                <Badge variant="light" w="max-content">
                                  {adminValueLabel(reservation.reservationType)}
                                </Badge>
                                {reservation.coverage === 'uncovered' && (
                                  <Text size="xs" c="orange">
                                    Be abonemento · apmokėjimas nesuregistruotas
                                  </Text>
                                )}
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  color={statusColor(reservation.status)}
                                  variant="light"
                                  w="max-content"
                                >
                                  {adminValueLabel(reservation.status)}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm">
                                  {reservation.countsTowardsUsage ? 'Taip' : 'Ne'}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm">{reservation.cancelReason || '-'}</Text>
                              </Table.Td>
                              <Table.Td>
                                {isScheduled && reservation.occurrenceId ? (
                                  <Group gap="xs" wrap="wrap" miw={240}>
                                    <Button
                                      size="xs"
                                      variant="light"
                                      disabled={!hasReservationActionNotes}
                                      loading={actionLoading === `${reservation.id}-early`}
                                      onClick={() =>
                                        void runReservationCannotAttend(reservation.id, 'early')
                                      }
                                    >
                                      Atšaukti laiku
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
                                      Atšaukti pavėluotai
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
                                      Dalyvavo
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
                                      Neatvyko
                                    </Button>
                                  </Group>
                                ) : (
                                  <Text size="xs" c="dimmed">
                                    Rezervacija nebėra suplanuota.
                                  </Text>
                                )}
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                      </Table.Tbody>
                    </SubscriptionDetailTable>
                  ) : (
                    <Text c="dimmed">Būsimų rezervacijų šiam abonementui kol kas nėra.</Text>
                  )}
                </Stack>
              </SubscriptionDetailSection>

              <SubscriptionDetailSection value="history" title="Veiksmų istorija">
                <Stack gap="md">
                  {selectedSubscription.lifecycleAudit?.length ? (
                    <SubscriptionDetailTable label="Veiksmų istorija">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Laikas</Table.Th>
                          <Table.Th>Veiksmas</Table.Th>
                          <Table.Th>Atliko</Table.Th>
                          <Table.Th>Pinigų grąžinimas</Table.Th>
                          <Table.Th>Pastabos ir metaduomenys</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {selectedSubscription.lifecycleAudit.map((entry: any, index: number) => (
                          <Table.Tr key={`${entry.createdAt}-${entry.action}-${index}`}>
                            <Table.Td style={{ whiteSpace: 'nowrap' }}>
                              {formatDateTime(entry.createdAt)}
                            </Table.Td>
                            <Table.Td>
                              <Badge color={statusColor(entry.action)} variant="light" w="max-content">
                                {adminValueLabel(entry.action)}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text size="sm">{entry.actorLabel}</Text>
                                <Text size="xs" c="dimmed">
                                  {adminValueLabel(entry.actorType)}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={2}>
                                <Badge
                                  color={statusColor(entry.refundStatus)}
                                  variant="light"
                                  w="max-content"
                                >
                                  {adminValueLabel(entry.refundStatus)}
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
                    </SubscriptionDetailTable>
                  ) : (
                    <Text c="dimmed">Veiksmų istorijos įrašų dar nėra.</Text>
                  )}
                </Stack>
              </SubscriptionDetailSection>
            </SubscriptionDetailSections>
          ) : null}
        </Modal>

        <Modal
          opened={Boolean(manualMagicLinkRequest)}
          onClose={() => {
            setManualMagicLinkRequest(null);
            setManualMagicLinkReason('');
          }}
          title="Išimtinis rankinis prisijungimo nuorodos išdavimas"
          size="md"
        >
          {manualMagicLinkRequest ? (
            <Stack gap="md">
              <Alert color="red" title="Naudok tik išimtiniu atveju">
                Šį būdą naudok tik tada, kai pakartotinis siuntimas el. paštu netinka, pavyzdžiui,
                klientas tiesiogiai bendrauja su pagalbos specialistu arba negali pasiekti savo
                pašto.
              </Alert>
              <Textarea
                label="Operatoriaus priežastis"
                withAsterisk
                description="Ši priežastis bus įrašyta į abonemento veiksmų istoriją."
                placeholder="Pvz., klientas telefonu kreipėsi į pagalbos specialistą ir negali pasiekti el. pašto"
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
                  Išduoti rankinę nuorodą
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
          title="Išduota abonemento prisijungimo nuoroda"
          size="lg"
        >
          {generatedMagicLink ? (
            <Stack gap="md">
              <Alert color="grape" title="Aktyvi prisijungimo nuoroda">
                Šią nuorodą naudok tik tada, kai ją tikrai reikia rankiniu būdu nusiųsti klientui.
                Ji nekopijuojama automatiškai ir iš pradžių rodoma paslėpta.
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
                label="Prisijungimo adresas"
                value={
                  isGeneratedMagicLinkVisible
                    ? generatedMagicLink.consumeUrl
                    : '[Paslėpta iki sąmoningo parodymo veiksmo]'
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
                  Parodyti nuorodą
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
                          ? 'Prisijungimo nuoroda nukopijuota'
                          : 'Nepavyko nukopijuoti prisijungimo nuorodos',
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
                    Atidaryti nuorodą
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
