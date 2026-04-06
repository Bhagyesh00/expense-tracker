import React, { useState } from 'react';
import { View, TextInput, type TextInputProps } from 'react-native';
import { cn } from '../lib/cn';
import { Text } from './text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
}

const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      containerClassName,
      inputClassName,
      secureTextEntry,
      editable = true,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View className={cn('w-full', containerClassName)}>
        {label && (
          <Text
            variant="label"
            className={cn(
              'mb-1.5',
              error ? 'text-error-600' : 'text-secondary-700',
            )}
          >
            {label}
          </Text>
        )}
        <View
          className={cn(
            'flex-row items-center rounded-lg border bg-white px-3',
            isFocused && !error && 'border-primary-500',
            error ? 'border-error-500 bg-error-50' : 'border-secondary-300',
            !editable && 'bg-secondary-100 opacity-60',
          )}
        >
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <TextInput
            ref={ref}
            className={cn(
              'flex-1 py-3 text-base text-secondary-900 font-sans',
              inputClassName,
            )}
            placeholderTextColor="#94a3b8"
            secureTextEntry={secureTextEntry}
            editable={editable}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            accessibilityLabel={label}
            accessibilityState={{ disabled: !editable }}
            {...props}
          />
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </View>
        {error && (
          <Text variant="caption" className="mt-1 text-error-600">
            {error}
          </Text>
        )}
      </View>
    );
  },
);

Input.displayName = 'Input';

export { Input };
