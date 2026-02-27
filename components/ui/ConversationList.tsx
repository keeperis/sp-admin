'use client';

import { Checkbox, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import { useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import useSWR from 'swr';
import type { Channel } from '@/types';
import { ConversationRow } from './ConversationRow';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  channel: Channel | 'all';
}

export function ConversationList({ selectedId, onSelect, channel }: ConversationListProps) {
  const [status, setStatus] = useState<string>('');
  const [unread, setUnread] = useState(false);
  const [search, setSearch] = useState('');

  const queryParams = new URLSearchParams();
  if (channel !== 'all') queryParams.set('channel', channel);
  if (status) queryParams.set('status', status);
  if (unread) queryParams.set('unread', 'true');
  if (search) queryParams.set('q', search);

  const { data, error } = useSWR(
    `/api/conversations?${queryParams.toString()}`,
    fetcher,
    { refreshInterval: 10000 }, // Poll every 10 seconds
  );

  if (error) {
    return <Text c="red">Error loading conversations</Text>;
  }

  if (!data) {
    return <Text c="dimmed">Loading...</Text>;
  }

  return (
    <Stack gap="md" style={{ height: '100%' }}>
      <Group>
        <TextInput
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
      </Group>
      <Group>
        <Select
          placeholder="Status"
          data={[
            { value: '', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'waiting_approval', label: 'Waiting Approval' },
            { value: 'paused', label: 'Paused' },
            { value: 'closed', label: 'Closed' },
          ]}
          value={status}
          onChange={(val) => setStatus(val || '')}
          clearable
        />
        <Checkbox
          label="Unread"
          checked={unread}
          onChange={(e) => setUnread(e.currentTarget.checked)}
        />
      </Group>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Virtuoso
          data={data.conversations || []}
          itemContent={(_index, conversation) => (
            <div style={{ padding: '4px' }}>
              <ConversationRow
                conversation={conversation}
                onClick={() => onSelect(conversation.id)}
                isSelected={selectedId === conversation.id}
              />
            </div>
          )}
          style={{ height: '100%' }}
        />
      </div>
    </Stack>
  );
}
