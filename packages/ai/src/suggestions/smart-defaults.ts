export interface SmartDefaults {
  suggestedCategory: string | null;
  suggestedDescription: string | null;
}

interface RecentExpense {
  description: string;
  category_id: string | null;
  date: string;
}

interface TimeSlot {
  label: string;
  categories: string[];
  descriptions: string[];
}

/**
 * Time-of-day and context-based suggestion slots.
 * Categories are common category names (matched case-insensitively against
 * the user's actual category list in the calling code).
 */
const TIME_SLOTS: Record<string, TimeSlot> = {
  earlyMorning: {
    label: 'Early Morning (6-10)',
    categories: ['food', 'food & drinks', 'coffee', 'breakfast', 'transport'],
    descriptions: ['Coffee', 'Breakfast', 'Morning tea'],
  },
  lunch: {
    label: 'Lunch (11-14)',
    categories: ['food', 'food & drinks', 'restaurant', 'dining'],
    descriptions: ['Lunch', 'Restaurant', 'Cafeteria'],
  },
  afternoon: {
    label: 'Afternoon (14-17)',
    categories: ['transport', 'shopping', 'snacks'],
    descriptions: ['Snacks', 'Tea', 'Auto/cab'],
  },
  evening: {
    label: 'Evening (17-21)',
    categories: ['food', 'groceries', 'dining', 'dinner'],
    descriptions: ['Dinner', 'Groceries', 'Vegetables'],
  },
  night: {
    label: 'Night (21-6)',
    categories: ['entertainment', 'food', 'transport'],
    descriptions: ['Late night food', 'Cab home'],
  },
};

const WEEKEND_SLOTS: Record<string, TimeSlot> = {
  morning: {
    label: 'Weekend Morning',
    categories: ['food', 'groceries', 'shopping'],
    descriptions: ['Brunch', 'Groceries', 'Weekend shopping'],
  },
  afternoon: {
    label: 'Weekend Afternoon',
    categories: ['entertainment', 'shopping', 'dining'],
    descriptions: ['Movie', 'Shopping', 'Lunch out'],
  },
  evening: {
    label: 'Weekend Evening',
    categories: ['dining', 'entertainment', 'food'],
    descriptions: ['Dinner out', 'Drinks', 'Entertainment'],
  },
};

/**
 * Get smart defaults based on time of day, day of week, and recent expense patterns.
 */
export function getSmartDefaults(
  hour: number,
  dayOfWeek: number,
  recentExpenses: RecentExpense[],
): SmartDefaults {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // First, check recent patterns at this time
  const patternMatch = findRecentPattern(hour, dayOfWeek, recentExpenses);
  if (patternMatch) {
    return patternMatch;
  }

  // Fall back to time-based defaults
  const slot = getTimeSlot(hour, isWeekend);
  if (!slot) {
    return { suggestedCategory: null, suggestedDescription: null };
  }

  return {
    suggestedCategory: slot.categories[0] ?? null,
    suggestedDescription: slot.descriptions[0] ?? null,
  };
}

function getTimeSlot(hour: number, isWeekend: boolean): TimeSlot | null {
  if (isWeekend) {
    if (hour >= 6 && hour < 12) return WEEKEND_SLOTS.morning!;
    if (hour >= 12 && hour < 17) return WEEKEND_SLOTS.afternoon!;
    if (hour >= 17 && hour < 24) return WEEKEND_SLOTS.evening!;
    return TIME_SLOTS.night!;
  }

  if (hour >= 6 && hour < 10) return TIME_SLOTS.earlyMorning!;
  if (hour >= 10 && hour < 14) return TIME_SLOTS.lunch!;
  if (hour >= 14 && hour < 17) return TIME_SLOTS.afternoon!;
  if (hour >= 17 && hour < 21) return TIME_SLOTS.evening!;
  return TIME_SLOTS.night!;
}

/**
 * Look at recent expenses at the same time of day and day of week
 * to find a repeating pattern.
 */
function findRecentPattern(
  hour: number,
  dayOfWeek: number,
  recentExpenses: RecentExpense[],
): SmartDefaults | null {
  if (recentExpenses.length < 3) return null;

  // Filter expenses from the same time window (+/- 1 hour) and same day of week
  const timeWindowExpenses = recentExpenses.filter((exp) => {
    const expDate = new Date(exp.date);
    const expHour = expDate.getHours();
    const expDay = expDate.getDay();
    return (
      expDay === dayOfWeek &&
      Math.abs(expHour - hour) <= 1
    );
  });

  if (timeWindowExpenses.length < 2) return null;

  // Find most common description and category
  const descFreq = new Map<string, number>();
  const catFreq = new Map<string, number>();

  for (const exp of timeWindowExpenses) {
    const desc = exp.description.toLowerCase().trim();
    descFreq.set(desc, (descFreq.get(desc) ?? 0) + 1);

    if (exp.category_id) {
      catFreq.set(exp.category_id, (catFreq.get(exp.category_id) ?? 0) + 1);
    }
  }

  const topDesc = findMostFrequent(descFreq);
  const topCat = findMostFrequent(catFreq);

  if (!topDesc && !topCat) return null;

  // Find the original casing from the most recent matching expense
  const originalDesc = topDesc
    ? timeWindowExpenses.find(
        (e) => e.description.toLowerCase().trim() === topDesc,
      )?.description
    : null;

  return {
    suggestedCategory: topCat,
    suggestedDescription: originalDesc ?? null,
  };
}

function findMostFrequent(freq: Map<string, number>): string | null {
  let maxKey: string | null = null;
  let maxCount = 0;

  for (const [key, count] of freq) {
    if (count > maxCount) {
      maxCount = count;
      maxKey = key;
    }
  }

  return maxCount >= 2 ? maxKey : null;
}
