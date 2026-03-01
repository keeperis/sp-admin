'use client';

import { AppShell, Avatar, Burger, Group, MantineProvider, Menu, Text } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { IconCalendarEvent, IconEdit, IconLogout, IconMoon, IconSun } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { useDisclosure } from '@mantine/hooks';
import { useTheme } from '@/src/components/theme/ThemeProvider';
import { appTheme } from '@/src/theme';

const navItems = [
  { href: '/admin/workshops', label: 'Workshops', icon: IconCalendarEvent },
  { href: '/admin/content', label: 'Content', icon: IconEdit },
];

const adminLightBg = '#ffffff';
const adminDarkBg = '#1a1b1e';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [opened, { toggle, close }] = useDisclosure(false);
  const isDark = theme === 'dark';
  const bg = isDark ? adminDarkBg : adminLightBg;

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
          <Group h="100%" px="md" justify="space-between">
            <Group gap="sm">
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <Text fw={700} size="lg">
                SoulPoetry Admin
              </Text>
            </Group>
            {session?.user && (
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Group gap="xs" style={{ cursor: 'pointer' }}>
                    <Avatar src={session.user.image} size="sm" />
                    <Text size="sm">{session.user.name || session.user.email}</Text>
                  </Group>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={isDark ? <IconSun size={14} /> : <IconMoon size={14} />}
                    onClick={toggleTheme}
                  >
                    {isDark ? 'Light' : 'Dark'}
                  </Menu.Item>
                  <Menu.Item leftSection={<IconLogout size={14} />} onClick={() => signOut()}>
                    Sign out
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
