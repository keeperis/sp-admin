type AutomaticMakeupResult = {
  status: 'scheduled' | 'covered' | 'unavailable' | 'failed';
  message: string;
};

export function automaticMakeupNotification(result?: AutomaticMakeupResult | null) {
  if (!result || result.status === 'covered') return null;
  const warning = result.status !== 'scheduled';
  return {
    title: warning
      ? 'Lankymas išsaugotas – patikrinkite pakaitinį vizitą'
      : 'Pakaitinis vizitas suplanuotas',
    message: result.message,
    color: warning ? 'yellow' : 'green',
    autoClose: warning ? (false as const) : 8000,
  };
}
