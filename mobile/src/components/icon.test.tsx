import { render } from '@testing-library/react-native';

import { Icon, type IconName } from './icon';

const names: IconName[] = [
  'home',
  'activity',
  'plus',
  'zap',
  'user',
  'chevron-left',
  'chevron-right',
  'chevron-down',
  'log-out',
  'refresh-cw',
  'share-2',
];

describe('Icon', () => {
  it('renders every icon at the requested size', async () => {
    for (const name of names) {
      const view = await render(<Icon name={name} size={30} />);
      expect(view.toJSON()).toMatchObject({ props: { width: 30, height: 30 } });
    }
  });
});
