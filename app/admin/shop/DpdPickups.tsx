'use client';

import {
  Accordion,
  Alert,
  Anchor,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  Loader,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconCheck, IconRefresh, IconTruckDelivery } from '@tabler/icons-react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';
import type {
  DpdPickup,
  DpdPickupCandidate,
  DpdPickupInput,
  DpdPickupSender,
  DpdPickupsData,
} from '@/lib/shop/dpd-pickup-contract';

const emptySender: DpdPickupSender = {
  contact: '',
  name: '',
  address: '',
  city: '',
  postalCode: '',
  phone: '',
  additionalInfo: '',
};
const states: Record<DpdPickup['state'], { label: string; color: string }> = {
  creating: { label: 'Laukiama atsakymo', color: 'blue' },
  confirmed: { label: 'DPD priėmė iškvietimą', color: 'teal' },
  uncertain: { label: 'Reikia patikrinti DPD', color: 'orange' },
  rejected: { label: 'Iškvietimas nepriimtas', color: 'red' },
  external: { label: 'Iškviesta kitoje sistemoje', color: 'gray' },
};
const kg = (weight: number) => `${weight.toLocaleString('lt-LT', { maximumFractionDigits: 3 })} kg`;
const todayInVilnius = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Vilnius' }).format(new Date());
const createdTime = (value: string) =>
  new Date(value).toLocaleString('lt-LT', { timeZone: 'Europe/Vilnius' });
const pickupWindow = (from: string, until: string) =>
  `${from.slice(0, 10)} · ${from.slice(11, 16)}–${until.slice(11, 16)}`;
const normalizedAddress = (sender: DpdPickupSender) =>
  `${sender.address}|${sender.city}|${sender.postalCode}`
    .toLocaleLowerCase('lt-LT')
    .replace(/[^\p{L}\p{N}|]/gu, '');

function SelectionSummary({ candidates }: { candidates: DpdPickupCandidate[] }) {
  return (
    <Text fw={600} size="sm" aria-live="polite">
      Pasirinkta pakuočių: {candidates.reduce((sum, item) => sum + item.parcelCount, 0)} · Bendras
      svoris: {kg(candidates.reduce((sum, item) => sum + item.weightKg, 0))}
    </Text>
  );
}

export function DpdPickups({ configurationRevision }: { configurationRevision: number }) {
  const [data, setData] = useState<DpdPickupsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [sender, setSender] = useState<DpdPickupSender>(emptySender);
  const [date, setDate] = useState('');
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  const [comment, setComment] = useState('');
  const [external, setExternal] = useState(false);
  const [externalReference, setExternalReference] = useState('');
  const [review, setReview] = useState<DpdPickupInput | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [resolve, setResolve] = useState<DpdPickup | null>(null);
  const [resolveConfirmed, setResolveConfirmed] = useState(false);
  const [resolveReference, setResolveReference] = useState('');
  const request = useRef<DpdPickupInput | null>(null);
  const requestRejected = useRef(false);
  const inFlight = useRef(false);
  const senderInitialized = useRef(false);
  const generation = useRef(0);
  const form = useRef<HTMLFormElement>(null);

  const acceptPickup = useCallback((pickup: DpdPickup) => {
    request.current = null;
    requestRejected.current = false;
    setPending(false);
    setReview(null);
    setConfirmed(false);
    if (pickup.state === 'confirmed' || pickup.state === 'external') {
      setSelected([]);
      setNotice(
        pickup.state === 'confirmed'
          ? 'DPD priėmė kurjerio iškvietimą. Jo duomenys išsaugoti istorijoje.'
          : 'Išsaugota, kad šioms siuntoms kurjeris jau iškviestas kitoje sistemoje. Naujas iškvietimas DPD nesiųstas.',
      );
      setError('');
    } else if (pickup.state === 'uncertain' || pickup.state === 'creating') {
      setSelected([]);
      setError(
        'Iškvietimo rezultatas dar nepatvirtintas. Patikrink įrašą istorijoje ir DPD paskyroje. Šios siuntos pakartotiniam iškvietimui nebesiūlomos.',
      );
    } else {
      setError(
        pickup.errorMessage || 'DPD iškvietimo nepriėmė. Patikrink duomenis prieš naują bandymą.',
      );
    }
  }, []);

  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setLoadError('');
    try {
      const next: DpdPickupsData = await shopRequest('shipping/dpd/pickups');
      if (current !== generation.current) return null;
      setData(next);
      if (!senderInitialized.current) {
        senderInitialized.current = true;
        setSender(next.sender || emptySender);
      }
      setSelected((ids) => ids.filter((id) => next.candidates.some((item) => item.orderId === id)));
      if (request.current) {
        const existing = next.pickups.find((item) => item.requestId === request.current?.requestId);
        if (existing) acceptPickup(existing);
        else if (requestRejected.current) {
          request.current = null;
          requestRejected.current = false;
          setPending(false);
        }
      }
      return next;
    } catch (cause) {
      if (current === generation.current)
        setLoadError(cause instanceof Error ? cause.message : 'Nepavyko įkelti iškvietimų.');
      return null;
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [acceptPickup]);

  useEffect(() => {
    // A saved connection revision refreshes the candidates for that DPD account.
    void configurationRevision;
    void load();
    return () => {
      generation.current += 1;
    };
  }, [configurationRevision, load]);

  const candidates = data?.candidates.filter((item) => selected.includes(item.orderId)) || [];
  const frozen = busy || pending;
  const unavailable = loading || !!loadError || !data?.settings.credentialsConfigured;
  const matchingPickups = (pickupDate: string, pickupSender: DpdPickupSender) =>
    data?.pickups.filter(
      (pickup) =>
        pickup.state !== 'rejected' &&
        pickup.environment === data.settings.environment &&
        pickup.pickupTime.slice(0, 10) === pickupDate &&
        normalizedAddress(pickup.sender) === normalizedAddress(pickupSender),
    ) || [];
  const sameDayPickups = matchingPickups(date, sender);

  function updateSender(field: keyof DpdPickupSender, value: string) {
    setSender((current) => ({ ...current, [field]: value }));
    setNotice('');
  }

  async function saveSender() {
    if (!data || inFlight.current) return;
    const invalid = [
      ...(form.current?.querySelectorAll<HTMLInputElement>('[data-pickup-sender] input') || []),
    ].find((input) => !input.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result: { sender: DpdPickupSender; senderRevision: number } = await shopRequest(
        'shipping/dpd/pickup-sender',
        'PUT',
        { revision: data.senderRevision, sender },
      );
      setData((current) => current && { ...current, ...result });
      setSender(result.sender);
      setNotice('Paėmimo vieta išsaugota kitiems iškvietimams.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nepavyko išsaugoti paėmimo vietos.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function prepare(event: FormEvent) {
    event.preventDefault();
    if (!data || unavailable || frozen) return;
    setError('');
    setNotice('');
    if (!selected.length) {
      setError('Pasirink bent vieną paruoštą siuntą.');
      return;
    }
    const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
    if (minutes(until) - minutes(from) < 150) {
      setError('Paėmimo laiko intervalas turi būti bent 2 val. 30 min.');
      return;
    }
    setConfirmed(false);
    setReview({
      requestId: crypto.randomUUID(),
      settingsRevision: data.settings.revision,
      environment: data.settings.environment,
      orderIds: [...selected],
      sender: { ...sender },
      pickupTime: `${date}T${from}`,
      senderWorkUntil: `${date}T${until}`,
      comment,
      source: external ? 'external' : 'api',
      externalReference: external ? externalReference : '',
      confirmProduction: true,
    });
  }

  async function submit(input: DpdPickupInput) {
    if (inFlight.current) return;
    inFlight.current = true;
    request.current = input;
    requestRejected.current = false;
    setPending(true);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/shop/shipping/dpd/pickups', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      requestRejected.current =
        response.status >= 400 && response.status < 500 && typeof result.error === 'string';
      if (!response.ok) throw new Error(result.error || 'Iškvietimo nepavyko patvirtinti.');
      if (result.pickup?.requestId !== input.requestId)
        throw new Error('Negavome iškvietimo patvirtinimo.');
      acceptPickup(result.pickup);
      await load();
    } catch (cause) {
      setReview(null);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Ryšys nutrūko. Pirmiausia patikrink iškvietimo būseną.',
      );
      await load();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function resolvePickup(outcome: 'confirmed' | 'not_created') {
    if (!resolve || !resolveConfirmed || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await shopRequest(`shipping/dpd/pickups/${resolve.id}/resolve`, 'POST', {
        outcome,
        reference: resolveReference,
        confirmed: true,
      });
      setResolve(null);
      setNotice(
        outcome === 'confirmed'
          ? 'Išsaugotas tavo patvirtinimas, kad DPD priėmė iškvietimą.'
          : 'Išsaugota, kad iškvietimas nesukurtas. Siuntas vėl galima pasirinkti naujam iškvietimui.',
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nepavyko išsaugoti patikros rezultato.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Stack gap="lg">
      <Paper withBorder radius="md" p={{ base: 'md', sm: 'lg' }}>
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Title order={3}>Kurjerio iškvietimas</Title>
              <Text size="sm" c="dimmed" mt={5}>
                Vienas kurjerio atvykimas pasirinktoms paruoštoms siuntoms.
              </Text>
            </div>
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconRefresh size={15} />}
              onClick={() => void load()}
              disabled={busy}
              loading={loading}
            >
              Atnaujinti
            </Button>
          </Group>

          {loading && !data && <Loader size="sm" aria-label="Gaunami kurjerio iškvietimai" />}
          {loadError && (
            <Alert color="red" title="Nepavyko atnaujinti duomenų" role="alert">
              {loadError}
            </Alert>
          )}
          {error && (
            <Alert color="orange" title="Patikrink iškvietimą" role="alert">
              {error}
            </Alert>
          )}
          {notice && (
            <Alert color="teal" icon={<IconCheck size={18} />} role="status">
              {notice}
            </Alert>
          )}
          {pending && (
            <Alert color="orange" title="Laukiama šio bandymo patvirtinimo">
              <Text size="sm">
                Duomenys užrakinti, kol patikrinsime pateiktą užklausą. Pakartotinis bandymas naudos
                tą patį iškvietimo numerį.
              </Text>
              <Group mt="sm">
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => void load()}
                  disabled={busy}
                  loading={loading}
                >
                  Patikrinti įrašą
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  disabled={busy || loading}
                  onClick={() => request.current && void submit(request.current)}
                >
                  Pakartoti tą pačią užklausą
                </Button>
              </Group>
            </Alert>
          )}

          {data && !data.settings.credentialsConfigured && (
            <Alert color="blue">Pirmiausia žemiau išsaugok DPD prisijungimą.</Alert>
          )}
          {data?.settings.environment === 'sandbox' && (
            <Alert color="blue">
              Naudojama DPD testinė paskyra. Tikras kurjeris nebus kviečiamas.
            </Alert>
          )}

          {data && (
            <form ref={form} onSubmit={prepare}>
              <Stack gap="lg">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text fw={600}>1. Paruoštos siuntos</Text>
                    {!!data.candidates.length && (
                      <Button
                        size="xs"
                        variant="subtle"
                        disabled={frozen || unavailable}
                        onClick={() =>
                          setSelected(
                            selected.length === data.candidates.length
                              ? []
                              : data.candidates.map((item) => item.orderId),
                          )
                        }
                      >
                        {selected.length === data.candidates.length
                          ? 'Atžymėti visas'
                          : 'Pasirinkti visas'}
                      </Button>
                    )}
                  </Group>
                  <Text size="sm" c="dimmed">
                    Rodomos apmokėtos, dar neišsiųstos siuntos su paruoštomis etiketėmis,
                    nepriskirtos kitam iškvietimui.
                  </Text>
                  {!data.candidates.length ? (
                    <Text size="sm">
                      Šiuo metu paruoštų siuntų nėra. Siuntą ir etiketę gali sukurti užsakymo lange.
                    </Text>
                  ) : (
                    <Stack gap="xs" mah={320} style={{ overflowY: 'auto' }}>
                      {data.candidates.map((item) => (
                        <Paper withBorder radius="sm" p="sm" key={item.orderId}>
                          <Checkbox
                            color="teal"
                            checked={selected.includes(item.orderId)}
                            disabled={frozen || unavailable}
                            onChange={(event) => {
                              const checked = event.currentTarget.checked;
                              setSelected((current) =>
                                checked
                                  ? [...current, item.orderId]
                                  : current.filter((id) => id !== item.orderId),
                              );
                            }}
                            label={
                              <Text size="sm" fw={600} style={{ overflowWrap: 'anywhere' }}>
                                {item.orderNumber}
                              </Text>
                            }
                            description={`${item.parcelCount} pak. · ${kg(item.weightKg)} · ${item.parcelNumbers.join(', ')}`}
                            styles={{
                              body: { width: '100%' },
                              labelWrapper: { minWidth: 0 },
                              description: { overflowWrap: 'anywhere' },
                            }}
                          />
                        </Paper>
                      ))}
                    </Stack>
                  )}
                  <SelectionSummary candidates={candidates} />
                </Stack>
                <Divider />
                <fieldset
                  data-pickup-sender
                  disabled={frozen}
                  style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
                >
                  <Stack gap="md">
                    <Text component="legend" fw={600}>
                      2. Iš kur paimti siuntas
                    </Text>
                    <Text size="sm" c="dimmed">
                      Nurodyk vietą, kur fiziškai paruoštos pakuotės. Paėmimo šalies kodas – LT.
                    </Text>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      <TextInput
                        label="Kontaktinis asmuo"
                        required
                        maxLength={35}
                        value={sender.contact}
                        onChange={(e) => updateSender('contact', e.currentTarget.value)}
                      />
                      <TextInput
                        label="Telefono numeris"
                        description="Tarptautiniu formatu, be tarpų."
                        placeholder="+370…"
                        type="tel"
                        pattern="\+[1-9][0-9]{7,14}"
                        required
                        maxLength={20}
                        value={sender.phone}
                        onChange={(e) => updateSender('phone', e.currentTarget.value)}
                      />
                      <TextInput
                        label="Įmonė / siuntėjo pavadinimas"
                        maxLength={35}
                        value={sender.name}
                        onChange={(e) => updateSender('name', e.currentTarget.value)}
                      />
                      <TextInput
                        label="Gatvė ir namo numeris"
                        required
                        maxLength={35}
                        value={sender.address}
                        onChange={(e) => updateSender('address', e.currentTarget.value)}
                      />
                      <TextInput
                        label="Miestas"
                        required
                        maxLength={25}
                        value={sender.city}
                        onChange={(e) => updateSender('city', e.currentTarget.value)}
                      />
                      <TextInput
                        label="Pašto kodas"
                        placeholder="5 skaitmenys"
                        inputMode="numeric"
                        pattern="[0-9]{5}"
                        required
                        maxLength={5}
                        value={sender.postalCode}
                        onChange={(e) => updateSender('postalCode', e.currentTarget.value)}
                      />
                    </SimpleGrid>
                    <TextInput
                      label="Papildoma adreso informacija"
                      description="Durų kodas, aukštas ar įėjimas (iki 30 simbolių)."
                      maxLength={30}
                      value={sender.additionalInfo}
                      onChange={(e) => updateSender('additionalInfo', e.currentTarget.value)}
                    />
                    <Group>
                      <Button
                        variant="light"
                        color="teal"
                        size="xs"
                        onClick={() => void saveSender()}
                        disabled={frozen || unavailable}
                      >
                        Išsaugoti paėmimo vietą
                      </Button>
                    </Group>
                  </Stack>
                </fieldset>
                <Divider />
                <Stack gap="md">
                  <Text fw={600}>3. Paėmimo laikas</Text>
                  <Checkbox
                    checked={external}
                    disabled={frozen}
                    color="teal"
                    onChange={(e) => setExternal(e.currentTarget.checked)}
                    label="Kurjerį šioms siuntoms jau iškviečiau kitoje sistemoje"
                    description="Tik išsaugosime įrašą. Naujo iškvietimo DPD nesiųsime."
                  />
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <TextInput
                      type="date"
                      label="Paėmimo data"
                      required
                      min={external ? undefined : todayInVilnius()}
                      value={date}
                      disabled={frozen}
                      onChange={(e) => setDate(e.currentTarget.value)}
                    />
                    <TextInput
                      type="time"
                      label="Siuntos paruoštos nuo"
                      required
                      value={from}
                      disabled={frozen}
                      onChange={(e) => setFrom(e.currentTarget.value)}
                    />
                    <TextInput
                      type="time"
                      label="Kurjerio laukiame iki"
                      required
                      value={until}
                      disabled={frozen}
                      onChange={(e) => setUntil(e.currentTarget.value)}
                    />
                  </SimpleGrid>
                  <Text size="xs" c="dimmed">
                    Lietuvos laiku. Skirk bent 2 val. 30 min. intervalą ir iškviesk bent tiek laiko
                    iki darbo pabaigos. Tos pačios dienos iškvietimai: I zona (įskaitant Vilnių) iki
                    15:00, II zona iki 12:00, III zona iki 10:00. Vėliau – kitą darbo dieną.{' '}
                    <Anchor
                      href="https://www.dpd.com/lt/lt/faq/kada-kurjeris-paims-siuntas/"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="xs"
                    >
                      DPD paėmimo laikai ir zonos
                    </Anchor>
                  </Text>
                  {!external && sameDayPickups.length > 0 && (
                    <Alert color="orange" title="Šiai dienai ir adresui jau yra iškvietimas">
                      Patikrink istoriją prieš kviesdamas dar kartą. DPD prašo kurjerį kviesti vieną
                      kartą per dieną. Jei tai tas pats atvykimas, naujo iškvietimo nesiųsk.{' '}
                      <Anchor
                        href="https://www.dpd.com/lt/lt/faq/kaip-pateikti-kurjerio-iskvietimo-uzsakyma/"
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                      >
                        DPD iškvietimo taisyklės
                      </Anchor>
                    </Alert>
                  )}
                  {external ? (
                    <TextInput
                      label="Iškvietimo numeris / sistema"
                      description="Jei numerio negavai, gali nurodyti sistemą, pvz., WordPress."
                      maxLength={100}
                      value={externalReference}
                      disabled={frozen}
                      onChange={(e) => setExternalReference(e.currentTarget.value)}
                    />
                  ) : (
                    <TextInput
                      label="Pastaba kurjeriui"
                      description="Iki 30 simbolių."
                      maxLength={30}
                      value={comment}
                      disabled={frozen}
                      onChange={(e) => setComment(e.currentTarget.value)}
                    />
                  )}
                </Stack>
                <Group justify="space-between">
                  <SelectionSummary candidates={candidates} />
                  <Button
                    type="submit"
                    color="teal"
                    leftSection={<IconTruckDelivery size={18} />}
                    disabled={frozen || unavailable || !selected.length}
                  >
                    {external ? 'Peržiūrėti įrašą' : 'Peržiūrėti iškvietimą'}
                  </Button>
                </Group>
              </Stack>
            </form>
          )}
        </Stack>
      </Paper>

      <Stack gap="sm">
        <Title order={3}>Iškvietimų istorija</Title>
        <Text size="sm" c="dimmed">
          Čia saugomi mūsų sistemos iškvietimai ir tavo įrašyti iškvietimai iš kitų sistemų. DPD
          priėmimas dar nereiškia, kad siuntos paimtos. Perdavus jas kurjeriui, užsakymus pažymėk
          išsiųstais.
        </Text>
        {data && !data.pickups.length && (
          <Text c="dimmed" size="sm">
            Iškvietimų dar nėra.
          </Text>
        )}
        <Accordion variant="separated" radius="md">
          {data?.pickups.map((pickup) => (
            <Accordion.Item key={pickup.id} value={pickup.id}>
              <Accordion.Control>
                <Stack gap={6}>
                  <Group gap="xs" wrap="wrap">
                    <Badge size="sm" color={states[pickup.state].color} variant="light">
                      {states[pickup.state].label}
                    </Badge>
                    {pickup.closedAt && (
                      <Badge size="sm" color="gray" variant="outline">
                        Paėmimas užbaigtas
                      </Badge>
                    )}
                    {pickup.environment === 'sandbox' && (
                      <Badge size="sm" color="blue">
                        Testas
                      </Badge>
                    )}
                  </Group>
                  <Text size="sm" fw={600}>
                    {pickupWindow(pickup.pickupTime, pickup.senderWorkUntil)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {pickup.parcelCount} pak. · {kg(pickup.weightKg)} · {pickup.sender.city}
                  </Text>
                </Stack>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs" style={{ overflowWrap: 'anywhere' }}>
                  <Text size="sm">
                    {pickup.sender.address}, {pickup.sender.city}, {pickup.sender.postalCode}
                  </Text>
                  <Text size="sm">
                    {pickup.sender.contact} · {pickup.sender.phone}
                  </Text>
                  {pickup.sender.additionalInfo && (
                    <Text size="sm">{pickup.sender.additionalInfo}</Text>
                  )}
                  <Text size="sm">Užsakymai: {pickup.orderNumbers.join(', ')}</Text>
                  {pickup.comment && <Text size="sm">Pastaba: {pickup.comment}</Text>}
                  <Text size="xs" c="dimmed">
                    Įrašas: {pickup.id}
                  </Text>
                  {pickup.reference && <Text size="sm">Nuoroda / numeris: {pickup.reference}</Text>}
                  <Text size="xs" c="dimmed">
                    Sukurta: {createdTime(pickup.createdAt)}
                  </Text>
                  {pickup.closedAt && (
                    <Text size="xs" c="dimmed">
                      Paėmimas užbaigtas: {createdTime(pickup.closedAt)}
                      {pickup.closedBy ? ` · ${pickup.closedBy}` : ''}. Nepaimtos siuntos
                      atlaisvintos kitam iškvietimui.
                    </Text>
                  )}
                  {pickup.errorMessage && (
                    <Alert color={states[pickup.state].color}>{pickup.errorMessage}</Alert>
                  )}
                  {(pickup.state === 'creating' || pickup.state === 'uncertain') && (
                    <Text size="sm">
                      Naujo iškvietimo šioms siuntoms nesiųsk, kol nepatikrintas ankstesnis bandymas
                      DPD paskyroje.
                    </Text>
                  )}
                  {pickup.canResolve && (
                    <Group>
                      <Button
                        size="xs"
                        variant="light"
                        color="orange"
                        disabled={busy}
                        onClick={() => {
                          setError('');
                          setResolve(pickup);
                          setResolveConfirmed(false);
                          setResolveReference('');
                        }}
                      >
                        Įrašyti patikrintą rezultatą
                      </Button>
                    </Group>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>

      <Modal
        opened={!!review}
        onClose={() => !busy && setReview(null)}
        title={
          review?.source === 'external'
            ? 'Kitur pateikto iškvietimo įrašas'
            : 'Patvirtink kurjerio iškvietimą'
        }
        size="lg"
        centered
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
        withCloseButton={!busy}
      >
        {review && (
          <Stack gap="md">
            <Text fw={600}>
              {pickupWindow(review.pickupTime, review.senderWorkUntil)} · Lietuvos laiku
            </Text>
            <Text>
              {review.sender.address}, {review.sender.city}, {review.sender.postalCode}
            </Text>
            <Text size="sm">
              {review.sender.contact} · {review.sender.phone}
            </Text>
            {review.sender.additionalInfo && <Text size="sm">{review.sender.additionalInfo}</Text>}
            <SelectionSummary candidates={candidates} />
            <Text size="sm" style={{ overflowWrap: 'anywhere' }}>
              {candidates.map((item) => item.orderNumber).join(', ')}
            </Text>
            {review.comment && review.source === 'api' && (
              <Text size="sm">Pastaba: {review.comment}</Text>
            )}
            {review.source === 'api' &&
              matchingPickups(review.pickupTime.slice(0, 10), review.sender).length > 0 && (
                <Alert color="orange" title="Galimas pakartotinis iškvietimas">
                  Šiai dienai ir adresui istorijoje jau yra iškvietimas. Tęsk tik patikrinęs, kad
                  reikia atskiro kurjerio atvykimo, ir suderinęs tai su DPD.
                </Alert>
              )}
            {review.source === 'external' ? (
              <Alert color="blue">
                Išsaugosime tavo pateiktą informaciją. DPD naujos užklausos negaus.
              </Alert>
            ) : (
              <Alert color={review.environment === 'sandbox' ? 'blue' : 'orange'}>
                {review.environment === 'sandbox'
                  ? 'Iškvietimas bus pateiktas DPD testinei paskyrai.'
                  : 'Patvirtinus iškvietimas bus pateiktas tikrai DPD paskyrai. Patikrink paėmimo vietą, laiką ir pakuočių skaičių.'}
              </Alert>
            )}
            <Checkbox
              color="teal"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => setConfirmed(e.currentTarget.checked)}
              label={
                review.source === 'external'
                  ? 'Patvirtinu, kad kurjeris šioms siuntoms jau iškviestas.'
                  : 'Duomenys teisingi, o kurjeris šioms siuntoms dar neiškviestas.'
              }
            />
            <Group justify="flex-end">
              <Button variant="default" disabled={busy} onClick={() => setReview(null)}>
                Grįžti
              </Button>
              <Button
                color="teal"
                disabled={!confirmed || busy}
                loading={busy}
                onClick={() => void submit(review)}
              >
                {review.source === 'external' ? 'Išsaugoti įrašą' : 'Iškviesti kurjerį'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={!!resolve}
        onClose={() => !busy && setResolve(null)}
        title="Patikrinto iškvietimo rezultatas"
        size="lg"
        centered
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
        withCloseButton={!busy}
      >
        {resolve && (
          <Stack gap="md">
            <Text size="sm">
              {pickupWindow(resolve.pickupTime, resolve.senderWorkUntil)} · {resolve.parcelCount}{' '}
              pak.
            </Text>
            {error && (
              <Alert color="red" role="alert">
                {error}
              </Alert>
            )}
            <Alert color="orange">
              Pirmiausia patikrink iškvietimą DPD paskyroje arba su DPD darbuotoju. Šiuo veiksmu
              įrašysi patikros rezultatą; naujo iškvietimo nesiųsime.
            </Alert>
            <TextInput
              label="DPD patvirtinimo numeris / pastaba"
              maxLength={100}
              value={resolveReference}
              disabled={busy}
              onChange={(e) => setResolveReference(e.currentTarget.value)}
            />
            <Checkbox
              color="teal"
              label="Patikrinau su DPD ir žinau, ar iškvietimas buvo priimtas."
              checked={resolveConfirmed}
              disabled={busy}
              onChange={(e) => setResolveConfirmed(e.currentTarget.checked)}
            />
            <Group justify="flex-end">
              <Button
                variant="light"
                color="orange"
                disabled={!resolveConfirmed || busy}
                onClick={() => void resolvePickup('not_created')}
              >
                DPD iškvietimo nesukūrė
              </Button>
              <Button
                color="teal"
                disabled={!resolveConfirmed || busy}
                onClick={() => void resolvePickup('confirmed')}
              >
                DPD priėmė iškvietimą
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
