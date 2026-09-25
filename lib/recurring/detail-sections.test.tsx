import assert from 'node:assert/strict';
import test from 'node:test';
import { MantineProvider } from '@mantine/core';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  SubscriptionDetailSection,
  SubscriptionDetailSections,
} from '@/app/admin/recurring/SubscriptionDetailSections';

const sections = [
  ['summary', 'Santrauka'],
  ['schedule', 'Tvarkaraštis ir perkelti užsiėmimai'],
  ['actions', 'Abonemento būsenos veiksmai'],
  ['refunds', 'Pinigų grąžinimas ir išimtys'],
  ['history', 'Veiksmų istorija'],
  ['reservations', 'Operacinės rezervacijos'],
  ['occurrences', 'Artimiausi grupės užsiėmimai'],
];

function render(value: string[]) {
  return renderToStaticMarkup(
    <MantineProvider>
      <SubscriptionDetailSections value={value} onChange={() => {}}>
        {sections.map(([id, title]) => (
          <SubscriptionDetailSection key={id} value={id} title={title}>
            Skilties turinys: {id}
          </SubscriptionDetailSection>
        ))}
      </SubscriptionDetailSections>
    </MantineProvider>,
  );
}

test('all subscription detail sections start collapsed with accessible headings', () => {
  const html = render([]);
  assert.equal((html.match(/aria-expanded="false"/g) || []).length, 7);
  const panels = html.match(/<div[^>]*role="region"[^>]*>/g) || [];
  assert.equal(panels.filter((tag) => tag.includes('aria-hidden="true"')).length, 7);
  assert.equal((html.match(/<h5/g) || []).length, 7);
  for (const [, title] of sections) assert.ok(html.includes(title));
});

test('multiple detail sections can be expanded independently', () => {
  const html = render(['summary', 'history']);
  assert.equal((html.match(/aria-expanded="true"/g) || []).length, 2);
  assert.equal((html.match(/aria-expanded="false"/g) || []).length, 5);
  const panels = html.match(/<div[^>]*role="region"[^>]*>/g) || [];
  assert.equal(panels.filter((tag) => tag.includes('aria-hidden="true"')).length, 5);
});
