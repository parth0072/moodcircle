import { api } from '@/api';
import type { Emotion } from '@/constants/emotions';
import { HUG_REACTION, type GroupColor } from '@/constants/groups';

import { parseResponse } from './parse';
import {
  groupDetailResponse,
  groupResponse,
  messageResponse,
  overviewResponse,
  previewResponse,
  type Group,
  type GroupPreview,
  type Member,
  type OverviewGroup,
} from './schemas/group';
import {
  postMoodResponse,
  reactionResponse,
  todayResponse,
  type FeedItem,
  type Reaction,
  type TodayFeed,
} from './schemas/mood';

export interface NewGroup {
  name: string;
  color: GroupColor;
  /** False makes a "mood only" group. */
  showNotes: boolean;
}

export interface JoinRequest {
  inviteCode: string;
  /** Share the day's journal mood with the group automatically. */
  autoShare: boolean;
}

export interface NewPost {
  emotion: Emotion;
  note?: string;
}

/** The person's groups with their members and what was posted today: the "Your circles" screen. */
export async function listGroupOverview(): Promise<OverviewGroup[]> {
  const data = await api.get<unknown>('/groups/overview');
  return parseResponse(overviewResponse, data).groups;
}

/** What a code opens, without joining. A wrong code is an ApiError with code INVALID_INVITE_CODE. */
export async function previewGroup(code: string): Promise<GroupPreview> {
  const data = await api.get<unknown>(`/groups/preview?code=${encodeURIComponent(code)}`);
  return parseResponse(previewResponse, data).group;
}

export async function createGroup(input: NewGroup): Promise<Group> {
  const data = await api.post<unknown>('/groups', input);
  return parseResponse(groupResponse, data).group;
}

export async function joinGroup(input: JoinRequest): Promise<Group> {
  const data = await api.post<unknown>('/groups/join', input);
  return parseResponse(groupResponse, data).group;
}

export async function getGroupDetail(id: string): Promise<{ group: Group; members: Member[] }> {
  const data = await api.get<unknown>(`/groups/${id}`);
  return parseResponse(groupDetailResponse, data);
}

/** Today's posts in one group, with who reacted to each. */
export async function getGroupFeed(id: string): Promise<TodayFeed> {
  const data = await api.get<unknown>(`/groups/${id}/moods/today`);
  return parseResponse(todayResponse, data);
}

/** One post a day per group; a second one is an ApiError with code ALREADY_CHECKED_IN. */
export async function postGroupMood(groupId: string, post: NewPost): Promise<FeedItem> {
  const body = post.note?.trim()
    ? { emotion: post.emotion, note: post.note.trim() }
    : { emotion: post.emotion };
  const data = await api.post<unknown>(`/groups/${groupId}/moods`, body);
  return parseResponse(postMoodResponse, data).mood;
}

/** "Send a hug". */
export async function addHug(moodId: string): Promise<Reaction> {
  const data = await api.post<unknown>(`/moods/${moodId}/reactions`, { type: HUG_REACTION });
  return parseResponse(reactionResponse, data).reaction;
}

export async function removeHug(moodId: string, reactionId: string): Promise<void> {
  const data = await api.delete<unknown>(`/moods/${moodId}/reactions/${reactionId}`);
  parseResponse(messageResponse, data);
}
