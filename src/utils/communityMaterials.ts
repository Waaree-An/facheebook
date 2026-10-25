import type { SupabaseClient } from '@supabase/supabase-js';
import type { VideoLink } from '../types';

export type CommunityMaterialStatus = 'pending' | 'approved' | 'rejected';
export type CommunityMaterialMediaKind = 'photo' | 'document' | 'short_video';

export interface CommunityMaterialAttachment {
  id: string;
  name: string;
  mimeType: string;
  mediaKind: CommunityMaterialMediaKind;
  sizeBytes: number;
  signedUrl: string;
}

export interface CommunityMaterialComment {
  id: string;
  materialId: string;
  ownerId: string;
  content: string;
  createdAt: string;
}

export interface CommunityMaterial {
  id: string;
  ownerId: string;
  title: string;
  subject: string;
  summary: string;
  sourceUrl: string | null;
  videoLinks: VideoLink[];
  tags: string[];
  status: CommunityMaterialStatus;
  moderationNote: string | null;
  createdAt: string;
  attachments: CommunityMaterialAttachment[];
  likes: number;
  userLiked: boolean;
  comments: CommunityMaterialComment[];
}

export interface CommunityMaterialReport {
  id: string;
  materialId: string;
  materialTitle: string | null;
  reason: string;
  details: string | null;
}

interface CommunityMaterialRow {
  id: string;
  owner_id: string;
  title: string;
  subject: string;
  summary: string;
  source_url: string | null;
  video_links: VideoLink[];
  tags: string[];
  status: CommunityMaterialStatus;
  moderation_note: string | null;
  created_at: string;
}

const BUCKET_ID = 'community-materials';
const materialColumns = 'id, owner_id, title, subject, summary, source_url, video_links, tags, status, moderation_note, created_at';

function mapMaterial(row: CommunityMaterialRow): CommunityMaterial {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    subject: row.subject,
    summary: row.summary,
    sourceUrl: row.source_url,
    videoLinks: Array.isArray(row.video_links) ? row.video_links : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status,
    moderationNote: row.moderation_note,
    createdAt: row.created_at,
    attachments: [],
    likes: 0,
    userLiked: false,
    comments: [],
  };
}

export async function loadCommunityMaterials(client: SupabaseClient, userId: string): Promise<CommunityMaterial[]> {
  const { data, error } = await client
    .from('community_materials')
    .select(materialColumns)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const materials = ((data ?? []) as unknown as CommunityMaterialRow[]).map(mapMaterial);
  if (!materials.length) return materials;

  const materialIds = materials.map((material) => material.id);
  const [
    { data: attachmentRows, error: attachmentError },
    { data: likeRows, error: likesError },
    { data: commentRows, error: commentsError },
  ] = await Promise.all([
    client.from('community_material_attachments')
      .select('id, material_id, name, mime_type, media_kind, size_bytes, object_path')
      .in('material_id', materialIds),
    client.from('community_material_likes')
      .select('material_id, user_id')
      .in('material_id', materialIds),
    client.from('community_material_comments')
      .select('id, material_id, owner_id, content, created_at')
      .in('material_id', materialIds)
      .order('created_at', { ascending: true }),
  ]);
  if (attachmentError) throw attachmentError;
  if (likesError) throw likesError;
  if (commentsError) throw commentsError;

  const likesByMaterial = new Map<string, { count: number; userLiked: boolean }>();
  for (const like of (likeRows ?? []) as Array<{ material_id: string; user_id: string }>) {
    const current = likesByMaterial.get(like.material_id) ?? { count: 0, userLiked: false };
    current.count += 1;
    current.userLiked ||= like.user_id === userId;
    likesByMaterial.set(like.material_id, current);
  }
  const commentsByMaterial = new Map<string, CommunityMaterialComment[]>();
  for (const comment of (commentRows ?? []) as Array<{
    id: string;
    material_id: string;
    owner_id: string;
    content: string;
    created_at: string;
  }>) {
    const current = commentsByMaterial.get(comment.material_id) ?? [];
    current.push({
      id: comment.id,
      materialId: comment.material_id,
      ownerId: comment.owner_id,
      content: comment.content,
      createdAt: comment.created_at,
    });
    commentsByMaterial.set(comment.material_id, current);
  }

  const attachments = (attachmentRows ?? []) as Array<{
    id: string;
    material_id: string;
    name: string;
    mime_type: string;
    media_kind: CommunityMaterialMediaKind;
    size_bytes: number;
    object_path: string;
  }>;
  const signed = await Promise.all(attachments.map(async (attachment) => {
    const { data: signedData, error: signedError } = await client.storage
      .from(BUCKET_ID)
      .createSignedUrl(attachment.object_path, 3600);
    if (signedError) throw signedError;
    return {
      materialId: attachment.material_id,
      attachment: {
        id: attachment.id,
        name: attachment.name,
        mimeType: attachment.mime_type,
        mediaKind: attachment.media_kind,
        sizeBytes: attachment.size_bytes,
        signedUrl: signedData.signedUrl,
      } satisfies CommunityMaterialAttachment,
    };
  }));
  const byMaterial = new Map<string, CommunityMaterialAttachment[]>();
  for (const item of signed) {
    const items = byMaterial.get(item.materialId) ?? [];
    items.push(item.attachment);
    byMaterial.set(item.materialId, items);
  }
  return materials.map((material) => ({
    ...material,
    attachments: byMaterial.get(material.id) ?? [],
    likes: likesByMaterial.get(material.id)?.count ?? 0,
    userLiked: likesByMaterial.get(material.id)?.userLiked ?? false,
    comments: commentsByMaterial.get(material.id) ?? [],
  }));
}

export async function toggleCommunityMaterialLike(
  client: SupabaseClient,
  userId: string,
  materialId: string,
  isLiked: boolean,
): Promise<void> {
  const result = isLiked
    ? await client.from('community_material_likes').delete().eq('material_id', materialId).eq('user_id', userId)
    : await client.from('community_material_likes').insert({ material_id: materialId, user_id: userId });
  if (result.error) throw result.error;
}

export async function submitCommunityMaterialComment(
  client: SupabaseClient,
  userId: string,
  materialId: string,
  content: string,
): Promise<CommunityMaterialComment> {
  const { data, error } = await client.from('community_material_comments')
    .insert({ material_id: materialId, owner_id: userId, content: content.trim() })
    .select('id, material_id, owner_id, content, created_at')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    materialId: data.material_id,
    ownerId: data.owner_id,
    content: data.content,
    createdAt: data.created_at,
  };
}

export async function submitCommunityMaterial(
  client: SupabaseClient,
  userId: string,
  material: Pick<CommunityMaterial, 'title' | 'subject' | 'summary' | 'sourceUrl' | 'videoLinks' | 'tags'>,
  files: Array<{ file: File; mediaKind: CommunityMaterialMediaKind }>,
): Promise<CommunityMaterial> {
  const sourceUrl = material.sourceUrl?.trim() || null;
  if (sourceUrl) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      throw new Error('Enter a valid public link beginning with https:// or http://.');
    }
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new Error('Only public http:// and https:// links can be shared.');
    }
  }
  const { data, error } = await client
    .from('community_materials')
    .insert({
      owner_id: userId,
      title: material.title.trim(),
      subject: material.subject.trim(),
      summary: material.summary.trim(),
      source_url: sourceUrl,
      video_links: material.videoLinks,
      tags: material.tags,
    })
    .select(materialColumns)
    .single();
  if (error) throw error;
  const createdMaterial = mapMaterial(data as unknown as CommunityMaterialRow);
  const uploadedPaths: string[] = [];

  try {
    for (const item of files) {
      const attachmentId = crypto.randomUUID();
      const objectPath = `${userId}/${createdMaterial.id}/${attachmentId}`;
      const { error: metadataError } = await client.from('community_material_attachments').insert({
        id: attachmentId,
        material_id: createdMaterial.id,
        owner_id: userId,
        bucket_id: BUCKET_ID,
        object_path: objectPath,
        name: item.file.name,
        mime_type: item.file.type,
        media_kind: item.mediaKind,
        size_bytes: item.file.size,
      });
      if (metadataError) throw metadataError;

      uploadedPaths.push(objectPath);
      const { error: uploadError } = await client.storage
        .from(BUCKET_ID)
        .upload(objectPath, item.file, { contentType: item.file.type, upsert: false });
      if (uploadError) throw uploadError;
    }
    const loaded = await loadCommunityMaterials(client, userId);
    const result = loaded.find((entry) => entry.id === createdMaterial.id);
    if (!result) throw new Error('The submitted resource could not be reloaded.');
    return result;
  } catch (uploadError) {
    const cleanupErrors: string[] = [];
    if (uploadedPaths.length) {
      const { error: storageCleanupError } = await client.storage.from(BUCKET_ID).remove(uploadedPaths);
      if (storageCleanupError) cleanupErrors.push(storageCleanupError.message);
    }
    const { error: deleteError } = await client.from('community_materials').delete().eq('id', createdMaterial.id);
    if (deleteError) cleanupErrors.push(deleteError.message);
    const details = uploadError instanceof Error ? uploadError.message : 'Unknown upload error';
    const cleanup = cleanupErrors.length ? ` Cleanup also failed: ${cleanupErrors.join('; ')}` : '';
    throw new Error(`Could not submit the resource or its attachments: ${details}.${cleanup}`);
  }
}

export async function deletePendingCommunityMaterial(client: SupabaseClient, materialId: string): Promise<void> {
  const { data: attachmentRows, error: attachmentError } = await client
    .from('community_material_attachments')
    .select('object_path')
    .eq('material_id', materialId);
  if (attachmentError) throw attachmentError;
  const paths = ((attachmentRows ?? []) as Array<{ object_path: string }>).map((item) => item.object_path);
  if (paths.length) {
    const { error: storageError } = await client.storage.from(BUCKET_ID).remove(paths);
    if (storageError) throw storageError;
  }
  const { error } = await client.from('community_materials').delete().eq('id', materialId);
  if (error) throw error;
}

export function makeCommunityVideoLink(title: string, rawUrl: string): VideoLink {
  const url = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Enter a complete video URL beginning with https:// or http://.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only HTTP and HTTPS video links are supported.');
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  let platform: VideoLink['platform'] = 'other';
  if (['youtube.com', 'm.youtube.com', 'youtu.be'].includes(hostname)) platform = 'youtube';
  else if (hostname === 'vimeo.com' || hostname === 'player.vimeo.com') platform = 'vimeo';
  else if (/\.(mp4|webm|ogg)(?:$|\?)/i.test(url)) platform = 'direct';
  return {
    id: crypto.randomUUID(),
    title: title.trim() || 'Video Reference',
    url: parsed.toString(),
    platform,
  };
}

export async function moderateCommunityMaterial(
  client: SupabaseClient,
  materialId: string,
  decision: 'approved' | 'rejected',
): Promise<void> {
  const { error } = await client.rpc('moderate_community_material', {
    target_material_id: materialId,
    decision,
  });
  if (error) throw error;
}

export async function reportCommunityMaterial(
  client: SupabaseClient,
  userId: string,
  materialId: string,
  reason: string,
  details: string,
): Promise<void> {
  const { error } = await client.from('community_material_reports').insert({
    material_id: materialId,
    reporter_id: userId,
    reason,
    details: details.trim() || null,
  });
  if (error) throw error;
}

export async function loadOpenCommunityMaterialReports(
  client: SupabaseClient,
): Promise<CommunityMaterialReport[]> {
  const { data, error } = await client
    .from('community_material_reports')
    .select('id, material_id, reason, details')
    .eq('status', 'open')
    .order('created_at', { ascending: true });
  if (error) throw error;
  const reports = (data ?? []) as Array<{
    id: string;
    material_id: string;
    reason: string;
    details: string | null;
  }>;
  if (!reports.length) return [];

  const { data: materials, error: materialsError } = await client
    .from('community_materials')
    .select('id, title')
    .in('id', reports.map((report) => report.material_id));
  if (materialsError) throw materialsError;
  const titles = new Map(((materials ?? []) as Array<{ id: string; title: string }>).map((item) => [item.id, item.title]));
  return reports.map((report) => ({
    id: report.id,
    materialId: report.material_id,
    materialTitle: titles.get(report.material_id) ?? null,
    reason: report.reason,
    details: report.details,
  }));
}

export async function reviewCommunityMaterialReport(
  client: SupabaseClient,
  reportId: string,
  decision: 'resolved' | 'dismissed',
): Promise<void> {
  const { error } = await client.rpc('review_community_material_report', {
    target_report_id: reportId,
    decision,
  });
  if (error) throw error;
}
