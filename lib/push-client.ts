export async function disablePushOnLogout() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    try {
      await fetch('/api/admin/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ action: 'disable', endpoint: subscription.endpoint }),
        signal: AbortSignal.timeout(3000),
      });
    } finally {
      await subscription.unsubscribe();
    }
  } catch {
    /* Logout must still work offline; expired provider subscriptions are cleaned by the sender. */
  }
}
