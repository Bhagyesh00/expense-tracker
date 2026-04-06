import React from 'react';
import { View } from 'react-native';
import { cn } from '../lib/cn';
import { Text } from '../primitives/text';
import { Button } from '../primitives/button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <View className={cn('items-center justify-center px-8 py-12', className)}>
      {icon && (
        <View className="mb-4 rounded-full bg-secondary-100 p-4">{icon}</View>
      )}
      <Text variant="h3" className="text-center text-secondary-900 mb-2">
        {title}
      </Text>
      {description && (
        <Text variant="body" className="text-center text-secondary-500 mb-6 max-w-xs">
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button variant="default" size="default" onPress={onAction}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

EmptyState.displayName = 'EmptyState';

export { EmptyState };
