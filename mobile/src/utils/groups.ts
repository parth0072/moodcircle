import type { Member, OverviewGroup } from '@/api/schemas/group';
import type { FeedItem } from '@/api/schemas/mood';
import { EMOTIONS, emotionLabels, type Emotion } from '@/constants/emotions';
import { HUG_REACTION } from '@/constants/groups';

/** "1 member", "6 members". */
export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** The letter on a tile or avatar; "?" when there is no name. */
export function initialOf(name: string | null | undefined): string {
  return (name ?? '').trim().charAt(0).toUpperCase() || '?';
}

export function displayName(person: { name?: string | null; username?: string | null }): string {
  return person.name?.trim() || person.username?.trim() || 'Someone';
}

/** An invite code as typed: no spaces, upper case (the server ignores case too). */
export function normalizeCode(text: string): string {
  return text.replace(/\s+/g, '').toUpperCase();
}

/** What "Invite people" shares. */
export function inviteMessage(groupName: string, code: string): string {
  return `Join my circle "${groupName}" on Moodbloom. Open Groups, tap "Join with code" and enter ${code}.`;
}

/** "12 min ago", "3 hr ago". Posts are from today, so a day or more is only a time-zone edge. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} hr ago` : 'Yesterday';
}

export interface EmotionCount {
  emotion: Emotion;
  count: number;
}

/** Posts counted by emotion, most first (ties keep the design's order). */
export function countByEmotion(posts: { emotion: Emotion }[]): EmotionCount[] {
  const counts = new Map<Emotion, number>();
  for (const { emotion } of posts) counts.set(emotion, (counts.get(emotion) ?? 0) + 1);
  return EMOTIONS.filter((emotion) => counts.has(emotion))
    .map((emotion) => ({ emotion, count: counts.get(emotion) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

/** "Mostly calm", or "A mix of moods" when the top two are level. Empty when nothing was posted. */
export function moodHeadline(posts: { emotion: Emotion }[]): string {
  const [first, second] = countByEmotion(posts);
  if (!first) return '';
  if (second && second.count === first.count) return 'A mix of moods';
  return `Mostly ${emotionLabels[first.emotion].toLowerCase()}`;
}

/** The line at the right of a group card. */
export function circleSummary(group: OverviewGroup): string {
  const posted = group.today.length;
  if (posted === 0) return 'No check-ins yet today';
  // When at least half the group has posted the mood is the news; before that, who is missing.
  if (posted * 2 >= group.memberCount) return `${moodHeadline(group.today)} today`;
  // Fewer than half have posted, so at least two are missing: always plural.
  return `${group.memberCount - posted} haven't checked in`;
}

/** "6 members · 4 posts today". */
export function circleMeta(group: OverviewGroup): string {
  return `${pluralize(group.memberCount, 'member')} · ${pluralize(group.today.length, 'post')} today`;
}

/** One piece of the group's mood bar: an emotion, or (null) the members who have not posted yet. */
export interface BarSegment {
  emotion: Emotion | null;
  count: number;
}

export function moodBar(group: OverviewGroup): BarSegment[] {
  const segments: BarSegment[] = countByEmotion(group.today);
  const missing = group.memberCount - group.today.length;
  if (missing > 0) segments.push({ emotion: null, count: missing });
  return segments;
}

/** "Group mood today: 2 calm, 1 joy, 3 not yet", for a screen reader. */
export function moodBarLabel(segments: BarSegment[]): string {
  const parts = segments.map((s) => `${s.count} ${s.emotion ?? 'not yet'}`);
  return `Group mood today: ${parts.join(', ')}`;
}

export interface StackedMember {
  id: string;
  initial: string;
  /** The emotion they posted today, or null when they have not. */
  emotion: Emotion | null;
}

/** The little row of avatars on a group card: who posted first, then the rest; `extra` is the "+2". */
export function memberStack(
  group: OverviewGroup,
  limit = 4,
): { members: StackedMember[]; extra: number } {
  const emotionByUser = new Map<string, Emotion>();
  for (const post of group.today) if (post.userId) emotionByUser.set(post.userId, post.emotion);
  const all = group.members.map((m) => ({
    id: m.id,
    initial: initialOf(displayName(m)),
    emotion: emotionByUser.get(m.id) ?? null,
  }));
  const ordered = [...all.filter((m) => m.emotion), ...all.filter((m) => !m.emotion)];
  const members = ordered.slice(0, limit);
  return { members, extra: Math.max(group.memberCount - members.length, 0) };
}

/** Posts by other people that came in after the person last opened the group. */
export function unreadCount(
  group: OverviewGroup,
  myId: string | undefined,
  seenAt?: string,
): number {
  return group.today.filter((post) => post.userId !== myId && (!seenAt || post.createdAt > seenAt))
    .length;
}

export interface RightNowMember {
  id: string;
  /** "You" for the signed-in person. */
  name: string;
  initial: string;
  emotion: Emotion | null;
  isMe: boolean;
}

/** The row under the group's name: the person first, then who has posted, then who has not yet. */
export function rightNow(
  members: Member[],
  feed: FeedItem[],
  myId: string | undefined,
): RightNowMember[] {
  const emotionByUser = new Map<string, Emotion>();
  for (const item of feed) {
    const id = posterId(item);
    if (id) emotionByUser.set(id, item.emotion);
  }
  const rows = members.map((member) => {
    const isMe = member.id === myId;
    const name = isMe ? 'You' : displayName(member);
    return {
      id: member.id,
      name,
      initial: initialOf(name),
      emotion: emotionByUser.get(member.id) ?? null,
      isMe,
    };
  });
  return [
    ...rows.filter((r) => r.isMe),
    ...rows.filter((r) => !r.isMe && r.emotion),
    ...rows.filter((r) => !r.isMe && !r.emotion),
  ];
}

/** Who made a post; undefined for an anonymous one. */
export function posterId(item: FeedItem): string | undefined {
  return 'id' in item.user ? item.user.id : undefined;
}

/** The name on a post: "Someone" for an anonymous one. */
export function posterName(item: FeedItem): string {
  return 'anonymous' in item.user ? 'Someone' : displayName(item.user);
}

/** Hugs on a post: how many, and the person's own (so they can take it back). */
export function hugsOn(
  item: FeedItem,
  myId: string | undefined,
): { count: number; mineId: string | null } {
  const hugs = item.reactions.filter((r) => r.type === HUG_REACTION);
  return { count: hugs.length, mineId: hugs.find((r) => r.userId === myId)?.id ?? null };
}
