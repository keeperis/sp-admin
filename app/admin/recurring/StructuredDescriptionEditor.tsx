'use client';

import { ActionIcon, Button, Group, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useRef } from 'react';

export type StructuredDescription = {
  intro: string;
  paragraph1: string;
  paragraph2: string;
  paragraph3: string;
  listTitle: string;
  listItems: string[];
  closing1: string;
  closing2: string;
  closing3: string;
};

export function emptyStructuredDescription(): StructuredDescription {
  return {
    intro: '',
    paragraph1: '',
    paragraph2: '',
    paragraph3: '',
    listTitle: '',
    listItems: [],
    closing1: '',
    closing2: '',
    closing3: '',
  };
}

export function structuredDescriptionToText(value: StructuredDescription) {
  return [
    value.intro,
    value.paragraph1,
    value.paragraph2,
    value.paragraph3,
    value.listTitle,
    ...value.listItems,
    value.closing1,
    value.closing2,
    value.closing3,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n');
}

type StructuredDescriptionEditorProps = {
  value: StructuredDescription;
  onChange: (value: StructuredDescription) => void;
};

export function StructuredDescriptionEditor({ value, onChange }: StructuredDescriptionEditorProps) {
  const nextItemKey = useRef(0);
  const itemKeys = useRef<string[]>([]);
  while (itemKeys.current.length < value.listItems.length) {
    nextItemKey.current += 1;
    itemKeys.current.push(`description-item-${nextItemKey.current}`);
  }
  itemKeys.current.length = value.listItems.length;

  const updateField = (
    field: Exclude<keyof StructuredDescription, 'listItems'>,
    nextValue: string,
  ) => onChange({ ...value, [field]: nextValue });

  const updateListItem = (index: number, nextValue: string) => {
    const listItems = [...value.listItems];
    listItems[index] = nextValue;
    onChange({ ...value, listItems });
  };

  return (
    <Stack gap="sm">
      <Textarea
        label="Įžanginis sakinys"
        description="Čia galite įklijuoti ir visą pradinį tekstą, tada paspausti DI skaidymo mygtuką."
        minRows={2}
        autosize
        value={value.intro}
        onChange={(event) => updateField('intro', event.currentTarget.value)}
      />
      <Textarea
        label="Pirma pastraipa"
        minRows={3}
        autosize
        value={value.paragraph1}
        onChange={(event) => updateField('paragraph1', event.currentTarget.value)}
      />
      <Textarea
        label="Antra pastraipa"
        minRows={3}
        autosize
        value={value.paragraph2}
        onChange={(event) => updateField('paragraph2', event.currentTarget.value)}
      />
      <Textarea
        label="Trečia pastraipa"
        minRows={3}
        autosize
        value={value.paragraph3}
        onChange={(event) => updateField('paragraph3', event.currentTarget.value)}
      />
      <TextInput
        label="Sąrašo antraštė"
        value={value.listTitle}
        onChange={(event) => updateField('listTitle', event.currentTarget.value)}
      />
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" fw={500}>
            Sąrašo elementai
          </Text>
          <Button
            type="button"
            size="xs"
            variant="subtle"
            leftSection={<IconPlus size={14} />}
            onClick={() => onChange({ ...value, listItems: [...value.listItems, ''] })}
          >
            Pridėti elementą
          </Button>
        </Group>
        {value.listItems.map((item, index) => (
          <Group key={itemKeys.current[index]} align="flex-end" wrap="nowrap">
            <TextInput
              label={`Elementas ${index + 1}`}
              value={item}
              style={{ flex: 1 }}
              onChange={(event) => updateListItem(index, event.currentTarget.value)}
            />
            <ActionIcon
              type="button"
              color="red"
              variant="subtle"
              aria-label={`Pašalinti ${index + 1} sąrašo elementą`}
              onClick={() => {
                itemKeys.current.splice(index, 1);
                onChange({
                  ...value,
                  listItems: value.listItems.filter((_listItem, itemIndex) => itemIndex !== index),
                });
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
      </Stack>
      <Textarea
        label="Pirma baigiamoji pastraipa"
        minRows={2}
        autosize
        value={value.closing1}
        onChange={(event) => updateField('closing1', event.currentTarget.value)}
      />
      <Textarea
        label="Antra baigiamoji pastraipa"
        minRows={2}
        autosize
        value={value.closing2}
        onChange={(event) => updateField('closing2', event.currentTarget.value)}
      />
      <Textarea
        label="Trečia baigiamoji pastraipa"
        minRows={2}
        autosize
        value={value.closing3}
        onChange={(event) => updateField('closing3', event.currentTarget.value)}
      />
    </Stack>
  );
}
