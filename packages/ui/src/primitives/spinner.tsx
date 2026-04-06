import React from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const spinnerSizeMap = {
  sm: { native: 'small' as const, pixels: 16 },
  md: { native: 'small' as const, pixels: 24 },
  lg: { native: 'large' as const, pixels: 36 },
};

const spinnerVariants = cva('items-center justify-center', {
  variants: {
    size: {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-9 w-9',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  color?: string;
  className?: string;
}

function Spinner({ size = 'md', color = '#6366f1', className }: SpinnerProps) {
  const sizeConfig = spinnerSizeMap[size ?? 'md'];

  if (Platform.OS === 'web') {
    return (
      <View
        className={cn(spinnerVariants({ size }), className)}
        accessibilityRole="progressbar"
        accessibilityLabel="Loading"
      >
        <View
          className={cn(
            'rounded-full border-2 border-secondary-200',
            size === 'sm' && 'h-4 w-4',
            size === 'md' && 'h-6 w-6',
            size === 'lg' && 'h-9 w-9',
          )}
          // @ts-expect-error -- web-only style for animation
          style={{
            borderTopColor: color,
            animationName: 'spin',
            animationDuration: '700ms',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
          }}
        />
      </View>
    );
  }

  return (
    <View className={cn(spinnerVariants({ size }), className)}>
      <ActivityIndicator
        size={sizeConfig.native}
        color={color}
        accessibilityLabel="Loading"
      />
    </View>
  );
}

Spinner.displayName = 'Spinner';

export { Spinner };
