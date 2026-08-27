import { Image } from 'react-native';
export function Avatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const d = { sm: 32, md: 48, lg: 96 }[size];
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- RN/Metro asset loading requires `require()`
  return <Image source={require('../../../../assets/brand/mentor-photo.jpg')} style={{ width: d, height: d, borderRadius: d / 2 }} />;
}
