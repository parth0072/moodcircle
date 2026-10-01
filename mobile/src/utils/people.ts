import { emotionColors } from '@/theme';

import { pluralize } from './groups';

interface Named {
  name: string | null;
  username?: string | null;
}

/** What to call someone: their name, else their @username, else "Someone". */
export function personName(person: Named): string {
  return person.name?.trim() || (person.username ? `@${person.username}` : 'Someone');
}

// The avatar colours, taken from the emotion palette: all of them read ink text.
const PALETTE = [
  emotionColors.joy,
  emotionColors.calm,
  emotionColors.sad,
  emotionColors.anger,
  emotionColors.worry,
  emotionColors.meh,
];

/** A colour that stays the same for the same person on every screen. */
export function personColor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/** "Shared with Kabir", "Shared with Kabir and Mei", "Shared with Kabir, Mei and 2 others". */
export function sharedWithLabel(people: Named[]): string {
  const names = people.map(personName);
  if (names.length === 0) return 'Private';
  if (names.length === 1) return `Shared with ${names[0]}`;
  if (names.length === 2) return `Shared with ${names[0]} and ${names[1]}`;
  return `Shared with ${names[0]}, ${names[1]} and ${pluralize(names.length - 2, 'other')}`;
}

/** Where someone is reached from: "In Sunday Circle", "In Sunday Circle and 1 more group". */
export function groupsLabel(groups: { name: string }[]): string {
  if (groups.length === 0) return '';
  if (groups.length === 1) return `In ${groups[0].name}`;
  return `In ${groups[0].name} and ${pluralize(groups.length - 1, 'more group')}`;
}
