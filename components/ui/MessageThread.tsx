'use client';

import { Stack, Text } from '@mantine/core';
import { useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import useSWR from 'swr';
import { MessageBubble } from './MessageBubble';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface MessageThreadProps {
  conversationId: string | null;
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const { data, error, mutate } = useSWR(
    conversationId ? `/api/conversations/${conversationId}/messages` : null,
    fetcher,
    { refreshInterval: 5000 }, // Poll every 5 seconds
  );

  useEffect(() => {
    if (conversationId) {
      // Mark as read
      fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' });
      mutate();
    }
  }, [conversationId, mutate]);

  if (!conversationId) {
    return (
      <Stack align="center" justify="center" style={{ height: '100%' }}>
        <Text c="dimmed">Select a conversation</Text>
      </Stack>
    );
  }

  if (error) {
    return <Text c="red">Error loading messages</Text>;
  }

  if (!data) {
    return <Text c="dimmed">Loading...</Text>;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Virtuoso
          data={data.messages || []}
          initialTopMostItemIndex={data.messages?.length ? data.messages.length - 1 : 0}
          followOutput="smooth"
          itemContent={(_index, message) => (
            <div style={{ padding: '4px 8px' }}>
              <MessageBubble message={message} />
            </div>
          )}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}
