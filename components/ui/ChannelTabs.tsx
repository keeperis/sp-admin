'use client';

import { SegmentedControl } from '@mantine/core';
import type { Channel } from '@/types';

interface ChannelTabsProps {
  value: Channel | 'all';
  onChange: (value: Channel | 'all') => void;
}

export function ChannelTabs({ value, onChange }: ChannelTabsProps) {
  return (
    <SegmentedControl
      value={value}
      onChange={(val) => onChange(val as Channel | 'all')}
      data={[
        { label: 'All', value: 'all' },
        { label: 'Messenger', value: 'fb_messenger_dm' },
        { label: 'Instagram', value: 'ig_dm' },
        { label: 'FB Comments', value: 'fb_comment' },
        { label: 'IG Comments', value: 'ig_comment' },
      ]}
      fullWidth
    />
  );
}
