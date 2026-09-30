import { feedItem, minutesAgo, overviewGroup } from '@/test-utils/groups';

import {
  circleMeta,
  circleSummary,
  countByEmotion,
  displayName,
  hugsOn,
  initialOf,
  inviteMessage,
  memberStack,
  moodBar,
  moodBarLabel,
  moodHeadline,
  normalizeCode,
  pluralize,
  posterId,
  posterName,
  rightNow,
  timeAgo,
  unreadCount,
} from './groups';

const post = (
  emotion: 'joy' | 'calm' | 'sad' | 'worry' | 'anger' | 'meh',
  userId: string | null = null,
  createdAt = '2026-09-30T08:00:00.000Z',
) => ({
  userId,
  emotion,
  createdAt,
});

describe('small text helpers', () => {
  it('counts nouns', () => {
    expect(pluralize(1, 'member')).toBe('1 member');
    expect(pluralize(0, 'post')).toBe('0 posts');
    expect(pluralize(6, 'member')).toBe('6 members');
  });

  it('finds a letter and a name, with fallbacks', () => {
    expect(initialOf('  kabir')).toBe('K');
    expect(initialOf('')).toBe('?');
    expect(initialOf(null)).toBe('?');
    expect(displayName({ name: ' Kabir ', username: 'k' })).toBe('Kabir');
    expect(displayName({ name: null, username: 'kabir_9' })).toBe('kabir_9');
    expect(displayName({ name: null, username: null })).toBe('Someone');
  });

  it('cleans up a typed code and words an invitation', () => {
    expect(normalizeCode(' a1b 2c3\n')).toBe('A1B2C3');
    expect(inviteMessage('Sunday Circle', 'A1B2C3')).toContain('"Sunday Circle"');
    expect(inviteMessage('Sunday Circle', 'A1B2C3')).toContain('A1B2C3');
  });

  it('says how long ago', () => {
    const now = new Date('2026-09-30T12:00:00.000Z');
    const ago = (m: number) => timeAgo(new Date(now.getTime() - m * 60_000).toISOString(), now);
    expect(ago(0)).toBe('Just now');
    expect(ago(12)).toBe('12 min ago');
    expect(ago(59)).toBe('59 min ago');
    expect(ago(60)).toBe('1 hr ago');
    expect(ago(180)).toBe('3 hr ago');
    expect(ago(24 * 60)).toBe('Yesterday');
  });
});

describe('mood counts', () => {
  it('ranks emotions by count, ties in the design order', () => {
    const ranked = countByEmotion([
      { emotion: 'anger' },
      { emotion: 'calm' },
      { emotion: 'calm' },
      { emotion: 'joy' },
    ]);
    expect(ranked).toEqual([
      { emotion: 'calm', count: 2 },
      { emotion: 'joy', count: 1 },
      { emotion: 'anger', count: 1 },
    ]);
  });

  it('headlines the mood, or says it is a mix, or says nothing', () => {
    expect(moodHeadline([])).toBe('');
    expect(moodHeadline([{ emotion: 'calm' }])).toBe('Mostly calm');
    expect(moodHeadline([{ emotion: 'calm' }, { emotion: 'calm' }, { emotion: 'joy' }])).toBe(
      'Mostly calm',
    );
    expect(moodHeadline([{ emotion: 'calm' }, { emotion: 'joy' }])).toBe('A mix of moods');
  });
});

describe('a group card', () => {
  it('describes size and posts', () => {
    expect(circleMeta(overviewGroup({ memberCount: 6, today: [post('joy')] }))).toBe(
      '6 members · 1 post today',
    );
    expect(circleMeta(overviewGroup({ memberCount: 1, today: [] }))).toBe(
      '1 member · 0 posts today',
    );
  });

  it('summarises: the mood once half the group has posted, before that who is missing', () => {
    expect(circleSummary(overviewGroup({ memberCount: 4, today: [] }))).toBe(
      'No check-ins yet today',
    );
    expect(
      circleSummary(
        overviewGroup({
          memberCount: 6,
          today: [post('calm'), post('calm'), post('joy'), post('sad'), post('anger')],
        }),
      ),
    ).toBe('Mostly calm today');
    expect(
      circleSummary(overviewGroup({ memberCount: 2, today: [post('calm'), post('joy')] })),
    ).toBe('A mix of moods today');
    expect(circleSummary(overviewGroup({ memberCount: 4, today: [post('joy')] }))).toBe(
      "3 haven't checked in",
    );
    expect(circleSummary(overviewGroup({ memberCount: 3, today: [post('joy')] }))).toBe(
      "2 haven't checked in",
    );
    expect(
      circleSummary(overviewGroup({ memberCount: 5, today: [post('joy'), post('joy')] })),
    ).toBe("3 haven't checked in");
  });

  it('draws the mood bar with a grey piece for those who have not posted', () => {
    const bar = moodBar(
      overviewGroup({ memberCount: 4, today: [post('calm'), post('calm'), post('joy')] }),
    );
    expect(bar).toEqual([
      { emotion: 'calm', count: 2 },
      { emotion: 'joy', count: 1 },
      { emotion: null, count: 1 },
    ]);
    expect(moodBarLabel(bar)).toBe('Group mood today: 2 calm, 1 joy, 1 not yet');
    expect(moodBar(overviewGroup({ memberCount: 1, today: [post('joy')] }))).toEqual([
      { emotion: 'joy', count: 1 },
    ]);
  });

  it('stacks avatars with those who posted first, and counts the rest', () => {
    const members = ['me', 'a', 'b', 'c', 'd', 'e'].map((id, i) => ({
      id,
      name: `Person${i}`,
      username: null,
    }));
    const { members: shown, extra } = memberStack(
      overviewGroup({ memberCount: 6, members, today: [post('sad', 'd'), post('joy', 'b')] }),
    );
    expect(shown.map((m) => m.id)).toEqual(['b', 'd', 'me', 'a']);
    expect(shown[0].emotion).toBe('joy');
    expect(shown[2].emotion).toBeNull();
    expect(extra).toBe(2);
  });

  it("counts other people's posts since the group was last seen", () => {
    const g = overviewGroup({
      today: [
        post('joy', 'me', '2026-09-30T09:00:00.000Z'),
        post('calm', 'u-kabir', '2026-09-30T08:00:00.000Z'),
        post('sad', null, '2026-09-30T10:00:00.000Z'),
      ],
    });
    expect(unreadCount(g, 'me')).toBe(2); // never opened: everything but their own
    expect(unreadCount(g, 'me', '2026-09-30T08:30:00.000Z')).toBe(1); // only the anonymous one is newer
    expect(unreadCount(g, 'me', '2026-09-30T10:00:00.000Z')).toBe(0);
  });
});

describe('inside a group', () => {
  it('lists who is here right now: the person, then who posted, then who has not', () => {
    const detail = [
      { id: 'u-sam', name: 'Sam', username: null, avatar: null },
      { id: 'me', name: 'Aria', username: null, avatar: null },
      { id: 'u-kabir', name: 'Kabir', username: null, avatar: null },
    ];
    const row = rightNow(
      detail,
      [
        feedItem({
          user: { id: 'u-kabir', name: 'Kabir', username: null, avatar: null },
          emotion: 'joy',
        }),
      ],
      'me',
    );
    expect(row.map((r) => [r.name, r.initial, r.emotion])).toEqual([
      ['You', 'Y', null],
      ['Kabir', 'K', 'joy'],
      ['Sam', 'S', null],
    ]);
    expect(row[0].isMe).toBe(true);
  });

  it('does not put an anonymous post on anyone', () => {
    const detail = [{ id: 'u-kabir', name: 'Kabir', username: null, avatar: null }];
    const anonymous = feedItem({ user: { anonymous: true }, isAnonymous: true });
    expect(rightNow(detail, [anonymous], 'me')[0].emotion).toBeNull();
    expect(posterId(anonymous)).toBeUndefined();
    expect(posterName(anonymous)).toBe('Someone');
    expect(posterName(feedItem())).toBe('Kabir');
  });

  it('counts hugs and finds the ones the person sent', () => {
    const item = feedItem({
      reactions: [
        { id: 'r1', type: 'sending_love', userId: 'me', createdAt: minutesAgo(5) },
        { id: 'r2', type: 'sending_love', userId: 'u-sam', createdAt: minutesAgo(4) },
        { id: 'r3', type: 'same', userId: 'u-sam', createdAt: minutesAgo(3) },
      ],
    });
    expect(hugsOn(item, 'me')).toEqual({ count: 2, mineId: 'r1' });
    expect(hugsOn(item, 'u-kabir')).toEqual({ count: 2, mineId: null });
  });
});
