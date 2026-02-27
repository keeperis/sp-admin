'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  List,
  Modal,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconBrandFacebook,
  IconCalendarEvent,
  IconClockHour3,
  IconMail,
  IconMapPin,
  IconPhone,
  IconX,
} from '@tabler/icons-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { buildApiUrl } from '@/lib/api';
import { getConfiguredSiteKey } from '@/lib/site';
import { useArtboardReady } from '@/src/components/background/ArtboardReadyProvider';
import type { Workshop } from '@/src/data/workshops';
import { getTranslations, type Locale } from '@/src/i18n';
import styles from './UpcomingWorkshops.module.css';

gsap.registerPlugin(ScrollTrigger);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const LT_MONTHS_GENITIVE = [
  'sausio',
  'vasario',
  'kovo',
  'balandžio',
  'gegužės',
  'birželio',
  'liepos',
  'rugpjūčio',
  'rugsėjo',
  'spalio',
  'lapkričio',
  'gruodžio',
];
const LT_WEEKDAYS = [
  'pirmadienį',
  'antradienį',
  'trečiadienį',
  'ketvirtadienį',
  'penktadienį',
  'šeštadienį',
  'sekmadienį',
];

const CONTACT_EMAIL = 'info@soulpoetry.lt';
const CONTACT_PHONE = '+37060000000';

interface UpcomingWorkshopsProps {
  locale: Locale;
}

export function UpcomingWorkshops({ locale }: UpcomingWorkshopsProps) {
  const t = getTranslations(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<string>('closest');
  const { colorScheme } = useMantineColorScheme();
  const uiColor = colorScheme === 'dark' ? '#e9ecef' : '#495057';
  const sectionRef = useRef<HTMLElement>(null);
  const line1Ref = useRef<HTMLDivElement>(null);
  const line2Ref = useRef<HTMLDivElement>(null);
  const cardsGridRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const modalPanelRef = useRef<HTMLDivElement>(null);
  const modalItemRefs = useRef<Array<HTMLElement | null>>([]);
  const { isReady } = useArtboardReady();

  const titleText = t.workshops.title;
  const titleWords = titleText.split(' ');
  const word1 = titleWords[0] ?? '';
  const word2 = titleWords.slice(1).join(' ') || '';

  const site = getConfiguredSiteKey();
  const { data } = useSWR<{ workshops: Workshop[] }>(
    buildApiUrl('/api/workshops', { site }),
    fetcher,
  );
  const workshops = data?.workshops || [];
  const selectedWorkshopId = searchParams.get('workshop');
  const selectedWorkshop = useMemo(
    () => workshops.find((workshop) => workshop.id === selectedWorkshopId) || null,
    [workshops, selectedWorkshopId],
  );
  const [activeWorkshop, setActiveWorkshop] = useState<typeof selectedWorkshop>(null);

  const filteredWorkshops = useMemo(() => {
    const now = new Date();

    return workshops
      .filter((workshop) => {
        const workshopDate = new Date(workshop.startISO);
        if (workshopDate < now) return false;

        switch (activeFilter) {
          case 'workshops':
            return workshop.eventType !== 'ongoing';
          case 'ongoing':
            return workshop.eventType === 'ongoing';
          default:
            return true;
        }
      })
      .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime())
      .slice(0, 6);
  }, [activeFilter, workshops]);

  /* Scroll animacija: žodžiai suvažiuoja į vidurį (±50px), desktop: pradeda viduryje tarp krašto ir centro */
  useEffect(() => {
    const section = sectionRef.current;
    const line1 = line1Ref.current;
    const line2 = line2Ref.current;
    if (!section || !line1 || !line2) return;

    const isDesktop = () => window.innerWidth >= 768;
    const startX = isDesktop() ? '25vw' : '50vw';

    gsap.set(line1, { x: `-${startX}` });
    gsap.set(line2, { x: startX });

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top 80%',
      end: 'top 30%',
      scrub: 1,
      animation: gsap
        .timeline()
        .to(line1, { x: -50, ease: 'power2.out' })
        .to(line2, { x: 50, ease: 'power2.out' }, '<'),
    });

    return () => st.kill();
  }, []);

  /* Filter juostos ir eventų kortelių animacija: scrolinant atsiranda */
  useEffect(() => {
    if (!isReady) return;
    const grid = cardsGridRef.current;
    const tabs = tabsRef.current;
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('[data-workshop-card]'));
    if (cards.length === 0 && !tabs) return;

    if (tabs) gsap.set(tabs, { y: 40, opacity: 0 });
    gsap.set(cards, { y: 70, opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: grid,
        start: 'top 90%',
        end: 'top 30%',
        scrub: 1.2,
      },
    });

    if (tabs) {
      tl.to(tabs, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }, 0);
    }

    const stagger = 0.08;
    cards.forEach((card, i) => {
      tl.to(
        card,
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
        },
        0.05 + i * stagger,
      );
    });

    const refresh = () => ScrollTrigger.refresh();
    setTimeout(refresh, 200);
    setTimeout(refresh, 1000);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [isReady]);

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    if (locale === 'lt') {
      const monthRaw = LT_MONTHS_GENITIVE[date.getMonth()] || '';
      const month = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
      const day = date.getDate();
      const weekday = LT_WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
      const time = date.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' });
      return `${month} ${day} d., ${weekday} ${time}`;
    }
    const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${monthDay}, ${weekday} ${time}`;
  };

  const updateWorkshopQuery = (workshopId?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (workshopId) params.set('workshop', workshopId);
    else params.delete('workshop');
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (selectedWorkshop) {
      setActiveWorkshop(selectedWorkshop);
    }
  }, [selectedWorkshop]);

  useEffect(() => {
    if (!selectedWorkshopId) return;
    const panel = modalPanelRef.current;
    const items = modalItemRefs.current.filter(Boolean) as HTMLElement[];
    if (!panel) return;

    const raf = requestAnimationFrame(() => {
      gsap.fromTo(
        panel,
        { y: 14, opacity: 0.85 },
        { y: 0, opacity: 1, duration: 0.28, ease: 'power2.out' },
      );

      if (items.length > 0) {
        gsap.fromTo(
          items,
          { y: 10, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.24,
            stagger: 0.04,
            ease: 'power2.out',
            delay: 0.05,
          },
        );
      }
    });

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [selectedWorkshopId]);

  useEffect(() => {
    const isModalOpen = Boolean(selectedWorkshopId);
    if (!isModalOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [selectedWorkshopId]);

  return (
    <section ref={sectionRef} className={styles.section}>
      <Box pt="xl" pb={{ base: '5rem', md: '5rem' }} id="workshops">
        <Container size="lg">
          <Stack gap="xl">
            <div className={styles.sectionTitleWrapper}>
              <div ref={line1Ref} className={styles.sectionTitleLine}>
                {word1}
              </div>
              <div ref={line2Ref} className={styles.sectionTitleLine}>
                {word2}
              </div>
            </div>

            <Box ref={tabsRef}>
              <Tabs
                color={uiColor}
                value={activeFilter}
                onChange={(val) => setActiveFilter(val || 'closest')}
              >
                <Tabs.List justify="center">
                  <Tabs.Tab value="closest" fw={500}>
                    {locale === 'lt' ? 'Artimiausi' : 'Closest'}
                  </Tabs.Tab>
                  <Tabs.Tab value="workshops" fw={500}>
                    {locale === 'lt' ? 'Dirbtuvės' : 'Workshops'}
                  </Tabs.Tab>
                  <Tabs.Tab value="ongoing" fw={500}>
                    {locale === 'lt' ? 'Nuolatiniai' : 'Ongoing'}
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs>
            </Box>

            <SimpleGrid ref={cardsGridRef} cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
              {filteredWorkshops.map((workshop) => (
                <Card
                  key={workshop.id}
                  data-workshop-card
                  className={styles.workshopCard}
                  shadow="sm"
                  padding="xl"
                  radius="lg"
                  withBorder
                  style={{
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {workshop.coverImageUrl && (
                    <Card.Section>
                      <Box
                        style={{ aspectRatio: '16/9', overflow: 'hidden', position: 'relative' }}
                      >
                        <Image
                          src={workshop.coverImageUrl}
                          alt={locale === 'lt' ? workshop.titleLt : workshop.titleEn}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          style={{ objectFit: 'cover' }}
                        />
                      </Box>
                    </Card.Section>
                  )}
                  <Stack gap="md" pt={workshop.coverImageUrl ? 'md' : undefined}>
                    <Text fw={600} size="lg" className={styles.workshopCardTitle}>
                      {locale === 'lt' ? workshop.titleLt : workshop.titleEn}
                    </Text>
                    <Stack gap={4}>
                      <Text size="sm" className={styles.metaText}>
                        {formatDate(workshop.startISO)}
                      </Text>
                      <Text size="sm" className={styles.metaText}>
                        {(workshop.sessionsCount ?? 1) > 1
                          ? locale === 'lt'
                            ? 'Vieno užsiėmimo trukmė'
                            : 'Duration per session'
                          : locale === 'lt'
                            ? 'Trukmė'
                            : 'Duration'}
                        : {workshop.durationMin} {locale === 'lt' ? 'min' : 'min'}
                      </Text>
                    </Stack>
                    <Group justify="space-between" mt="auto" wrap="wrap" gap="xs">
                      {(() => {
                        const sessions = workshop.sessionsCount ?? 1;
                        const pricePer = workshop.pricePerSession ?? workshop.priceEur ?? 0;

                        if (sessions === 1) {
                          return (
                            <Text fw={600} size="lg" className={styles.priceText}>
                              {t.workshops.price} {pricePer}€
                            </Text>
                          );
                        }
                        return (
                          <Text fw={600} size="lg" className={styles.priceText}>
                            {t.workshops.priceFrom} {pricePer}€
                          </Text>
                        );
                      })()}
                      {workshop.spotsLeft === 0 ? (
                        <Badge className={`${styles.spotsBadge} ${styles.spotsFull}`} size="lg">
                          {locale === 'lt' ? 'Grupė pilna' : t.workshops.full}
                        </Badge>
                      ) : (
                        <Badge
                          className={`${styles.spotsBadge} ${
                            workshop.spotsLeft <= 2 ? styles.spotsLow : styles.spotsAvailable
                          }`}
                          size="lg"
                        >
                          {(locale === 'lt' ? 'Liko vietų' : 'Spots left') +
                            ` - ${workshop.spotsLeft}`}
                        </Badge>
                      )}
                    </Group>
                    <Button
                      color="gray"
                      variant="light"
                      mt="md"
                      onClick={() => updateWorkshopQuery(workshop.id)}
                    >
                      {t.workshops.more}
                    </Button>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      <Modal
        key={`workshop-modal-${colorScheme}`}
        opened={Boolean(selectedWorkshopId)}
        onClose={() => updateWorkshopQuery()}
        onExitTransitionEnd={() => setActiveWorkshop(null)}
        centered
        size="xl"
        withCloseButton={false}
        classNames={{
          content: styles.modalContent,
          header: styles.modalHeader,
          body: styles.modalBody,
          title: styles.modalTitle,
        }}
        transitionProps={{
          transition: 'fade-down',
          duration: 500,
          timingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        overlayProps={{
          color: '#000000',
          backgroundOpacity: colorScheme === 'dark' ? 0 : 0.5,
          blur: colorScheme === 'dark' ? 8 : 4,
        }}
        title={null}
      >
        {activeWorkshop ? (
          <Stack
            gap={0}
            ref={modalPanelRef}
            style={{ position: 'relative', flex: 1, minHeight: 0 }}
          >
            <ActionIcon
              onClick={() => updateWorkshopQuery()}
              variant="filled"
              color="dark"
              radius="xl"
              size="md"
              className={styles.modalCloseBtn}
              aria-label={locale === 'lt' ? 'Uždaryti modalą' : 'Close modal'}
            >
              <IconX size={16} />
            </ActionIcon>

            {/* Header – fiksuotas, nesiscrolina */}
            <div className={styles.modalHeaderSection}>
              {activeWorkshop.coverImageUrl ? (
                <Box
                  ref={(el) => {
                    modalItemRefs.current[0] = el;
                  }}
                  className={styles.modalCoverImage}
                >
                  <Image
                    src={activeWorkshop.coverImageUrl}
                    alt={locale === 'lt' ? activeWorkshop.titleLt : activeWorkshop.titleEn}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    style={{ objectFit: 'cover' }}
                  />
                </Box>
              ) : null}
              <Group
                ref={(el) => {
                  modalItemRefs.current[1] = el;
                  modalItemRefs.current[2] = el;
                }}
                gap="md"
                align="flex-start"
                wrap="wrap"
                mt={activeWorkshop.coverImageUrl ? 'lg' : undefined}
              >
                {/* Kairė: Pavadinimas + Data, trukmė, vieta */}
                <Stack gap="sm" style={{ flex: 1, minWidth: 180 }}>
                  <Text fw={600} size="lg" className={styles.priceText}>
                    {locale === 'lt' ? activeWorkshop.titleLt : activeWorkshop.titleEn}
                  </Text>
                  <Stack gap={8}>
                    <Group gap="xs" align="center">
                      <IconCalendarEvent size={16} stroke={1.8} />
                      <Text size="sm" className={styles.metaText}>
                        {formatDate(activeWorkshop.startISO)}
                      </Text>
                    </Group>
                    <Group gap="xs" align="center">
                      <IconClockHour3 size={16} stroke={1.8} />
                      <Text size="sm" className={styles.metaText}>
                        {(activeWorkshop.sessionsCount ?? 1) > 1
                          ? locale === 'lt'
                            ? 'Vieno užsiėmimo trukmė'
                            : 'Duration per session'
                          : locale === 'lt'
                            ? 'Trukmė'
                            : 'Duration'}
                        : {activeWorkshop.durationMin} {locale === 'lt' ? 'min' : 'min'}
                      </Text>
                    </Group>
                    <Group gap="xs" align="center">
                      <IconMapPin size={16} stroke={1.8} />
                      <Text size="sm" className={styles.metaText}>
                        {t.location.streetAddress}
                      </Text>
                    </Group>
                  </Stack>
                </Stack>
                {/* Dešinė: Kainos ir vietų laukas */}
                <Box className={styles.modalPriceBox}>
                  <Text
                    fw={600}
                    size="xl"
                    className={`${styles.priceText} ${styles.modalPriceAmount}`}
                  >
                    {(activeWorkshop.sessionsCount ?? 1) > 1
                      ? `${t.workshops.priceFrom} ${activeWorkshop.pricePerSession ?? activeWorkshop.priceEur ?? 0} €`
                      : `${activeWorkshop.pricePerSession ?? activeWorkshop.priceEur ?? 0} €`}
                  </Text>
                  {(activeWorkshop.sessionsCount ?? 1) === 1 && (
                    <Text size="xs" c="dimmed">
                      {t.workshops.perPerson}
                    </Text>
                  )}
                  {activeWorkshop.spotsLeft === 0 ? (
                    <Badge className={`${styles.spotsBadge} ${styles.spotsFull}`} size="md">
                      {locale === 'lt' ? 'Grupė pilna' : t.workshops.full}
                    </Badge>
                  ) : (
                    <Badge
                      className={`${styles.spotsBadge} ${
                        activeWorkshop.spotsLeft <= 2 ? styles.spotsLow : styles.spotsAvailable
                      }`}
                      size="md"
                    >
                      {(locale === 'lt' ? 'Liko vietų' : 'Spots left') +
                        ` – ${activeWorkshop.spotsLeft}`}
                    </Badge>
                  )}
                </Box>
              </Group>
            </div>

            {/* Vidurys – tik čia scrolinasi (aprašymas) */}
            <div className={styles.modalScrollSection}>
              {(() => {
                const description = activeWorkshop.descriptionStructured;
                const hasStructuredDescription =
                  description &&
                  Object.values(description).some((value) =>
                    Array.isArray(value) ? value.length > 0 : Boolean(value),
                  );

                if (!hasStructuredDescription) {
                  return (
                    <Text
                      ref={(el) => {
                        modalItemRefs.current[3] = el;
                      }}
                      size="sm"
                      c="dimmed"
                    >
                      {activeWorkshop.description ||
                        (locale === 'lt'
                          ? 'Renginio aprašymas bus paskelbtas netrukus.'
                          : 'Event description will be available soon.')}
                    </Text>
                  );
                }

                return (
                  <Stack
                    ref={(el) => {
                      modalItemRefs.current[3] = el;
                    }}
                    gap="sm"
                  >
                    {description.intro ? (
                      <Text size="sm" c="dimmed">
                        {description.intro}
                      </Text>
                    ) : null}
                    {description.paragraph1 ? (
                      <Text size="sm" c="dimmed">
                        {description.paragraph1}
                      </Text>
                    ) : null}
                    {description.paragraph2 ? (
                      <Text size="sm" c="dimmed">
                        {description.paragraph2}
                      </Text>
                    ) : null}
                    {description.paragraph3 ? (
                      <Text size="sm" c="dimmed">
                        {description.paragraph3}
                      </Text>
                    ) : null}
                    {description.listTitle ? (
                      <Text size="sm" fw={600} c="dimmed">
                        {description.listTitle}
                      </Text>
                    ) : null}
                    {description.listItems?.length ? (
                      <List spacing={6}>
                        {description.listItems.map((item) => (
                          <List.Item key={item}>
                            <Text size="sm" c="dimmed">
                              {item}
                            </Text>
                          </List.Item>
                        ))}
                      </List>
                    ) : null}
                    {description.closing1 ? (
                      <Text size="sm" c="dimmed">
                        {description.closing1}
                      </Text>
                    ) : null}
                    {description.closing2 ? (
                      <Text size="sm" c="dimmed">
                        {description.closing2}
                      </Text>
                    ) : null}
                    {description.closing3 ? (
                      <Text size="sm" c="dimmed">
                        {description.closing3}
                      </Text>
                    ) : null}
                  </Stack>
                );
              })()}
            </div>

            {/* Footer – viena eilutė: Registruokitės + 3 mygtukai */}
            <div className={styles.modalFooterSection}>
              <Group
                gap="sm"
                wrap="nowrap"
                justify="space-between"
                ref={(el) => {
                  modalItemRefs.current[4] = el;
                }}
              >
                <Text fw={600} size="lg" className={styles.priceText}>
                  {locale === 'lt' ? 'Registruokitės' : 'Register'}
                </Text>
                {/* Mobile: tik icon mygtukai */}
                <Group gap="xs" className={styles.modalFooterIconsOnly}>
                  {activeWorkshop.fbEventUrl ? (
                    <ActionIcon
                      component="a"
                      href={activeWorkshop.fbEventUrl}
                      target="_blank"
                      rel="noreferrer"
                      variant="light"
                      size="lg"
                      aria-label="Facebook"
                    >
                      <IconBrandFacebook size={20} />
                    </ActionIcon>
                  ) : (
                    <ActionIcon
                      component="a"
                      href={`/${locale}/workshops/${activeWorkshop.id}`}
                      variant="light"
                      size="lg"
                      aria-label="Facebook"
                    >
                      <IconBrandFacebook size={20} />
                    </ActionIcon>
                  )}
                  <ActionIcon
                    component="a"
                    href={`mailto:${CONTACT_EMAIL}`}
                    variant="light"
                    size="lg"
                    aria-label={locale === 'lt' ? 'El. paštu' : 'Email'}
                  >
                    <IconMail size={20} />
                  </ActionIcon>
                  <ActionIcon
                    component="a"
                    href={`tel:${CONTACT_PHONE}`}
                    variant="light"
                    size="lg"
                    aria-label={locale === 'lt' ? 'Telefonu' : 'Phone'}
                  >
                    <IconPhone size={20} />
                  </ActionIcon>
                </Group>
                {/* Desktop: pilni mygtukai */}
                <Group gap="xs" className={styles.modalFooterFullBtns}>
                  {activeWorkshop.fbEventUrl ? (
                    <Button
                      component="a"
                      href={activeWorkshop.fbEventUrl}
                      target="_blank"
                      rel="noreferrer"
                      size="xs"
                      variant="light"
                      leftSection={<IconBrandFacebook size={14} />}
                    >
                      Facebook
                    </Button>
                  ) : (
                    <Button
                      component="a"
                      href={`/${locale}/workshops/${activeWorkshop.id}`}
                      size="xs"
                      variant="light"
                      leftSection={<IconBrandFacebook size={14} />}
                    >
                      Facebook
                    </Button>
                  )}
                  <Button
                    component="a"
                    href={`mailto:${CONTACT_EMAIL}`}
                    size="xs"
                    variant="light"
                    leftSection={<IconMail size={14} />}
                  >
                    {locale === 'lt' ? 'El. paštu' : 'Email'}
                  </Button>
                  <Button
                    component="a"
                    href={`tel:${CONTACT_PHONE}`}
                    size="xs"
                    variant="light"
                    leftSection={<IconPhone size={14} />}
                  >
                    {locale === 'lt' ? 'Telefonu' : 'Phone'}
                  </Button>
                </Group>
              </Group>
            </div>
          </Stack>
        ) : (
          <Text c="dimmed">{locale === 'lt' ? 'Kraunama...' : 'Loading...'}</Text>
        )}
      </Modal>
    </section>
  );
}
