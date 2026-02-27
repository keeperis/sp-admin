'use client';

import { Box, Button, Stack, Text, Title } from '@mantine/core';
import { IconBrandFacebook, IconBrandInstagram, IconMail } from '@tabler/icons-react';
import { getTranslations, type Locale } from '@/src/i18n';
import styles from './LocationContact.module.css';

interface LocationContactProps {
  locale: Locale;
  footerOnly?: boolean;
}

export function LocationContact({ locale, footerOnly = false }: LocationContactProps) {
  const t = getTranslations(locale);
  const baseHref = footerOnly ? `/${locale}` : '';
  const sectionLinks = [
    { href: `${baseHref}#top`, label: locale === 'lt' ? 'Pradžia' : 'Home' },
    { href: `${baseHref}#workshops`, label: t.workshops.title },
    { href: `${baseHref}#one-time`, label: t.oneTimeWorkshops.title },
    { href: `${baseHref}#ongoing`, label: t.ongoingClasses.title },
    { href: `${baseHref}#private-events`, label: t.privateEvents.title },
    { href: `${baseHref}#faq`, label: t.faq.title },
  ];
  const usefulLinks = [
    {
      href: '/privatumo-politika',
      label: locale === 'lt' ? 'Privatumo politika' : 'Privacy policy',
    },
    {
      href: '/duomenu-tvarkymas',
      label: locale === 'lt' ? 'Duomenų tvarkymas' : 'Data processing',
    },
    {
      href: '/dirbtuviu-organizavimo-tvarka',
      label: locale === 'lt' ? 'Dirbtuvių organizavimo tvarka' : 'Workshop terms',
    },
  ];

  const footerContent = (
    <Box className={styles.footer} py="xl" px={{ base: 'md', sm: 'xl' }}>
      <div className={styles.footerGrid}>
        <div className={styles.footerColumn}>
          <Text className={styles.footerHeading}>
            {locale === 'lt' ? 'Susisiekite' : 'Contact'}
          </Text>
          <Stack gap="sm" align="flex-start">
            <Button
              color="gray"
              variant="outline"
              size="sm"
              radius="xl"
              px="sm"
              className={styles.footerContactBtn}
              leftSection={<IconMail size={16} />}
            >
              {t.location.email}
            </Button>
            <Button
              color="gray"
              variant="outline"
              size="sm"
              radius="xl"
              px="sm"
              className={styles.footerContactBtn}
              leftSection={<IconBrandInstagram size={16} />}
            >
              {t.location.instagram}
            </Button>
            <Button
              color="gray"
              variant="outline"
              size="sm"
              radius="xl"
              px="sm"
              className={styles.footerContactBtn}
              leftSection={<IconBrandFacebook size={16} />}
            >
              {t.location.facebook}
            </Button>
          </Stack>
        </div>

        <div className={styles.footerColumn} />

        <div className={styles.footerColumn}>
          <Stack gap={6}>
            {sectionLinks.map((link) => (
              <a key={link.href} href={link.href} className={styles.footerLink}>
                {link.label}
              </a>
            ))}
          </Stack>
        </div>

        <div className={styles.footerColumn}>
          <Stack gap={6}>
            {usefulLinks.map((link) => (
              <a key={link.href} href={link.href} className={styles.footerLink}>
                {link.label}
              </a>
            ))}
          </Stack>
        </div>
      </div>
      <Text className={styles.copyright}>
        © {new Date().getFullYear()} SOUL POETRY.
      </Text>
    </Box>
  );

  if (footerOnly) {
    return <footer>{footerContent}</footer>;
  }

  return (
    <section id="contact" className={styles.section} style={{ marginTop: '6rem' }}>
      <Box pt="2xl" pb="xl" px={{ base: 'md', sm: 'xl' }}>
        <Stack gap="xl" maw={800} mx="auto">
          <Title order={2} ta="center" size="2.5rem" fw={600} className={styles.title}>
            {t.location.title}
          </Title>
          <Box ta="center">
            <Text size="md" c="dimmed" className={styles.text}>
              {t.location.howToFind}
            </Text>
          </Box>
        </Stack>
      </Box>
      <Box className={styles.mapWrapper}>
        <iframe
          title="Soul Poetry studio location"
          src="https://www.google.com/maps?q=Pottery+like+Poetry,+Vilnius&output=embed"
          className={styles.mapFrame}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </Box>
      {footerContent}
    </section>
  );
}
