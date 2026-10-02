import type { ScopedMutator } from 'swr';

export function revalidateRecurringData(mutate: ScopedMutator) {
  // Omit the data argument: passing undefined clears the cache, unmounts the
  // registers and loses both page and table scroll positions while refetching.
  return mutate((key) => typeof key === 'string' && key.startsWith('/api/admin/recurring/'));
}
