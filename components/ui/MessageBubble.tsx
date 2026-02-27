'use client';

import { Badge, Group, Paper, Text } from '@mantine/core';
import type { Direction } from '@/types';

interface MessageBubbleProps {
  message: {
    id: string;
    direction: Direction;
    text?: string;
    timestamp: string;
    status?: string;
    meta?: {
      authorAdmin?: {
        name: string;
      } | null;
    };
  };
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound';

  return (
    <Group justify={isOutbound ? 'flex-end' : 'flex-start'} align="flex-start" mb="xs">
      <Paper
        p="sm"
        radius="md"
        style={{
          maxWidth: '70%',
          backgroundColor: isOutbound ? '#e7f5ff' : '#f1f3f5',
        }}
      >
        <Text size="sm">{message.text}</Text>
        <Group gap="xs" mt={4} justify="space-between">
          <Text size="xs" c="dimmed">
            {new Date(message.timestamp).toLocaleTimeString()}
          </Text>
          {isOutbound && message.status && (
            <Badge size="xs" variant="light">
              {message.status}
            </Badge>
          )}
        </Group>
      </Paper>
    </Group>
  );
}
