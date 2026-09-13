// LIFE RPG PROGRESSION ENGINE (Exact formulas from user specification)

// XP required to go from level (n) to (n+1)
export function xpForLevel(level: number): number {
  const BASE = 100;
  const GROWTH = 1.15; // 1.1 = gentle, 1.3 = steep
  return Math.round(BASE * Math.pow(level, GROWTH));
}

// Total cumulative XP needed to reach a given level from 0
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
}

// Given a user's total XP, derive their current level + progress
export function getLevelFromXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  xpToNextLevel: number;
  progressPercent: number;
} {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  const nextLevelXp = xpForLevel(level);
  return {
    level,
    currentLevelXp: remaining,
    xpToNextLevel: nextLevelXp,
    progressPercent: Math.min(100, Math.round((remaining / nextLevelXp) * 100)),
  };
}

export interface CharacterState {
  id: string;
  username: string;
  total_xp: number;
  currency: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string;
  attributes: {
    Intellect: number;
    Vitality: number;
    Serenity: number;
    Craft: number;
  };
}

// Streak bonus multiplier: 1 + Math.min(streak, 30) * 0.02
export function calculateStreakMultiplier(streak: number): number {
  return 1 + Math.min(streak, 30) * 0.02;
}

// Map task category to character attribute
export function mapCategoryToAttribute(category: string): 'Intellect' | 'Vitality' | 'Serenity' | 'Craft' {
  switch (category.toLowerCase()) {
    case 'intellect':
    case 'study':
    case 'coding':
      return 'Intellect';
    case 'vitality':
    case 'body':
    case 'health':
      return 'Vitality';
    case 'serenity':
    case 'soul':
    case 'mindfulness':
      return 'Serenity';
    case 'craft':
    case 'order':
    case 'workshop':
    default:
      return 'Craft';
  }
}
