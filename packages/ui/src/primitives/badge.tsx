import React from 'react';
import { View } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Text } from './text';

const badgeVariants = cva('flex-row items-center justify-center rounded-full', {
  variants: {
    variant: {
      default: 'bg-primary-100',
      success: 'bg-success-100',
      warning: 'bg-warning-100',
      error: 'bg-error-100',
      info: 'bg-info-100',
      outline: 'border border-secondary-300 bg-transparent',
    },
    size: {
      sm: 'px-2 py-0.5',
      md: 'px-3 py-1',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

const badgeTextVariants = cva('font-sans font-medium', {
  variants: {
    variant: {
      default: 'text-primary-700',
      success: 'text-success-700',
      warning: 'text-warning-700',
      error: 'text-error-700',
      info: 'text-info-700',
      outline: 'text-secondary-700',
    },
    size: {
      sm: 'text-2xs',
      md: 'text-xs',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  label: string;
  className?: string;
  textClassName?: string;
}

function Badge({ label, variant, size, className, textClassName }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant, size }), className)}>
      <Text
        className={cn(badgeTextVariants({ variant, size }), textClassName)}
      >
        {label}
      </Text>
    </View>
  );
}

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
