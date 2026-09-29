import { render } from '@testing-library/react-native';

import { MoodFace } from './mood-face';

describe('MoodFace', () => {
  it('draws a distinct face for each of the five levels', async () => {
    const drawings = new Set<string>();
    for (const level of [1, 2, 3, 4, 5] as const) {
      const view = await render(<MoodFace level={level} />);
      drawings.add(JSON.stringify(view.toJSON()));
    }
    expect(drawings.size).toBe(5);
  });

  it('is decorative unless labelled, then announces the mood name', async () => {
    const hidden = await render(<MoodFace level={2} />);
    expect(hidden.toJSON()).toMatchObject({ props: { accessibilityElementsHidden: true } });
    const labelled = await render(<MoodFace level={2} labelled />);
    expect(labelled.toJSON()).toMatchObject({
      props: {
        accessibilityRole: 'image',
        accessibilityLabel: 'Low',
        accessibilityElementsHidden: false,
      },
    });
  });
});
