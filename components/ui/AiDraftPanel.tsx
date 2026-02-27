'use client';

import { Alert, Badge, Button, Group, Paper, Progress, Stack, Text, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AiDraftPanelProps {
  conversationId: string | null;
}

export function AiDraftPanel({ conversationId }: AiDraftPanelProps) {
  const { data, mutate } = useSWR(
    conversationId ? `/api/conversations/${conversationId}/draft` : null,
    fetcher,
    { refreshInterval: 5000 },
  );

  const [editedText, setEditedText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data?.draft) {
      setEditedText(data.draft.draftText);
    }
  }, [data]);

  if (!conversationId) {
    return null;
  }

  if (!data?.draft) {
    return (
      <Paper p="md" withBorder>
        <Text c="dimmed" size="sm">
          No AI draft available
        </Text>
      </Paper>
    );
  }

  const draft = data.draft;
  const intentColors: Record<string, string> = {
    pricing: 'blue',
    booking: 'green',
    schedule: 'orange',
    reschedule: 'yellow',
    faq: 'purple',
    other: 'gray',
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/drafts/${draft.id}/approve`, {
        method: 'POST',
      });
      if (response.ok) {
        notifications.show({ message: 'Draft approved and sent', color: 'green' });
        mutate();
      } else {
        notifications.show({ message: 'Error approving draft', color: 'red' });
      }
    } catch (_error) {
      notifications.show({ message: 'Error approving draft', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditAndSend = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/drafts/${draft.id}/edit_and_send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedText }),
      });
      if (response.ok) {
        notifications.show({ message: 'Draft edited and sent', color: 'green' });
        mutate();
      } else {
        notifications.show({ message: 'Error sending edited draft', color: 'red' });
      }
    } catch (_error) {
      notifications.show({ message: 'Error sending edited draft', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/drafts/${draft.id}/reject`, {
        method: 'POST',
      });
      if (response.ok) {
        notifications.show({ message: 'Draft rejected', color: 'orange' });
        mutate();
      } else {
        notifications.show({ message: 'Error rejecting draft', color: 'red' });
      }
    } catch (_error) {
      notifications.show({ message: 'Error rejecting draft', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={600}>AI Draft</Text>
          <Badge color={intentColors[draft.intent] || 'gray'}>{draft.intent}</Badge>
        </Group>

        <div>
          <Text size="sm" mb={4}>
            Confidence
          </Text>
          <Progress
            value={draft.confidence * 100}
            color={draft.confidence > 0.8 ? 'green' : draft.confidence > 0.6 ? 'yellow' : 'red'}
          />
        </div>

        {draft.needsHuman && (
          <Alert color="orange" title="Needs Human Review">
            This draft requires human attention.
          </Alert>
        )}

        <div>
          <Text size="sm" mb={4}>
            Draft Text
          </Text>
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            minRows={4}
            maxRows={8}
          />
        </div>

        {draft.retrieval?.kbItemIds?.length > 0 && (
          <div>
            <Text size="sm" mb={4}>
              Based on:
            </Text>
            <Group gap={4}>
              {draft.retrieval.kbItemIds.slice(0, 3).map((item: any) => (
                <Badge key={item.id} size="xs" variant="light">
                  {item.title}
                </Badge>
              ))}
              {draft.retrieval.kbItemIds.length > 3 && (
                <Text size="xs" c="dimmed">
                  +{draft.retrieval.kbItemIds.length - 3} more
                </Text>
              )}
            </Group>
          </div>
        )}

        <Group>
          <Button onClick={handleApprove} loading={loading} color="green">
            Approve & Send
          </Button>
          <Button onClick={handleEditAndSend} loading={loading} variant="light">
            Edit & Send
          </Button>
          <Button onClick={handleReject} loading={loading} color="red" variant="light">
            Reject
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
