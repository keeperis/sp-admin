import assert from 'node:assert/strict';
import test from 'node:test';
import { MantineProvider } from '@mantine/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderDpdQuickAction } from '@/app/admin/shop/OrderDpdQuickAction';
import type { FulfillmentStatus, ShopOrderView } from './commerce-contract';

test('paid parcel orders offer a label only while awaiting dispatch', () => {
  const render = (fulfillmentStatus: FulfillmentStatus) =>
    renderToStaticMarkup(
      <MantineProvider>
        <OrderDpdQuickAction
          order={
            { fulfillmentStatus, mode: 'live', delivery: { method: 'parcel' } } as ShopOrderView
          }
          disabled={false}
          onChange={() => {}}
        />
      </MantineProvider>,
    );
  assert.match(render('unfulfilled'), /Spausdinti DPD etiketę/);
  assert.match(render('preparing'), /Spausdinti DPD etiketę/);
  assert.doesNotMatch(render('shipped'), /Spausdinti DPD etiketę/);
  assert.doesNotMatch(render('fulfilled'), /Spausdinti DPD etiketę/);
});
