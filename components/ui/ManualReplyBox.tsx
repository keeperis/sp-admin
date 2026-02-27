'use client';

import { Button, Group, Textarea } from '@mantine/core';
import { useState } from 'react';
import type { Channel } from '@/types';

interface ManualReplyBoxProps {
  conversationId: string;
  channel: Channel;
  onSent: () => void;
}

export function ManualReplyBox({ conversationId, channel, onSent }: ManualReplyBoxProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const isComment = channel.includes('comment');
  const buttonLabel = isComment ? 'Reply to comment' : 'Send message';

  const handleSend = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/outbound/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          text: text.trim(),
          source: 'admin',
        }),
      });

      if (response.ok) {
        setText('');
        onSent();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (_error) {
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Group align="flex-end" p="md">
      <Textarea
        placeholder="Type your message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        style={{ flex: 1 }}
        minRows={2}
        maxRows={4}
      />
      <Button onClick={handleSend} loading={loading} disabled={!text.trim()}>
        {buttonLabel}
      </Button>
    </Group>
  );
}
