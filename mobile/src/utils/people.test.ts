import { emotionColors } from '@/theme';

import { groupsLabel, personColor, personName, sharedWithLabel } from './people';

describe('personName', () => {
  it('prefers the name, then the username, then "Someone"', () => {
    expect(personName({ name: 'Kabir', username: 'kabir_k' })).toBe('Kabir');
    expect(personName({ name: '  ', username: 'kabir_k' })).toBe('@kabir_k');
    expect(personName({ name: null, username: null })).toBe('Someone');
    expect(personName({ name: null })).toBe('Someone');
  });
});

describe('personColor', () => {
  it('is the same colour for the same person, and one of the emotion colours', () => {
    const colour = personColor('3f2b8c1e-aaaa-4bbb-8ccc-0123456789ab');
    expect(personColor('3f2b8c1e-aaaa-4bbb-8ccc-0123456789ab')).toBe(colour);
    expect(Object.values(emotionColors)).toContain(colour);
  });

  it('is not the same colour for everyone', () => {
    const colours = new Set(Array.from({ length: 40 }, (_, i) => personColor(`user-${i}`)));
    expect(colours.size).toBeGreaterThan(2);
  });
});

describe('sharedWithLabel', () => {
  const kabir = { name: 'Kabir' };
  const mei = { name: 'Mei' };
  it('reads naturally for any number of people', () => {
    expect(sharedWithLabel([])).toBe('Private');
    expect(sharedWithLabel([kabir])).toBe('Shared with Kabir');
    expect(sharedWithLabel([kabir, mei])).toBe('Shared with Kabir and Mei');
    expect(sharedWithLabel([kabir, mei, { name: 'Jonah' }])).toBe(
      'Shared with Kabir, Mei and 1 other',
    );
    expect(sharedWithLabel([kabir, mei, { name: 'A' }, { name: 'B' }])).toBe(
      'Shared with Kabir, Mei and 2 others',
    );
  });
});

describe('groupsLabel', () => {
  it('names the group someone is reached from', () => {
    expect(groupsLabel([])).toBe('');
    expect(groupsLabel([{ name: 'Sunday Circle' }])).toBe('In Sunday Circle');
    expect(groupsLabel([{ name: 'Sunday Circle' }, { name: 'Book Club' }])).toBe(
      'In Sunday Circle and 1 more group',
    );
    expect(groupsLabel([{ name: 'A' }, { name: 'B' }, { name: 'C' }])).toBe(
      'In A and 2 more groups',
    );
  });
});
