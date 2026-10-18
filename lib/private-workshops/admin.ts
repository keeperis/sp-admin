import type { PrivateWorkshopBooking, PrivateWorkshopConfig } from './types';

export const PRIVATE_API = '/api/admin/private-workshops';

export const bookingStatuses = {
  pending_transfer: { label: 'Laukia pavedimo', color: 'orange' },
  confirmed: { label: 'Patvirtinta', color: 'green' },
  cancelled: { label: 'Atšaukta', color: 'gray' },
  expired: { label: 'Pasibaigė apmokėjimo terminas', color: 'gray' },
  completed: { label: 'Įvyko', color: 'blue' },
} as const;

export function money(value: number) {
  return new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(value);
}

export function localDateTime(value: string | null) {
  if (!value) return '–';
  return new Intl.DateTimeFormat('lt-LT', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Vilnius',
  }).format(new Date(value));
}

export function addDates(existing: string[], input: string[]) {
  return [...new Set([...existing, ...input])].sort();
}

export function validImageUrl(value: string) {
  if (!value.trim()) return true;
  if (value.length > 2000 || value.includes('\\')) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function validateConfig(config: PrivateWorkshopConfig): string | null {
  if (config.settings.addonsDueNow) return 'Papildomos paslaugos apmokamos tik po užsiėmimo.';
  if (!validImageUrl(config.settings.coverImageUrl))
    return 'Netinkama viršelio nuotraukos nuoroda.';
  if (
    config.settings.enabled &&
    (!config.settings.titleLt.trim() ||
      !config.settings.descriptionLt.trim() ||
      !config.settings.placeName.trim())
  ) {
    return 'Prieš įjungdami registraciją užpildykite aprašymą, vietą ir pavadinimą.';
  }
  for (const item of config.types) {
    if (
      !item.titleLt.trim() ||
      !Number.isInteger(item.durationMin) ||
      item.durationMin < 15 ||
      item.durationMin > 720 ||
      item.durationMin % 15 !== 0 ||
      !Number.isInteger(item.minParticipants) ||
      item.minParticipants < 1 ||
      !Number.isInteger(item.maxParticipants) ||
      item.maxParticipants < item.minParticipants ||
      item.maxParticipants > 200 ||
      !Number.isFinite(item.pricePerPersonEur) ||
      item.pricePerPersonEur <= 0 ||
      item.pricePerPersonEur > 100000 ||
      !validImageUrl(item.thumbnailUrl)
    ) {
      return `Patikrinkite dirbtuvių tipą „${item.titleLt || 'be pavadinimo'}“: pavadinimą, trukmę, dalyvių ribas, kainą ir nuotrauką.`;
    }
  }
  for (const item of config.addons) {
    if (
      !item.titleLt.trim() ||
      !Number.isFinite(item.priceEur) ||
      item.priceEur < 0 ||
      item.priceEur > 100000 ||
      !Number.isInteger(item.durationMin) ||
      item.durationMin < 0 ||
      item.durationMin > 720 ||
      item.durationMin % 15 !== 0
    )
      return `Patikrinkite papildomą paslaugą „${item.titleLt || 'be pavadinimo'}“.`;
  }
  for (const item of config.windows) {
    if (
      !item.dates.length ||
      item.dates.some((date) => {
        if (!/^20\d{2}-\d{2}-\d{2}$/.test(date)) return true;
        const parsed = new Date(`${date}T12:00:00Z`);
        return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date;
      }) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.startTime) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.endTime) ||
      item.startTime >= item.endTime ||
      !item.typeIds.length
    )
      return 'Kiekvienam laikui reikia datų, teisingo pradžios–pabaigos intervalo ir bent vieno dirbtuvių tipo.';
    if (
      item.typeIds.some((id) => !config.types.some((type) => type.id === id)) ||
      item.addonIds.some((id) => !config.addons.some((addon) => addon.id === id))
    )
      return 'Laikui priskirtas nebeegzistuojantis tipas arba paslauga.';
    const [startHours, startMinutes] = item.startTime.split(':').map(Number);
    const [endHours, endMinutes] = item.endTime.split(':').map(Number);
    const duration = (endHours - startHours) * 60 + endMinutes - startMinutes;
    if (
      item.typeIds.some((id) => config.types.find((type) => type.id === id)!.durationMin > duration)
    )
      return 'Priskirto dirbtuvių tipo trukmė netelpa į laiko intervalą.';
  }
  return null;
}

// Preview only. The API recalculates and persists totals from the booking snapshot.
export function completionPreview(booking: PrivateWorkshopBooking, participants: number) {
  const billable = Math.max(booking.quote.minimumParticipants, participants);
  const totalCents =
    billable * Math.round(booking.quote.pricePerPersonEur * 100) +
    Math.round(booking.quote.addonsTotalEur * 100);
  return {
    total: totalCents / 100,
    balance: (totalCents - Math.round(booking.quote.depositEur * 100)) / 100,
  };
}

export async function privateRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...init?.headers,
    },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      response.status === 409 && data.code === 'PRIVATE_CONFIG_CONFLICT'
        ? 'Duomenys pasikeitė kitame lange. Atnaujinkite duomenis ir pakartokite veiksmą. Jūsų pakeitimai dar neišsaugoti.'
        : data.error || 'Nepavyko atlikti veiksmo.',
    );
  return data as T;
}
