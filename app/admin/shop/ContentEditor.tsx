'use client';
import {
  Accordion,
  Alert,
  Button,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import {
  type ContentKey,
  contentFields,
  type ShopContent,
  type ShopData,
} from '@/lib/shop/contract';
import { ImagesEditor } from './ImagesEditor';

export function ContentEditor({
  data,
  save,
  dirtyChanged,
}: {
  data: ShopData;
  save: (content: ShopContent) => Promise<boolean>;
  dirtyChanged: (dirty: boolean) => void;
}) {
  const [content, setContent] = useState(data.content);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dirty = JSON.stringify(content) !== JSON.stringify(data.content);
  useEffect(() => {
    dirtyChanged(dirty);
    return () => dirtyChanged(false);
  }, [dirty, dirtyChanged]);
  const sections = [...new Set(contentFields.map((f) => f[2]))];
  const setText = (key: ContentKey, value: string) =>
    setContent((c) => ({ ...c, text: { ...c.text, [key]: value } }));
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={3}>Svetainės tekstai ir vaizdai</Title>
        </div>
        <Button
          color="teal"
          disabled={!dirty || uploading}
          loading={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await save(content);
            } finally {
              setSaving(false);
            }
          }}
        >
          Išsaugoti turinį
        </Button>
      </Group>
      {dirty && <Alert color="yellow">Yra neišsaugotų turinio pakeitimų.</Alert>}
      <Accordion variant="separated" multiple defaultValue={['Pradinis puslapis']}>
        {sections.map((section) => (
          <Accordion.Item key={section} value={section}>
            <Accordion.Control>{section}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                {contentFields
                  .filter((f) => f[2] === section)
                  .map(([key, label]) =>
                    /Description|Paragraph|Bottom|defaultCare|defaultDelivery/.test(key) ? (
                      <Textarea
                        key={key}
                        label={label}
                        value={content.text[key]}
                        onChange={(e) => setText(key, e.target.value)}
                        autosize
                        minRows={3}
                        maxLength={5000}
                      />
                    ) : (
                      <TextInput
                        key={key}
                        label={label}
                        value={content.text[key]}
                        onChange={(e) => setText(key, e.target.value)}
                        maxLength={5000}
                      />
                    ),
                  )}
                {section === 'Pradinis puslapis' && (
                  <>
                    <Title order={5}>Pagrindinė nuotrauka</Title>
                    <ImagesEditor
                      max={1}
                      value={content.heroImage.url ? [content.heroImage] : []}
                      onChange={(images) =>
                        setContent((c) => ({ ...c, heroImage: images[0] || { url: '', alt: '' } }))
                      }
                      onBusy={setUploading}
                    />
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                      <Select
                        clearable
                        label="Produktas pagrindinėje nuotraukoje"
                        value={content.heroProductId || null}
                        onChange={(id) => setContent((c) => ({ ...c, heroProductId: id || '' }))}
                        data={data.products.map((p) => ({
                          value: p.id,
                          label: `${p.name}${p.status === 'published' ? '' : ' (nepaskelbtas)'}`,
                        }))}
                      />
                      <NumberInput
                        label="Nuotraukos horizontali pozicija, %"
                        description="0 — kairė, 50 — centras, 100 — dešinė."
                        min={0}
                        max={100}
                        value={content.heroImagePosition}
                        onChange={(v) =>
                          setContent((c) => ({ ...c, heroImagePosition: Number(v) || 0 }))
                        }
                      />
                    </SimpleGrid>
                  </>
                )}
                {section === 'Mūsų istorija' && (
                  <>
                    <Title order={5}>Studijos nuotrauka</Title>
                    <ImagesEditor
                      max={1}
                      value={content.storyImage.url ? [content.storyImage] : []}
                      onChange={(images) =>
                        setContent((c) => ({ ...c, storyImage: images[0] || { url: '', alt: '' } }))
                      }
                      onBusy={setUploading}
                    />
                  </>
                )}
                {section === 'Ritualai' && (
                  <Select
                    clearable
                    label="Ritualų mygtuko kategorija"
                    value={content.ritualCategoryId || null}
                    onChange={(id) => setContent((c) => ({ ...c, ritualCategoryId: id || '' }))}
                    data={data.categories.map((c) => ({ value: c.id, label: c.label }))}
                  />
                )}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Stack>
  );
}
