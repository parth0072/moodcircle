import type { Group, OverviewGroup } from '@/api/schemas/group';
import type { FeedItem } from '@/api/schemas/mood';

// Builders for the group screens' tests: a plausible group, and overrides for what a test cares about.

export const signedInUser = {
  id: 'me',
  email: 'aria@example.com',
  name: 'Aria',
  username: null,
  avatar: null,
  isPremium: false,
  hasPassword: true,
  joyActivities: [],
  joyOnboarded: false,
};

export const group = (overrides: Partial<Group> = {}): Group => ({
  id: 'g1',
  name: 'Sunday Circle',
  inviteCode: 'A1B2C3',
  createdBy: 'u-kabir',
  memberCount: 3,
  isAdmin: false,
  color: 'blue',
  showNotes: true,
  autoShare: false,
  createdAt: '2026-09-30T06:00:00.000Z',
  ...overrides,
});

export const overviewGroup = (overrides: Partial<OverviewGroup> = {}): OverviewGroup => ({
  ...group(),
  members: [
    { id: 'me', name: 'Aria', username: null },
    { id: 'u-kabir', name: 'Kabir', username: null },
    { id: 'u-sam', name: 'Sam', username: null },
  ],
  today: [],
  ...overrides,
});

export const feedItem = (overrides: Partial<FeedItem> = {}): FeedItem => ({
  id: 'p1',
  user: { id: 'u-kabir', name: 'Kabir', username: null, avatar: null },
  isOwn: false,
  level: 5,
  emotion: 'joy',
  note: '',
  isAnonymous: false,
  date: '2026-09-30',
  createdAt: '2026-09-30T08:00:00.000Z',
  reactions: [],
  ...overrides,
});

/** An ISO time `minutes` ago, so "12 min ago" style labels are stable in a test. */
export const minutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60_000).toISOString();
