'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BG_IMAGES, shuffle } from '@/lib/bgImages';
import styles from './ArtboardBackground.module.css';
import { ArtboardColumn } from './ArtboardColumn';
import { useArtboardReady } from './ArtboardReadyProvider';

gsap.registerPlugin(ScrollTrigger);

const GAP_DESKTOP = 8;
const GAP_MOBILE = 4;
const MOBILE_BREAKPOINT = 768;
const FRAME = 0;
const ASPECT_WIDTH = 4;
const ASPECT_HEIGHT = 6;
const GRID_WIDTH_VW = 125;
const SPEEDS_4 = [0.45, 0.3, 0.5, 0.4];

const INITIAL_OFFSETS_PERCENT = [80, 51, 40, 70];

const COLUMN_IMAGE_ASSIGNMENT: number[][] = [
  [0, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11],
  [12, 13, 14, 15, 16, 17],
  [18, 19, 20, 21, 22, 23],
];

function getColumnConfig() {
  return { cols: 4, speeds: SPEEDS_4, gridClass: styles.gridCols4 };
}

export function ArtboardBackground() {
  const { setReady } = useArtboardReady();
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const setTrackRef = useCallback((el: HTMLDivElement | null, index: number) => {
    trackRefs.current[index] = el;
  }, []);
  const yValues = useRef<number[]>([]);
  const lastScrollY = useRef(0);
  const setHeightRef = useRef(0);
  const lastWidthRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [framesVisible, setFramesVisible] = useState(false);
  const [config, setConfig] = useState(getColumnConfig);
  const [sizing, setSizing] = useState<{
    tileHeight: number;
    tileGap: number;
    frame: number;
    setHeight: number;
    imagePool: string[][];
  } | null>(null);
  const loadedTilesRef = useRef<Set<HTMLDivElement>>(new Set());
  const revealedRef = useRef<Set<HTMLDivElement>>(new Set());
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onTileLoaded = useCallback((el: HTMLDivElement) => {
    loadedTilesRef.current.add(el);
  }, []);

  useEffect(() => {
    const updateSizing = () => {
      if (typeof window === 'undefined') return;
      const vw = window.innerWidth;
      if (lastWidthRef.current !== null && lastWidthRef.current === vw) return;
      lastWidthRef.current = vw;
      const cfg = getColumnConfig();
      setConfig(cfg);
      const tileGap = vw < MOBILE_BREAKPOINT ? GAP_MOBILE : GAP_DESKTOP;
      const colWidthPx = (vw * GRID_WIDTH_VW) / 100 / cfg.cols;
      const tileHeight = colWidthPx * (ASPECT_HEIGHT / ASPECT_WIDTH);
      const setHeight = (tileHeight + tileGap) * 6;
      const imagePool: string[][] = [];
      for (let c = 0; c < cfg.cols; c++) {
        const indices =
          COLUMN_IMAGE_ASSIGNMENT[c] ?? Array.from({ length: 6 }, (_, i) => c * 6 + i);
        const paths = indices
          .filter((i) => i >= 0 && i < BG_IMAGES.length)
          .slice(0, 6)
          .map((i) => BG_IMAGES[i]!);
        while (paths.length < 6) paths.push(BG_IMAGES[0]!);
        imagePool.push(shuffle(paths));
      }
      setSizing({
        tileHeight,
        tileGap,
        frame: FRAME,
        setHeight,
        imagePool,
      });
      setHeightRef.current = setHeight;
      yValues.current = Array.from({ length: cfg.cols }, (_, i) => {
        const pct = INITIAL_OFFSETS_PERCENT[i] ?? 0;
        return -(Math.min(100, Math.max(0, pct)) / 100) * setHeight;
      });
    };
    updateSizing();
    const ro = new ResizeObserver(updateSizing);
    if (rootRef.current) ro.observe(rootRef.current);
    window.addEventListener('resize', updateSizing);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSizing);
    };
  }, []);

  useEffect(() => {
    if (!sizing || !rootRef.current) return;
    const setHeight = sizing.setHeight;
    const speeds = config.speeds;
    const st = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const scrollY = self.scroll();
        const delta = scrollY - lastScrollY.current;
        lastScrollY.current = scrollY;
        trackRefs.current.forEach((track, i) => {
          if (!track) return;
          const speed = speeds[i] ?? 1;
          let y = yValues.current[i] ?? 0;
          y -= delta * speed;
          y = gsap.utils.wrap(-setHeight, 0, y);
          yValues.current[i] = y;
          gsap.set(track, { y });
        });
      },
    });
    lastScrollY.current = typeof window !== 'undefined' ? (window.scrollY ?? 0) : 0;
    const applyInitialOffsets = () => {
      trackRefs.current.forEach((track, i) => {
        if (track) gsap.set(track, { y: yValues.current[i] ?? 0 });
      });
      setIsReady(true);
    };
    requestAnimationFrame(() => requestAnimationFrame(applyInitialOffsets));
    return () => {
      st.kill();
    };
  }, [sizing, config.speeds]);

  useEffect(() => {
    const runReveal = () => {
      const revealed = revealedRef.current;
      const minTilesForReady = config.cols * 6;
      if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
      revealIntervalRef.current = setInterval(() => {
        const loaded = Array.from(loadedTilesRef.current);
        if (loaded.length === 0) return;

        const toReveal = loaded.filter((el) => !revealed.has(el));
        if (toReveal.length === 0) {
          if (loaded.length < minTilesForReady) return;
          if (revealIntervalRef.current) {
            clearInterval(revealIntervalRef.current);
            revealIntervalRef.current = null;
          }
          setFramesVisible(true);
          return;
        }
        const idx = Math.floor(Math.random() * toReveal.length);
        const el = toReveal[idx];
        if (!el) return;
        revealed.add(el);
        const img = el.querySelector('img');
        if (img) {
          gsap.to(img, {
            opacity: 1,
            filter: 'blur(0px)',
            scale: 1,
            duration: 0.55,
            ease: 'power2.out',
          });
        }

        if (revealed.size >= minTilesForReady) {
          if (revealIntervalRef.current) {
            clearInterval(revealIntervalRef.current);
            revealIntervalRef.current = null;
          }
          setFramesVisible(true);
        }
      }, 80);

      // Soft fallback: reveal all currently loaded tiles.
      setTimeout(() => {
        const loaded = Array.from(loadedTilesRef.current);
        loaded.forEach((el) => {
          if (revealed.has(el)) return;
          revealed.add(el);
          const img = el.querySelector('img');
          if (img) {
            gsap.to(img, {
              opacity: 1,
              filter: 'blur(0px)',
              scale: 1,
              duration: 0.5,
              ease: 'power2.out',
            });
          }
        });
      }, 2500);

      // Hard fallback: never block content forever if images fail to load.
      setTimeout(() => {
        setFramesVisible(true);
      }, 8000);
    };
    if (sizing && config.cols > 0) runReveal();
    return () => {
      if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
    };
  }, [sizing, config.cols]);

  useEffect(() => {
    if (framesVisible) setReady();
  }, [framesVisible, setReady]);

  useEffect(() => {
    if (!rootRef.current) return;
    const el = rootRef.current;
    let drift = 0;
    const start = performance.now();
    const tick = () => {
      drift = Math.sin(((performance.now() - start) / 45000) * Math.PI * 2) * 2;
      el.style.setProperty('--grid-offset-x', `${drift}px`);
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const defaultTileHeight = 400;
  const effectiveSizing = sizing ?? {
    tileHeight: defaultTileHeight,
    tileGap: GAP_DESKTOP,
    frame: FRAME,
    setHeight: (defaultTileHeight + GAP_DESKTOP) * 6,
    imagePool: [
      BG_IMAGES.slice(0, 6),
      BG_IMAGES.slice(6, 12),
      BG_IMAGES.slice(12, 18),
      BG_IMAGES.slice(18, 24),
    ],
  };

  const { tileHeight, tileGap, frame, imagePool } = effectiveSizing;

  return (
    <div
      ref={rootRef}
      className={styles.bgRoot}
      data-frames-visible={framesVisible ? 'true' : undefined}
      style={
        {
          '--tile-gap': `${tileGap}px`,
          '--frame': `${frame}px`,
          opacity: isReady ? 1 : 0,
          transition: 'opacity 0.25s ease-out',
        } as React.CSSProperties
      }
    >
      <div className={`${styles.grid} ${config.gridClass}`}>
        {imagePool.map((images, i) => (
          <ArtboardColumn
            key={images.join('|')}
            images={images}
            speed={config.speeds[i] ?? 0.8}
            columnIndex={i}
            tileHeight={tileHeight}
            tileGap={tileGap}
            frame={frame}
            trackRefCallback={setTrackRef}
            onTileLoaded={onTileLoaded}
          />
        ))}
      </div>
    </div>
  );
}
