import { fireEvent, render } from '@testing-library/react-native';
import { Button } from './Button';

jest.mock('../lib/i18n', () => ({ currentLanguage: () => 'en' }));

it('calls onPress and exposes disabled state', () => {
  const onPress = jest.fn();
  const { getByRole, rerender } = render(<Button title="Go" onPress={onPress} />);
  fireEvent.press(getByRole('button'));
  expect(onPress).toHaveBeenCalledTimes(1);
  rerender(<Button title="Go" onPress={onPress} disabled />);
  expect(getByRole('button').props.accessibilityState.disabled).toBe(true);
});
