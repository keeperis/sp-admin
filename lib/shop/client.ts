export async function shopRequest(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api/admin/shop/${path}`, {
    method,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response
    .json()
    .catch(() => ({ error: 'Serveris grąžino netinkamą atsakymą.' }));
  if (!response.ok) throw new Error(result.error || 'Nepavyko išsaugoti.');
  return result;
}

export const shopSlug = (value: string) =>
  value
    .toLocaleLowerCase('lt')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
