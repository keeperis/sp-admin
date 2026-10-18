import assert from 'node:assert/strict';
import test from 'node:test';
import {
  descriptionDocumentToEditor,
  descriptionDocumentToText,
  editorToDescriptionDocument,
  legacyDescriptionDocument,
} from './description';
import type { PrivateWorkshopDescriptionDocument } from './types';

test('legacy descriptions remain editable without re-entry or interpreting their contents as HTML', () => {
  const text = 'Pirmoji pastraipa\r\nAntra eilutė.\r\n\r\n<strong>Pažodinis tekstas</strong>';
  const document = legacyDescriptionDocument(text);
  assert.deepEqual(document.blocks, [
    { type: 'paragraph', content: [{ text: 'Pirmoji pastraipa\nAntra eilutė.' }] },
    { type: 'paragraph', content: [{ text: '<strong>Pažodinis tekstas</strong>' }] },
  ]);
  assert.deepEqual(editorToDescriptionDocument(descriptionDocumentToEditor(document)), document);
  assert.equal(descriptionDocumentToText(document), text.replace(/\r\n/g, '\n'));
});

test('headings, bold text, flat lists and intentional line breaks survive editor round trips', () => {
  const document: PrivateWorkshopDescriptionDocument = {
    version: 1,
    blocks: [
      { type: 'heading', content: [{ text: 'Darbų atsiėmimas' }] },
      {
        type: 'paragraph',
        content: [
          { text: 'Po ' },
          { text: '3 savaičių', bold: true },
          { text: '.\nSusisieksime.' },
        ],
      },
      {
        type: 'bulletList',
        items: [[{ text: 'Pasiimti studijoje' }], [{ text: 'Atsiėmimas nemokamas', bold: true }]],
      },
    ],
  };
  assert.deepEqual(editorToDescriptionDocument(descriptionDocumentToEditor(document)), document);
  assert.equal(
    descriptionDocumentToText(document),
    'Darbų atsiėmimas\n\nPo 3 savaičių.\nSusisieksime.\n\n- Pasiimti studijoje\n- Atsiėmimas nemokamas',
  );
});

test('plain text fallback is canonical and excludes empty blocks and list items', () => {
  assert.equal(
    descriptionDocumentToText({
      version: 1,
      blocks: [
        { type: 'paragraph', content: [{ text: '  Įžanga  ' }] },
        { type: 'paragraph', content: [{ text: ' \n' }] },
        {
          type: 'bulletList',
          items: [[{ text: ' ' }], [{ text: 'Pirma ' }, { text: 'dalis', bold: true }]],
        },
        { type: 'heading', content: [{ text: 'Pabaiga  ' }] },
      ],
    }),
    'Įžanga  \n\n- Pirma dalis\n\nPabaiga',
  );
});

test('clearing the editor produces an explicit empty document rather than restoring legacy text', () => {
  const empty: PrivateWorkshopDescriptionDocument = { version: 1, blocks: [] };
  assert.deepEqual(editorToDescriptionDocument(descriptionDocumentToEditor(empty)), empty);
  assert.equal(descriptionDocumentToText(empty), '');
  assert.deepEqual(
    editorToDescriptionDocument({ type: 'doc', content: [{ type: 'paragraph' }] }),
    empty,
  );
});

test('the persisted format contains only approved block types and bold marks', () => {
  assert.deepEqual(
    editorToDescriptionDocument({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Paprastas', marks: [{ type: 'link' }, { type: 'italic' }] },
            { type: 'text', text: ' tekstas' },
            { type: 'hardBreak' },
            { type: 'text', text: 'Svarbu', marks: [{ type: 'bold' }, { type: 'underline' }] },
          ],
        },
        { type: 'image', attrs: { src: 'https://example.com/image.png' } },
      ],
    }),
    {
      version: 1,
      blocks: [
        {
          type: 'paragraph',
          content: [{ text: 'Paprastas tekstas\n' }, { text: 'Svarbu', bold: true }],
        },
      ],
    },
  );
});
