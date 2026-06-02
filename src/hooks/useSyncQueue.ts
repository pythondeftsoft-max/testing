import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  getQueuedSyncs,
  markSyncStatus,
  removeQueued,
  getPendingPhotos,
  markPhotoUploaded,
  removePhoto,
  QueuedSync,
} from '@/lib/inspector/idb';
import { useOnlineStatus } from './useOnlineStatus';

export const useSyncQueue = () => {
  const online = useOnlineStatus();
  const [pending, setPending] = useState<QueuedSync[]>([]);
  const [draining, setDraining] = useState(false);

  const refresh = useCallback(async () => {
    const items = await getQueuedSyncs();
    setPending(items);
  }, []);

  const drain = useCallback(async () => {
    if (draining || !online) return;
    setDraining(true);
    try {
      const queue = await getQueuedSyncs();
      for (const item of queue) {
        if (item.status === 'syncing') continue;
        await markSyncStatus(item.client_uuid, 'syncing');

        // 1. Upload pending photos for this inspection
        const photos = await getPendingPhotos(item.inspection_id);
        const photoMap: Record<string, string[]> = {};
        for (const p of photos) {
          if (p.uploaded && p.storage_path) {
            photoMap[p.deficiency_client_id] = photoMap[p.deficiency_client_id] || [];
            photoMap[p.deficiency_client_id].push(p.storage_path);
            continue;
          }
          const path = `${item.agency_id}/${item.inspection_id}/${p.id}.jpg`;
          const { error: upErr } = await supabase.storage
            .from('inspection-photos')
            .upload(path, p.blob, { contentType: p.mime_type, upsert: true });
          if (upErr) {
            await markSyncStatus(item.client_uuid, 'failed', upErr.message);
            continue;
          }
          await markPhotoUploaded(p.id, path);
          photoMap[p.deficiency_client_id] = photoMap[p.deficiency_client_id] || [];
          photoMap[p.deficiency_client_id].push(path);
        }

        // 2. Inject uploaded photo paths into payload deficiencies
        const enrichedPayload = {
          ...item.payload,
          deficiencies: (item.payload.deficiencies || []).map((d: any) => ({
            ...d,
            photo_paths: photoMap[d.client_id] || d.photo_paths || [],
          })),
        };

        // 3. Call edge function
        const { data, error } = await supabase.functions.invoke('process-inspection-sync', {
          body: {
            client_uuid: item.client_uuid,
            inspection_id: item.inspection_id,
            agency_id: item.agency_id,
            device_captured_at: item.device_captured_at,
            payload: enrichedPayload,
          },
        });

        if (error || !data?.success) {
          await markSyncStatus(item.client_uuid, 'failed', error?.message || data?.error || 'Sync failed');
        } else {
          await removeQueued(item.client_uuid);
          // Clean up uploaded photos
          for (const p of photos) {
            await removePhoto(p.id);
          }
        }
      }
    } finally {
      setDraining(false);
      await refresh();
    }
  }, [draining, online, refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-drain when coming online
  useEffect(() => {
    if (online) drain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return { pending, draining, drain, refresh };
};
