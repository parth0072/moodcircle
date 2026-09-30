import { render } from '@testing-library/react-native';

import { EMOTIONS, emotionLabels } from '@/constants/emotions';

import { EmotionFace } from './emotion-face';
import { FlowerFace } from './flower-face';

describe('EmotionFace', () => {
  it('draws all six emotions at the requested size', async () => {
    for (const emotion of EMOTIONS) {
      const view = await render(<EmotionFace emotion={emotion} size={40} />);
      expect(view.toJSON()).toMatchObject({ props: { width: 40, height: 40 } });
    }
  });

  it('is hidden from screen readers beside a text label, and an image with a name when it stands alone', async () => {
    const decorative = await render(<EmotionFace emotion="joy" />);
    expect(decorative.toJSON()).toMatchObject({ props: { accessibilityElementsHidden: true } });

    const alone = await render(<EmotionFace emotion="worry" labelled />);
    expect(alone.toJSON()).toMatchObject({
      props: { accessibilityRole: 'image', accessibilityLabel: emotionLabels.worry },
    });
  });
});

describe('FlowerFace', () => {
  it('draws every emotion as a bloom, named when labelled', async () => {
    for (const emotion of EMOTIONS) {
      const view = await render(<FlowerFace emotion={emotion} labelled />);
      expect(view.toJSON()).toMatchObject({
        props: { accessibilityRole: 'image', accessibilityLabel: emotionLabels[emotion] },
      });
    }
  });
});
