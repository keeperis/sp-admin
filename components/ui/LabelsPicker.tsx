'use client';

import { Badge, MultiSelect } from '@mantine/core';
import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface LabelsPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  conversationId?: string;
  customerId?: string;
}

export function LabelsPicker({ value, onChange, conversationId }: LabelsPickerProps) {
  const { data } = useSWR('/api/labels', fetcher);
  const [loading, setLoading] = useState(false);

  const labels = data?.labels || [];

  const handleChange = async (newValue: string[]) => {
    onChange(newValue);

    // Update conversation or customer labels
    if (conversationId) {
      setLoading(true);
      try {
        await fetch(`/api/conversations/${conversationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ labels: newValue }),
        });
      } catch (error) {
        console.error('Failed to update labels:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <MultiSelect
      data={labels.map((label: any) => ({
        value: label.id,
        label: label.name,
      }))}
      value={value}
      onChange={handleChange}
      placeholder="Select labels"
      searchable
      disabled={loading}
      renderOption={({ option }) => {
        const label = labels.find((l: any) => l.id === option.value);
        return (
          <div>
            <Badge size="sm" color={label?.color || 'gray'}>
              {option.label}
            </Badge>
          </div>
        );
      }}
    />
  );
}
