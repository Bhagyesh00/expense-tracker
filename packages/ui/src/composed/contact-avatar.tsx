import React from 'react';
import { View, Image } from 'react-native';
import { cn } from '../lib/cn';
import { Text } from '../primitives/text';

export interface ContactAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: { container: 'h-8 w-8', text: 'text-xs', image: 32 },
  md: { container: 'h-10 w-10', text: 'text-sm', image: 40 },
  lg: { container: 'h-14 w-14', text: 'text-lg', image: 56 },
} as const;

const AVATAR_COLORS = [
  '#6366f1', // primary
  '#10b981', // success
  '#f59e0b', // warning
  '#3b82f6', // info
  '#ef4444', // error
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0]!.charAt(0).toUpperCase();
  }
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

function ContactAvatar({
  name,
  avatarUrl,
  size = 'md',
  className,
}: ContactAvatarProps) {
  const sizeConfig = SIZE_MAP[size];

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        className={cn('rounded-full', sizeConfig.container, className)}
        style={{ width: sizeConfig.image, height: sizeConfig.image }}
        accessibilityLabel={name}
      />
    );
  }

  const bgColor = getColorForName(name);
  const initials = getInitials(name);

  return (
    <View
      className={cn(
        'items-center justify-center rounded-full',
        sizeConfig.container,
        className,
      )}
      style={{ backgroundColor: bgColor }}
      accessibilityLabel={name}
    >
      <Text className={cn('font-bold text-white', sizeConfig.text)}>
        {initials}
      </Text>
    </View>
  );
}

ContactAvatar.displayName = 'ContactAvatar';

export { ContactAvatar };
