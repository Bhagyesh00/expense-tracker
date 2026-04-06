import React, { useCallback, useState } from 'react';
import { View, TextInput, type TextInputProps } from 'react-native';
import { cn } from '../lib/cn';
import { Text } from '../primitives/text';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  INR: '\u20B9',
  JPY: '\u00A5',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '\u00A5',
  KRW: '\u20A9',
};

function formatWithThousandSeparators(value: string): string {
  const parts = value.split('.');
  const integerPart = parts[0]?.replace(/\B(?=(\d{3})+(?!\d))/g, ',') ?? '';
  return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
}

function stripFormatting(value: string): string {
  return value.replace(/,/g, '');
}

export interface CurrencyInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  currency: string;
  value: string;
  onChangeValue: (value: string) => void;
  error?: string;
  label?: string;
  containerClassName?: string;
}

const CurrencyInput = React.forwardRef<TextInput, CurrencyInputProps>(
  (
    {
      currency,
      value,
      onChangeValue,
      error,
      label,
      containerClassName,
      ...props
    },
    ref,
  ) => {
    const [displayValue, setDisplayValue] = useState(
      value ? formatWithThousandSeparators(value) : '',
    );
    const [isFocused, setIsFocused] = useState(false);

    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

    const handleChangeText = useCallback(
      (text: string) => {
        const raw = stripFormatting(text);
        // Allow only valid decimal input
        if (raw !== '' && !/^\d*\.?\d{0,2}$/.test(raw)) {
          return;
        }
        setDisplayValue(raw);
        onChangeValue(raw);
      },
      [onChangeValue],
    );

    const handleFocus = useCallback(() => {
      setIsFocused(true);
      // Show raw value on focus for easier editing
      setDisplayValue(stripFormatting(displayValue));
    }, [displayValue]);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      if (displayValue) {
        const raw = stripFormatting(displayValue);
        // Normalize: add .00 if no decimal, or pad decimal
        const normalized = raw.includes('.')
          ? raw.replace(/\.(\d?)$/, (_, d) => `.${d || '0'}0`.slice(0, 3))
          : raw;
        const formatted = formatWithThousandSeparators(normalized);
        setDisplayValue(formatted);
        onChangeValue(raw);
      }
    }, [displayValue, onChangeValue]);

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
          )}
        >
          <Text className="mr-2 text-lg font-semibold text-secondary-500">
            {symbol}
          </Text>
          <TextInput
            ref={ref}
            className="flex-1 py-3 text-lg font-semibold text-secondary-900 font-sans"
            value={displayValue}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#94a3b8"
            accessibilityLabel={label ?? `Amount in ${currency}`}
            {...props}
          />
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

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
