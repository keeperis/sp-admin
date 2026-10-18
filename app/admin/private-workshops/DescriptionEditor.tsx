'use client';

import { Button, Group, Stack, Text } from '@mantine/core';
import { IconAlignLeft, IconBold, IconH3, IconList } from '@tabler/icons-react';
import { EditorContent, Node, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useId, useRef } from 'react';
import {
  descriptionDocumentToEditor,
  descriptionDocumentToText,
  editorToDescriptionDocument,
  legacyDescriptionDocument,
} from '@/lib/private-workshops/description';
import type { PrivateWorkshopDescriptionDocument } from '@/lib/private-workshops/types';
import classes from './DescriptionEditor.module.css';

// A single paragraph per item prevents nested lists and unsupported block formatting.
const FlatListItem = Node.create({
  name: 'listItem',
  content: 'paragraph',
  defining: true,
  parseHTML: () => [{ tag: 'li' }],
  renderHTML: () => ['li', 0],
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
    };
  },
});

type Props = {
  label: string;
  value: string;
  document?: PrivateWorkshopDescriptionDocument | null;
  disabled?: boolean;
  onChange: (document: PrivateWorkshopDescriptionDocument, text: string) => void;
};

export function DescriptionEditor({ label, value, document, disabled = false, onChange }: Props) {
  const id = useId();
  const labelId = `${id}-label`;
  const helpId = `${id}-help`;
  const incoming = document ?? legacyDescriptionDocument(value);
  const incomingSignature = JSON.stringify(incoming);
  const lastEmitted = useRef(incomingSignature);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        italic: false,
        link: false,
        listItem: false,
        orderedList: false,
        strike: false,
        underline: false,
        trailingNode: false,
      }),
      FlatListItem,
    ],
    content: descriptionDocumentToEditor(incoming),
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        'aria-labelledby': labelId,
        'aria-describedby': helpId,
        'aria-readonly': String(disabled),
      },
    },
    onUpdate: ({ editor: current }) => {
      const next = editorToDescriptionDocument(current.getJSON());
      lastEmitted.current = JSON.stringify(next);
      onChangeRef.current(next, descriptionDocumentToText(next));
    },
  });

  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      paragraph: Boolean(current?.isActive('paragraph') && !current.isActive('bulletList')),
      heading: Boolean(current?.isActive('heading', { level: 3 })),
      bold: Boolean(current?.isActive('bold')),
      bulletList: Boolean(current?.isActive('bulletList')),
    }),
  });

  useEffect(() => {
    if (!editor || incomingSignature === lastEmitted.current) return;
    editor.commands.setContent(descriptionDocumentToEditor(JSON.parse(incomingSignature)), {
      emitUpdate: false,
    });
    lastEmitted.current = incomingSignature;
  }, [editor, incomingSignature]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled, false);
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          id,
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': label,
          'aria-labelledby': labelId,
          'aria-describedby': helpId,
          'aria-readonly': String(disabled),
        },
      },
    });
  }, [editor, disabled, id, labelId, helpId, label]);

  function setBlock(type: 'paragraph' | 'heading') {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (editor.isActive('bulletList')) chain.liftListItem('listItem');
    if (type === 'heading') chain.setHeading({ level: 3 }).run();
    else chain.setParagraph().run();
  }

  const controls = [
    {
      label: 'Pastraipa',
      icon: IconAlignLeft,
      active: active?.paragraph,
      run: () => setBlock('paragraph'),
    },
    { label: 'Antraštė', icon: IconH3, active: active?.heading, run: () => setBlock('heading') },
    {
      label: 'Paryškinti',
      icon: IconBold,
      active: active?.bold,
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: 'Sąrašas',
      icon: IconList,
      active: active?.bulletList,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
  ];

  return (
    <Stack gap={5}>
      <Text id={labelId} size="sm" fw={500}>
        {label}
      </Text>
      <div className={classes.editor} data-disabled={disabled || undefined}>
        <Group
          gap={4}
          className={classes.toolbar}
          role="toolbar"
          aria-label={`${label}: formatavimas`}
        >
          {controls.map((control) => (
            <Button
              key={control.label}
              type="button"
              size="compact-xs"
              variant={control.active ? 'light' : 'subtle'}
              color={control.active ? 'blue' : 'gray'}
              leftSection={<control.icon size={16} aria-hidden="true" />}
              aria-label={control.label}
              aria-pressed={Boolean(control.active)}
              disabled={disabled || !editor}
              onMouseDown={(event) => event.preventDefault()}
              onClick={control.run}
            >
              {control.label}
            </Button>
          ))}
        </Group>
        <EditorContent editor={editor} className={classes.content} />
      </div>
      <Text id={helpId} size="xs" c="dimmed">
        Pažymėkite tekstą, kad jį paryškintumėte. Nauja pastraipa – Enter, nauja eilutė – Shift +
        Enter.
      </Text>
    </Stack>
  );
}
