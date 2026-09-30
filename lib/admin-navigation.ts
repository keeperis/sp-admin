import {
  IconBell,
  IconBellRinging,
  IconBrandFacebook,
  IconBuildingBank,
  IconCalendarEvent,
  IconDashboard,
  IconEdit,
  IconFileDescription,
  IconHome,
  IconQrcode,
  IconRepeat,
} from '@tabler/icons-react';

// Shared by the home launcher and sidebar so routes/labels cannot drift apart.
export const adminSections = [
  {
    href: '/admin/workshops',
    label: 'Dirbtuvės',
    description: 'Planuojamos ir praėjusios dirbtuvės, rezervacijos ir apmokėjimai.',
    icon: IconCalendarEvent,
  },
  {
    href: '/admin/recurring',
    label: 'Nuolatiniai užsiėmimai',
    description: 'Grupės, abonementai ir lankomumas.',
    icon: IconRepeat,
  },
  {
    href: '/admin/corporate',
    label: 'Įmonės',
    description: 'Įmonių paskyros ir jų dalyviai.',
    icon: IconBuildingBank,
  },
  {
    href: '/admin/tickets',
    label: 'Bilietai',
    description: 'Bilietų paieška ir patikrinimas.',
    icon: IconQrcode,
  },
  {
    href: '/admin/reminders',
    label: 'Priminimų prenumeratoriai',
    description: 'Klientai, laukiantys žinių apie užsiėmimus.',
    icon: IconBellRinging,
  },
  {
    href: '/admin/notifications',
    label: 'Pranešimai į telefoną',
    description: 'Pranešimų apie naujas registracijas nustatymai.',
    icon: IconBell,
  },
  {
    href: '/admin/content',
    label: 'Turinys',
    description: 'Svetainių tekstai ir turinys.',
    icon: IconEdit,
  },
  {
    href: '/admin/legal',
    label: 'Teisinė informacija',
    description: 'Taisyklės ir privatumo informacija.',
    icon: IconFileDescription,
  },
  {
    href: '/admin/meta',
    label: 'Meta',
    description: 'Facebook integracijos valdymas.',
    icon: IconBrandFacebook,
  },
  {
    href: '/admin/overview',
    label: 'Apžvalga',
    description: 'Prisijungimų, integracijų ir paslaugų būsena.',
    icon: IconDashboard,
  },
];

export const adminNavItems = [
  { href: '/admin', label: 'Pagrindinis', icon: IconHome },
  ...adminSections,
];

export function isAdminNavActive(pathname: string, href: string) {
  return pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));
}
