'use client';

import { useEffect, useState } from 'react';
import classes from './InstallHelp.module.css';

export function InstallHelp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)');
    const update = () => {
      const appleStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
      setVisible(!standalone.matches && !appleStandalone);
    };
    update();
    standalone.addEventListener('change', update);
    return () => standalone.removeEventListener('change', update);
  }, []);

  if (!visible) return null;

  return (
    <details className={classes.help}>
      <summary>Įsidėti į iPhone pagrindinį ekraną</summary>
      <p>
        Atidarykite administravimą per Safari. Pasirinkite „Bendrinti“ → „Pridėti prie pagrindinio
        ekrano“. Jei rodomas „Open as Web App“, palikite jį įjungtą.
      </p>
      <p>
        Administravimą atidarykite iš naujos „SoulPoetry“ ikonos. Veikimui reikia interneto; pirmą
        kartą gali reikėti prisijungti per Google.
      </p>
    </details>
  );
}
