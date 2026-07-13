'use client';

import { IconBrandFacebook, IconBrandInstagram, IconMail } from '@tabler/icons-react';
import gsap from 'gsap';
import Image from 'next/image';
import { useLayoutEffect, useRef } from 'react';
import styles from './WelcomeLanding.module.css';

interface WelcomeLandingProps {
  ceramicsUrl: string;
  yogaUrl: string;
}

export function WelcomeLanding({ ceramicsUrl, yogaUrl }: WelcomeLandingProps) {
  const logoRef = useRef<HTMLDivElement>(null);
  const yogaRef = useRef<HTMLAnchorElement>(null);
  const ceramicsRef = useRef<HTMLAnchorElement>(null);
  const shopRef = useRef<HTMLSpanElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const logoEl = logoRef.current;
    const yogaEl = yogaRef.current;
    const ceramicsEl = ceramicsRef.current;
    const shopEl = shopRef.current;
    const footerEl = footerRef.current;
    if (!logoEl || !yogaEl || !ceramicsEl || !shopEl || !footerEl) return;

    const ctx = gsap.context(() => {
      const finalizeEntry = () => {
        logoEl.classList.add(styles.logoEntered);
        yogaEl.classList.add(styles.cardLinkEntered);
        ceramicsEl.classList.add(styles.cardLinkEntered);
        shopEl.classList.add(styles.cardLinkEntered);
        footerEl.classList.add(styles.footerEntered);
      };

      const tl = gsap.timeline({
        defaults: { ease: 'expo.out', force3D: true },
        delay: 0.08,
        onComplete: finalizeEntry,
      });

      tl.to(logoEl, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 1.2,
      });
      tl.to(
        yogaEl,
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 1.9,
        },
        '<0.2',
      );
      tl.to(
        ceramicsEl,
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 1.9,
        },
        '<0.28',
      );
      tl.to(
        shopEl,
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 1.9,
        },
        '<0.28',
      );
      tl.to(
        footerEl,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
        },
        '<1.05',
      );
    });

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.overlay} aria-hidden />

      <div className={styles.content}>
        <div ref={logoRef} className={styles.logoWrap}>
          <Image
            src="/sp_logo_light.png"
            alt="Soul Poetry"
            width={1040}
            height={505}
            priority
            className={styles.logo}
          />
        </div>

        <div className={styles.centerStage}>
          <section className={styles.buttons} aria-label="Choose destination">
            <a
              ref={yogaRef}
              className={styles.cardLink}
              href={yogaUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open Yoga site"
            >
              <span className={styles.cardLabelWrap}>
                <span className={styles.cardLabel}>Yoga</span>
                <span className={styles.cardSubLabel}>Potyriai kurie išlaisvina</span>
              </span>
            </a>

            <a
              ref={ceramicsRef}
              className={styles.cardLink}
              href={ceramicsUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open Ceramics site"
            >
              <span className={styles.cardLabelWrap}>
                <span className={styles.cardLabel}>Keramika</span>
                <span className={styles.cardSubLabel}>Akimirkos kurios neišdilsta</span>
              </span>
            </a>

            <span ref={shopRef} className={`${styles.cardLink} ${styles.cardLinkDisabled}`}>
              <span className={styles.cardLabelWrap}>
                <span className={styles.cardLabel}>El. Parduotuvė</span>
                <span className={styles.cardSubLabel}>Jau greitai</span>
              </span>
            </span>
          </section>
        </div>

        <footer ref={footerRef} className={styles.footer}>
          <div className={styles.footerInner}>
            <p className={styles.footerPoem}>Keramikos ir jogos namai - jaukiam laikui su savimi</p>

            <nav className={styles.footerContact} aria-label="Soul Poetry kontaktai">
              <div className={styles.footerContactList}>
                <a
                  href="https://www.instagram.com/soulpoetry.love"
                  className={styles.footerContactLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <IconBrandInstagram size={15} stroke={1.8} className={styles.footerContactIcon} />
                  Instagram
                </a>
                <a
                  href="https://www.facebook.com/potterylikepoetry"
                  className={styles.footerContactLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <IconBrandFacebook size={15} stroke={1.8} className={styles.footerContactIcon} />
                  Facebook
                </a>
                <a href="mailto:info@soulpoetry.lt" className={styles.footerContactLink}>
                  <IconMail size={15} stroke={1.8} className={styles.footerContactIcon} />
                  info@soulpoetry.lt
                </a>
              </div>
            </nav>

            <p className={styles.copyright}>© {new Date().getFullYear()} SOUL POETRY.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
