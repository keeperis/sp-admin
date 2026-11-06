'use client';

import {
  Accordion,
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconCheck, IconPlugConnected, IconTruckDelivery } from '@tabler/icons-react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';

type DpdEnvironment = 'production' | 'sandbox';
type DpdConfiguration = {
  provider: 'dpd-interconnector';
  environment: DpdEnvironment;
  credentialsConfigured: boolean;
  revision: number;
  updatedAt: string | null;
};
type DpdConnectionResult = {
  authenticated: true;
  environment: DpdEnvironment;
  checkedAt: string;
  endpoint: string;
  method: string;
  message: string;
};

const environmentLabels: Record<DpdEnvironment, string> = {
  production: 'Esama DPD paskyra',
  sandbox: 'DPD testinė paskyra',
};

export function DpdIntegration() {
  const [configuration, setConfiguration] = useState<DpdConfiguration | null>(null);
  const [configurationError, setConfigurationError] = useState('');
  const [configurationLoading, setConfigurationLoading] = useState(true);
  const [environment, setEnvironment] = useState<DpdEnvironment>('production');
  const [useServerCredentials, setUseServerCredentials] = useState(false);
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DpdConnectionResult | null>(null);
  const passwordField = useRef<HTMLInputElement | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  // Keep the password only in the input, and erase it when that input leaves the page.
  const attachPasswordField = useCallback((node: HTMLInputElement | null) => {
    if (passwordField.current && passwordField.current !== node) {
      passwordField.current.value = '';
    }
    passwordField.current = node;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (passwordField.current) passwordField.current.value = '';
    };
  }, []);

  const loadConfiguration = useCallback(async () => {
    setConfigurationLoading(true);
    setConfigurationError('');
    try {
      const data: DpdConfiguration = await shopRequest('shipping/dpd');
      if (mounted.current) setConfiguration(data);
    } catch (cause) {
      if (mounted.current) {
        setConfigurationError(
          cause instanceof Error ? cause.message : 'Nepavyko įkelti DPD nustatymų.',
        );
      }
    } finally {
      if (mounted.current) setConfigurationLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfiguration();
  }, [loadConfiguration]);

  function resetFeedback() {
    setError('');
    setResult(null);
    setSaved(false);
  }

  async function testConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const save = submitter instanceof HTMLButtonElement && submitter.value === 'save';
    if (save && (!configuration || useServerCredentials)) return;
    const input = passwordField.current;
    const password = input?.value || '';
    resetFeedback();
    if (!useServerCredentials && (!username.trim() || !password)) {
      if (input) input.value = '';
      setError('Įrašyk DPD naudotoją ir slaptažodį.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setSaving(save);
    try {
      let response: DpdConnectionResult;
      if (save) {
        const settings: DpdConfiguration & { connection: DpdConnectionResult } = await shopRequest(
          'shipping/dpd',
          'PUT',
          { revision: configuration!.revision, environment, username: username.trim(), password },
        );
        response = settings.connection;
        if (mounted.current) {
          setConfiguration(settings);
          setUseServerCredentials(true);
          setSaved(true);
        }
      } else {
        response = await shopRequest('shipping/dpd/test', 'POST', {
          environment,
          credentialSource: useServerCredentials ? 'server' : 'manual',
          ...(!useServerCredentials && { username: username.trim(), password }),
        });
      }
      if (response.authenticated !== true) {
        throw new Error('DPD nepatvirtino prisijungimo. Pabandyk dar kartą.');
      }
      if (mounted.current) setResult(response);
    } catch (cause) {
      if (mounted.current) {
        setError(cause instanceof Error ? cause.message : 'Nepavyko patikrinti DPD prisijungimo.');
      }
    } finally {
      if (input) input.value = '';
      inFlight.current = false;
      if (mounted.current) {
        setBusy(false);
        setSaving(false);
      }
    }
  }

  return (
    <Stack gap="lg" maw={800}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>DPD siuntimas</Title>
          <Text c="dimmed" size="sm" mt={6}>
            Patikrink ir išsaugok turimą „DPD Baltic Shipping“ prisijungimą siuntų etiketėms kurti.
          </Text>
        </div>
        <Badge variant="light" color="teal" leftSection={<IconTruckDelivery size={13} />}>
          {configuration?.credentialsConfigured
            ? 'Prisijungimas paruoštas'
            : 'Prisijungimo patikra'}
        </Badge>
      </Group>

      <Paper withBorder radius="md" p="lg">
        <form onSubmit={testConnection} autoComplete="off">
          <Stack gap="lg">
            <Text size="sm">
              Patikra tik nuskaito DPD duomenis. Siunta nesukuriama ir kurjeris neiškviečiamas.
            </Text>
            <Text size="sm" c="dimmed">
              Pasirinkus „Patikrinti ir išsaugoti“, veikiantis prisijungimas saugomas užšifruotas ir
              naudojamas siuntoms kurti. Ankstesnė patikra duomenų neišsaugojo — išsaugojimui
              slaptažodį įrašyk dar kartą.
            </Text>

            {configurationLoading && (
              <Group gap="xs">
                <Loader size="xs" />
                <Text size="sm" c="dimmed">
                  Tikrinami parduotuvės nustatymai…
                </Text>
              </Group>
            )}
            {configurationError && (
              <Alert color="orange" title="Nepavyko įkelti DPD nustatymų">
                {configurationError}
                <Button
                  display="block"
                  variant="subtle"
                  color="orange"
                  size="xs"
                  mt="xs"
                  onClick={loadConfiguration}
                >
                  Bandyti dar kartą
                </Button>
              </Alert>
            )}

            <Select
              label="DPD paskyra"
              description="Seniems parduotuvės prisijungimams rinkis esamą paskyrą. Testinei aplinkai DPD išduoda atskirus prisijungimus."
              data={Object.entries(environmentLabels).map(([value, label]) => ({ value, label }))}
              value={environment}
              allowDeselect={false}
              disabled={busy || useServerCredentials}
              onChange={(value) => {
                if (value !== 'production' && value !== 'sandbox') return;
                setEnvironment(value);
                if (passwordField.current) passwordField.current.value = '';
                resetFeedback();
              }}
            />

            {configuration?.credentialsConfigured && (
              <Switch
                label="Naudoti išsaugotą prisijungimą"
                description={environmentLabels[configuration.environment]}
                checked={useServerCredentials}
                disabled={busy}
                color="teal"
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  setUseServerCredentials(checked);
                  if (checked) setEnvironment(configuration.environment);
                  if (passwordField.current) passwordField.current.value = '';
                  resetFeedback();
                }}
              />
            )}

            {!useServerCredentials && (
              <Stack gap="md">
                <TextInput
                  name="dpd-api-user"
                  label="DPD naudotojas"
                  description="Prisijungimas, kurį naudojai „DPD Baltic Shipping“ modulyje."
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  disabled={busy}
                  required
                  onChange={(event) => {
                    setUsername(event.currentTarget.value);
                    resetFeedback();
                  }}
                />
                <PasswordInput
                  ref={attachPasswordField}
                  name="dpd-api-password"
                  label="DPD slaptažodis"
                  description="Po bandymo laukelis išvalomas. Prisijungimas išsaugomas tik pasirinkus išsaugojimo mygtuką."
                  autoComplete="off"
                  visibilityToggleButtonProps={{ 'aria-label': 'Rodyti arba slėpti slaptažodį' }}
                  disabled={busy}
                  required
                  onChange={resetFeedback}
                />
              </Stack>
            )}

            {error && (
              <Alert color="red" title="Veiksmas nepavyko" role="alert">
                {error}
                <Button variant="subtle" color="red" size="xs" onClick={loadConfiguration} mt="xs">
                  Atnaujinti nustatymus
                </Button>
              </Alert>
            )}

            <Group>
              <Button
                type="submit"
                value="test"
                color="teal"
                variant={useServerCredentials ? 'filled' : 'light'}
                loading={busy && !saving}
                disabled={saving}
                leftSection={<IconPlugConnected size={17} />}
              >
                Patikrinti prisijungimą
              </Button>
              {!useServerCredentials && (
                <Button
                  type="submit"
                  value="save"
                  color="teal"
                  loading={saving}
                  disabled={busy || configurationLoading || !configuration || !!configurationError}
                >
                  Patikrinti ir išsaugoti prisijungimą
                </Button>
              )}
            </Group>
          </Stack>
        </form>
      </Paper>

      {result && (
        <Stack gap="sm" aria-live="polite">
          <Alert
            color="teal"
            title={saved ? 'Prisijungimas veikia ir išsaugotas' : 'Prisijungimas veikia'}
            icon={<IconCheck size={20} />}
          >
            <Text size="sm">{result.message}</Text>
            {saved && (
              <Text size="sm" mt="sm">
                Prisijungimo duomenys išsaugoti užšifruoti. Kuriant etiketes jų iš naujo įvesti
                nereikės.
              </Text>
            )}
            <Text size="sm" mt="sm">
              Ši patikra nepatvirtina sutarties galiojimo. Siuntos sukūrimą ir etiketę išbandysime
              atskirai.
            </Text>
            <Text size="xs" mt="sm" c="dimmed">
              {environmentLabels[result.environment]} · Patikrinta{' '}
              {new Date(result.checkedAt).toLocaleString('lt-LT')}
            </Text>
          </Alert>
          <Accordion variant="contained" radius="md">
            <Accordion.Item value="details">
              <Accordion.Control>Patikros techninė informacija</Accordion.Control>
              <Accordion.Panel>
                <Stack gap={5}>
                  <Text size="sm">API: DPD Interconnector</Text>
                  <Text size="sm" style={{ overflowWrap: 'anywhere' }}>
                    Adresas: {result.endpoint}
                  </Text>
                  <Text size="sm">Metodas: {result.method}</Text>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      )}
    </Stack>
  );
}
