import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const textVariants = cva('font-sans text-secondary-900', {
  variants: {
    variant: {
      h1: 'text-3xl font-bold tracking-tight',
      h2: 'text-2xl font-bold tracking-tight',
      h3: 'text-xl font-semibold',
      body: 'text-base font-normal leading-6',
      caption: 'text-sm font-normal text-secondary-500',
      label: 'text-sm font-medium text-secondary-700',
    },
  },
  defaultVariants: {
    variant: 'body',
  },
});

export interface TextProps
  extends RNTextProps,
    VariantProps<typeof textVariants> {
  className?: string;
}

const Text = React.forwardRef<RNText, TextProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <RNText
        ref={ref}
        className={cn(textVariants({ variant }), className)}
        {...props}
      >
        {children}
      </RNText>
    );
  },
);

Text.displayName = 'Text';

export { Text, textVariants };
