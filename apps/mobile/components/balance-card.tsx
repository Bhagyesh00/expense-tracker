import { View, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface BalanceCardProps {
  totalBalance: number;
  income: number;
  expenses: number;
  currency?: string;
}

function formatAmount(amount: number, currency: string = "INR"): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  const symbol = symbols[currency] ?? currency + " ";

  if (Math.abs(amount) >= 100000) {
    return `${symbol}${(amount / 100000).toFixed(1)}L`;
  }
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

export default function BalanceCard({
  totalBalance,
  income,
  expenses,
  currency = "INR",
}: BalanceCardProps) {
  return (
    <Animated.View entering={FadeInDown.duration(600).delay(200)}>
      <View
        className="mx-5 rounded-3xl overflow-hidden"
        style={{
          shadowColor: "#4F46E5",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        {/* Gradient-like background using layered views */}
        <View className="bg-primary-600 p-6">
          {/* Background decoration */}
          <View
            className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5"
            style={{ transform: [{ translateX: 40 }, { translateY: -40 }] }}
          />
          <View
            className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5"
            style={{ transform: [{ translateX: -20 }, { translateY: 30 }] }}
          />

          {/* Balance Label */}
          <Text className="text-white/70 text-sm font-medium mb-1">
            Total Balance
          </Text>

          {/* Balance Amount */}
          <Text className="text-white text-4xl font-bold mb-6">
            {formatAmount(totalBalance, currency)}
          </Text>

          {/* Income & Expense Row */}
          <View className="flex-row gap-4">
            {/* Income */}
            <View className="flex-1 bg-white/10 rounded-2xl p-3.5">
              <View className="flex-row items-center gap-2 mb-1">
                <View className="w-6 h-6 rounded-full bg-green-400/20 items-center justify-center">
                  <Text className="text-green-300 text-xs font-bold">↑</Text>
                </View>
                <Text className="text-white/70 text-xs font-medium">
                  Income
                </Text>
              </View>
              <Text className="text-white text-lg font-bold">
                {formatAmount(income, currency)}
              </Text>
            </View>

            {/* Expenses */}
            <View className="flex-1 bg-white/10 rounded-2xl p-3.5">
              <View className="flex-row items-center gap-2 mb-1">
                <View className="w-6 h-6 rounded-full bg-red-400/20 items-center justify-center">
                  <Text className="text-red-300 text-xs font-bold">↓</Text>
                </View>
                <Text className="text-white/70 text-xs font-medium">
                  Expenses
                </Text>
              </View>
              <Text className="text-white text-lg font-bold">
                {formatAmount(expenses, currency)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
