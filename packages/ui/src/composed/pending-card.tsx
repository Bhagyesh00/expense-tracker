import React from 'react';
import { View, Pressable, type PressableProps } from 'react-native';
import { cn } from '../lib/cn';
import { Text } from '../primitives/text';
import { Badge } from '../primitives/badge';

export interface PendingPaymentData {
  id: string;
  direction: 'give' | 'receive';
  contact: {
    name: string;
    avatarUrl?: string | null;
  };
  amount: number;
  paidAmount?: number;
  currency: string;
  status: 'pending' | 'partial' | 'settled' | 'overdue' | 'cancelled';
  dueDate?: string | null;
  description?: string;
}

export interface PendingCardProps extends Omit<PressableProps, 'children'> {
  payment: PendingPaymentData;
  className?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  INR: '\u20B9',
  JPY: '\u00A5',
};

const STATUS_VARIANT_MAP = {
  pending: 'warning',
  partial: 'info',
  settled: 'success',
  overdue: 'error',
  cancelled: 'outline',
} as const;

function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + ' ';
  return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function formatDueDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays < 7) return `Due in ${diffDays}d`;
  return `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function PendingCard({ payment, className, ...props }: PendingCardProps) {
  const isReceive = payment.direction === 'receive';
  const progressPercent =
    payment.paidAmount && payment.amount > 0
      ? Math.min((payment.paidAmount / payment.amount) * 100, 100)
      : 0;

  return (
    <Pressable
      className={cn(
        'rounded-xl border bg-white p-4 active:bg-secondary-50',
        isReceive ? 'border-success-200' : 'border-error-200',
        className,
      )}
      accessibilityRole="button"
      accessibilityLabel={`${isReceive ? 'Receive from' : 'Pay to'} ${payment.contact.name}, ${formatAmount(payment.amount, payment.currency)}`}
      {...props}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          <View
            className={cn(
              'h-8 w-8 rounded-full items-center justify-center mr-3',
              isReceive ? 'bg-success-100' : 'bg-error-100',
            )}
          >
            <Text
              className={cn(
                'text-sm font-bold',
                isReceive ? 'text-success-700' : 'text-error-700',
              )}
            >
              {payment.contact.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-secondary-900" numberOfLines={1}>
              {payment.contact.name}
            </Text>
            {payment.description && (
              <Text variant="caption" numberOfLines={1}>
                {payment.description}
              </Text>
            )}
          </View>
        </View>

        <Badge
          label={payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
          variant={STATUS_VARIANT_MAP[payment.status]}
          size="sm"
        />
      </View>

      <View className="flex-row items-center justify-between">
        <Text
          className={cn(
            'text-lg font-bold',
            isReceive ? 'text-success-600' : 'text-error-600',
          )}
        >
          {isReceive ? '+' : '-'}{formatAmount(payment.amount, payment.currency)}
        </Text>

        {payment.dueDate && (
          <Text variant="caption" className="text-secondary-500">
            {formatDueDate(payment.dueDate)}
          </Text>
        )}
      </View>

      {payment.status === 'partial' && progressPercent > 0 && (
        <View className="mt-3">
          <View className="flex-row items-center justify-between mb-1">
            <Text variant="caption">
              Paid: {formatAmount(payment.paidAmount ?? 0, payment.currency)}
            </Text>
            <Text variant="caption">{Math.round(progressPercent)}%</Text>
          </View>
          <View className="h-1.5 rounded-full bg-secondary-200 overflow-hidden">
            <View
              className={cn(
                'h-full rounded-full',
                isReceive ? 'bg-success-500' : 'bg-error-500',
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </View>
        </View>
      )}
    </Pressable>
  );
}

PendingCard.displayName = 'PendingCard';

export { PendingCard };
