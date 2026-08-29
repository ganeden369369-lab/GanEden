import { Image } from 'react-native';

/** Rendered diameter (px) per avatar size — exported so layouts can reserve the same space. */
export const AVATAR_SIZES = { sm: 32, md: 48, lg: 96 } as const;

export type AvatarSize = keyof typeof AVATAR_SIZES;

export function Avatar({ size = 'md' }: { size?: AvatarSize }) {
  const d = AVATAR_SIZES[size];
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- RN/Metro asset loading requires `require()`
  return <Image source={require('../../../../assets/brand/mentor-photo.jpg')} style={{ width: d, height: d, borderRadius: d / 2 }} />;
}
