import React from 'react';
import { View } from 'react-native';
import { cn } from '../lib/cn';
import { Text } from '../primitives/text';

export interface CategoryPillProps {
  name: string;
  icon?: React.ReactNode;
  color?: string;
  size?: 'sm' | 'md';
  className?: string;
}

function CategoryPill({
  name,
  icon,
  color = '#6366f1',
  size = 'md',
  className,
}: CategoryPillProps) {
  const bgOpacity = '20'; // 12% opacity hex

  return (
    <View
      className={cn(
        'flex-row items-center rounded-full',
        size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1.5',
        className,
      )}
      style={{ backgroundColor: `${color}${bgOpacity}` }}
    >
      {icon && (
        <View className={cn(size === 'sm' ? 'mr-1' : 'mr-1.5')}>
          {icon}
        </View>
      )}
      <Text
        className={cn(
          'font-medium',
          size === 'sm' ? 'text-xs' : 'text-sm',
        )}
        style={{ color }}
      >
        {name}
      </Text>
    </View>
  );
}

CategoryPill.displayName = 'CategoryPill';

export { CategoryPill };
