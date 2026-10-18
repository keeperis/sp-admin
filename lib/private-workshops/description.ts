import type { PrivateWorkshopDescriptionDocument, PrivateWorkshopDescriptionText } from './types';

// The persisted format deliberately contains no HTML, styling, links, or editor-specific nodes.
export type DescriptionEditorNode = {
  type?: string;
  text?: string;
  marks?: Array<{ type: string }>;
  attrs?: Record<string, unknown>;
  content?: DescriptionEditorNode[];
};

export function descriptionDocumentToText(document: PrivateWorkshopDescriptionDocument): string {
  return document.blocks
    .map((block) => {
      if (block.type !== 'bulletList') return block.content.map((span) => span.text).join('');
      return block.items
        .map((item) => item.map((span) => span.text).join(''))
        .filter((text) => text.trim())
        .map((text) => `- ${text}`)
        .join('\n');
    })
    .filter((text) => text.trim())
    .join('\n\n')
    .trim();
}

export function legacyDescriptionDocument(text: string): PrivateWorkshopDescriptionDocument {
  return {
    version: 1,
    blocks: text
      .replace(/\r\n?/g, '\n')
      .split(/\n\s*\n/)
      .filter((paragraph) => paragraph.trim())
      .map((paragraph) => ({ type: 'paragraph', content: [{ text: paragraph }] })),
  };
}

function editorInline(content: PrivateWorkshopDescriptionText[]): DescriptionEditorNode[] {
  return content.flatMap((span) =>
    span.text
      .split('\n')
      .flatMap((line, index) => [
        ...(index ? [{ type: 'hardBreak' }] : []),
        ...(line
          ? [{ type: 'text', text: line, ...(span.bold ? { marks: [{ type: 'bold' }] } : {}) }]
          : []),
      ]),
  );
}

export function descriptionDocumentToEditor(
  document: PrivateWorkshopDescriptionDocument,
): DescriptionEditorNode {
  const content = document.blocks.map((block): DescriptionEditorNode => {
    if (block.type === 'bulletList') {
      return {
        type: 'bulletList',
        content: block.items.map((item) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: editorInline(item) }],
        })),
      };
    }
    return {
      type: block.type,
      ...(block.type === 'heading' ? { attrs: { level: 3 } } : {}),
      content: editorInline(block.content),
    };
  });
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

function documentInline(nodes: DescriptionEditorNode[] = []): PrivateWorkshopDescriptionText[] {
  const spans: PrivateWorkshopDescriptionText[] = [];
  for (const node of nodes) {
    const text = node.type === 'hardBreak' ? '\n' : node.type === 'text' ? node.text || '' : '';
    if (!text) continue;
    const bold = node.type === 'text' && node.marks?.some((mark) => mark.type === 'bold');
    const previous = spans.at(-1);
    if (previous && Boolean(previous.bold) === Boolean(bold)) previous.text += text;
    else spans.push({ text, ...(bold ? { bold: true } : {}) });
  }
  return spans;
}

export function editorToDescriptionDocument(
  editorDocument: DescriptionEditorNode,
): PrivateWorkshopDescriptionDocument {
  const blocks: PrivateWorkshopDescriptionDocument['blocks'] = [];
  for (const node of editorDocument.content || []) {
    if (node.type === 'paragraph' || node.type === 'heading') {
      const content = documentInline(node.content);
      if (content.some((span) => span.text.trim())) blocks.push({ type: node.type, content });
    } else if (node.type === 'bulletList') {
      const items = (node.content || [])
        .filter((item) => item.type === 'listItem')
        .map((item) =>
          documentInline(item.content?.find((child) => child.type === 'paragraph')?.content),
        )
        .filter((item) => item.some((span) => span.text.trim()));
      if (items.length) blocks.push({ type: 'bulletList', items });
    }
  }
  return { version: 1, blocks };
}
