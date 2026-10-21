import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReadingMaterial, StudyTip } from '../types';

type SyncItem = ReadingMaterial | StudyTip;
type CollectionName = 'study_materials' | 'study_tips';
type CloudRow = { id: string; payload: SyncItem | null; updated_at: string; deleted_at: string | null };
type Tombstone = { deletedAt: string; payload?: SyncItem };
type Tombstones = Record<string, Tombstone>;

function itemTimestamp(item: SyncItem): number {
  const value = 'updatedAt' in item && item.updatedAt ? item.updatedAt : item.createdAt;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function readTombstones(userId: string, collection: CollectionName): Tombstones {
  try {
    const raw = localStorage.getItem(`fachee_sync_tombstones_${userId}_${collection}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string | Tombstone>;
    return Object.fromEntries(Object.entries(parsed).map(([id, value]) => [
      id,
      typeof value === 'string' ? { deletedAt: value } : value,
    ]));
  } catch (error) {
    console.error('Could not read study-data deletion records', error);
    throw new Error('Could not read pending sync changes. Your local study data was not uploaded.');
  }
}

export function recordStudyDeletion(userId: string, collection: CollectionName, id: string): void {
  const tombstones = readTombstones(userId, collection);
  tombstones[id] = { deletedAt: new Date().toISOString() };
  try {
    localStorage.setItem(`fachee_sync_tombstones_${userId}_${collection}`, JSON.stringify(tombstones));
  } catch (error) {
    console.error('Could not save a pending study-data deletion', error);
    throw new Error('Could not record the deletion for cloud sync. Please try again.');
  }
}

function withoutAttachmentData(item: SyncItem): SyncItem {
  if (!('photos' in item)) {
    const { voiceMessage: _voiceMessage, ...tip } = item;
    return tip;
  }
  const strip = (attachments: ReadingMaterial['photos']) => attachments.map(({ dataUrl: _dataUrl, ...attachment }) => attachment);
  return {
    ...item,
    photos: strip(item.photos),
    shortVideos: strip(item.shortVideos),
    documents: strip(item.documents),
  };
}

function preserveLocalAttachmentData(cloudItem: SyncItem, localItem: SyncItem | undefined): SyncItem {
  if (!localItem) return cloudItem;
  if (!('photos' in cloudItem) && !('photos' in localItem)) {
    return { ...cloudItem, voiceMessage: localItem.voiceMessage };
  }
  if (!('photos' in cloudItem) || !('photos' in localItem)) return cloudItem;
  const restore = (cloudFiles: ReadingMaterial['photos'], localFiles: ReadingMaterial['photos']) =>
    cloudFiles.map((file) => {
      const localFile = localFiles.find((candidate) => candidate.id === file.id);
      return localFile?.dataUrl ? { ...file, dataUrl: localFile.dataUrl } : file;
    });
  return {
    ...cloudItem,
    photos: restore(cloudItem.photos, localItem.photos),
    shortVideos: restore(cloudItem.shortVideos, localItem.shortVideos),
    documents: restore(cloudItem.documents, localItem.documents),
  };
}

export async function syncStudyCollection<T extends SyncItem>(
  client: SupabaseClient,
  userId: string,
  collection: CollectionName,
  localItems: T[],
  confirmConflicts?: (count: number) => boolean,
): Promise<T[]> {
  const { data, error } = await client
    .from(collection)
    .select('id,payload,updated_at,deleted_at')
    .eq('user_id', userId);
  if (error) throw new Error(`Could not load cloud ${collection === 'study_materials' ? 'materials' : 'tips'}: ${error.message}`);

  const cloudRows = (data ?? []) as CloudRow[];
  const tombstones = readTombstones(userId, collection);
  const localById = new Map(localItems.map((item) => [item.id, item]));
  const cloudById = new Map(cloudRows.map((row) => [row.id, row]));
  const conflicts = localItems.filter((item) => {
    const cloud = cloudById.get(item.id);
    return cloud?.payload
      && JSON.stringify(canonicalize(cloud.payload)) !== JSON.stringify(canonicalize(withoutAttachmentData(item)));
  }).length;
  if (conflicts && confirmConflicts && !confirmConflicts(conflicts)) {
    throw new Error('Cloud sync paused. No conflicting records were changed.');
  }
  const ids = new Set([...localById.keys(), ...cloudById.keys(), ...Object.keys(tombstones)]);
  const upserts: Array<{ id: string; user_id: string; payload: SyncItem | null; updated_at: string; deleted_at: string | null }> = [];
  const merged: T[] = [];

  for (const id of ids) {
    const local = localById.get(id);
    const cloud = cloudById.get(id);
    const tombstone = tombstones[id];
    const deletedAt = tombstone?.deletedAt;
    if (deletedAt && (!cloud || Date.parse(deletedAt) >= Date.parse(cloud.updated_at))) {
      upserts.push({
        id,
        user_id: userId,
        payload: cloud?.payload ?? tombstone.payload ?? null,
        updated_at: deletedAt,
        deleted_at: deletedAt,
      });
      continue;
    }

    if (cloud?.deleted_at && (!local || Date.parse(cloud.deleted_at) >= itemTimestamp(local))) {
      tombstones[id] = { deletedAt: cloud.deleted_at, payload: cloud.payload };
      continue;
    }

    if (cloud && !cloud.deleted_at && !cloud.payload) {
      throw new Error(`Cloud ${collection === 'study_materials' ? 'material' : 'tip'} ${id} has no payload. Restore it from a backup before syncing.`);
    }
    const cloudIsNewer = Boolean(cloud && (!local || Date.parse(cloud.updated_at) >= itemTimestamp(local)));
    const winner = cloudIsNewer ? cloud!.payload : local ?? cloud?.payload;
    if (!winner) continue;
    const payload = preserveLocalAttachmentData(winner, local);
    const timestamp = cloudIsNewer ? cloud!.updated_at : new Date(itemTimestamp(winner) || Date.now()).toISOString();
    upserts.push({ id, user_id: userId, payload: withoutAttachmentData(payload), updated_at: timestamp, deleted_at: null });
    merged.push(payload as T);
    if (deletedAt) delete tombstones[id];
  }

  if (upserts.length > 0) {
    const { error: saveError } = await client.from(collection).upsert(upserts, { onConflict: 'user_id,id' });
    if (saveError) throw new Error(`Could not sync cloud ${collection === 'study_materials' ? 'materials' : 'tips'}: ${saveError.message}`);
  }
  try {
    localStorage.setItem(`fachee_sync_tombstones_${userId}_${collection}`, JSON.stringify(tombstones));
  } catch (error) {
    console.error('Could not update synced deletion records', error);
    throw new Error('Study data synced, but local sync state could not be updated. Please reload and retry.');
  }
  return merged;
}
