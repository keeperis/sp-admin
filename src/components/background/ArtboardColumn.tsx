'use client';

import Image from 'next/image';
import { useCallback } from 'react';
import styles from './ArtboardColumn.module.css';

export interface ArtboardColumnProps {
  images: string[];
  speed: number;
  columnIndex: number;
  tileHeight: number;
  tileGap: number;
  frame: number;
  trackRefCallback: (el: HTMLDivElement | null, index: number) => void;
  onTileLoaded: (el: HTMLDivElement) => void;
}

export function ArtboardColumn({
  images,
  tileHeight,
  tileGap,
  frame,
  trackRefCallback,
  columnIndex,
  onTileLoaded,
}: ArtboardColumnProps) {
  // Duplicate to 12 tiles for seamless wrapping
  const tiles = [...images, ...images];

  const handleLoad = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) onTileLoaded(el);
    },
    [onTileLoaded],
  );

  return (
    <div className={styles.colViewport}>
      <div
        ref={(el) => trackRefCallback(el, columnIndex)}
        className={styles.track}
        style={
          {
            ['--tile-h' as string]: `${tileHeight}px`,
            ['--tile-gap' as string]: `${tileGap}px`,
            ['--frame' as string]: `${frame}px`,
          } as React.CSSProperties
        }
      >
        {tiles.map((src, i) => (
          <div key={`${i}-${src}`} className={styles.tile}>
            <Image
              src={src}
              alt=""
              fill
              sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw"
              className={`${styles.tileImage} ${styles.tileImageReveal}`}
              onLoad={(e) => {
                const target = e.target as HTMLImageElement;
                const wrapper = target.closest(`.${styles.tile}`);
                if (wrapper) handleLoad(wrapper as HTMLDivElement);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
