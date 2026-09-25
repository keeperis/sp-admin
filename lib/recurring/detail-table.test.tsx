import assert from 'node:assert/strict';
import test from 'node:test';
import { MantineProvider, Table } from '@mantine/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { SubscriptionDetailTable } from '@/app/admin/recurring/SubscriptionDetailTable';

test('detail tables keep readable columns inside a keyboard-accessible native scroller', () => {
  const html = renderToStaticMarkup(
    <MantineProvider>
      <SubscriptionDetailTable label="Operacinės rezervacijos" minWidth={1100}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Atšaukimo priežastis</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td>Klientas susirgo</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </SubscriptionDetailTable>
    </MantineProvider>,
  );

  assert.match(html, /role="region"/);
  assert.match(html, /aria-label="Operacinės rezervacijos: slenkama lentelė"/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /--table-min-width:calc\(68\.75rem \* var\(--mantine-scale\)\)/);
  assert.match(html, /--table-overflow:auto/);
  assert.match(html, /word-break:normal;overflow-wrap:normal/);
  assert.match(html, /<th[^>]*white-space:nowrap/);
  assert.match(html, /<td[^>]*vertical-align:top/);
  assert.match(html, /Lentelę galite slinkti į šonus/);
});
