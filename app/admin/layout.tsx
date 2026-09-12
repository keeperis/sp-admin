'use client';

import {
  AppShell,
  Avatar,
  Burger,
  Center,
  Group,
  Loader,
  MantineProvider,
  Menu,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Notifications } from '@mantine/notifications';
import {
  IconBellRinging,
  IconBrandFacebook,
  IconBuildingBank,
  IconCalendarEvent,
  IconDashboard,
  IconEdit,
  IconFileDescription,
  IconLogout,
  IconMoon,
  IconQrcode,
  IconRepeat,
  IconSun,
  IconTicket,
} from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useTheme } from '@/src/components/theme/ThemeProvider';
import { appTheme } from '@/src/theme';

const navItems = [
  { href: '/admin', label: 'Apžvalga', icon: IconDashboard },
  { href: '/admin/workshops', label: 'Užsiėmimai', icon: IconCalendarEvent },
  { href: '/admin/bookings', label: 'Rezervacijos', icon: IconTicket },
  { href: '/admin/recurring', label: 'Abonementai', icon: IconRepeat },
  { href: '/admin/corporate', label: 'Įmonės', icon: IconBuildingBank },
  { href: '/admin/tickets', label: 'Bilietai', icon: IconQrcode },
  { href: '/admin/reminders', label: 'Priminimų prenumeratoriai', icon: IconBellRinging },
  { href: '/admin/content', label: 'Turinys', icon: IconEdit },
  { href: '/admin/legal', label: 'Teisinė informacija', icon: IconFileDescription },
  { href: '/admin/meta', label: 'Meta', icon: IconBrandFacebook },
];

const adminLightBg = '#ffffff';
const adminDarkBg = '#1a1b1e';

type AdminGateState = 'checking' | 'granted' | 'redirecting';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [opened, { toggle, close }] = useDisclosure(false);
  const [gateState, setGateState] = useState<AdminGateState>('checking');
  const isDark = theme === 'dark';
  const bg = isDark ? adminDarkBg : adminLightBg;

  useEffect(() => {
    let cancelled = false;

    async function guardAdminAccess() {
      const callbackUrl = pathname || '/admin';

      if (status === 'loading') {
        setGateState('checking');
        return;
      }

      if (status === 'unauthenticated') {
        setGateState('redirecting');
        router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      setGateState('checking');

      try {
        const response = await fetch('/api/admin/status', { cache: 'no-store' });
        const payload = (await response.json()) as { code?: string; error?: string };

        if (cancelled) return;

        if (response.ok) {
          setGateState('granted');
          return;
        }

        setGateState('redirecting');
        await signOut({ redirect: false });
        if (cancelled) return;

        const loginUrl = new URL('/login', window.location.origin);
        loginUrl.searchParams.set('callbackUrl', callbackUrl);
        if (payload.code) {
          loginUrl.searchParams.set('reason', payload.code);
        }
        router.replace(`${loginUrl.pathname}${loginUrl.search}`);
      } catch {
        if (!cancelled) {
          setGateState('granted');
        }
      }
    }

    void guardAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, status]);

  if (gateState !== 'granted') {
    return (
      <MantineProvider theme={appTheme} forceColorScheme={isDark ? 'dark' : 'light'}>
        <Notifications />
        <Center mih="100vh" bg={bg}>
          <Stack align="center" gap="sm">
            <Loader size="md" />
            <Text size="sm" c="dimmed">
              {gateState === 'redirecting'
                ? 'Tikrinama prieiga ir nukreipiama…'
                : 'Tikrinama prieiga…'}
            </Text>
          </Stack>
        </Center>
      </MantineProvider>
    );
  }

  return (
    <MantineProvider theme={appTheme} forceColorScheme={isDark ? 'dark' : 'light'}>
      <Notifications />
      <AppShell
        navbar={{
          width: 250,
          breakpoint: 'sm',
          collapsed: { mobile: !opened, desktop: false },
        }}
        header={{
          height: 60,
        }}
        padding="md"
        styles={{
          main: {
            backgroundColor: bg,
            overflowX: 'clip',
            maxWidth: '100vw',
          },
          navbar: {
            backgroundColor: bg,
          },
          header: {
            backgroundColor: bg,
          },
        }}
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between" wrap="nowrap" gap="xs">
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <Text fw={700} size="lg" hiddenFrom="xs" style={{ whiteSpace: 'nowrap' }}>
                SoulPoetry
              </Text>
              <Text fw={700} size="lg" visibleFrom="xs" style={{ whiteSpace: 'nowrap' }}>
                SoulPoetry administravimas
              </Text>
            </Group>
            {session?.user && (
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Group
                    gap="xs"
                    wrap="nowrap"
                    style={{ cursor: 'pointer', minWidth: 0, maxWidth: 'min(15rem, 34vw)' }}
                  >
                    <Avatar src={session.user.image} size="sm" style={{ flexShrink: 0 }} />
                    <Text size="sm" truncate="end" style={{ minWidth: 0 }}>
                      {session.user.name || session.user.email}
                    </Text>
                  </Group>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={isDark ? <IconSun size={14} /> : <IconMoon size={14} />}
                    onClick={toggleTheme}
                  >
                    {isDark ? 'Šviesi tema' : 'Tamsi tema'}
                  </Menu.Item>
                  <Menu.Item leftSection={<IconLogout size={14} />} onClick={() => signOut()}>
                    Atsijungti
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <nav>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{ textDecoration: 'none' }}
                  onClick={close}
                >
                  <Group
                    p="sm"
                    mb="xs"
                    style={{
                      borderRadius: '4px',
                      backgroundColor: isActive
                        ? isDark
                          ? 'rgba(255,255,255,0.1)'
                          : '#e7f5ff'
                        : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={18} />
                    <Text size="sm" fw={isActive ? 600 : 400}>
                      {item.label}
                    </Text>
                  </Group>
                </Link>
              );
            })}
          </nav>
        </AppShell.Navbar>

        <AppShell.Main>{children}</AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SessionProvider>
  );
}
