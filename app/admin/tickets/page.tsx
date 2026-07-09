'use client';

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconCheck,
  IconEye,
  IconQrcode,
  IconRefresh,
  IconSearch,
  IconTicket,
} from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { buildApiUrl } from '@/lib/api';
import type { SiteKey } from '@/lib/site';
import styles from './TicketsPage.module.css';

type TicketStatus = 'valid' | 'checked_in' | 'cancelled';
type CheckInMethod = 'scanner' | 'manual';

interface AdminTicket {
  id: string;
  bookingId: string;
  workshopId: string;
  site: SiteKey;
  locale: string;
  holderName: string;
  holderEmail: string;
  participantsCount: number;
  code: string;
  status: TicketStatus;
  checkedInAt: string | null;
  checkedInBy: string | null;
  checkInMethod: CheckInMethod | null;
  createdAt: string;
  bookingStatus: string | null;
  workshop: {
    id: string;
    titleLt: string;
    titleEn: string;
    startISO: string;
    placeName: string | null;
  } | null;
}

const PROJECT_OPTIONS: Array<{ value: SiteKey; label: string }> = [
  { value: 'ceramics', label: 'Ceramics' },
  { value: 'yoga', label: 'Yoga' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Visos būsenos' },
  { value: 'valid', label: 'Galiojantys' },
  { value: 'checked_in', label: 'Panaudoti' },
  { value: 'cancelled', label: 'Atšaukti' },
];

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Nepavyko gauti duomenų');
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

function statusLabel(status: TicketStatus) {
  if (status === 'checked_in') return 'Panaudotas';
  if (status === 'cancelled') return 'Atšauktas';
  return 'Galiojantis';
}

function statusColor(status: TicketStatus) {
  if (status === 'checked_in') return 'blue';
  if (status === 'cancelled') return 'red';
  return 'green';
}

function workshopTitle(ticket: AdminTicket) {
  return ticket.workshop?.titleLt || ticket.workshop?.titleEn || ticket.workshopId;
}

function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge color={statusColor(status)} variant="light">
      {statusLabel(status)}
    </Badge>
  );
}

function TicketsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [site, setSite] = useState<SiteKey>(
    searchParams.get('site') === 'yoga' ? 'yoga' : 'ceramics',
  );
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [workshopId, setWorkshopId] = useState(searchParams.get('workshopId') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [appliedSearch, setAppliedSearch] = useState(searchParams.get('search') || '');
  const [scannerOpened, setScannerOpened] = useState(false);
  const [candidate, setCandidate] = useState<AdminTicket | null>(null);
  const [candidateMethod, setCandidateMethod] = useState<CheckInMethod>('scanner');
  const [manualCode, setManualCode] = useState('');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [scannerRun, setScannerRun] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const processingScanRef = useRef(false);

  const ticketParams = new URLSearchParams({ site });
  if (status) ticketParams.set('status', status);
  if (workshopId) ticketParams.set('workshopId', workshopId);
  if (appliedSearch) ticketParams.set('search', appliedSearch);
  const ticketsApiUrl = `/api/admin/tickets?${ticketParams.toString()}`;
  const workshopsApiUrl = buildApiUrl('/api/workshops', { site });
  const { data, error, isLoading, mutate } = useSWR(ticketsApiUrl, fetcher);
  const { data: workshopsData } = useSWR(workshopsApiUrl, fetcher);
  const tickets: AdminTicket[] = data?.tickets || [];

  const workshopOptions = useMemo(() => {
    const workshops = workshopsData?.workshops || [];
    return [
      { value: '', label: 'Visi užsiėmimai' },
      ...workshops.map((workshop: any) => ({
        value: workshop.id,
        label: `${workshop.titleLt} (${formatDateTime(workshop.startISO)})`,
      })),
    ];
  }, [workshopsData]);

  const syncUrl = useCallback(
    (next: { site?: SiteKey; status?: string; workshopId?: string; search?: string }) => {
      const params = new URLSearchParams();
      const nextSite = next.site ?? site;
      const nextStatus = next.status ?? status;
      const nextWorkshop = next.workshopId ?? workshopId;
      const nextSearch = next.search ?? appliedSearch;
      params.set('site', nextSite);
      if (nextStatus) params.set('status', nextStatus);
      if (nextWorkshop) params.set('workshopId', nextWorkshop);
      if (nextSearch) params.set('search', nextSearch);
      router.replace(`/admin/tickets?${params.toString()}`);
    },
    [appliedSearch, router, site, status, workshopId],
  );

  const stopScanner = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) {
      for (const track of stream.getTracks()) track.stop();
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const lookupTicket = useCallback(
    async (value: string, method: CheckInMethod) => {
      const normalized = value.trim();
      if (!normalized) {
        setScannerError('Įveskite arba nuskenuokite bilieto kodą.');
        return;
      }

      processingScanRef.current = true;
      setIsLookingUp(true);
      setScannerError(null);
      try {
        const response = await fetch('/api/admin/tickets/lookup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({ value: normalized }),
        });
        const result = await response.json();
        if (!response.ok || !result.ticket) {
          throw new Error(result.error || 'Bilietas nerastas');
        }
        stopScanner();
        setCandidate(result.ticket);
        setCandidateMethod(method);
      } catch (nextError: any) {
        stopScanner();
        setScannerError(nextError?.message || 'Nepavyko patikrinti bilieto');
      } finally {
        setIsLookingUp(false);
        processingScanRef.current = false;
      }
    },
    [stopScanner],
  );

  useEffect(() => {
    if (!scannerOpened || candidate || isLookingUp) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError('Kamera nepasiekiama. Naudokite HTTPS arba įveskite bilieto kodą ranka.');
      return;
    }

    let cancelled = false;
    setScannerError(null);
    import('@zxing/browser')
      .then(async ({ BrowserQRCodeReader }) => {
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 });
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          videoRef.current,
          (result) => {
            if (!result || processingScanRef.current) return;
            controls.stop();
            void lookupTicket(result.getText(), 'scanner');
          },
        );
        if (cancelled) controls.stop();
        else scannerControlsRef.current = controls;
      })
      .catch((nextError: any) => {
        if (!cancelled) {
          setScannerError(
            nextError?.name === 'NotAllowedError'
              ? 'Nesuteiktas leidimas naudoti kamerą. Leiskite prieigą arba įveskite kodą ranka.'
              : 'Nepavyko paleisti kameros. Įveskite bilieto kodą ranka.',
          );
        }
      });

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [candidate, isLookingUp, lookupTicket, scannerOpened, scannerRun, stopScanner]);

  const resetScanner = () => {
    stopScanner();
    setCandidate(null);
    setManualCode('');
    setScannerError(null);
    processingScanRef.current = false;
    setScannerRun((value) => value + 1);
  };

  const openScanner = () => {
    resetScanner();
    setScannerOpened(true);
  };

  const closeScanner = () => {
    stopScanner();
    setScannerOpened(false);
    setCandidate(null);
    setScannerError(null);
  };

  const openTicket = (ticket: AdminTicket) => {
    stopScanner();
    setScannerError(null);
    setCandidate(ticket);
    setCandidateMethod('manual');
    setScannerOpened(true);
  };

  const confirmCheckIn = async () => {
    if (!candidate) return;
    setIsCheckingIn(true);
    try {
      const response = await fetch('/api/admin/tickets/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ ticketId: candidate.id, method: candidateMethod }),
      });
      const result = await response.json();
      if (result.ticket) setCandidate(result.ticket);
      if (!response.ok) throw new Error(result.error || 'Dalyvavimo patvirtinti nepavyko');

      notifications.show({
        title: 'Dalyvavimas patvirtintas',
        message: `${result.ticket.holderName} · ${result.ticket.participantsCount} asm.`,
        color: 'green',
      });
      await mutate();
    } catch (nextError: any) {
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const applySearch = () => {
    const nextSearch = search.trim();
    setAppliedSearch(nextSearch);
    syncUrl({ search: nextSearch });
  };

  const clearFilters = () => {
    setStatus('');
    setWorkshopId('');
    setSearch('');
    setAppliedSearch('');
    syncUrl({ status: '', workshopId: '', search: '' });
  };

  return (
    <Container size="xl" py="md" className={styles.page}>
      <Stack gap="lg">
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Title order={2}>Bilietai</Title>
            <Text size="sm" c="dimmed">
              Dalyvių bilietai ir atvykimo patvirtinimas
            </Text>
          </div>
          <Button leftSection={<IconQrcode size={20} />} onClick={openScanner} size="md">
            Skenuoti bilietą
          </Button>
        </Group>

        <Paper withBorder p="md" radius="sm">
          <div className={styles.filters}>
            <Select
              label="Projektas"
              data={PROJECT_OPTIONS}
              value={site}
              onChange={(value) => {
                const nextSite = value === 'yoga' ? 'yoga' : 'ceramics';
                setSite(nextSite);
                setWorkshopId('');
                syncUrl({ site: nextSite, workshopId: '' });
              }}
              allowDeselect={false}
            />
            <Select
              label="Būsena"
              data={STATUS_OPTIONS}
              value={status}
              onChange={(value) => {
                const nextStatus = value || '';
                setStatus(nextStatus);
                syncUrl({ status: nextStatus });
              }}
              allowDeselect={false}
            />
            <Select
              label="Užsiėmimas"
              data={workshopOptions}
              value={workshopId}
              onChange={(value) => {
                const nextWorkshop = value || '';
                setWorkshopId(nextWorkshop);
                syncUrl({ workshopId: nextWorkshop });
              }}
              searchable
              allowDeselect={false}
            />
            <TextInput
              label="Paieška"
              placeholder="Kodas, vardas arba el. paštas"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applySearch();
              }}
              rightSection={
                <ActionIcon variant="subtle" aria-label="Ieškoti" onClick={applySearch}>
                  <IconSearch size={17} />
                </ActionIcon>
              }
            />
          </div>
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" color="gray" size="xs" onClick={clearFilters}>
              Išvalyti filtrus
            </Button>
          </Group>
        </Paper>

        <Group justify="space-between">
          <Title order={4}>Bilietų sąrašas</Title>
          <Text size="sm" c="dimmed">
            {isLoading ? 'Kraunama...' : `${tickets.length} bilietai`}
          </Text>
        </Group>

        {error ? (
          <Alert color="red" icon={<IconAlertCircle size={18} />}>
            {error.message}
          </Alert>
        ) : isLoading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : tickets.length === 0 ? (
          <Text c="dimmed">Bilietų pagal pasirinktus filtrus nėra.</Text>
        ) : (
          <>
            <Paper withBorder className={styles.desktopTable}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Bilietas</Table.Th>
                    <Table.Th>Dalyvis</Table.Th>
                    <Table.Th>Užsiėmimas</Table.Th>
                    <Table.Th>Grupė</Table.Th>
                    <Table.Th>Būsena</Table.Th>
                    <Table.Th>Atvykimas</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {tickets.map((ticket) => (
                    <Table.Tr key={ticket.id}>
                      <Table.Td>
                        <Text fw={600} size="sm">
                          {ticket.code}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {ticket.site}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {ticket.holderName}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {ticket.holderEmail}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{workshopTitle(ticket)}</Text>
                        <Text size="xs" c="dimmed">
                          {formatDateTime(ticket.workshop?.startISO)}
                        </Text>
                      </Table.Td>
                      <Table.Td>{ticket.participantsCount}</Table.Td>
                      <Table.Td>
                        <TicketStatusBadge status={ticket.status} />
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatDateTime(ticket.checkedInAt)}</Text>
                        {ticket.checkedInBy ? (
                          <Text size="xs" c="dimmed">
                            {ticket.checkedInBy}
                          </Text>
                        ) : null}
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label="Bilieto patikra">
                          <ActionIcon
                            variant="subtle"
                            aria-label={`Tikrinti bilietą ${ticket.code}`}
                            onClick={() => openTicket(ticket)}
                          >
                            <IconEye size={17} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>

            <Stack gap="sm" className={styles.mobileList}>
              {tickets.map((ticket) => (
                <Card key={ticket.id} withBorder radius="sm" padding="md">
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <div>
                        <Text fw={700}>{ticket.code}</Text>
                        <Text size="sm" fw={500}>
                          {ticket.holderName}
                        </Text>
                      </div>
                      <TicketStatusBadge status={ticket.status} />
                    </Group>
                    <div>
                      <Text size="sm">{workshopTitle(ticket)}</Text>
                      <Text size="xs" c="dimmed">
                        {formatDateTime(ticket.workshop?.startISO)}
                      </Text>
                    </div>
                    <Group justify="space-between">
                      <Text size="sm">Grupė: {ticket.participantsCount}</Text>
                      <Button
                        variant="light"
                        color="gray"
                        size="xs"
                        leftSection={<IconEye size={15} />}
                        onClick={() => openTicket(ticket)}
                      >
                        Tikrinti
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </>
        )}
      </Stack>

      <Modal
        opened={scannerOpened}
        onClose={closeScanner}
        title="Bilieto patikra"
        size="lg"
        fullScreen={isMobile}
        centered
        classNames={{
          content: styles.scannerContent,
          header: styles.scannerHeader,
          body: styles.scannerBody,
        }}
      >
        {candidate ? (
          <Stack gap="lg">
            <Alert
              color={statusColor(candidate.status)}
              icon={
                candidate.status === 'valid' ? <IconTicket size={20} /> : <IconCheck size={20} />
              }
              title={statusLabel(candidate.status)}
            >
              {candidate.status === 'checked_in'
                ? `Bilietas panaudotas ${formatDateTime(candidate.checkedInAt)}.`
                : candidate.status === 'cancelled'
                  ? 'Šis bilietas atšauktas ir negali būti panaudotas.'
                  : 'Bilietas galioja. Patikrinkite duomenis prieš patvirtindami.'}
            </Alert>

            <div className={styles.candidateSummary}>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Dalyvis
                </Text>
                <Text fw={700} size="lg">
                  {candidate.holderName}
                </Text>
                <Text size="sm" c="dimmed">
                  {candidate.holderEmail}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Užsiėmimas
                </Text>
                <Text fw={600}>{workshopTitle(candidate)}</Text>
                <Text size="sm" c="dimmed">
                  {formatDateTime(candidate.workshop?.startISO)}
                </Text>
              </div>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Bilieto kodas
                  </Text>
                  <Text fw={600}>{candidate.code}</Text>
                </div>
                <div className={styles.participantCount}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Grupė
                  </Text>
                  <Text fw={700} size="xl">
                    {candidate.participantsCount}
                  </Text>
                </div>
              </Group>
            </div>

            {candidate.bookingStatus !== 'confirmed' ? (
              <Alert color="red" icon={<IconAlertCircle size={18} />}>
                Registracija nėra patvirtinta. Dalyvavimo žymėti negalima.
              </Alert>
            ) : null}

            {candidate.status === 'valid' && candidate.bookingStatus === 'confirmed' ? (
              <Button
                size="md"
                leftSection={<IconCheck size={20} />}
                onClick={confirmCheckIn}
                loading={isCheckingIn}
              >
                Patvirtinti visos grupės dalyvavimą ({candidate.participantsCount})
              </Button>
            ) : null}

            <Group grow>
              <Button
                variant="light"
                color="gray"
                leftSection={<IconRefresh size={17} />}
                onClick={resetScanner}
              >
                Skenuoti kitą
              </Button>
              <Button variant="subtle" color="gray" onClick={closeScanner}>
                Uždaryti
              </Button>
            </Group>
          </Stack>
        ) : (
          <Stack gap="md">
            <div className={styles.cameraFrame}>
              <video ref={videoRef} className={styles.cameraVideo} muted playsInline />
              <div className={styles.scanGuide} aria-hidden="true" />
              {isLookingUp ? (
                <div className={styles.cameraLoading}>
                  <Loader color="white" />
                </div>
              ) : null}
            </div>
            <Text size="sm" c="dimmed" ta="center">
              Nukreipkite galinę telefono kamerą į bilieto QR kodą.
            </Text>
            {scannerError ? (
              <Stack gap="xs">
                <Alert color="red" icon={<IconAlertCircle size={18} />}>
                  {scannerError}
                </Alert>
                <Button
                  variant="light"
                  color="gray"
                  leftSection={<IconRefresh size={17} />}
                  onClick={resetScanner}
                >
                  Paleisti kamerą iš naujo
                </Button>
              </Stack>
            ) : null}
            <Divider label="arba įveskite kodą" labelPosition="center" />
            <Group align="flex-end" wrap="nowrap" className={styles.manualEntry}>
              <TextInput
                label="Bilieto kodas arba QR nuoroda"
                placeholder="SPC-A48217DE"
                value={manualCode}
                onChange={(event) => setManualCode(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void lookupTicket(manualCode, 'manual');
                }}
                className={styles.manualInput}
              />
              <Button
                variant="light"
                leftSection={<IconSearch size={17} />}
                onClick={() => lookupTicket(manualCode, 'manual')}
                loading={isLookingUp}
              >
                Tikrinti
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<Text c="dimmed">Kraunama...</Text>}>
      <TicketsPageContent />
    </Suspense>
  );
}
