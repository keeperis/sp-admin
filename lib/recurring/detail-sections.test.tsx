import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { MantineProvider } from '@mantine/core';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  SubscriptionDetailSection,
  SubscriptionDetailSections,
} from '@/app/admin/recurring/SubscriptionDetailSections';

const pageSource = readFileSync(
  new URL('../../app/admin/recurring/page.tsx', import.meta.url),
  'utf8',
);
const sections = Array.from(
  pageSource.matchAll(/<SubscriptionDetailSection\s+value="([^"]+)"\s+title="([^"]+)"/g),
  ([, id, title]) => [id, title],
);

test('subscription details contain only personal sections with history last', () => {
  assert.deepEqual(sections, [
    ['summary', 'Santrauka'],
    ['schedule', 'Tvarkaraštis ir perkelti užsiėmimai'],
    ['actions', 'Abonemento būsenos veiksmai'],
    ['refunds', 'Pinigų grąžinimas ir išimtys'],
    ['reservations', 'Operacinės rezervacijos'],
    ['history', 'Veiksmų istorija'],
  ]);
  assert.ok(!pageSource.includes('selectedOccurrences'));
});

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
  assert.equal((html.match(/aria-expanded="false"/g) || []).length, 6);
  const panels = html.match(/<div[^>]*role="region"[^>]*>/g) || [];
  assert.equal(panels.filter((tag) => tag.includes('aria-hidden="true"')).length, 6);
  assert.equal((html.match(/<h5/g) || []).length, 6);
  for (const [, title] of sections) assert.ok(html.includes(title));
});

test('multiple detail sections can be expanded independently', () => {
  const html = render(['summary', 'history']);
  assert.equal((html.match(/aria-expanded="true"/g) || []).length, 2);
  assert.equal((html.match(/aria-expanded="false"/g) || []).length, 4);
  const panels = html.match(/<div[^>]*role="region"[^>]*>/g) || [];
  assert.equal(panels.filter((tag) => tag.includes('aria-hidden="true"')).length, 4);
});
