import type { Locale } from '@/src/i18n';

export function formatWorkshopDuration(durationMin: number, locale: Locale) {
  const totalMinutes = Math.max(0, Math.round(durationMin));
  if (totalMinutes < 60) {
    return locale === 'lt' ? `${totalMinutes} min.` : `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hoursText = locale === 'lt' ? `${hours} val.` : `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  const minutesText = locale === 'lt' ? `${minutes} min.` : `${minutes} min`;

  return minutes > 0 ? `${hoursText} ${minutesText}` : hoursText;
}
