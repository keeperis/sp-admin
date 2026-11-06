'use client';
import {
  ActionIcon,
  Alert,
  Button,
  FileButton,
  Group,
  Image,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconPhoto, IconTrash, IconUpload } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { shopRequest } from '@/lib/shop/client';
import type { ShopImage } from '@/lib/shop/contract';

export function ImagesEditor({
  value,
  onChange,
  max = 12,
  onBusy,
}: {
  value: ShopImage[];
  onChange: (images: ShopImage[]) => void;
  max?: number;
  onBusy?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [library, setLibrary] = useState<ShopImage[] | null>(null);
  const reset = useRef<() => void>(null);
  async function upload(file: File | null) {
    if (!file) return;
    setError('');
    if (file.size > 8 * 1024 * 1024) {
      setError('Nuotrauka turi būti iki 8 MB.');
      reset.current?.();
      return;
    }
    setBusy(true);
    onBusy?.(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const image = await shopRequest('media', 'POST', {
        filename: file.name,
        alt: file.name.replace(/\.[^.]+$/, ''),
        base64,
      });
      onChange([...value, { url: image.url, alt: image.alt }].slice(-max));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepavyko įkelti nuotraukos.');
    } finally {
      setBusy(false);
      onBusy?.(false);
      reset.current?.();
    }
  }
  async function browse() {
    setBusy(true);
    setError('');
    onBusy?.(true);
    try {
      const result = await shopRequest('media');
      setLibrary(result.images);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  function move(index: number, direction: number) {
    const next = [...value];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  }
  return (
    <Stack gap="sm">
      <Group>
        <FileButton
          onChange={upload}
          accept="image/jpeg,image/png,image/webp,image/avif"
          resetRef={reset}
        >
          {(props) => (
            <Button
              {...props}
              variant="light"
              color="teal"
              leftSection={<IconUpload size={16} />}
              loading={busy}
              disabled={max > 1 && value.length >= max}
            >
              {max === 1 && value.length ? 'Pakeisti nuotrauką' : 'Įkelti nuotrauką'}
            </Button>
          )}
        </FileButton>
        <Button
          variant="subtle"
          leftSection={<IconPhoto size={16} />}
          onClick={browse}
          disabled={busy || (max > 1 && value.length >= max)}
        >
          Iš bibliotekos
        </Button>
      </Group>
      <Text size="xs" c="dimmed">
        JPG, PNG, WebP arba AVIF, iki 8 MB. Pirmoji nuotrauka rodoma kataloge. Aprašyk, kas joje
        matoma.
      </Text>
      {error && <Alert color="red">{error}</Alert>}
      {value.map((image, index) => (
        <Group
          key={`${image.url}-${index}`}
          align="center"
          wrap="nowrap"
          style={{
            border: '1px solid var(--mantine-color-default-border)',
            padding: 12,
            borderRadius: 8,
          }}
        >
          <Image src={image.url} alt={image.alt} w={84} h={84} radius="sm" fit="cover" />
          <TextInput
            label={index === 0 ? 'Pagrindinės nuotraukos aprašymas' : `Nuotrauka ${index + 1}`}
            value={image.alt}
            onChange={(event) =>
              onChange(
                value.map((item, i) => (i === index ? { ...item, alt: event.target.value } : item)),
              )
            }
            style={{ flex: 1, minWidth: 0 }}
            required
            maxLength={300}
          />
          <Stack gap={4}>
            {max > 1 && (
              <>
                <ActionIcon
                  variant="subtle"
                  aria-label={`Pakelti nuotrauką ${index + 1}`}
                  disabled={index === 0 || busy}
                  onClick={() => move(index, -1)}
                >
                  <IconArrowUp size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  aria-label={`Nuleisti nuotrauką ${index + 1}`}
                  disabled={index === value.length - 1 || busy}
                  onClick={() => move(index, 1)}
                >
                  <IconArrowDown size={16} />
                </ActionIcon>
              </>
            )}
            <ActionIcon
              color="red"
              variant="subtle"
              disabled={busy}
              aria-label={`Pašalinti nuotrauką ${index + 1} iš šio įrašo`}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Stack>
        </Group>
      ))}
      <Modal
        opened={library !== null}
        onClose={() => setLibrary(null)}
        title="Nuotraukų biblioteka"
        size="lg"
        zIndex={400}
      >
        {!library?.length ? (
          <Text c="dimmed">Biblioteka dar tuščia. Įkelk pirmą nuotrauką.</Text>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3 }}>
            {library.map((image) => (
              <button
                type="button"
                key={image.url}
                onClick={() => {
                  onChange([...value, { url: image.url, alt: image.alt }].slice(-max));
                  setLibrary(null);
                }}
                style={{
                  cursor: 'pointer',
                  border: '1px solid var(--mantine-color-default-border)',
                  background: 'transparent',
                  color: 'inherit',
                  padding: 8,
                  textAlign: 'left',
                }}
              >
                <Image src={image.url} alt={image.alt} h={120} fit="cover" />
                <Text size="xs" mt={8} lineClamp={2}>
                  {image.alt}
                </Text>
              </button>
            ))}
          </SimpleGrid>
        )}
      </Modal>
    </Stack>
  );
}
