import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { cn } from '../lib/cn';
import { Text } from '../primitives/text';

export interface BudgetRingProps {
  spent: number;
  budget: number;
  currency: string;
  categoryName?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  INR: '\u20B9',
  JPY: '\u00A5',
};

function getProgressColor(percent: number): string {
  if (percent < 50) return '#10b981'; // success-500
  if (percent < 80) return '#f59e0b'; // warning-500
  return '#ef4444'; // error-500
}

function formatCompact(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + ' ';
  if (amount >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}k`;
  }
  return `${symbol}${amount.toFixed(0)}`;
}

function BudgetRing({
  spent,
  budget,
  currency,
  categoryName,
  size = 120,
  strokeWidth = 10,
  className,
}: BudgetRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  const progressColor = getProgressColor(percent);

  return (
    <View className={cn('items-center', className)}>
      <View style={{ width: size, height: size }} className="items-center justify-center">
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View className="items-center">
          <Text className="text-lg font-bold text-secondary-900">
            {Math.round(percent)}%
          </Text>
          <Text variant="caption" className="text-2xs">
            {formatCompact(spent, currency)}
          </Text>
        </View>
      </View>
      {categoryName && (
        <Text variant="caption" className="mt-2 text-center" numberOfLines={1}>
          {categoryName}
        </Text>
      )}
      <Text variant="caption" className="text-2xs text-center text-secondary-400">
        of {formatCompact(budget, currency)}
      </Text>
    </View>
  );
}

BudgetRing.displayName = 'BudgetRing';

export { BudgetRing };
