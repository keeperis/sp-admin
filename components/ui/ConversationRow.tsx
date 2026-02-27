'use client';

import { Avatar, Badge, Group, Paper, Stack, Text } from '@mantine/core';
import type { Channel } from '@/types';

interface ConversationRowProps {
  conversation: {
    id: string;
    channel: Channel;
    status: string;
    lastMessageAt: string;
    unreadCount: number;
    customer: {
      id: string;
      displayName?: string;
      avatarUrl?: string;
    } | null;
    labels: Array<{
      id: string;
      name: string;
      color?: string;
    }>;
  };
  onClick: () => void;
  isSelected: boolean;
}

export function ConversationRow({ conversation, onClick, isSelected }: ConversationRowProps) {
  const channelBadge = {
    fb_messenger_dm: 'FB',
    ig_dm: 'IG',
    fb_comment: 'CMT',
    ig_comment: 'CMT',
  }[conversation.channel];

  const displayName = conversation.customer?.displayName || `${channelBadge} User`;

  return (
    <Paper
      p="sm"
      withBorder
      style={{
        cursor: 'pointer',
        backgroundColor: isSelected ? '#e7f5ff' : 'white',
      }}
      onClick={onClick}
    >
      <Group gap="xs" align="flex-start">
        <Avatar src={conversation.customer?.avatarUrl} size="sm" radius="xl" />
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" justify="space-between">
            <Text size="sm" fw={conversation.unreadCount > 0 ? 600 : 400} truncate>
              {displayName}
            </Text>
            <Group gap={4}>
              <Badge size="xs" variant="light">
                {channelBadge}
              </Badge>
              {conversation.unreadCount > 0 && (
                <Badge size="xs" color="blue">
                  {conversation.unreadCount}
                </Badge>
              )}
            </Group>
          </Group>
          {conversation.labels.length > 0 && (
            <Group gap={4}>
              {conversation.labels.slice(0, 2).map((label) => (
                <Badge key={label.id} size="xs" color={label.color || 'gray'}>
                  {label.name}
                </Badge>
              ))}
              {conversation.labels.length > 2 && (
                <Text size="xs" c="dimmed">
                  +{conversation.labels.length - 2}
                </Text>
              )}
            </Group>
          )}
          <Text size="xs" c="dimmed">
            {new Date(conversation.lastMessageAt).toLocaleString()}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}
