'use client';

import { Image, Select, Stack, TextInput } from '@mantine/core';
import { validImageUrl } from '@/lib/private-workshops/admin';

const CERAMICS_ORIGIN = 'https://keramika.soulpoetry.love';
const images = Array.from({ length: 16 }, (_, index) => ({
  value: `${CERAMICS_ORIGIN}/bg/soulpoetry-ceramics-${index + 1}.jpg`,
  label: `Keramikos nuotrauka ${index + 1}`,
}));

export function ImagePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const preview = value.startsWith('/') ? `${CERAMICS_ORIGIN}${value}` : value;
  return (
    <Stack gap="xs">
      <Select
        label={`${label}: pasirinkti iš galerijos`}
        placeholder="Pasirinkite nuotrauką"
        data={images}
        value={images.some((image) => image.value === value) ? value : null}
        onChange={(next) => {
          if (next) onChange(next);
        }}
        searchable
      />
      <TextInput
        label={`${label}: URL`}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder="https://..."
        error={!validImageUrl(value) ? 'Naudokite http(s) nuorodą arba /bg/... kelią.' : undefined}
      />
      {value && validImageUrl(value) && (
        <Image
          src={preview}
          alt={`${label} – peržiūra`}
          h={160}
          radius="sm"
          fit="cover"
          maw={400}
        />
      )}
    </Stack>
  );
}
