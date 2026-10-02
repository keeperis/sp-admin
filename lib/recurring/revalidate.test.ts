import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createCacheHelper,
  initCache,
  type RevalidateCallback,
  SWRGlobalState,
} from 'swr/_internal';
import { revalidateRecurringData } from './revalidate';

test('recurring refresh keeps loaded data until all background requests finish', async () => {
  const initialized = initCache(new Map());
  assert.ok(initialized);
  const [cache, mutate] = initialized;
  const state = SWRGlobalState.get(cache);
  assert.ok(state);
  const keys = [
    '/api/admin/recurring/programs?site=ceramics',
    '/api/admin/recurring/groups?site=ceramics',
    '/api/admin/recurring/groups/test/attendance?site=ceramics',
  ];
  const unrelated = '/api/admin/workshops';
  const previousData = { version: 1 };
  const refreshedData = { version: 2 };
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested: string[] = [];
  const cleared: string[] = [];
  for (const key of [...keys, unrelated]) {
    const [, set] = createCacheHelper(cache, key);
    const initialState = { _k: key, data: previousData };
    set(initialState);
    state[6](key, (value) => {
      if (!value.data) cleared.push(key);
    });
    state[0][key] = [
      // This test only dispatches mutation events, which await a boolean result.
      (async () => {
        requested.push(key);
        await gate;
        set({ data: refreshedData });
        return true;
      }) as RevalidateCallback,
    ];
  }
  let finished = false;
  const refreshing = revalidateRecurringData(mutate).then(() => {
    finished = true;
  });
  await Promise.resolve();
  assert.deepEqual(requested, keys);
  assert.equal(finished, false, 'saving should wait for revalidation');
  for (const key of [...keys, unrelated]) assert.equal(cache.get(key)?.data, previousData);
  release();
  await refreshing;
  for (const key of keys) assert.equal(cache.get(key)?.data, refreshedData);
  assert.equal(cache.get(unrelated)?.data, previousData);
  assert.deepEqual(cleared, [], 'mounted registers must never receive an empty cache');
});

test('payment and attendance handlers both preserve the recurring cache during refresh', () => {
  const source = readFileSync(
    new URL('../../app/admin/recurring/GroupAttendanceTable.tsx', import.meta.url),
    'utf8',
  );
  assert.equal(source.match(/await revalidateRecurringData\(refresh\)/g)?.length, 2);
  assert.doesNotMatch(source, /await refresh\(/);
});
