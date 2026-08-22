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
  MultiSelect,
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
  IconAlertTriangle,
  IconArrowsExchange,
  IconBuildingBank,
  IconCancel,
  IconCash,
  IconCopy,
  IconEdit,
  IconEye,
  IconLink,
  IconMailPlus,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconReceiptRefund,
  IconRefresh,
  IconRepeat,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import type { SiteKey } from '@/lib/site';

type CompanyStatus = 'draft' | 'active' | 'archived';
type MemberRole = 'admin' | 'member';
type MemberStatus = 'invited' | 'active' | 'suspended';
type CorporatePolicyStatus = 'draft' | 'active' | 'archived';
type LedgerDirection = 'credit' | 'debit';
type LedgerCategory = 'funding' | 'adjustment';

type CorporateWalletDto = {
  id: string;
  companyId: string;
  status: string;
  currency: string;
  balanceEur: number;
  reservedBalanceEur: number;
  availableBalanceEur: number;
  createdAt: string;
  updatedAt: string;
};

type CorporateUsagePolicyDto = {
  id: string;
  companyId: string;
  status: CorporatePolicyStatus;
  allowedProductKinds: string[];
  allowedSites: SiteKey[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type CompanyMemberDto = {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  phone: string | null;
  employeeCode: string | null;
  role: MemberRole;
  status: MemberStatus;
  invitedAt: string | null;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CorporateLedgerEntryDto = {
  id: string;
  companyId: string;
  walletId: string;
  memberId: string | null;
  direction: LedgerDirection;
  category: string;
  source: string;
  productKind: string | null;
  site: SiteKey | null;
  amountEur: number;
  balanceAfterEur: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type CorporateSponsoredPurchaseDto = {
  id: string;
  companyId: string;
  walletId: string;
  memberId: string;
  recurringPurchaseId: string;
  corporateLedgerEntryId: string;
  rollbackLedgerEntryId: string | null;
  subscriptionId: string | null;
  site: SiteKey;
  programId: string;
  planId: string;
  groupId: string;
  selectedStartDate: string;
  amountEur: number;
  currency: string;
  status: 'funded' | 'fulfilled' | 'failed' | 'rolled_back';
  notes: string | null;
  failureReason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type CorporateMemberUsageReportDto = {
  memberId: string;
  totalSponsoredPurchases: number;
  fulfilledSponsoredPurchases: number;
  failedSponsoredPurchases: number;
  rolledBackSponsoredPurchases: number;
  activeSubscriptionCount: number;
  inactiveSubscriptionCount: number;
  totalCommittedAmountEur: number;
  lastSponsoredPurchaseAt: string | null;
  lastSponsoredSite: SiteKey | null;
};

type SubscriptionLiteDto = {
  id: string;
  site: SiteKey;
  status: string;
  startDate: string;
  validUntil: string;
  remainingSessions: number;
  totalSessions: number;
  priceEur: number;
  latestLifecycleEvent: {
    action: string;
    createdAt: string;
  } | null;
};

type ReservationLiteDto = {
  id: string;
  site: SiteKey;
  reservationType: string;
  status: string;
  occurrence: {
    id: string;
    date: string;
    startISO: string;
    status: string;
  } | null;
  group: {
    id: string;
    name: string;
    locationName: string;
    startTime: string;
  } | null;
  program: {
    id: string;
    slug: string;
    nameLt: string;
  } | null;
};

type AttendanceLiteDto = {
  id: string;
  result: string;
  recordedAt: string;
  recordedByType: string;
  notes: string | null;
};

type CorporateMemberDrilldownDto = {
  memberId: string;
  reservationSummary: Record<string, number>;
  attendanceSummary: Record<string, number>;
  sponsoredSubscriptions: Array<{
    subscription: SubscriptionLiteDto;
    sponsoredPurchase: CorporateSponsoredPurchaseDto;
    program: { id: string; slug: string; nameLt: string } | null;
    plan: { id: string; nameLt: string; sessionCount: number } | null;
    group: { id: string; name: string; startTime: string; locationName: string } | null;
  }>;
  recentReservations: ReservationLiteDto[];
  recentAttendance: Array<{
    attendance: AttendanceLiteDto;
    reservation: ReservationLiteDto | null;
    occurrence: {
      id: string;
      date: string;
      startISO: string;
      status: string;
    } | null;
  }>;
};

type CompanySummaryDto = {
  id: string;
  name: string;
  code: string;
  status: CompanyStatus;
  billingEmail: string | null;
  billingPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  wallet: CorporateWalletDto | null;
  policy: CorporateUsagePolicyDto | null;
  memberCounts: {
    total: number;
    activeAdmins: number;
    activeMembers: number;
  };
};

type CompanyDetailDto = CompanySummaryDto & {
  members: CompanyMemberDto[];
  recentLedgerEntries: CorporateLedgerEntryDto[];
  recentSponsoredPurchases: CorporateSponsoredPurchaseDto[];
  memberUsageReports: CorporateMemberUsageReportDto[];
  memberDrilldowns: CorporateMemberDrilldownDto[];
};

type RecurringProgramDto = {
  id: string;
  site: SiteKey;
  slug: string;
  nameLt: string;
  nameEn: string;
  status: string;
};

type PassPlanDto = {
  id: string;
  programId: string;
  site: SiteKey;
  code: string;
  nameLt: string;
  nameEn: string;
  priceEur: number;
  sessionCount: number;
  validityDays: number;
  status: string;
};

type ClassGroupDto = {
  id: string;
  programId: string;
  site: SiteKey;
  name: string;
  status: string;
  weekday: number;
  startTime: string;
  locationName: string;
};

type CreateCompanyForm = {
  name: string;
  code: string;
  status: CompanyStatus;
  billingEmail: string;
  billingPhone: string;
  notes: string;
  initialBalanceEur: string;
  allowedSites: SiteKey[];
  primaryAdminName: string;
  primaryAdminEmail: string;
  primaryAdminPhone: string;
  primaryAdminEmployeeCode: string;
};

type WalletAdjustmentForm = {
  direction: LedgerDirection;
  category: LedgerCategory;
  amountEur: string;
  notes: string;
  referenceType: string;
  referenceId: string;
};

type MemberForm = {
  fullName: string;
  email: string;
  phone: string;
  employeeCode: string;
  role: MemberRole;
  status: MemberStatus;
};

type CorporatePurchaseForm = {
  site: SiteKey;
  memberId: string;
  programId: string;
  planId: string;
  groupId: string;
  startDate: string;
  locale: 'lt' | 'en';
  notes: string;
};

type CorporateProductKind = 'workshop' | 'recurring';
type RefundStatus = 'not_applicable' | 'pending' | 'completed' | 'declined';
type RefundReason = 'requested_by_customer' | 'duplicate' | 'fraudulent';

type EditCompanyForm = {
  name: string;
  status: CompanyStatus;
  billingEmail: string;
  billingPhone: string;
  notes: string;
  policyStatus: CorporatePolicyStatus;
  allowedProductKinds: CorporateProductKind[];
  allowedSites: SiteKey[];
  policyNotes: string;
};

type CorporateSubscriptionActionEntry =
  CorporateMemberDrilldownDto['sponsoredSubscriptions'][number];

type SubscriptionActionEligibility = {
  eligible: boolean;
  reason: string | null;
};

type SubscriptionPlanOptionDto = {
  eligible: boolean;
  reason: string | null;
  plan: {
    id: string;
    nameLt: string;
    priceEur: number;
  };
};

type SubscriptionLifecycleAuditEntryDto = {
  action: string;
  actorLabel: string;
  actorType: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  notes: string | null;
  refundAmountEur: number | null;
  refundReference: string | null;
  refundStatus: string | null;
};

type RecurringSubscriptionDetailDto = {
  subscription: SubscriptionLiteDto & {
    latestMagicLinkIssuedAt: string | null;
    sourcePurchaseId: string | null;
  };
  provisioning: {
    schedule: {
      generationVersion: number | null;
      plannedCount: number | null;
      scheduledThrough: string | null;
    } | null;
  } | null;
  makeup: {
    remainingCredits: number | null;
  } | null;
  lifecycle: {
    actions: {
      cancel: SubscriptionActionEligibility;
      pause: SubscriptionActionEligibility;
      resume: SubscriptionActionEligibility;
    } | null;
    planOptions: SubscriptionPlanOptionDto[];
    releasePreview: {
      blockedReservations: Array<{ reservationId: string }>;
      releasableDates: string[];
    } | null;
  } | null;
  refund: {
    amountEur: number | null;
    eligible: boolean;
    execution: {
      lastError: string | null;
      providerStatus: string | null;
      refundReference: string | null;
      state: string | null;
    } | null;
    paymentProvider: string | null;
    paymentStatus: string | null;
    reason: string | null;
  } | null;
  lifecycleAudit: SubscriptionLifecycleAuditEntryDto[];
};

const SITE_OPTIONS: Array<{ value: SiteKey; label: string }> = [
  { value: 'ceramics', label: 'Ceramics' },
  { value: 'yoga', label: 'Yoga' },
];

const COMPANY_STATUS_OPTIONS: Array<{ value: CompanyStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const MEMBER_ROLE_OPTIONS: Array<{ value: MemberRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
];

const MEMBER_STATUS_OPTIONS: Array<{ value: MemberStatus; label: string }> = [
  { value: 'invited', label: 'Invited' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

const LEDGER_DIRECTION_OPTIONS: Array<{ value: LedgerDirection; label: string }> = [
  { value: 'credit', label: 'Credit' },
  { value: 'debit', label: 'Debit' },
];

const LEDGER_CATEGORY_OPTIONS: Array<{ value: LedgerCategory; label: string }> = [
  { value: 'funding', label: 'Funding' },
  { value: 'adjustment', label: 'Adjustment' },
];

const LOCALE_OPTIONS = [
  { value: 'lt', label: 'Lietuvių' },
  { value: 'en', label: 'English' },
];

const POLICY_STATUS_OPTIONS: Array<{ value: CorporatePolicyStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const PRODUCT_KIND_OPTIONS: Array<{ value: CorporateProductKind; label: string }> = [
  { value: 'workshop', label: 'Workshop' },
  { value: 'recurring', label: 'Recurring' },
];

const REFUND_STATUS_OPTIONS: Array<{ value: RefundStatus; label: string }> = [
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

const emptyCreateCompanyForm = (): CreateCompanyForm => ({
  name: '',
  code: '',
  status: 'draft',
  billingEmail: '',
  billingPhone: '',
  notes: '',
  initialBalanceEur: '',
  allowedSites: ['ceramics', 'yoga'],
  primaryAdminName: '',
  primaryAdminEmail: '',
  primaryAdminPhone: '',
  primaryAdminEmployeeCode: '',
});

const emptyWalletAdjustmentForm = (): WalletAdjustmentForm => ({
  direction: 'credit',
  category: 'funding',
  amountEur: '',
  notes: '',
  referenceType: '',
  referenceId: '',
});

const emptyMemberForm = (): MemberForm => ({
  fullName: '',
  email: '',
  phone: '',
  employeeCode: '',
  role: 'member',
  status: 'invited',
});

const emptyEditCompanyForm = (): EditCompanyForm => ({
  name: '',
  status: 'draft',
  billingEmail: '',
  billingPhone: '',
  notes: '',
  policyStatus: 'draft',
  allowedProductKinds: ['recurring'],
  allowedSites: ['ceramics', 'yoga'],
  policyNotes: '',
});

function buildEditCompanyForm(company: CompanyDetailDto): EditCompanyForm {
  return {
    name: company.name,
    status: company.status,
    billingEmail: company.billingEmail || '',
    billingPhone: company.billingPhone || '',
    notes: company.notes || '',
    policyStatus: company.policy?.status || 'draft',
    allowedProductKinds: (company.policy?.allowedProductKinds as
      | CorporateProductKind[]
      | undefined) || ['recurring'],
    allowedSites: company.policy?.allowedSites?.length
      ? company.policy.allowedSites
      : ['ceramics', 'yoga'],
    policyNotes: company.policy?.notes || '',
  };
}

function buildCorporatePurchaseForm(
  company: CompanyDetailDto | null | undefined,
  fallbackSite: SiteKey = 'ceramics',
): CorporatePurchaseForm {
  const activeMembers = (company?.members || []).filter((member) => member.status === 'active');
  const allowedSites = company?.policy?.allowedSites?.length ? company.policy.allowedSites : null;
  return {
    site: allowedSites?.[0] || fallbackSite,
    memberId: activeMembers[0]?.id || '',
    programId: '',
    planId: '',
    groupId: '',
    startDate: new Date().toISOString().slice(0, 10),
    locale: 'lt',
    notes: '',
  };
}

const fetcher = async <T,>(url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'Nepavyko gauti corporate duomenų');
  }
  return payload as T;
};

async function adminJsonRequest<T>(
  url: string,
  init: {
    method?: 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
  } = {},
) {
  const response = await fetch(url, {
    method: init.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'Operacija nepavyko');
  }
  return payload as T;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('lt-LT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

function parseMoneyInput(value: string) {
  if (!value.trim()) return null;
  const normalized = Number(value.replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : Number.NaN;
}

function statusColor(status?: string | null) {
  if (status === 'active') return 'green';
  if (status === 'draft' || status === 'invited') return 'yellow';
  if (status === 'suspended') return 'orange';
  if (status === 'archived') return 'gray';
  if (status === 'admin') return 'blue';
  if (status === 'member') return 'cyan';
  if (status === 'credit') return 'green';
  if (status === 'debit') return 'red';
  return 'gray';
}

function productKindLabel(kind: string) {
  if (kind === 'recurring') return 'Recurring';
  return kind;
}

function siteLabel(site?: SiteKey | null) {
  return SITE_OPTIONS.find((option) => option.value === site)?.label || site || '-';
}

function formatSummaryPairs(summary: Record<string, number>) {
  const pairs = Object.entries(summary).filter(([, count]) => Boolean(count));
  if (pairs.length === 0) return '-';
  return pairs.map(([key, count]) => `${key}: ${count}`).join(' • ');
}

function asTextList(values?: Array<string | null | undefined>) {
  const filtered = (values || []).filter(Boolean);
  return filtered.length ? filtered.join(', ') : '-';
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

export default function CorporateAdminPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [query, setQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [createCompanyOpened, setCreateCompanyOpened] = useState(false);
  const [editCompanyOpened, setEditCompanyOpened] = useState(false);
  const [walletAdjustmentOpened, setWalletAdjustmentOpened] = useState(false);
  const [memberModalOpened, setMemberModalOpened] = useState(false);
  const [memberDrilldownOpened, setMemberDrilldownOpened] = useState(false);
  const [subscriptionActionOpened, setSubscriptionActionOpened] = useState(false);
  const [corporatePurchaseOpened, setCorporatePurchaseOpened] = useState(false);
  const [editingMember, setEditingMember] = useState<CompanyMemberDto | null>(null);
  const [selectedMemberDrilldownId, setSelectedMemberDrilldownId] = useState<string | null>(null);
  const [selectedSubscriptionActionId, setSelectedSubscriptionActionId] = useState<string | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [subscriptionActionNotes, setSubscriptionActionNotes] = useState('');
  const [subscriptionCancelRefundStatus, setSubscriptionCancelRefundStatus] =
    useState<RefundStatus>('not_applicable');
  const [subscriptionCancelRefundAmount, setSubscriptionCancelRefundAmount] = useState('');
  const [subscriptionCancelRefundReference, setSubscriptionCancelRefundReference] = useState('');
  const [subscriptionChangePlanId, setSubscriptionChangePlanId] = useState('');
  const [subscriptionRefundReason, setSubscriptionRefundReason] =
    useState<RefundReason>('requested_by_customer');
  const [subscriptionRefundExceptionCode, setSubscriptionRefundExceptionCode] =
    useState('manual_refund_required');
  const [subscriptionRefundExceptionMessage, setSubscriptionRefundExceptionMessage] = useState('');
  const [subscriptionManualMagicLinkReason, setSubscriptionManualMagicLinkReason] = useState('');
  const [reservationActionNotes, setReservationActionNotes] = useState('');
  const [reservationCancelReason, setReservationCancelReason] = useState('');
  const [generatedMagicLink, setGeneratedMagicLink] = useState<null | {
    consumeUrl: string;
    customerEmail: string;
    expiresAt: string;
    subscriptionId: string | null;
  }>(null);
  const [isGeneratedMagicLinkVisible, setIsGeneratedMagicLinkVisible] = useState(false);
  const [createCompanyForm, setCreateCompanyForm] =
    useState<CreateCompanyForm>(emptyCreateCompanyForm);
  const [editCompanyForm, setEditCompanyForm] = useState<EditCompanyForm>(emptyEditCompanyForm);
  const [walletAdjustmentForm, setWalletAdjustmentForm] =
    useState<WalletAdjustmentForm>(emptyWalletAdjustmentForm);
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm);
  const [corporatePurchaseForm, setCorporatePurchaseForm] = useState<CorporatePurchaseForm>(
    buildCorporatePurchaseForm(null),
  );

  const companiesApiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (query.trim()) params.set('q', query.trim());
    const suffix = params.toString();
    return `/api/admin/corporate/companies${suffix ? `?${suffix}` : ''}`;
  }, [query, statusFilter]);

  const detailApiUrl = selectedCompanyId
    ? `/api/admin/corporate/companies/${selectedCompanyId}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{ companies: CompanySummaryDto[] }>(
    companiesApiUrl,
    fetcher,
  );
  const {
    data: detailData,
    error: detailError,
    isLoading: isLoadingDetail,
    mutate: mutateDetail,
  } = useSWR<{ company: CompanyDetailDto }>(detailApiUrl, fetcher);

  const selectedCompany = detailData?.company || null;
  const companies = data?.companies || [];
  const activeMembers = (selectedCompany?.members || []).filter(
    (member) => member.status === 'active',
  );
  const allowedSites = selectedCompany?.policy?.allowedSites?.length
    ? selectedCompany.policy.allowedSites
    : (['ceramics', 'yoga'] as SiteKey[]);

  const programsApiUrl = corporatePurchaseOpened
    ? `/api/admin/recurring/programs?${new URLSearchParams({
        site: corporatePurchaseForm.site,
        status: 'active',
      }).toString()}`
    : null;
  const plansApiUrl =
    corporatePurchaseOpened && corporatePurchaseForm.programId
      ? `/api/admin/recurring/plans?${new URLSearchParams({
          site: corporatePurchaseForm.site,
          status: 'active',
          programId: corporatePurchaseForm.programId,
        }).toString()}`
      : null;
  const groupsApiUrl =
    corporatePurchaseOpened && corporatePurchaseForm.programId
      ? `/api/admin/recurring/groups?${new URLSearchParams({
          site: corporatePurchaseForm.site,
          status: 'active',
          programId: corporatePurchaseForm.programId,
        }).toString()}`
      : null;

  const { data: programsData, isLoading: isLoadingPrograms } = useSWR<{
    programs: RecurringProgramDto[];
  }>(programsApiUrl, fetcher);
  const { data: plansData, isLoading: isLoadingPlans } = useSWR<{ plans: PassPlanDto[] }>(
    plansApiUrl,
    fetcher,
  );
  const { data: groupsData, isLoading: isLoadingGroups } = useSWR<{ groups: ClassGroupDto[] }>(
    groupsApiUrl,
    fetcher,
  );

  const programs = programsData?.programs || [];
  const plans = plansData?.plans || [];
  const groups = groupsData?.groups || [];
  const selectedPlan = plans.find((plan) => plan.id === corporatePurchaseForm.planId) || null;

  const programOptions = programs.map((program) => ({
    value: program.id,
    label: `${program.nameLt} (${program.slug})`,
  }));
  const planOptions = plans.map((plan) => ({
    value: plan.id,
    label: `${plan.nameLt} • ${plan.sessionCount} k. • ${formatMoney(plan.priceEur)}`,
  }));
  const groupOptions = groups.map((group) => ({
    value: group.id,
    label: `${group.name} • ${group.weekday} • ${group.startTime} • ${group.locationName}`,
  }));
  const memberOptions = activeMembers.map((member) => ({
    value: member.id,
    label: `${member.fullName} • ${member.email}`,
  }));
  const memberNameById = useMemo(
    () =>
      new Map(
        (selectedCompany?.members || []).map((member) => [
          member.id,
          `${member.fullName} • ${member.email}`,
        ]),
      ),
    [selectedCompany?.members],
  );
  const memberById = useMemo(
    () => new Map((selectedCompany?.members || []).map((member) => [member.id, member])),
    [selectedCompany?.members],
  );
  const memberDrilldownById = useMemo(
    () =>
      new Map(
        (selectedCompany?.memberDrilldowns || []).map((drilldown) => [
          drilldown.memberId,
          drilldown,
        ]),
      ),
    [selectedCompany?.memberDrilldowns],
  );
  const selectedMemberDrilldown = selectedMemberDrilldownId
    ? memberDrilldownById.get(selectedMemberDrilldownId) || null
    : null;
  const selectedSubscriptionAction = useMemo(() => {
    if (!selectedSubscriptionActionId || !selectedCompany?.memberDrilldowns) return null;
    for (const drilldown of selectedCompany.memberDrilldowns) {
      const match = drilldown.sponsoredSubscriptions.find(
        (entry) => entry.subscription.id === selectedSubscriptionActionId,
      );
      if (match) return match;
    }
    return null;
  }, [selectedCompany?.memberDrilldowns, selectedSubscriptionActionId]);
  const subscriptionActionDetailApiUrl =
    subscriptionActionOpened && selectedSubscriptionActionId
      ? `/api/admin/recurring/subscriptions/${selectedSubscriptionActionId}`
      : null;
  const {
    data: subscriptionActionDetailData,
    error: subscriptionActionDetailError,
    isLoading: isLoadingSubscriptionActionDetail,
    mutate: mutateSubscriptionActionDetail,
  } = useSWR<RecurringSubscriptionDetailDto>(subscriptionActionDetailApiUrl, fetcher);
  const selectedSubscriptionActionDetail = subscriptionActionDetailData || null;
  const selectedSubscriptionPlanOptions =
    selectedSubscriptionActionDetail?.lifecycle?.planOptions || [];
  const selectedSubscriptionPlanOption =
    selectedSubscriptionPlanOptions.find((option) => option.plan.id === subscriptionChangePlanId) ||
    null;

  useEffect(() => {
    if (!selectedSubscriptionPlanOptions.length) {
      setSubscriptionChangePlanId('');
      return;
    }

    if (
      subscriptionChangePlanId &&
      selectedSubscriptionPlanOptions.some((option) => option.plan.id === subscriptionChangePlanId)
    ) {
      return;
    }

    const defaultOption =
      selectedSubscriptionPlanOptions.find((option) => option.eligible) ||
      selectedSubscriptionPlanOptions[0];
    setSubscriptionChangePlanId(defaultOption?.plan.id || '');
  }, [selectedSubscriptionPlanOptions, subscriptionChangePlanId]);

  const refreshSelectedCompany = async () => {
    await Promise.all([mutate(), mutateDetail()]);
  };

  const openCreateCompanyModal = () => {
    setCreateCompanyForm(emptyCreateCompanyForm());
    setCreateCompanyOpened(true);
  };

  const openWalletAdjustmentModal = () => {
    setWalletAdjustmentForm(emptyWalletAdjustmentForm());
    setWalletAdjustmentOpened(true);
  };

  const openEditCompanyModal = () => {
    if (!selectedCompany) return;
    setEditCompanyForm(buildEditCompanyForm(selectedCompany));
    setEditCompanyOpened(true);
  };

  const openCreateMemberModal = () => {
    setEditingMember(null);
    setMemberForm(emptyMemberForm());
    setMemberModalOpened(true);
  };

  const openEditMemberModal = (member: CompanyMemberDto) => {
    setEditingMember(member);
    setMemberForm({
      fullName: member.fullName,
      email: member.email,
      phone: member.phone || '',
      employeeCode: member.employeeCode || '',
      role: member.role,
      status: member.status,
    });
    setMemberModalOpened(true);
  };

  const openMemberDrilldownModal = (memberId: string) => {
    setSelectedMemberDrilldownId(memberId);
    setMemberDrilldownOpened(true);
  };

  const openSubscriptionActionModal = (entry: CorporateSubscriptionActionEntry) => {
    setSelectedSubscriptionActionId(entry.subscription.id);
    setSubscriptionActionNotes('');
    setSubscriptionCancelRefundStatus('not_applicable');
    setSubscriptionCancelRefundAmount('');
    setSubscriptionCancelRefundReference('');
    setSubscriptionChangePlanId('');
    setSubscriptionRefundReason('requested_by_customer');
    setSubscriptionRefundExceptionCode('manual_refund_required');
    setSubscriptionRefundExceptionMessage('');
    setSubscriptionManualMagicLinkReason('');
    setReservationActionNotes('');
    setReservationCancelReason('');
    setGeneratedMagicLink(null);
    setIsGeneratedMagicLinkVisible(false);
    setSubscriptionActionOpened(true);
  };

  const openCorporatePurchaseModal = () => {
    if (!selectedCompany) return;
    if (!activeMembers.length) {
      notifications.show({
        color: 'yellow',
        message: 'Corporate recurring pirkimui reikia bent vieno active company member.',
      });
      return;
    }
    setCorporatePurchaseForm(buildCorporatePurchaseForm(selectedCompany));
    setCorporatePurchaseOpened(true);
  };

  const handleCreateCompany = async () => {
    const initialBalanceEur = parseMoneyInput(createCompanyForm.initialBalanceEur);
    if (Number.isNaN(initialBalanceEur)) {
      notifications.show({ color: 'red', message: 'Pradinis balansas turi būti skaičius.' });
      return;
    }

    const primaryAdminName = createCompanyForm.primaryAdminName.trim();
    const primaryAdminEmail = createCompanyForm.primaryAdminEmail.trim();

    if ((primaryAdminName && !primaryAdminEmail) || (!primaryAdminName && primaryAdminEmail)) {
      notifications.show({
        color: 'red',
        message: 'Primary admin vardas ir el. paštas turi būti pildomi kartu.',
      });
      return;
    }

    setActionLoading('create-company');
    try {
      const payload = await adminJsonRequest<{ company: CompanyDetailDto }>(
        '/api/admin/corporate/companies',
        {
          method: 'POST',
          body: {
            name: createCompanyForm.name,
            code: createCompanyForm.code,
            status: createCompanyForm.status,
            billingEmail: createCompanyForm.billingEmail || undefined,
            billingPhone: createCompanyForm.billingPhone || undefined,
            notes: createCompanyForm.notes || undefined,
            initialBalanceEur: initialBalanceEur === null ? undefined : initialBalanceEur,
            policy: {
              allowedProductKinds: ['recurring'],
              allowedSites: createCompanyForm.allowedSites,
            },
            primaryAdmin:
              primaryAdminName && primaryAdminEmail
                ? {
                    fullName: primaryAdminName,
                    email: primaryAdminEmail,
                    phone: createCompanyForm.primaryAdminPhone || undefined,
                    employeeCode: createCompanyForm.primaryAdminEmployeeCode || undefined,
                  }
                : undefined,
          },
        },
      );

      setCreateCompanyOpened(false);
      setSelectedCompanyId(payload.company.id);
      await Promise.all([mutate(), mutateDetail()]);
      notifications.show({
        color: 'green',
        message: `Sukurta įmonė ${payload.company.name}.`,
      });
    } catch (error: any) {
      notifications.show({ color: 'red', message: error.message || 'Nepavyko sukurti įmonės' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleWalletAdjustment = async () => {
    if (!selectedCompanyId) return;
    const amountEur = parseMoneyInput(walletAdjustmentForm.amountEur);
    if (Number.isNaN(amountEur) || amountEur === null) {
      notifications.show({ color: 'red', message: 'Suma turi būti teisingas skaičius.' });
      return;
    }

    setActionLoading('wallet-adjustment');
    try {
      await adminJsonRequest(
        `/api/admin/corporate/companies/${selectedCompanyId}/wallet-adjustments`,
        {
          method: 'POST',
          body: {
            direction: walletAdjustmentForm.direction,
            category: walletAdjustmentForm.category,
            amountEur,
            notes: walletAdjustmentForm.notes,
            referenceType: walletAdjustmentForm.referenceType || undefined,
            referenceId: walletAdjustmentForm.referenceId || undefined,
          },
        },
      );
      setWalletAdjustmentOpened(false);
      await refreshSelectedCompany();
      notifications.show({ color: 'green', message: 'Wallet korekcija išsaugota.' });
    } catch (error: any) {
      notifications.show({ color: 'red', message: error.message || 'Nepavyko koreguoti wallet' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateCompany = async () => {
    if (!selectedCompanyId) return;
    if (!editCompanyForm.allowedSites.length) {
      notifications.show({ color: 'red', message: 'Reikia bent vieno allowed site.' });
      return;
    }
    if (!editCompanyForm.allowedProductKinds.length) {
      notifications.show({ color: 'red', message: 'Reikia bent vieno allowed product kind.' });
      return;
    }

    setActionLoading('update-company');
    try {
      await adminJsonRequest(`/api/admin/corporate/companies/${selectedCompanyId}`, {
        method: 'PATCH',
        body: {
          name: editCompanyForm.name,
          status: editCompanyForm.status,
          billingEmail: editCompanyForm.billingEmail || undefined,
          billingPhone: editCompanyForm.billingPhone || undefined,
          notes: editCompanyForm.notes || undefined,
          policy: {
            status: editCompanyForm.policyStatus,
            allowedProductKinds: editCompanyForm.allowedProductKinds,
            allowedSites: editCompanyForm.allowedSites,
            notes: editCompanyForm.policyNotes || undefined,
          },
        },
      });
      setEditCompanyOpened(false);
      await refreshSelectedCompany();
      notifications.show({ color: 'green', message: 'Įmonės ir policy duomenys atnaujinti.' });
    } catch (error: any) {
      notifications.show({
        color: 'red',
        message: error.message || 'Nepavyko atnaujinti įmonės duomenų',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveMember = async () => {
    if (!selectedCompanyId) return;
    setActionLoading(editingMember ? 'update-member' : 'create-member');
    try {
      const url = editingMember
        ? `/api/admin/corporate/companies/${selectedCompanyId}/members/${editingMember.id}`
        : `/api/admin/corporate/companies/${selectedCompanyId}/members`;
      await adminJsonRequest(url, {
        method: editingMember ? 'PATCH' : 'POST',
        body: {
          fullName: memberForm.fullName,
          email: memberForm.email,
          phone: memberForm.phone || undefined,
          employeeCode: memberForm.employeeCode || undefined,
          role: memberForm.role,
          status: memberForm.status,
        },
      });
      setMemberModalOpened(false);
      setEditingMember(null);
      await refreshSelectedCompany();
      notifications.show({
        color: 'green',
        message: editingMember ? 'Narys atnaujintas.' : 'Narys sukurtas.',
      });
    } catch (error: any) {
      notifications.show({ color: 'red', message: error.message || 'Nepavyko išsaugoti nario' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteMember = async (member: CompanyMemberDto) => {
    if (!selectedCompanyId) return;
    if (!window.confirm(`Ištrinti narį ${member.fullName}?`)) return;

    setActionLoading(`delete-member-${member.id}`);
    try {
      await adminJsonRequest(
        `/api/admin/corporate/companies/${selectedCompanyId}/members/${member.id}`,
        {
          method: 'DELETE',
        },
      );
      await refreshSelectedCompany();
      notifications.show({ color: 'green', message: 'Narys ištrintas.' });
    } catch (error: any) {
      notifications.show({ color: 'red', message: error.message || 'Nepavyko ištrinti nario' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCorporateRecurringPurchase = async () => {
    if (!selectedCompanyId) return;

    setActionLoading('create-corporate-purchase');
    try {
      const payload = await adminJsonRequest<{
        wallet: CorporateWalletDto;
        purchase: { id: string };
        subscription: { id: string };
      }>(`/api/admin/corporate/companies/${selectedCompanyId}/recurring-purchases`, {
        method: 'POST',
        body: {
          site: corporatePurchaseForm.site,
          memberId: corporatePurchaseForm.memberId,
          programId: corporatePurchaseForm.programId,
          planId: corporatePurchaseForm.planId,
          groupId: corporatePurchaseForm.groupId,
          startDate: corporatePurchaseForm.startDate,
          locale: corporatePurchaseForm.locale,
          notes: corporatePurchaseForm.notes || undefined,
        },
      });
      setCorporatePurchaseOpened(false);
      await refreshSelectedCompany();
      notifications.show({
        color: 'green',
        message: `Corporate recurring sukurtas. Purchase ${payload.purchase.id}, subscription ${payload.subscription.id}.`,
      });
    } catch (error: any) {
      notifications.show({
        color: 'red',
        message: error.message || 'Nepavyko sukurti corporate recurring pirkimo',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCorporateSubscriptionLifecycleAction = async (
    action: 'pause' | 'resume' | 'cancel',
  ) => {
    if (!selectedSubscriptionAction) return;

    const body: Record<string, unknown> = {};
    if (subscriptionActionNotes.trim()) body.notes = subscriptionActionNotes.trim();

    if (action === 'cancel') {
      const refundAmount = parseMoneyInput(subscriptionCancelRefundAmount);
      if (Number.isNaN(refundAmount)) {
        notifications.show({ color: 'red', message: 'Refund suma turi būti teisingas skaičius.' });
        return;
      }

      body.refundStatus = subscriptionCancelRefundStatus;
      if (refundAmount !== null) body.refundAmountEur = refundAmount;
      if (subscriptionCancelRefundReference.trim()) {
        body.refundReference = subscriptionCancelRefundReference.trim();
      }
    }

    setActionLoading(`subscription-${action}`);
    try {
      await adminJsonRequest(
        `/api/admin/recurring/subscriptions/${selectedSubscriptionAction.subscription.id}/${action}`,
        {
          method: 'POST',
          body,
        },
      );
      await refreshSelectedCompany();
      notifications.show({
        color: 'green',
        message:
          action === 'pause'
            ? 'Subscription pristabdytas.'
            : action === 'resume'
              ? 'Subscription atnaujintas.'
              : 'Subscription atšauktas.',
      });
      await mutateSubscriptionActionDetail();
    } catch (error: any) {
      notifications.show({
        color: 'red',
        message: error.message || 'Nepavyko atlikti subscription veiksmo',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCorporateIssueMagicLink = async (deliveryMode: 'manual' | 'email') => {
    if (!selectedSubscriptionAction) return;
    if (deliveryMode === 'manual' && subscriptionManualMagicLinkReason.trim().length < 8) {
      notifications.show({
        color: 'yellow',
        message: 'Manual magic link reveal reikia bent 8 simbolių priežasties.',
      });
      return;
    }

    setActionLoading(`subscription-magic-link-${deliveryMode}`);
    try {
      const payload = await adminJsonRequest<{
        magicLink: {
          consumeUrl: string;
          customerEmail: string;
          expiresAt: string;
          subscriptionId: string | null;
        } | null;
      }>(
        `/api/admin/recurring/subscriptions/${selectedSubscriptionAction.subscription.id}/issue-magic-link`,
        {
          method: 'POST',
          body: {
            deliveryMode,
            reason:
              deliveryMode === 'manual' ? subscriptionManualMagicLinkReason.trim() : undefined,
          },
        },
      );

      if (deliveryMode === 'manual') {
        if (!payload.magicLink) {
          throw new Error('Magic link negrąžintas');
        }
        setGeneratedMagicLink(payload.magicLink);
        setIsGeneratedMagicLinkVisible(false);
        notifications.show({
          color: 'green',
          message: 'Manual magic link paruoštas saugiai peržiūrai.',
        });
      } else {
        setGeneratedMagicLink(null);
        setIsGeneratedMagicLinkVisible(false);
        notifications.show({
          color: 'green',
          message: 'Recurring magic link išsiųstas el. paštu.',
        });
      }

      await refreshSelectedCompany();
    } catch (error: any) {
      notifications.show({
        color: 'red',
        message: error.message || 'Nepavyko išduoti magic link',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCorporateSubscriptionRegenerateSchedule = async () => {
    if (!selectedSubscriptionAction) return;

    setActionLoading('subscription-regenerate-schedule');
    try {
      await adminJsonRequest(
        `/api/admin/recurring/subscriptions/${selectedSubscriptionAction.subscription.id}/regenerate-schedule`,
        {
          method: 'POST',
          body: subscriptionActionNotes.trim() ? { notes: subscriptionActionNotes.trim() } : {},
        },
      );
      await Promise.all([refreshSelectedCompany(), mutateSubscriptionActionDetail()]);
      notifications.show({
        color: 'green',
        message: 'Subscription grafikas perplanuotas.',
      });
    } catch (error: any) {
      notifications.show({
        color: 'red',
        message: error.message || 'Nepavyko perplanuoti subscription grafiko',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCorporateSubscriptionPlanChange = async () => {
    if (!selectedSubscriptionAction || !subscriptionChangePlanId) return;

    setActionLoading('subscription-change-plan');
    try {
      await adminJsonRequest(
        `/api/admin/recurring/subscriptions/${selectedSubscriptionAction.subscription.id}/change-plan`,
        {
          method: 'POST',
          body: {
            nextPlanId: subscriptionChangePlanId,
            ...(subscriptionActionNotes.trim() ? { notes: subscriptionActionNotes.trim() } : {}),
          },
        },
      );
      await Promise.all([refreshSelectedCompany(), mutateSubscriptionActionDetail()]);
      notifications.show({
        color: 'green',
        message: 'Subscription planas pakeistas.',
      });
    } catch (error: any) {
      notifications.show({
        color: 'red',
        message: error.message || 'Nepavyko pakeisti subscription plano',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCorporateSubscriptionRefundExecute = async () => {
    if (!selectedSubscriptionAction) return;

    setActionLoading('subscription-refund-execute');
    try {
      await adminJsonRequest(
        `/api/admin/recurring/subscriptions/${selectedSubscriptionAction.subscription.id}/refund`,
        {
          method: 'POST',
          body: {
            mode: 'execute',
            reason: subscriptionRefundReason,
            ...(subscriptionActionNotes.trim() ? { notes: subscriptionActionNotes.trim() } : {}),
          },
        },
      );
      await Promise.all([refreshSelectedCompany(), mutateSubscriptionActionDetail()]);
      notifications.show({
        color: 'green',
        message: 'Refund vykdymas užregistruotas.',
      });
    } catch (error: any) {
      notifications.show({
        color: 'red',
        message: error.message || 'Nepavyko paleisti refund vykdymo',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCorporateSubscriptionRefundException = async () => {
    if (!selectedSubscriptionAction) return;

    setActionLoading('subscription-refund-exception');
    try {
      await adminJsonRequest(
        `/api/admin/recurring/subscriptions/${selectedSubscriptionAction.subscription.id}/refund`,
        {
          method: 'POST',
          body: {
            mode: 'exception',
            exceptionCode: subscriptionRefundExceptionCode,
            exceptionMessage: subscriptionRefundExceptionMessage.trim() || undefined,
            ...(subscriptionActionNotes.trim() ? { notes: subscriptionActionNotes.trim() } : {}),
          },
        },
      );
      await Promise.all([refreshSelectedCompany(), mutateSubscriptionActionDetail()]);
      notifications.show({
        color: 'green',
        message: 'Refund exception užregistruotas.',
      });
    } catch (error: any) {
      notifications.show({
        color: 'red',
        message: error.message || 'Nepavyko užregistruoti refund exception',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyGeneratedMagicLink = async () => {
    if (!generatedMagicLink?.consumeUrl) return;
    const copied = await copyToClipboard(generatedMagicLink.consumeUrl);
    notifications.show({
      color: copied ? 'green' : 'yellow',
      message: copied ? 'Magic link nukopijuotas.' : 'Nepavyko nukopijuoti magic link.',
    });
  };

  const handleCorporateReservationAction = async ({
    reservationId,
    occurrenceId,
    action,
  }: {
    reservationId: string;
    occurrenceId?: string | null;
    action: 'early_cancel' | 'late_cancel' | 'attended' | 'late_cancel_attendance' | 'no_show';
  }) => {
    if (!reservationActionNotes.trim()) {
      notifications.show({
        color: 'yellow',
        message: 'Įrašyk attendance / cancel notes prieš atlikdamas veiksmą.',
      });
      return;
    }

    setActionLoading(`reservation-${reservationId}-${action}`);
    try {
      if (action === 'early_cancel' || action === 'late_cancel') {
        await adminJsonRequest(`/api/admin/recurring/reservations/${reservationId}/cannot-attend`, {
          method: 'POST',
          body: {
            timing: action === 'early_cancel' ? 'early' : 'late',
            notes: reservationActionNotes.trim(),
            ...(reservationCancelReason.trim()
              ? { cancelReason: reservationCancelReason.trim() }
              : {}),
          },
        });
      } else {
        if (!occurrenceId) {
          throw new Error('Trūksta occurrence id attendance veiksmui');
        }
        await adminJsonRequest(`/api/admin/recurring/occurrences/${occurrenceId}/attendance`, {
          method: 'POST',
          body: {
            reservationId,
            result:
              action === 'attended'
                ? 'attended'
                : action === 'late_cancel_attendance'
                  ? 'late_cancel'
                  : 'no_show',
            notes: reservationActionNotes.trim(),
          },
        });
      }

      await refreshSelectedCompany();
      setReservationActionNotes('');
      setReservationCancelReason('');
      notifications.show({
        color: 'green',
        message: 'Reservation / attendance veiksmas išsaugotas.',
      });
    } catch (error: any) {
      notifications.show({
        color: 'red',
        message: error.message || 'Nepavyko atlikti reservation veiksmo',
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1}>Corporate</Title>
            <Text c="dimmed">
              Company, wallet, members ir corporate-funded recurring administravimas vienoje
              vietoje.
            </Text>
          </div>
          <Group gap="sm">
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="light"
              onClick={() => {
                void Promise.all([mutate(), mutateDetail()]);
              }}
            >
              Atnaujinti
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreateCompanyModal}>
              Nauja įmonė
            </Button>
          </Group>
        </Group>

        <Card withBorder radius="md" padding="lg">
          <Group align="flex-end">
            <Select
              label="Statusas"
              data={[{ value: '', label: 'Visi statusai' }, ...COMPANY_STATUS_OPTIONS]}
              value={statusFilter || null}
              onChange={(value) => setStatusFilter(value || '')}
              w={220}
              clearable
            />
            <TextInput
              label="Paieška"
              placeholder="Pavadinimas, kodas, billing email"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              style={{ flex: 1 }}
            />
          </Group>
        </Card>

        {error ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Nepavyko įkelti įmonių">
            {error.message}
          </Alert>
        ) : null}

        <Card withBorder radius="md" padding="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={2} size="h3">
                Įmonės
              </Title>
              <Badge variant="light">{companies.length}</Badge>
            </Group>

            {isLoading ? (
              <Group justify="center" py="xl">
                <Loader size="sm" />
              </Group>
            ) : companies.length === 0 ? (
              <Text c="dimmed">Dar nėra corporate įmonių.</Text>
            ) : (
              <Table withTableBorder withColumnBorders striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Įmonė</Table.Th>
                    <Table.Th>Statusas</Table.Th>
                    <Table.Th>Wallet</Table.Th>
                    <Table.Th>Admins</Table.Th>
                    <Table.Th>Members</Table.Th>
                    <Table.Th>Allowed sites</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {companies.map((company) => (
                    <Table.Tr key={company.id}>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text fw={600}>{company.name}</Text>
                          <Text size="xs" c="dimmed">
                            {company.code}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {company.billingEmail || 'Be billing email'}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={statusColor(company.status)} variant="light">
                          {company.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text size="sm">{formatMoney(company.wallet?.availableBalanceEur)}</Text>
                          <Text size="xs" c="dimmed">
                            Balansas {formatMoney(company.wallet?.balanceEur)}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>{company.memberCounts.activeAdmins}</Table.Td>
                      <Table.Td>{company.memberCounts.activeMembers}</Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {(company.policy?.allowedSites || []).map(siteLabel).join(', ') || '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Button
                          size="xs"
                          variant={selectedCompanyId === company.id ? 'filled' : 'light'}
                          onClick={() => setSelectedCompanyId(company.id)}
                        >
                          {selectedCompanyId === company.id ? 'Atidaryta' : 'Atidaryti'}
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Card>

        {!selectedCompanyId ? (
          <Alert color="blue" icon={<IconBuildingBank size={18} />} title="Pasirink įmonę">
            Atsidaryk konkrečią company, kad galėtum valdyti wallet, members ir corporate-funded
            recurring pirkimus.
          </Alert>
        ) : detailError ? (
          <Alert
            color="red"
            icon={<IconAlertTriangle size={18} />}
            title="Nepavyko įkelti company detalės"
          >
            {detailError.message}
          </Alert>
        ) : isLoadingDetail || !selectedCompany ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        ) : (
          <Stack gap="lg">
            <Card withBorder radius="md" padding="lg">
              <Stack gap="lg">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Group gap="sm" align="center">
                      <Title order={2} size="h3">
                        {selectedCompany.name}
                      </Title>
                      <Badge variant="light">{selectedCompany.code}</Badge>
                      <Badge color={statusColor(selectedCompany.status)} variant="light">
                        {selectedCompany.status}
                      </Badge>
                    </Group>
                    <Text c="dimmed" size="sm">
                      Billing: {selectedCompany.billingEmail || '-'} •{' '}
                      {selectedCompany.billingPhone || '-'}
                    </Text>
                    {selectedCompany.notes ? (
                      <Text size="sm" mt={6}>
                        {selectedCompany.notes}
                      </Text>
                    ) : null}
                  </div>
                  <Group gap="sm">
                    <Button
                      leftSection={<IconEdit size={16} />}
                      variant="light"
                      onClick={openEditCompanyModal}
                    >
                      Redaguoti company
                    </Button>
                    <Button
                      leftSection={<IconCash size={16} />}
                      variant="light"
                      onClick={openWalletAdjustmentModal}
                    >
                      Wallet korekcija
                    </Button>
                    <Button
                      leftSection={<IconUsers size={16} />}
                      variant="light"
                      onClick={openCreateMemberModal}
                    >
                      Naujas narys
                    </Button>
                    <Button
                      leftSection={<IconRepeat size={16} />}
                      onClick={openCorporatePurchaseModal}
                    >
                      Finansuoti recurring
                    </Button>
                  </Group>
                </Group>

                <SimpleGrid cols={{ base: 1, md: 4 }}>
                  <Card withBorder radius="md" padding="md">
                    <Text size="xs" c="dimmed">
                      Available balance
                    </Text>
                    <Title order={3}>
                      {formatMoney(selectedCompany.wallet?.availableBalanceEur)}
                    </Title>
                    <Text size="xs" c="dimmed">
                      Reserved {formatMoney(selectedCompany.wallet?.reservedBalanceEur)}
                    </Text>
                  </Card>
                  <Card withBorder radius="md" padding="md">
                    <Text size="xs" c="dimmed">
                      Total balance
                    </Text>
                    <Title order={3}>{formatMoney(selectedCompany.wallet?.balanceEur)}</Title>
                    <Text size="xs" c="dimmed">
                      Wallet status {selectedCompany.wallet?.status || '-'}
                    </Text>
                  </Card>
                  <Card withBorder radius="md" padding="md">
                    <Text size="xs" c="dimmed">
                      Active admins
                    </Text>
                    <Title order={3}>{selectedCompany.memberCounts.activeAdmins}</Title>
                    <Text size="xs" c="dimmed">
                      Total members {selectedCompany.memberCounts.total}
                    </Text>
                  </Card>
                  <Card withBorder radius="md" padding="md">
                    <Text size="xs" c="dimmed">
                      Policy
                    </Text>
                    <Title order={3}>{selectedCompany.policy?.status || '-'}</Title>
                    <Text size="xs" c="dimmed">
                      {(selectedCompany.policy?.allowedSites || []).map(siteLabel).join(', ') ||
                        '-'}
                    </Text>
                  </Card>
                </SimpleGrid>

                <Group gap="xs">
                  <Badge variant="light" color={statusColor(selectedCompany.policy?.status)}>
                    Policy {selectedCompany.policy?.status || 'draft'}
                  </Badge>
                  {(selectedCompany.policy?.allowedProductKinds || []).map((kind) => (
                    <Badge key={kind} variant="light" color="blue">
                      {productKindLabel(kind)}
                    </Badge>
                  ))}
                  {(selectedCompany.policy?.allowedSites || []).map((site) => (
                    <Badge key={site} variant="light" color="grape">
                      {siteLabel(site)}
                    </Badge>
                  ))}
                </Group>
                {selectedCompany.policy?.notes ? (
                  <Text size="sm" c="dimmed">
                    Policy notes: {selectedCompany.policy.notes}
                  </Text>
                ) : null}
              </Stack>
            </Card>

            <Card withBorder radius="md" padding="lg">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={3} size="h4">
                    Darbuotojų usage
                  </Title>
                  <Badge variant="light">{selectedCompany.memberUsageReports.length}</Badge>
                </Group>
                {selectedCompany.memberUsageReports.length === 0 ? (
                  <Text c="dimmed">Kol kas corporate-funded usage per darbuotoją nėra.</Text>
                ) : (
                  <Table withTableBorder withColumnBorders striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Darbuotojas</Table.Th>
                        <Table.Th>Spend</Table.Th>
                        <Table.Th>Purchases</Table.Th>
                        <Table.Th>Subscriptions</Table.Th>
                        <Table.Th>Paskutinis usage</Table.Th>
                        <Table.Th />
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {selectedCompany.memberUsageReports.map((report) => {
                        const member = memberById.get(report.memberId);
                        return (
                          <Table.Tr key={report.memberId}>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text fw={600}>{member?.fullName || report.memberId}</Text>
                                <Text size="xs" c="dimmed">
                                  {member?.email || '-'}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {member?.employeeCode || member?.phone || member?.status || '-'}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text fw={600}>{formatMoney(report.totalCommittedAmountEur)}</Text>
                                <Text size="xs" c="dimmed">
                                  Fulfilled {report.fulfilledSponsoredPurchases}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text size="sm">Total {report.totalSponsoredPurchases}</Text>
                                <Text size="xs" c="dimmed">
                                  Failed {report.failedSponsoredPurchases} • Rolled back{' '}
                                  {report.rolledBackSponsoredPurchases}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text size="sm">Active {report.activeSubscriptionCount}</Text>
                                <Text size="xs" c="dimmed">
                                  Inactive {report.inactiveSubscriptionCount}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text size="sm">
                                  {report.lastSponsoredPurchaseAt
                                    ? formatDateTime(report.lastSponsoredPurchaseAt)
                                    : '-'}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {report.lastSponsoredSite
                                    ? siteLabel(report.lastSponsoredSite)
                                    : '-'}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Button
                                size="xs"
                                variant="light"
                                onClick={() => openMemberDrilldownModal(report.memberId)}
                              >
                                Detalė
                              </Button>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                )}
              </Stack>
            </Card>

            <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg">
              <Card withBorder radius="md" padding="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={3} size="h4">
                      Nariai
                    </Title>
                    <Badge variant="light">{selectedCompany.members.length}</Badge>
                  </Group>
                  {selectedCompany.members.length === 0 ? (
                    <Text c="dimmed">Ši įmonė dar neturi narių.</Text>
                  ) : (
                    <Table withTableBorder withColumnBorders striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Narys</Table.Th>
                          <Table.Th>Rolė</Table.Th>
                          <Table.Th>Statusas</Table.Th>
                          <Table.Th />
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {selectedCompany.members.map((member) => (
                          <Table.Tr key={member.id}>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text fw={600}>{member.fullName}</Text>
                                <Text size="xs" c="dimmed">
                                  {member.email}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {member.employeeCode || member.phone || '-'}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={statusColor(member.role)} variant="light">
                                {member.role}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={statusColor(member.status)} variant="light">
                                {member.status}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={6} justify="flex-end">
                                <ActionIcon
                                  variant="light"
                                  color="blue"
                                  onClick={() => openEditMemberModal(member)}
                                >
                                  <IconEdit size={16} />
                                </ActionIcon>
                                <ActionIcon
                                  variant="light"
                                  color="red"
                                  loading={actionLoading === `delete-member-${member.id}`}
                                  onClick={() => {
                                    void handleDeleteMember(member);
                                  }}
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
                </Stack>
              </Card>

              <Card withBorder radius="md" padding="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={3} size="h4">
                      Ledger
                    </Title>
                    <Badge variant="light">{selectedCompany.recentLedgerEntries.length}</Badge>
                  </Group>
                  {selectedCompany.recentLedgerEntries.length === 0 ? (
                    <Text c="dimmed">Kol kas ledger įrašų nėra.</Text>
                  ) : (
                    <Table withTableBorder withColumnBorders striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Laikas</Table.Th>
                          <Table.Th>Kryptis</Table.Th>
                          <Table.Th>Suma</Table.Th>
                          <Table.Th>Pastaba</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {selectedCompany.recentLedgerEntries.map((entry) => (
                          <Table.Tr key={entry.id}>
                            <Table.Td>{formatDateTime(entry.createdAt)}</Table.Td>
                            <Table.Td>
                              <Badge color={statusColor(entry.direction)} variant="light">
                                {entry.direction}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text fw={600}>{formatMoney(entry.amountEur)}</Text>
                                <Text size="xs" c="dimmed">
                                  Balansas po {formatMoney(entry.balanceAfterEur)}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{entry.notes || '-'}</Text>
                              <Text size="xs" c="dimmed">
                                {entry.category}
                                {entry.site ? ` • ${siteLabel(entry.site)}` : ''}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Stack>
              </Card>
            </SimpleGrid>

            <Card withBorder radius="md" padding="lg">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={3} size="h4">
                    Sponsored recurring istorija
                  </Title>
                  <Badge variant="light">{selectedCompany.recentSponsoredPurchases.length}</Badge>
                </Group>
                {selectedCompany.recentSponsoredPurchases.length === 0 ? (
                  <Text c="dimmed">Kol kas corporate-funded recurring įrašų nėra.</Text>
                ) : (
                  <Table withTableBorder withColumnBorders striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Laikas</Table.Th>
                        <Table.Th>Narys</Table.Th>
                        <Table.Th>Site</Table.Th>
                        <Table.Th>Statusas</Table.Th>
                        <Table.Th>Suma</Table.Th>
                        <Table.Th>Start</Table.Th>
                        <Table.Th>Nuorodos</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {selectedCompany.recentSponsoredPurchases.map((purchase) => (
                        <Table.Tr key={purchase.id}>
                          <Table.Td>{formatDateTime(purchase.createdAt)}</Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              <Text size="sm">
                                {memberNameById.get(purchase.memberId) || purchase.memberId}
                              </Text>
                              {purchase.notes ? (
                                <Text size="xs" c="dimmed">
                                  {purchase.notes}
                                </Text>
                              ) : null}
                            </Stack>
                          </Table.Td>
                          <Table.Td>{siteLabel(purchase.site)}</Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              <Badge color={statusColor(purchase.status)} variant="light">
                                {purchase.status}
                              </Badge>
                              {purchase.failureReason ? (
                                <Text size="xs" c="red">
                                  {purchase.failureReason}
                                </Text>
                              ) : null}
                            </Stack>
                          </Table.Td>
                          <Table.Td>{formatMoney(purchase.amountEur)}</Table.Td>
                          <Table.Td>{purchase.selectedStartDate}</Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              <Text size="xs" c="dimmed">
                                Purchase {purchase.recurringPurchaseId}
                              </Text>
                              <Text size="xs" c="dimmed">
                                Subscription {purchase.subscriptionId || '-'}
                              </Text>
                            </Stack>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Stack>
            </Card>
          </Stack>
        )}
      </Stack>

      <Modal
        opened={createCompanyOpened}
        onClose={() => setCreateCompanyOpened(false)}
        title="Nauja įmonė"
        size="lg"
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <TextInput
              label="Pavadinimas"
              value={createCompanyForm.name}
              onChange={(event) =>
                setCreateCompanyForm((current) => ({ ...current, name: event.currentTarget.value }))
              }
            />
            <TextInput
              label="Kodas"
              placeholder="ACME"
              value={createCompanyForm.code}
              onChange={(event) =>
                setCreateCompanyForm((current) => ({ ...current, code: event.currentTarget.value }))
              }
            />
            <Select
              label="Statusas"
              data={COMPANY_STATUS_OPTIONS}
              value={createCompanyForm.status}
              onChange={(value) =>
                setCreateCompanyForm((current) => ({
                  ...current,
                  status: (value as CompanyStatus | null) || 'draft',
                }))
              }
            />
            <TextInput
              label="Pradinis balansas"
              placeholder="0"
              value={createCompanyForm.initialBalanceEur}
              onChange={(event) =>
                setCreateCompanyForm((current) => ({
                  ...current,
                  initialBalanceEur: event.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="Billing email"
              value={createCompanyForm.billingEmail}
              onChange={(event) =>
                setCreateCompanyForm((current) => ({
                  ...current,
                  billingEmail: event.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="Billing phone"
              value={createCompanyForm.billingPhone}
              onChange={(event) =>
                setCreateCompanyForm((current) => ({
                  ...current,
                  billingPhone: event.currentTarget.value,
                }))
              }
            />
          </SimpleGrid>

          <MultiSelect
            label="Allowed sites"
            data={SITE_OPTIONS}
            value={createCompanyForm.allowedSites}
            onChange={(value) =>
              setCreateCompanyForm((current) => ({
                ...current,
                allowedSites: value as SiteKey[],
              }))
            }
          />

          <Textarea
            label="Pastabos"
            minRows={3}
            value={createCompanyForm.notes}
            onChange={(event) =>
              setCreateCompanyForm((current) => ({ ...current, notes: event.currentTarget.value }))
            }
          />

          <Divider label="Primary admin (optional)" />

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <TextInput
              label="Vardas"
              value={createCompanyForm.primaryAdminName}
              onChange={(event) =>
                setCreateCompanyForm((current) => ({
                  ...current,
                  primaryAdminName: event.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="El. paštas"
              value={createCompanyForm.primaryAdminEmail}
              onChange={(event) =>
                setCreateCompanyForm((current) => ({
                  ...current,
                  primaryAdminEmail: event.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="Telefonas"
              value={createCompanyForm.primaryAdminPhone}
              onChange={(event) =>
                setCreateCompanyForm((current) => ({
                  ...current,
                  primaryAdminPhone: event.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="Employee code"
              value={createCompanyForm.primaryAdminEmployeeCode}
              onChange={(event) =>
                setCreateCompanyForm((current) => ({
                  ...current,
                  primaryAdminEmployeeCode: event.currentTarget.value,
                }))
              }
            />
          </SimpleGrid>

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setCreateCompanyOpened(false)}>
              Uždaryti
            </Button>
            <Button
              loading={actionLoading === 'create-company'}
              onClick={() => void handleCreateCompany()}
            >
              Sukurti
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={subscriptionActionOpened}
        onClose={() => {
          setSubscriptionActionOpened(false);
          setSelectedSubscriptionActionId(null);
          setSubscriptionChangePlanId('');
          setGeneratedMagicLink(null);
          setIsGeneratedMagicLinkVisible(false);
        }}
        title={
          selectedSubscriptionAction
            ? `Subscription veiksmai: ${selectedSubscriptionAction.program?.nameLt || selectedSubscriptionAction.subscription.id}`
            : 'Subscription veiksmai'
        }
        size="lg"
      >
        {!selectedSubscriptionAction ? (
          <Text c="dimmed">Subscription veiksmo kontekstas nerastas.</Text>
        ) : (
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Card withBorder radius="md" padding="md">
                <Text size="xs" c="dimmed">
                  Subscription
                </Text>
                <Text fw={600}>{selectedSubscriptionAction.subscription.id}</Text>
                <Text size="sm" c="dimmed">
                  {selectedSubscriptionAction.program?.nameLt || '-'} •{' '}
                  {selectedSubscriptionAction.plan?.nameLt || '-'}
                </Text>
              </Card>
              <Card withBorder radius="md" padding="md">
                <Text size="xs" c="dimmed">
                  Statusas
                </Text>
                <Badge
                  color={statusColor(selectedSubscriptionAction.subscription.status)}
                  variant="light"
                >
                  {selectedSubscriptionAction.subscription.status}
                </Badge>
                <Text size="sm" c="dimmed" mt={6}>
                  {selectedSubscriptionAction.subscription.remainingSessions}/
                  {selectedSubscriptionAction.subscription.totalSessions} liko
                </Text>
              </Card>
            </SimpleGrid>

            {subscriptionActionDetailError ? (
              <Alert
                color="red"
                icon={<IconAlertTriangle size={16} />}
                title="Nepavyko įkelti recurring detail"
              >
                {subscriptionActionDetailError.message}
              </Alert>
            ) : isLoadingSubscriptionActionDetail ? (
              <Group justify="center" py="md">
                <Loader size="sm" />
              </Group>
            ) : null}

            {selectedSubscriptionActionDetail ? (
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <Card withBorder radius="md" padding="md">
                  <Stack gap="xs">
                    <Title order={4} size="h5">
                      Provisioning / makeup
                    </Title>
                    <Text>
                      <strong>Planned count:</strong>{' '}
                      {selectedSubscriptionActionDetail.provisioning?.schedule?.plannedCount ?? '-'}
                    </Text>
                    <Text>
                      <strong>Scheduled through:</strong>{' '}
                      {selectedSubscriptionActionDetail.provisioning?.schedule?.scheduledThrough ||
                        '-'}
                    </Text>
                    <Text>
                      <strong>Generation version:</strong>{' '}
                      {selectedSubscriptionActionDetail.provisioning?.schedule?.generationVersion ??
                        '-'}
                    </Text>
                    <Text>
                      <strong>Makeup balance:</strong>{' '}
                      {selectedSubscriptionActionDetail.makeup?.remainingCredits ?? '-'}
                    </Text>
                    <Text>
                      <strong>Releasable future dates:</strong>{' '}
                      {asTextList(
                        selectedSubscriptionActionDetail.lifecycle?.releasePreview?.releasableDates,
                      )}
                    </Text>
                    <Text>
                      <strong>Blocked reservations:</strong>{' '}
                      {selectedSubscriptionActionDetail.lifecycle?.releasePreview
                        ?.blockedReservations.length || 0}
                    </Text>
                  </Stack>
                </Card>

                <Card withBorder radius="md" padding="md">
                  <Stack gap="xs">
                    <Title order={4} size="h5">
                      Refund / audit signalai
                    </Title>
                    <Text>
                      <strong>Purchase id:</strong>{' '}
                      {selectedSubscriptionActionDetail.subscription.sourcePurchaseId || '-'}
                    </Text>
                    <Text>
                      <strong>Paskutinis magic link:</strong>{' '}
                      {formatDateTime(
                        selectedSubscriptionActionDetail.subscription.latestMagicLinkIssuedAt,
                      )}
                    </Text>
                    <Text>
                      <strong>Payment provider:</strong>{' '}
                      {selectedSubscriptionActionDetail.refund?.paymentProvider || '-'}
                    </Text>
                    <Text>
                      <strong>Payment status:</strong>{' '}
                      <Badge
                        color={statusColor(selectedSubscriptionActionDetail.refund?.paymentStatus)}
                        variant="light"
                      >
                        {selectedSubscriptionActionDetail.refund?.paymentStatus || '-'}
                      </Badge>
                    </Text>
                    <Text>
                      <strong>Refund state:</strong>{' '}
                      <Badge
                        color={statusColor(
                          selectedSubscriptionActionDetail.refund?.execution?.state,
                        )}
                        variant="light"
                      >
                        {selectedSubscriptionActionDetail.refund?.execution?.state || '-'}
                      </Badge>
                    </Text>
                    <Text>
                      <strong>Refund amount:</strong>{' '}
                      {formatMoney(selectedSubscriptionActionDetail.refund?.amountEur)}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {selectedSubscriptionActionDetail.refund?.reason ||
                        'Refund execution available'}
                    </Text>
                  </Stack>
                </Card>
              </SimpleGrid>
            ) : null}

            <Textarea
              label="Admin notes"
              minRows={3}
              placeholder="Lifecycle arba support pastabos"
              value={subscriptionActionNotes}
              onChange={(event) => setSubscriptionActionNotes(event.currentTarget.value)}
            />

            <Card withBorder radius="md" padding="lg">
              <Stack gap="md">
                <Title order={3} size="h4">
                  Magic link
                </Title>
                <TextInput
                  label="Manual reveal reason"
                  placeholder="Kodėl reikia rankinio reveal"
                  value={subscriptionManualMagicLinkReason}
                  onChange={(event) =>
                    setSubscriptionManualMagicLinkReason(event.currentTarget.value)
                  }
                />
                <Group>
                  <Button
                    leftSection={<IconMailPlus size={16} />}
                    loading={actionLoading === 'subscription-magic-link-email'}
                    onClick={() => void handleCorporateIssueMagicLink('email')}
                  >
                    Siųsti el. paštu
                  </Button>
                  <Button
                    leftSection={<IconLink size={16} />}
                    variant="light"
                    loading={actionLoading === 'subscription-magic-link-manual'}
                    onClick={() => void handleCorporateIssueMagicLink('manual')}
                  >
                    Manual reveal
                  </Button>
                </Group>

                {generatedMagicLink ? (
                  <Card withBorder radius="md" padding="md">
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <Text fw={600}>Sugeneruotas manual magic link</Text>
                        <Group gap="xs">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => setIsGeneratedMagicLinkVisible((current) => !current)}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => void handleCopyGeneratedMagicLink()}
                          >
                            <IconCopy size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {generatedMagicLink.customerEmail} • expires{' '}
                        {formatDateTime(generatedMagicLink.expiresAt)}
                      </Text>
                      {isGeneratedMagicLinkVisible ? (
                        <Code block>{generatedMagicLink.consumeUrl}</Code>
                      ) : (
                        <Text size="sm" c="dimmed">
                          Link paslėptas iki aiškaus reveal.
                        </Text>
                      )}
                    </Stack>
                  </Card>
                ) : null}
              </Stack>
            </Card>

            <Card withBorder radius="md" padding="lg">
              <Stack gap="md">
                <Title order={3} size="h4">
                  Lifecycle
                </Title>
                <Group>
                  <Button
                    leftSection={<IconPlayerPause size={16} />}
                    variant="light"
                    loading={actionLoading === 'subscription-pause'}
                    disabled={
                      !selectedSubscriptionActionDetail?.lifecycle?.actions?.pause?.eligible
                    }
                    onClick={() => void handleCorporateSubscriptionLifecycleAction('pause')}
                  >
                    Pause
                  </Button>
                  <Button
                    leftSection={<IconPlayerPlay size={16} />}
                    variant="light"
                    loading={actionLoading === 'subscription-resume'}
                    disabled={
                      !selectedSubscriptionActionDetail?.lifecycle?.actions?.resume?.eligible
                    }
                    onClick={() => void handleCorporateSubscriptionLifecycleAction('resume')}
                  >
                    Resume
                  </Button>
                  <Button
                    leftSection={<IconRefresh size={16} />}
                    variant="light"
                    loading={actionLoading === 'subscription-regenerate-schedule'}
                    onClick={() => void handleCorporateSubscriptionRegenerateSchedule()}
                  >
                    Regenerate schedule
                  </Button>
                </Group>
                <Text size="xs" c="dimmed">
                  Pause:{' '}
                  {selectedSubscriptionActionDetail?.lifecycle?.actions?.pause?.reason ||
                    'leidžiama'}
                </Text>
                <Text size="xs" c="dimmed">
                  Resume:{' '}
                  {selectedSubscriptionActionDetail?.lifecycle?.actions?.resume?.reason ||
                    'leidžiama'}
                </Text>

                <Divider label="Cancel su refund apskaita" />

                <SimpleGrid cols={{ base: 1, md: 3 }}>
                  <Select
                    label="Refund status"
                    data={REFUND_STATUS_OPTIONS}
                    value={subscriptionCancelRefundStatus}
                    onChange={(value) =>
                      setSubscriptionCancelRefundStatus(
                        (value as RefundStatus | null) || 'not_applicable',
                      )
                    }
                  />
                  <TextInput
                    label="Refund suma EUR"
                    value={subscriptionCancelRefundAmount}
                    onChange={(event) =>
                      setSubscriptionCancelRefundAmount(event.currentTarget.value)
                    }
                  />
                  <TextInput
                    label="Refund reference"
                    value={subscriptionCancelRefundReference}
                    onChange={(event) =>
                      setSubscriptionCancelRefundReference(event.currentTarget.value)
                    }
                  />
                </SimpleGrid>

                <Button
                  leftSection={<IconCancel size={16} />}
                  color="red"
                  loading={actionLoading === 'subscription-cancel'}
                  disabled={!selectedSubscriptionActionDetail?.lifecycle?.actions?.cancel?.eligible}
                  onClick={() => void handleCorporateSubscriptionLifecycleAction('cancel')}
                >
                  Cancel subscription
                </Button>
                <Text size="xs" c="dimmed">
                  Cancel:{' '}
                  {selectedSubscriptionActionDetail?.lifecycle?.actions?.cancel?.reason ||
                    'leidžiama'}
                </Text>
              </Stack>
            </Card>

            <Card withBorder radius="md" padding="lg">
              <Stack gap="md">
                <Title order={3} size="h4">
                  Plan change
                </Title>
                <Select
                  label="Kitas planas"
                  data={selectedSubscriptionPlanOptions.map((option) => ({
                    value: option.plan.id,
                    label: `${option.plan.nameLt} · ${formatMoney(option.plan.priceEur)} · ${
                      option.eligible ? 'eligible' : option.reason || 'blocked'
                    }`,
                  }))}
                  value={subscriptionChangePlanId}
                  onChange={(value) => setSubscriptionChangePlanId(value || '')}
                  placeholder="Pasirink planą"
                  searchable
                />
                <Group>
                  <Button
                    leftSection={<IconArrowsExchange size={16} />}
                    disabled={!selectedSubscriptionPlanOption?.eligible}
                    loading={actionLoading === 'subscription-change-plan'}
                    onClick={() => void handleCorporateSubscriptionPlanChange()}
                  >
                    Change plan
                  </Button>
                  <Text size="xs" c="dimmed">
                    {selectedSubscriptionPlanOption?.reason || 'Galima keisti tik į eligible planą'}
                  </Text>
                </Group>
              </Stack>
            </Card>

            <Card withBorder radius="md" padding="lg">
              <Stack gap="md">
                <Title order={3} size="h4">
                  Refund execution / exception
                </Title>
                <SimpleGrid cols={{ base: 1, md: 2 }}>
                  <Card withBorder radius="md" padding="md">
                    <Stack gap="xs">
                      <Text>
                        <strong>Provider:</strong>{' '}
                        {selectedSubscriptionActionDetail?.refund?.paymentProvider || '-'}
                      </Text>
                      <Text>
                        <strong>Payment status:</strong>{' '}
                        <Badge
                          color={statusColor(
                            selectedSubscriptionActionDetail?.refund?.paymentStatus,
                          )}
                          variant="light"
                        >
                          {selectedSubscriptionActionDetail?.refund?.paymentStatus || '-'}
                        </Badge>
                      </Text>
                      <Text>
                        <strong>Execution state:</strong>{' '}
                        <Badge
                          color={statusColor(
                            selectedSubscriptionActionDetail?.refund?.execution?.state,
                          )}
                          variant="light"
                        >
                          {selectedSubscriptionActionDetail?.refund?.execution?.state || '-'}
                        </Badge>
                      </Text>
                      <Text>
                        <strong>Refund ref:</strong>{' '}
                        {selectedSubscriptionActionDetail?.refund?.execution?.refundReference ||
                          '-'}
                      </Text>
                      <Text>
                        <strong>Provider status:</strong>{' '}
                        {selectedSubscriptionActionDetail?.refund?.execution?.providerStatus || '-'}
                      </Text>
                      <Text>
                        <strong>Last error:</strong>{' '}
                        {selectedSubscriptionActionDetail?.refund?.execution?.lastError || '-'}
                      </Text>
                    </Stack>
                  </Card>

                  <Card withBorder radius="md" padding="md">
                    <Stack gap="sm">
                      <Select
                        label="Stripe refund reason"
                        data={REFUND_REASON_OPTIONS}
                        value={subscriptionRefundReason}
                        onChange={(value) =>
                          setSubscriptionRefundReason(
                            (value as RefundReason) || 'requested_by_customer',
                          )
                        }
                        allowDeselect={false}
                      />
                      <Button
                        leftSection={<IconReceiptRefund size={16} />}
                        disabled={!selectedSubscriptionActionDetail?.refund?.eligible}
                        loading={actionLoading === 'subscription-refund-execute'}
                        onClick={() => void handleCorporateSubscriptionRefundExecute()}
                      >
                        Vykdyti Stripe refund
                      </Button>
                      <Divider />
                      <Select
                        label="Exception code"
                        data={REFUND_EXCEPTION_OPTIONS}
                        value={subscriptionRefundExceptionCode}
                        onChange={(value) =>
                          setSubscriptionRefundExceptionCode(value || 'manual_refund_required')
                        }
                        allowDeselect={false}
                      />
                      <Textarea
                        label="Exception message"
                        placeholder="Kodėl refund negalima įvykdyti automatiškai"
                        value={subscriptionRefundExceptionMessage}
                        onChange={(event) =>
                          setSubscriptionRefundExceptionMessage(event.currentTarget.value)
                        }
                        minRows={3}
                      />
                      <Button
                        variant="light"
                        loading={actionLoading === 'subscription-refund-exception'}
                        onClick={() => void handleCorporateSubscriptionRefundException()}
                      >
                        Žymėti refund exception
                      </Button>
                    </Stack>
                  </Card>
                </SimpleGrid>
              </Stack>
            </Card>

            <Card withBorder radius="md" padding="lg">
              <Stack gap="md">
                <Title order={3} size="h4">
                  Reservation / attendance veiksmai
                </Title>
                <Textarea
                  label="Attendance / cancel notes"
                  minRows={3}
                  placeholder="Kodėl atliekamas override"
                  value={reservationActionNotes}
                  onChange={(event) => setReservationActionNotes(event.currentTarget.value)}
                />
                <TextInput
                  label="Cancel reason"
                  placeholder="Papildoma priežastis cannot-attend veiksmui"
                  value={reservationCancelReason}
                  onChange={(event) => setReservationCancelReason(event.currentTarget.value)}
                />
              </Stack>
            </Card>

            <Card withBorder radius="md" padding="lg">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={3} size="h4">
                    Lifecycle audit
                  </Title>
                  <Badge variant="light">
                    audit įrašų: {selectedSubscriptionActionDetail?.lifecycleAudit?.length || 0}
                  </Badge>
                </Group>
                {selectedSubscriptionActionDetail?.lifecycleAudit?.length ? (
                  <Table withTableBorder withColumnBorders striped highlightOnHover>
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
                      {selectedSubscriptionActionDetail.lifecycleAudit.map((entry, index) => (
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
                                {entry.refundStatus || '-'}
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
                  <Text c="dimmed">Lifecycle audit įrašų dar nėra.</Text>
                )}
              </Stack>
            </Card>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={memberDrilldownOpened}
        onClose={() => {
          setMemberDrilldownOpened(false);
          setSelectedMemberDrilldownId(null);
        }}
        title={
          selectedMemberDrilldownId
            ? `Darbuotojo detalė: ${memberById.get(selectedMemberDrilldownId)?.fullName || selectedMemberDrilldownId}`
            : 'Darbuotojo detalė'
        }
        size="xl"
      >
        {!selectedMemberDrilldown || !selectedMemberDrilldownId ? (
          <Text c="dimmed">Nėra drill-down duomenų šiam darbuotojui.</Text>
        ) : (
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Card withBorder radius="md" padding="md">
                <Text size="xs" c="dimmed">
                  Reservation summary
                </Text>
                <Text size="sm">
                  {formatSummaryPairs(selectedMemberDrilldown.reservationSummary)}
                </Text>
              </Card>
              <Card withBorder radius="md" padding="md">
                <Text size="xs" c="dimmed">
                  Attendance summary
                </Text>
                <Text size="sm">
                  {formatSummaryPairs(selectedMemberDrilldown.attendanceSummary)}
                </Text>
              </Card>
            </SimpleGrid>

            <Card withBorder radius="md" padding="lg">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={3} size="h4">
                    Corporate-funded subscriptions
                  </Title>
                  <Badge variant="light">
                    {selectedMemberDrilldown.sponsoredSubscriptions.length}
                  </Badge>
                </Group>
                {selectedMemberDrilldown.sponsoredSubscriptions.length === 0 ? (
                  <Text c="dimmed">Šis darbuotojas dar neturi corporate-funded subscription.</Text>
                ) : (
                  <Table withTableBorder withColumnBorders striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Programa</Table.Th>
                        <Table.Th>Statusas</Table.Th>
                        <Table.Th>Galiojimas</Table.Th>
                        <Table.Th>Usage</Table.Th>
                        <Table.Th>Funding</Table.Th>
                        <Table.Th />
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {selectedMemberDrilldown.sponsoredSubscriptions.map((entry) => (
                        <Table.Tr key={entry.subscription.id}>
                          <Table.Td>
                            <Stack gap={2}>
                              <Text fw={600}>
                                {entry.program?.nameLt || entry.program?.slug || '-'}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {entry.plan?.nameLt || '-'} • {entry.group?.name || '-'}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {entry.group?.locationName || '-'} • {entry.group?.startTime || '-'}
                              </Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              <Badge color={statusColor(entry.subscription.status)} variant="light">
                                {entry.subscription.status}
                              </Badge>
                              <Text size="xs" c="dimmed">
                                {siteLabel(entry.subscription.site)}
                              </Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              <Text size="sm">{entry.subscription.startDate}</Text>
                              <Text size="xs" c="dimmed">
                                Iki {entry.subscription.validUntil}
                              </Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              <Text size="sm">
                                {entry.subscription.remainingSessions}/
                                {entry.subscription.totalSessions} liko
                              </Text>
                              <Text size="xs" c="dimmed">
                                {entry.subscription.latestLifecycleEvent
                                  ? `${entry.subscription.latestLifecycleEvent.action} • ${formatDateTime(entry.subscription.latestLifecycleEvent.createdAt)}`
                                  : 'Be lifecycle įrašų'}
                              </Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              <Text size="sm">
                                {formatMoney(entry.sponsoredPurchase.amountEur)}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {entry.sponsoredPurchase.status} •{' '}
                                {entry.sponsoredPurchase.selectedStartDate}
                              </Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Button
                              size="xs"
                              variant="light"
                              onClick={() => openSubscriptionActionModal(entry)}
                            >
                              Veiksmai
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Stack>
            </Card>

            <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg">
              <Card withBorder radius="md" padding="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={3} size="h4">
                      Recent reservations
                    </Title>
                    <Badge variant="light">
                      {selectedMemberDrilldown.recentReservations.length}
                    </Badge>
                  </Group>
                  {selectedMemberDrilldown.recentReservations.length === 0 ? (
                    <Text c="dimmed">Reservation istorijos dar nėra.</Text>
                  ) : (
                    <Table withTableBorder withColumnBorders striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Data</Table.Th>
                          <Table.Th>Programa</Table.Th>
                          <Table.Th>Tipas</Table.Th>
                          <Table.Th>Statusas</Table.Th>
                          <Table.Th />
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {selectedMemberDrilldown.recentReservations.map((reservation) => (
                          <Table.Tr key={reservation.id}>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text size="sm">{reservation.occurrence?.date || '-'}</Text>
                                <Text size="xs" c="dimmed">
                                  {reservation.group?.startTime || '-'}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">
                                {reservation.program?.nameLt || reservation.program?.slug || '-'}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{reservation.reservationType}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={statusColor(reservation.status)} variant="light">
                                {reservation.status}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              {reservation.status === 'scheduled' ? (
                                <Group gap={6} justify="flex-end">
                                  <ActionIcon
                                    variant="light"
                                    color="blue"
                                    loading={
                                      actionLoading === `reservation-${reservation.id}-attended`
                                    }
                                    onClick={() => {
                                      void handleCorporateReservationAction({
                                        reservationId: reservation.id,
                                        occurrenceId: reservation.occurrence?.id,
                                        action: 'attended',
                                      });
                                    }}
                                  >
                                    <IconUsers size={16} />
                                  </ActionIcon>
                                  <ActionIcon
                                    variant="light"
                                    color="yellow"
                                    loading={
                                      actionLoading === `reservation-${reservation.id}-early_cancel`
                                    }
                                    onClick={() => {
                                      void handleCorporateReservationAction({
                                        reservationId: reservation.id,
                                        occurrenceId: reservation.occurrence?.id,
                                        action: 'early_cancel',
                                      });
                                    }}
                                  >
                                    <IconPlayerPause size={16} />
                                  </ActionIcon>
                                  <ActionIcon
                                    variant="light"
                                    color="orange"
                                    loading={
                                      actionLoading ===
                                      `reservation-${reservation.id}-late_cancel_attendance`
                                    }
                                    onClick={() => {
                                      void handleCorporateReservationAction({
                                        reservationId: reservation.id,
                                        occurrenceId: reservation.occurrence?.id,
                                        action: 'late_cancel_attendance',
                                      });
                                    }}
                                  >
                                    <IconAlertTriangle size={16} />
                                  </ActionIcon>
                                  <ActionIcon
                                    variant="light"
                                    color="red"
                                    loading={
                                      actionLoading === `reservation-${reservation.id}-no_show`
                                    }
                                    onClick={() => {
                                      void handleCorporateReservationAction({
                                        reservationId: reservation.id,
                                        occurrenceId: reservation.occurrence?.id,
                                        action: 'no_show',
                                      });
                                    }}
                                  >
                                    <IconCancel size={16} />
                                  </ActionIcon>
                                </Group>
                              ) : (
                                <Text size="xs" c="dimmed">
                                  -
                                </Text>
                              )}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Stack>
              </Card>

              <Card withBorder radius="md" padding="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Title order={3} size="h4">
                      Recent attendance
                    </Title>
                    <Badge variant="light">{selectedMemberDrilldown.recentAttendance.length}</Badge>
                  </Group>
                  {selectedMemberDrilldown.recentAttendance.length === 0 ? (
                    <Text c="dimmed">Attendance istorijos dar nėra.</Text>
                  ) : (
                    <Table withTableBorder withColumnBorders striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Laikas</Table.Th>
                          <Table.Th>Rezultatas</Table.Th>
                          <Table.Th>Occurrence</Table.Th>
                          <Table.Th>Pastaba</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {selectedMemberDrilldown.recentAttendance.map((entry) => (
                          <Table.Tr key={entry.attendance.id}>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text size="sm">{formatDateTime(entry.attendance.recordedAt)}</Text>
                                <Text size="xs" c="dimmed">
                                  {entry.attendance.recordedByType}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={statusColor(entry.attendance.result)} variant="light">
                                {entry.attendance.result}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text size="sm">
                                  {entry.occurrence?.date ||
                                    entry.reservation?.occurrence?.date ||
                                    '-'}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {entry.reservation?.program?.nameLt ||
                                    entry.reservation?.program?.slug ||
                                    '-'}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{entry.attendance.notes || '-'}</Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Stack>
              </Card>
            </SimpleGrid>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={editCompanyOpened}
        onClose={() => setEditCompanyOpened(false)}
        title="Redaguoti company ir policy"
        size="lg"
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <TextInput
              label="Pavadinimas"
              value={editCompanyForm.name}
              onChange={(event) =>
                setEditCompanyForm((current) => ({ ...current, name: event.currentTarget.value }))
              }
            />
            <Select
              label="Company statusas"
              data={COMPANY_STATUS_OPTIONS}
              value={editCompanyForm.status}
              onChange={(value) =>
                setEditCompanyForm((current) => ({
                  ...current,
                  status: (value as CompanyStatus | null) || 'draft',
                }))
              }
            />
            <TextInput
              label="Billing email"
              value={editCompanyForm.billingEmail}
              onChange={(event) =>
                setEditCompanyForm((current) => ({
                  ...current,
                  billingEmail: event.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="Billing phone"
              value={editCompanyForm.billingPhone}
              onChange={(event) =>
                setEditCompanyForm((current) => ({
                  ...current,
                  billingPhone: event.currentTarget.value,
                }))
              }
            />
          </SimpleGrid>

          <Textarea
            label="Company pastabos"
            minRows={3}
            value={editCompanyForm.notes}
            onChange={(event) =>
              setEditCompanyForm((current) => ({ ...current, notes: event.currentTarget.value }))
            }
          />

          <Divider label="Corporate usage policy" />

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Select
              label="Policy statusas"
              data={POLICY_STATUS_OPTIONS}
              value={editCompanyForm.policyStatus}
              onChange={(value) =>
                setEditCompanyForm((current) => ({
                  ...current,
                  policyStatus: (value as CorporatePolicyStatus | null) || 'draft',
                }))
              }
            />
            <MultiSelect
              label="Allowed product kinds"
              data={PRODUCT_KIND_OPTIONS}
              value={editCompanyForm.allowedProductKinds}
              onChange={(value) =>
                setEditCompanyForm((current) => ({
                  ...current,
                  allowedProductKinds: value as CorporateProductKind[],
                }))
              }
            />
          </SimpleGrid>

          <MultiSelect
            label="Allowed sites"
            data={SITE_OPTIONS}
            value={editCompanyForm.allowedSites}
            onChange={(value) =>
              setEditCompanyForm((current) => ({
                ...current,
                allowedSites: value as SiteKey[],
              }))
            }
          />

          <Textarea
            label="Policy notes"
            minRows={3}
            value={editCompanyForm.policyNotes}
            onChange={(event) =>
              setEditCompanyForm((current) => ({
                ...current,
                policyNotes: event.currentTarget.value,
              }))
            }
          />

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setEditCompanyOpened(false)}>
              Uždaryti
            </Button>
            <Button
              loading={actionLoading === 'update-company'}
              onClick={() => void handleUpdateCompany()}
            >
              Išsaugoti
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={walletAdjustmentOpened}
        onClose={() => setWalletAdjustmentOpened(false)}
        title="Wallet korekcija"
      >
        <Stack gap="md">
          <Select
            label="Kryptis"
            data={LEDGER_DIRECTION_OPTIONS}
            value={walletAdjustmentForm.direction}
            onChange={(value) =>
              setWalletAdjustmentForm((current) => ({
                ...current,
                direction: (value as LedgerDirection | null) || 'credit',
              }))
            }
          />
          <Select
            label="Kategorija"
            data={LEDGER_CATEGORY_OPTIONS}
            value={walletAdjustmentForm.category}
            onChange={(value) =>
              setWalletAdjustmentForm((current) => ({
                ...current,
                category: (value as LedgerCategory | null) || 'funding',
              }))
            }
          />
          <TextInput
            label="Suma EUR"
            value={walletAdjustmentForm.amountEur}
            onChange={(event) =>
              setWalletAdjustmentForm((current) => ({
                ...current,
                amountEur: event.currentTarget.value,
              }))
            }
          />
          <Textarea
            label="Pastaba"
            minRows={3}
            value={walletAdjustmentForm.notes}
            onChange={(event) =>
              setWalletAdjustmentForm((current) => ({
                ...current,
                notes: event.currentTarget.value,
              }))
            }
          />
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <TextInput
              label="Reference type"
              value={walletAdjustmentForm.referenceType}
              onChange={(event) =>
                setWalletAdjustmentForm((current) => ({
                  ...current,
                  referenceType: event.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="Reference id"
              value={walletAdjustmentForm.referenceId}
              onChange={(event) =>
                setWalletAdjustmentForm((current) => ({
                  ...current,
                  referenceId: event.currentTarget.value,
                }))
              }
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setWalletAdjustmentOpened(false)}>
              Uždaryti
            </Button>
            <Button
              loading={actionLoading === 'wallet-adjustment'}
              onClick={() => void handleWalletAdjustment()}
            >
              Išsaugoti
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={memberModalOpened}
        onClose={() => {
          setMemberModalOpened(false);
          setEditingMember(null);
        }}
        title={editingMember ? 'Redaguoti narį' : 'Naujas narys'}
      >
        <Stack gap="md">
          <TextInput
            label="Vardas"
            value={memberForm.fullName}
            onChange={(event) =>
              setMemberForm((current) => ({ ...current, fullName: event.currentTarget.value }))
            }
          />
          <TextInput
            label="El. paštas"
            value={memberForm.email}
            onChange={(event) =>
              setMemberForm((current) => ({ ...current, email: event.currentTarget.value }))
            }
          />
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <TextInput
              label="Telefonas"
              value={memberForm.phone}
              onChange={(event) =>
                setMemberForm((current) => ({ ...current, phone: event.currentTarget.value }))
              }
            />
            <TextInput
              label="Employee code"
              value={memberForm.employeeCode}
              onChange={(event) =>
                setMemberForm((current) => ({
                  ...current,
                  employeeCode: event.currentTarget.value,
                }))
              }
            />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Select
              label="Rolė"
              data={MEMBER_ROLE_OPTIONS}
              value={memberForm.role}
              onChange={(value) =>
                setMemberForm((current) => ({
                  ...current,
                  role: (value as MemberRole | null) || 'member',
                }))
              }
            />
            <Select
              label="Statusas"
              data={MEMBER_STATUS_OPTIONS}
              value={memberForm.status}
              onChange={(value) =>
                setMemberForm((current) => ({
                  ...current,
                  status: (value as MemberStatus | null) || 'invited',
                }))
              }
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => {
                setMemberModalOpened(false);
                setEditingMember(null);
              }}
            >
              Uždaryti
            </Button>
            <Button
              loading={actionLoading === 'create-member' || actionLoading === 'update-member'}
              onClick={() => void handleSaveMember()}
            >
              Išsaugoti
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={corporatePurchaseOpened}
        onClose={() => setCorporatePurchaseOpened(false)}
        title="Corporate-funded recurring"
        size="lg"
      >
        <Stack gap="md">
          {selectedCompany ? (
            <Alert color="blue" icon={<IconCash size={16} />} title="Wallet būsena">
              Available balance: {formatMoney(selectedCompany.wallet?.availableBalanceEur)}
            </Alert>
          ) : null}

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Select
              label="Site"
              data={SITE_OPTIONS.filter((option) => allowedSites.includes(option.value))}
              value={corporatePurchaseForm.site}
              onChange={(value) =>
                setCorporatePurchaseForm((current) => ({
                  ...current,
                  site: (value as SiteKey | null) || current.site,
                  programId: '',
                  planId: '',
                  groupId: '',
                }))
              }
            />
            <Select
              label="Member"
              data={memberOptions}
              value={corporatePurchaseForm.memberId || null}
              onChange={(value) =>
                setCorporatePurchaseForm((current) => ({
                  ...current,
                  memberId: value || '',
                }))
              }
            />
            <Select
              label="Programa"
              data={programOptions}
              value={corporatePurchaseForm.programId || null}
              onChange={(value) =>
                setCorporatePurchaseForm((current) => ({
                  ...current,
                  programId: value || '',
                  planId: '',
                  groupId: '',
                }))
              }
              rightSection={isLoadingPrograms ? <Loader size={14} /> : null}
              searchable
            />
            <Select
              label="Planas"
              data={planOptions}
              value={corporatePurchaseForm.planId || null}
              onChange={(value) =>
                setCorporatePurchaseForm((current) => ({
                  ...current,
                  planId: value || '',
                }))
              }
              rightSection={isLoadingPlans ? <Loader size={14} /> : null}
              searchable
            />
            <Select
              label="Grupė"
              data={groupOptions}
              value={corporatePurchaseForm.groupId || null}
              onChange={(value) =>
                setCorporatePurchaseForm((current) => ({
                  ...current,
                  groupId: value || '',
                }))
              }
              rightSection={isLoadingGroups ? <Loader size={14} /> : null}
              searchable
            />
            <TextInput
              label="Start date"
              type="date"
              value={corporatePurchaseForm.startDate}
              onChange={(event) =>
                setCorporatePurchaseForm((current) => ({
                  ...current,
                  startDate: event.currentTarget.value,
                }))
              }
            />
            <Select
              label="Locale"
              data={LOCALE_OPTIONS}
              value={corporatePurchaseForm.locale}
              onChange={(value) =>
                setCorporatePurchaseForm((current) => ({
                  ...current,
                  locale: (value as 'lt' | 'en' | null) || 'lt',
                }))
              }
            />
          </SimpleGrid>

          <Textarea
            label="Pastabos"
            minRows={3}
            value={corporatePurchaseForm.notes}
            onChange={(event) =>
              setCorporatePurchaseForm((current) => ({
                ...current,
                notes: event.currentTarget.value,
              }))
            }
          />

          {selectedPlan ? (
            <Alert color="grape" icon={<IconRepeat size={16} />} title="Planuojamas nurašymas">
              {selectedPlan.nameLt} • {selectedPlan.sessionCount} k. •{' '}
              {formatMoney(selectedPlan.priceEur)}
            </Alert>
          ) : null}

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setCorporatePurchaseOpened(false)}>
              Uždaryti
            </Button>
            <Button
              leftSection={<IconMailPlus size={16} />}
              loading={actionLoading === 'create-corporate-purchase'}
              onClick={() => void handleCorporateRecurringPurchase()}
            >
              Sukurti corporate recurring
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
