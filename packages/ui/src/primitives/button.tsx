import React from 'react';
import {
  Pressable,
  type PressableProps,
  ActivityIndicator,
} from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { Text } from './text';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-lg',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 active:bg-primary-700',
        destructive: 'bg-error-600 active:bg-error-700',
        outline: 'border border-secondary-300 bg-transparent active:bg-secondary-100',
        secondary: 'bg-secondary-200 active:bg-secondary-300',
        ghost: 'bg-transparent active:bg-secondary-100',
        link: 'bg-transparent',
      },
      size: {
        default: 'h-12 px-5 py-3',
        sm: 'h-9 px-3 py-2',
        lg: 'h-14 px-8 py-4',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const buttonTextVariants = cva('font-sans font-semibold text-center', {
  variants: {
    variant: {
      default: 'text-white',
      destructive: 'text-white',
      outline: 'text-secondary-900',
      secondary: 'text-secondary-900',
      ghost: 'text-secondary-900',
      link: 'text-primary-600 underline',
    },
    size: {
      default: 'text-base',
      sm: 'text-sm',
      lg: 'text-lg',
      icon: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends Omit<PressableProps, 'children'>,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  loading?: boolean;
  className?: string;
  textClassName?: string;
}

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      className,
      textClassName,
      variant,
      size,
      disabled,
      loading,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <Pressable
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          isDisabled && 'opacity-50',
          className,
        )}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={
              variant === 'outline' || variant === 'ghost' || variant === 'secondary'
                ? '#475569'
                : '#ffffff'
            }
          />
        ) : typeof children === 'string' ? (
          <Text
            className={cn(
              buttonTextVariants({ variant, size }),
              textClassName,
            )}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </Pressable>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants, buttonTextVariants };
