'use client';
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';
import {
  type CommerceSettings,
  type CommerceSnapshot,
  documentKinds,
  documentLinks,
} from '@/lib/shop/commerce-contract';

const storefront = process.env.NEXT_PUBLIC_SHOP_URL || 'http://127.0.0.1:3004';
const sellerLabels = {
  name: 'Pavadinimas / vardas ir pavardė',
  code: 'Įmonės / individualios veiklos kodas',
  vatCode: 'PVM mokėtojo kodas (jei taikoma)',
  address: 'Veiklos adresas',
  returnAddress: 'Grąžinimo adresas',
  email: 'Klientų aptarnavimo el. paštas',
  phone: 'Telefonas',
};
const bankLabels = {
  beneficiaryName: 'Gavėjo pavadinimas',
  beneficiaryCode: 'Gavėjo kodas',
  iban: 'IBAN',
  bankName: 'Banko pavadinimas',
  paymentPurposePrefix: 'Pavedimo paskirties pradžia',
};
export function CommerceEditor() {
  const [snapshot, setSnapshot] = useState<CommerceSnapshot | null>(null);
  const [draft, setDraft] = useState<CommerceSettings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const result = await shopRequest('commerce');
      setSnapshot(result);
      setDraft(structuredClone(result.data));
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function change(next: CommerceSettings) {
    setDraft(next);
    setDirty(true);
  }
  async function save() {
    if (!snapshot || !draft) return;
    setBusy(true);
    setError('');
    try {
      const result = await shopRequest('commerce', 'PUT', {
        revision: snapshot.revision,
        data: draft,
      });
      setSnapshot(result);
      setDraft(structuredClone(result.data));
      setDirty(false);
      notifications.show({
        color: 'teal',
        title: 'Išsaugota',
        message: 'Rekvizitai ir dokumentai atnaujinti. Esamų užsakymų redakcijos nepakeistos.',
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!draft || !snapshot)
    return (
      <Stack>
        {busy ? (
          <Loader size="sm" />
        ) : (
          <Alert color="red">
            {error}
            <Button onClick={load}>Bandyti dar kartą</Button>
          </Alert>
        )}
      </Stack>
    );
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Dokumentai ir mokėjimai {dirty ? '•' : ''}</Title>
          <Text c="dimmed" size="sm">
            Parduotuvės dokumentai atskiri nuo užsiėmimų taisyklių. Redakcija #{snapshot.revision}.
          </Text>
        </div>
        <Group>
          <Button
            variant="default"
            disabled={busy}
            onClick={() => {
              if (!dirty || window.confirm('Atmesti neišsaugotus dokumentų pakeitimus?'))
                void load();
            }}
          >
            Įkelti iš naujo
          </Button>
          <Button color="teal" loading={busy} onClick={save} disabled={!dirty}>
            Išsaugoti dokumentus ir nustatymus
          </Button>
        </Group>
      </Group>
      <Alert color="yellow" title="Tik testinis režimas — tikra prekyba neįjungta">
        Kortelės ir pavedimai yra bandomieji. Pinigų gavimo imitavimas nesukuria tikro banko
        pavedimo. Dokumentai yra projektai: prieš prekybą patikrink rekvizitus, faktinę pristatymo
        ir grąžinimo tvarką, duomenų saugojimą bei teisinius reikalavimus.
      </Alert>
      <Group>
        <Badge color={snapshot.stripeReady ? 'teal' : 'orange'}>
          Stripe TEST: {snapshot.stripeReady ? 'prijungtas' : 'neprijungtas'}
        </Badge>
        <Badge color={snapshot.webhookReady ? 'teal' : 'orange'}>
          Webhook: {snapshot.webhookReady ? 'sukonfigūruotas' : 'neprijungtas'}
        </Badge>
        <Badge variant="outline">LIVE režimas užblokuotas</Badge>
      </Group>
      {error && (
        <Alert color="red" title="Neišsaugota">
          {error}
        </Alert>
      )}
      <fieldset disabled={busy} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <Stack>
          <Accordion multiple defaultValue={['documents']} variant="separated">
            <Accordion.Item value="seller">
              <Accordion.Control>Pardavėjo rekvizitai</Accordion.Control>
              <Accordion.Panel>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  {(Object.keys(sellerLabels) as (keyof typeof sellerLabels)[]).map((key) => (
                    <TextInput
                      key={key}
                      label={sellerLabels[key]}
                      type={key === 'email' ? 'email' : 'text'}
                      maxLength={500}
                      value={draft.seller[key]}
                      onChange={(e) =>
                        change({
                          ...draft,
                          seller: { ...draft.seller, [key]: e.currentTarget.value },
                        })
                      }
                    />
                  ))}
                </SimpleGrid>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="bank">
              <Accordion.Control>Bankinis pavedimas</Accordion.Control>
              <Accordion.Panel>
                <Stack>
                  <Text size="sm" c="dimmed">
                    Pirmą kartą pasiūlomi keramikos sistemos rekvizitai. Išsaugojus parduotuvė turi
                    atskirus nustatymus. Tikro pavedimo bandymuose nedarykite.
                  </Text>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    {(Object.keys(bankLabels) as (keyof typeof bankLabels)[]).map((key) => (
                      <TextInput
                        key={key}
                        label={bankLabels[key]}
                        maxLength={500}
                        value={draft.bank[key]}
                        onChange={(e) =>
                          change({
                            ...draft,
                            bank: { ...draft.bank, [key]: e.currentTarget.value },
                          })
                        }
                      />
                    ))}
                  </SimpleGrid>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="delivery">
              <Accordion.Control>Pristatymas ir kainos</Accordion.Control>
              <Accordion.Panel>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  {(
                    [
                      ['pickupLabel', 'Atsiėmimo pavadinimas'],
                      ['pickupAddress', 'Atsiėmimo adresas / instrukcija'],
                      ['parcelLabel', 'Siuntimo pavadinimas'],
                      ['estimatedDays', 'Numatomas pristatymo terminas'],
                    ] as const
                  ).map(([key, label]) => (
                    <TextInput
                      key={key}
                      label={label}
                      maxLength={500}
                      value={draft.delivery[key]}
                      onChange={(e) =>
                        change({
                          ...draft,
                          delivery: { ...draft.delivery, [key]: e.currentTarget.value },
                        })
                      }
                    />
                  ))}
                  {(
                    [
                      ['pickupFeeCents', 'Atsiėmimo kaina, €'],
                      ['parcelFeeCents', 'Siuntimo kaina, €'],
                    ] as const
                  ).map(([key, label]) => (
                    <NumberInput
                      key={key}
                      label={label}
                      min={0}
                      max={1000}
                      decimalScale={2}
                      value={draft.delivery[key] / 100}
                      onChange={(value) =>
                        change({
                          ...draft,
                          delivery: { ...draft.delivery, [key]: Math.round(Number(value) * 100) },
                        })
                      }
                    />
                  ))}
                </SimpleGrid>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="documents">
              <Accordion.Control>Pirkimo ir privatumo dokumentai · 5 dokumentai</Accordion.Control>
              <Accordion.Panel>
                <Stack>
                  {documentKinds.map((kind) => {
                    const doc = draft.documents[kind];
                    const edit = (part: Partial<typeof doc>) =>
                      change({
                        ...draft,
                        documents: {
                          ...draft.documents,
                          [kind]: {
                            ...doc,
                            ...part,
                            ...(part.body !== undefined || part.title !== undefined
                              ? { reviewed: false }
                              : {}),
                          },
                        },
                      });
                    return (
                      <Paper key={kind} withBorder p="md" radius="md">
                        <Stack gap="sm">
                          <Group justify="space-between">
                            <Text fw={600}>{documentLinks[kind].title}</Text>
                            <Button
                              component="a"
                              href={`${storefront}/informacija/${documentLinks[kind].slug}`}
                              target="_blank"
                              rel="noreferrer"
                              size="xs"
                              variant="subtle"
                            >
                              Peržiūrėti paskelbtą ↗
                            </Button>
                          </Group>
                          <TextInput
                            label="Dokumento antraštė"
                            value={doc.title}
                            maxLength={160}
                            onChange={(e) => edit({ title: e.currentTarget.value })}
                          />
                          <Textarea
                            label="Dokumento tekstas"
                            description="Skirk pastraipas tuščia eilute. Antraštę pradėk # ir tarpu. HTML nevykdomas."
                            autosize
                            minRows={8}
                            maxRows={24}
                            maxLength={25000}
                            value={doc.body}
                            onChange={(e) => edit({ body: e.currentTarget.value })}
                          />
                          <Group justify="space-between">
                            <Switch
                              label="Peržiūrėta administratoriaus"
                              checked={doc.reviewed}
                              onChange={(e) => edit({ reviewed: e.currentTarget.checked })}
                            />
                            <Text size="xs" c="dimmed">
                              Išsaugota versija: {doc.version}
                            </Text>
                          </Group>
                          <Text size="xs" c="dimmed">
                            Peržiūros žyma nėra teisininko patvirtinimas. Pakeitus tekstą ji
                            atšaukiama. Nauja redakcija suteikiama išsaugant.
                          </Text>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
          <Button color="teal" loading={busy} onClick={save} disabled={!dirty}>
            Išsaugoti dokumentus ir nustatymus
          </Button>
        </Stack>
      </fieldset>
    </Stack>
  );
}
