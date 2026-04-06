import React from 'react';
import { View, Pressable, type PressableProps } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { cn } from '../lib/cn';
import { Text } from '../primitives/text';
import { CategoryPill } from './category-pill';

export interface ExpenseCardData {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: {
    name: string;
    icon?: React.ReactNode;
    color?: string;
  };
  date: string;
  type?: 'expense' | 'income';
}

export interface ExpenseCardProps extends Omit<PressableProps, 'children'> {
  expense: ExpenseCardData;
  className?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  INR: '\u20B9',
  JPY: '\u00A5',
};

function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + ' ';
  const formatted = Math.abs(amount)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${symbol}${formatted}`;
}

function getRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ExpenseCard({ expense, className, ...props }: ExpenseCardProps) {
  const isIncome = expense.type === 'income';

  return (
    <Pressable
      className={cn(
        'flex-row items-center rounded-xl border border-secondary-200 bg-white px-4 py-3 active:bg-secondary-50',
        className,
      )}
      accessibilityRole="button"
      accessibilityLabel={`${expense.description}, ${formatAmount(expense.amount, expense.currency)}`}
      {...props}
    >
      <View className="mr-3">
        <CategoryPill
          name={expense.category.name}
          icon={expense.category.icon}
          color={expense.category.color}
          size="sm"
        />
      </View>

      <View className="flex-1">
        <Text className="text-base font-medium text-secondary-900" numberOfLines={1}>
          {expense.description}
        </Text>
        <Text variant="caption" className="mt-0.5">
          {getRelativeDate(expense.date)}
        </Text>
      </View>

      <View className="ml-3 items-end">
        <Text
          className={cn(
            'text-base font-semibold',
            isIncome ? 'text-success-600' : 'text-secondary-900',
          )}
        >
          {isIncome ? '+' : '-'}{formatAmount(expense.amount, expense.currency)}
        </Text>
      </View>

      <ChevronRight
        size={18}
        color="#94a3b8"
        className="ml-2"
      />
    </Pressable>
  );
}

ExpenseCard.displayName = 'ExpenseCard';

export { ExpenseCard };
