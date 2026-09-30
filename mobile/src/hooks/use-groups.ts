import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addHug,
  createGroup,
  getGroupDetail,
  getGroupFeed,
  joinGroup,
  listGroupOverview,
  postGroupMood,
  previewGroup,
  removeHug,
  type JoinRequest,
  type NewGroup,
  type NewPost,
} from '@/api/groups';
import { MIN_CODE_LENGTH } from '@/constants/groups';

import { groupKeys } from './group-keys';

// Other people post and join while a screen is closed, so group data is never treated as fresh
// (the app's default is 30 seconds): opening a screen, or coming back to the app, fetches again and
// shows what it already has in the meantime.
const ALWAYS_REFETCH = { staleTime: 0 } as const;

/** The person's groups with members and today's posts ("Your circles"). */
export function useGroupOverview() {
  return useQuery({
    queryKey: groupKeys.overview(),
    queryFn: listGroupOverview,
    ...ALWAYS_REFETCH,
  });
}

/** One group and all its members. */
export function useGroupDetail(id: string) {
  return useQuery({
    queryKey: groupKeys.detail(id),
    queryFn: () => getGroupDetail(id),
    ...ALWAYS_REFETCH,
  });
}

/** Today's posts in one group. */
export function useGroupFeed(id: string) {
  return useQuery({
    queryKey: groupKeys.feed(id),
    queryFn: () => getGroupFeed(id),
    ...ALWAYS_REFETCH,
  });
}

/**
 * What an invite code opens. Waits for a code long enough to be one, and never retries: "no group
 * has this code" is an answer, not a failure.
 */
export function useGroupPreview(code: string) {
  return useQuery({
    queryKey: groupKeys.preview(code),
    queryFn: () => previewGroup(code),
    enabled: code.length >= MIN_CODE_LENGTH,
    retry: false,
    staleTime: 30_000,
  });
}

/** Anything that changes a group, its members or its posts can change every group screen. */
function useRefreshGroups() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: groupKeys.all });
}

export function useCreateGroup() {
  const refresh = useRefreshGroups();
  return useMutation({ mutationFn: (group: NewGroup) => createGroup(group), onSuccess: refresh });
}

export function useJoinGroup() {
  const refresh = useRefreshGroups();
  return useMutation({
    mutationFn: (request: JoinRequest) => joinGroup(request),
    onSuccess: refresh,
  });
}

export function usePostToGroup() {
  const refresh = useRefreshGroups();
  return useMutation({
    mutationFn: ({ groupId, ...post }: NewPost & { groupId: string }) =>
      postGroupMood(groupId, post),
    onSuccess: refresh,
  });
}

/** Sends a hug, or takes it back when `reactionId` (the person's own hug on that post) is given. */
export function useToggleHug() {
  const refresh = useRefreshGroups();
  return useMutation({
    mutationFn: ({ moodId, reactionId }: { moodId: string; reactionId: string | null }) =>
      reactionId ? removeHug(moodId, reactionId) : addHug(moodId).then(() => undefined),
    onSuccess: refresh,
  });
}
