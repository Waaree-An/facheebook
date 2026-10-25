import type { SupabaseClient } from '@supabase/supabase-js';
import type { StudyTip } from '../types';

export interface CommunityTipComment {
  id: string;
  tipId: string;
  ownerId: string;
  content: string;
  createdAt: string;
}

type CommunityTipRow = {
  id: string;
  owner_id: string;
  title: string;
  author_name: string;
  category: StudyTip['category'];
  content: string;
  tags: string[];
  status: NonNullable<StudyTip['communityStatus']>;
  moderation_note: string | null;
  created_at: string;
  updated_at: string;
};

export interface CommunityTipReport {
  id: string;
  tipId: string;
  tipTitle: string | null;
  reason: string;
  details: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

const tipColumns = 'id, owner_id, title, author_name, category, content, tags, status, moderation_note, created_at, updated_at';

function mapCommunityTip(row: CommunityTipRow): StudyTip {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    authorName: row.author_name,
    category: row.category,
    content: row.content,
    tags: Array.isArray(row.tags) ? row.tags : [],
    likes: 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    communityStatus: row.status,
    moderationNote: row.moderation_note,
  };
}

export async function loadCommunityTips(
  client: SupabaseClient,
  userId: string,
): Promise<{ tips: StudyTip[]; commentsByTip: Record<string, CommunityTipComment[]> }> {
  const { data: tipRows, error: tipsError } = await client
    .from('community_tips')
    .select(tipColumns)
    .order('created_at', { ascending: false });
  if (tipsError) throw tipsError;

  const rows = (tipRows ?? []) as unknown as CommunityTipRow[];
  if (!rows.length) return { tips: [], commentsByTip: {} };

  const tipIds = rows.map((row) => row.id);
  const [
    { data: likeRows, error: likesError },
    { data: commentRows, error: commentsError },
  ] = await Promise.all([
    client.from('community_tip_likes')
      .select('tip_id, user_id')
      .in('tip_id', tipIds),
    client.from('community_tip_comments')
      .select('id, tip_id, owner_id, content, created_at')
      .in('tip_id', tipIds)
      .order('created_at', { ascending: true }),
  ]);
  if (likesError) throw likesError;
  if (commentsError) throw commentsError;

  const likes = (likeRows ?? []) as Array<{ tip_id: string; user_id: string }>;
  const likesByTip = new Map<string, { count: number; userLiked: boolean }>();
  for (const like of likes) {
    const current = likesByTip.get(like.tip_id) ?? { count: 0, userLiked: false };
    current.count += 1;
    current.userLiked ||= like.user_id === userId;
    likesByTip.set(like.tip_id, current);
  }

  const tips = rows.map((row) => {
    const tip = mapCommunityTip(row);
    const like = likesByTip.get(row.id);
    return { ...tip, likes: like?.count ?? 0, userLiked: like?.userLiked ?? false };
  });
  const commentsByTip: Record<string, CommunityTipComment[]> = {};
  for (const comment of (commentRows ?? []) as Array<{
    id: string;
    tip_id: string;
    owner_id: string;
    content: string;
    created_at: string;
  }>) {
    const comments = commentsByTip[comment.tip_id] ?? [];
    comments.push({
      id: comment.id,
      tipId: comment.tip_id,
      ownerId: comment.owner_id,
      content: comment.content,
      createdAt: comment.created_at,
    });
    commentsByTip[comment.tip_id] = comments;
  }
  return { tips, commentsByTip };
}

export async function submitCommunityTipComment(
  client: SupabaseClient,
  userId: string,
  tipId: string,
  content: string,
): Promise<CommunityTipComment> {
  const { data, error } = await client.from('community_tip_comments')
    .insert({ tip_id: tipId, owner_id: userId, content: content.trim() })
    .select('id, tip_id, owner_id, content, created_at')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    tipId: data.tip_id,
    ownerId: data.owner_id,
    content: data.content,
    createdAt: data.created_at,
  };
}

export async function isCommunityModerator(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc('is_community_moderator');
  if (error) throw error;
  return data === true;
}

export async function submitCommunityTip(
  client: SupabaseClient,
  userId: string,
  tip: Pick<StudyTip, 'title' | 'authorName' | 'category' | 'content' | 'tags'>,
): Promise<StudyTip> {
  const { data, error } = await client
    .from('community_tips')
    .insert({
      owner_id: userId,
      title: tip.title.trim(),
      author_name: tip.authorName.trim(),
      category: tip.category,
      content: tip.content.trim(),
      tags: tip.tags,
    })
    .select(tipColumns)
    .single();
  if (error) throw error;
  return mapCommunityTip(data as unknown as CommunityTipRow);
}

export async function deletePendingCommunityTip(client: SupabaseClient, tipId: string): Promise<void> {
  const { error } = await client.from('community_tips').delete().eq('id', tipId);
  if (error) throw error;
}

export async function toggleCommunityTipLike(
  client: SupabaseClient,
  userId: string,
  tipId: string,
  isLiked: boolean,
): Promise<void> {
  const result = isLiked
    ? await client.from('community_tip_likes').delete().eq('tip_id', tipId).eq('user_id', userId)
    : await client.from('community_tip_likes').insert({ tip_id: tipId, user_id: userId });
  if (result.error) throw result.error;
}

export async function reportCommunityTip(
  client: SupabaseClient,
  userId: string,
  tipId: string,
  reason: string,
  details: string,
): Promise<void> {
  const { error } = await client.from('community_tip_reports').insert({
    tip_id: tipId,
    reporter_id: userId,
    reason,
    details: details.trim() || null,
  });
  if (error) throw error;
}

export async function moderateCommunityTip(
  client: SupabaseClient,
  tipId: string,
  decision: 'approved' | 'rejected',
  note = '',
): Promise<void> {
  const { error } = await client.rpc('moderate_community_tip', {
    target_tip_id: tipId,
    decision,
    note,
  });
  if (error) throw error;
}

export async function loadOpenCommunityTipReports(client: SupabaseClient): Promise<CommunityTipReport[]> {
  const { data, error } = await client
    .from('community_tip_reports')
    .select('id, tip_id, reason, details, status, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    id: string;
    tip_id: string;
    reason: string;
    details: string | null;
    status: CommunityTipReport['status'];
    created_at: string;
  }>;
  if (!rows.length) return [];

  const { data: tips, error: tipsError } = await client
    .from('community_tips')
    .select('id, title')
    .in('id', rows.map((report) => report.tip_id));
  if (tipsError) throw tipsError;
  const titles = new Map(((tips ?? []) as Array<{ id: string; title: string }>).map((tip) => [tip.id, tip.title]));

  return rows.map((report) => ({
    id: report.id,
    tipId: report.tip_id,
    tipTitle: titles.get(report.tip_id) ?? null,
    reason: report.reason,
    details: report.details,
    status: report.status,
    createdAt: report.created_at,
  }));
}

export async function reviewCommunityTipReport(
  client: SupabaseClient,
  reportId: string,
  decision: 'resolved' | 'dismissed',
): Promise<void> {
  const { error } = await client.rpc('review_community_tip_report', {
    target_report_id: reportId,
    decision,
  });
  if (error) throw error;
}
