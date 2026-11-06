'use client';

import { Alert, Button, Container, Group, Select, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import type { SiteKey } from '@/lib/site';
import type { SiteContent } from '@/src/lib/content/schema';
import ContentEditor from './ContentEditor';

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Nepavyko įkelti turinio');
  return data;
};

type AdminContentResponse = { site: SiteKey; version: number; data: SiteContent };
type ContentDraft = AdminContentResponse;

const PROJECT_OPTIONS: Array<{ value: SiteKey; label: string }> = [
  { value: 'ceramics', label: 'Keramika' },
  { value: 'yoga', label: 'Joga' },
];

export default function ContentPage() {
  const [selectedSite, setSelectedSite] = useState<SiteKey>('ceramics');
  const contentApiUrl = `/api/admin/content?site=${selectedSite}`;
  const { data, error, isLoading, mutate } = useSWR<AdminContentResponse>(contentApiUrl, fetcher);
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sp-admin:selected-site');
      if (saved === 'ceramics' || saved === 'yoga') setSelectedSite(saved);
    } catch {
      // The editor also works when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sp-admin:selected-site', selectedSite);
    } catch {
      // Saving content does not depend on browser storage.
    }
  }, [selectedSite]);

  const loaded = data?.site === selectedSite ? data : undefined;
  const currentDraft = draft?.site === selectedSite ? draft : null;
  const content = currentDraft?.data || loaded?.data;

  const editContent = (next: SiteContent) => {
    if (!loaded) return;
    // Freeze the source version on the first edit. SWR refreshes must not advance
    // the version of an unsaved draft or attach it to another project.
    setDraft((current) => ({
      site: selectedSite,
      version: current?.site === selectedSite ? current.version : loaded.version,
      data: next,
    }));
  };

  const reload = async () => {
    setReloading(true);
    try {
      await mutate();
      setDraft(null);
      setConflict(false);
    } catch (reloadError) {
      notifications.show({
        message: reloadError instanceof Error ? reloadError.message : 'Nepavyko įkelti turinio',
        color: 'red',
      });
    } finally {
      setReloading(false);
    }
  };

  const save = async () => {
    if (!currentDraft || conflict || saving || translating || reloading) return;
    setSaving(true);
    try {
      const res = await fetch(contentApiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: currentDraft.version, data: currentDraft.data }),
      });
      const body = await res.json();
      if (res.status === 409) {
        setConflict(true);
        notifications.show({
          title: 'Turinys pasikeitė',
          message: 'Kitas redaktorius jau išsaugojo pakeitimus. Įkelkite naujausią versiją.',
          color: 'red',
        });
        return;
      }
      if (!res.ok) throw new Error(body?.error || 'Išsaugoti nepavyko');
      await mutate(body, { revalidate: false });
      setDraft(null);
      notifications.show({ message: 'Turinys išsaugotas', color: 'green' });
    } catch (saveError) {
      notifications.show({
        message: saveError instanceof Error ? saveError.message : 'Nepavyko išsaugoti',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  if (error && !content) {
    return (
      <Container size="lg">
        <Text c="red">Nepavyko įkelti turinio: {(error as Error).message}</Text>
      </Container>
    );
  }
  if (isLoading || !content) {
    return (
      <Container size="lg">
        <Text>Kraunama...</Text>
      </Container>
    );
  }

  return (
    <Container size="lg" pb={80}>
      <Group justify="space-between" mb="md" align="end">
        <Title order={1}>Turinys</Title>
        <Group align="end">
          <Select
            data={PROJECT_OPTIONS}
            value={selectedSite}
            onChange={(value) => {
              const nextSite = value === 'yoga' ? 'yoga' : 'ceramics';
              if (nextSite === selectedSite) return;
              setSelectedSite(nextSite);
              setDraft(null);
              setConflict(false);
            }}
            label="Projektas"
            allowDeselect={false}
            disabled={saving || translating || reloading}
            w={{ base: 140, sm: 170 }}
          />
          <Button
            onClick={save}
            loading={saving}
            disabled={!currentDraft || translating || reloading || conflict}
          >
            Išsaugoti
          </Button>
        </Group>
      </Group>
      {error && (
        <Alert color="red" mb="md">
          Turinio atnaujinti nepavyko. Neišsaugoti pakeitimai išlaikyti.
        </Alert>
      )}
      {conflict && (
        <Alert color="red" title="Versijų konfliktas" mb="md">
          <Text size="sm" mb="sm">
            Naujausia versija dar neįkelta. Nusikopijuokite savo pakeitimus, jei norite juos
            išsaugoti, ir įkelkite dabartinį turinį.
          </Text>
          <Button size="xs" color="red" variant="light" loading={reloading} onClick={reload}>
            Įkelti naujausią versiją
          </Button>
        </Alert>
      )}
      <ContentEditor
        key={selectedSite}
        site={selectedSite}
        content={content}
        onChange={editContent}
        disabled={saving || reloading}
        onBusyChange={setTranslating}
      />
      <Group style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 300 }}>
        <Button
          onClick={save}
          loading={saving}
          disabled={!currentDraft || translating || reloading || conflict}
        >
          Išsaugoti
        </Button>
      </Group>
    </Container>
  );
}
