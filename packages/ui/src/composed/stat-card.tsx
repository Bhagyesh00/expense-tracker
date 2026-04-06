import React from 'react';
import { View } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { cn } from '../lib/cn';
import { Text } from '../primitives/text';
import { Card } from '../primitives/card';

export interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
  className?: string;
}

function StatCard({
  title,
  value,
  change,
  icon,
  trend,
  className,
}: StatCardProps) {
  const isPositive = trend === 'up';
  const showTrend = trend !== undefined && change !== undefined;

  return (
    <Card className={cn('p-4', className)}>
      <View className="flex-row items-start justify-between mb-3">
        <Text variant="caption" className="text-secondary-500 flex-1">
          {title}
        </Text>
        {icon && (
          <View className="ml-2 rounded-lg bg-primary-50 p-2">{icon}</View>
        )}
      </View>

      <Text className="text-2xl font-bold text-secondary-900 mb-1">
        {value}
      </Text>

      {showTrend && (
        <View className="flex-row items-center">
          {isPositive ? (
            <TrendingUp size={14} color="#10b981" />
          ) : (
            <TrendingDown size={14} color="#ef4444" />
          )}
          <Text
            className={cn(
              'ml-1 text-sm font-medium',
              isPositive ? 'text-success-600' : 'text-error-600',
            )}
          >
            {isPositive ? '+' : ''}{change.toFixed(1)}%
          </Text>
          <Text variant="caption" className="ml-1">
            vs last month
          </Text>
        </View>
      )}
    </Card>
  );
}

StatCard.displayName = 'StatCard';

export { StatCard };
