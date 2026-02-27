'use client';

import { IconMessageCircle, IconMessageCircleX } from '@tabler/icons-react';
import { useTheme } from '@/src/components/theme/ThemeProvider';
import styles from './AiAssistantButton.module.css';
import { useAiChat } from './AiChatContext';

export function AiAssistantButton() {
  const { isOpen, toggle, isDialogExpanded } = useAiChat();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={styles.btn}
      data-dialog-expanded={isDialogExpanded ? 'true' : undefined}
      onClick={toggle}
      aria-label={isOpen ? 'Paslėpti pokalbį' : 'Atidaryti pokalbį'}
      style={{
        background: isDark ? 'rgba(30, 30, 33, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)',
        color: isDark ? '#e0e0e0' : '#333',
      }}
    >
      {isOpen ? <IconMessageCircleX size={24} /> : <IconMessageCircle size={24} />}
    </button>
  );
}
