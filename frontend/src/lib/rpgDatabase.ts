import { supabase, isSupabaseConfigured, getDemoProfile, saveDemoProfile, getDemoQuests, saveDemoQuests } from './supabaseClient';
import { UserProfile, Quest, InventoryItem, getRequiredXp } from './rpgTypes';

// ==============================================================================
// REKINDLE RPG DATABASE SERVICE
// Strictly isolates user data via Supabase UUID & PostgreSQL RLS
// ==============================================================================

/**
 * 1. Fetch User Profile
 * Queries public.profiles by authenticated user UUID.
 */
export async function fetchUserProfile(userId: string): Promise<{ profile: UserProfile | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { profile: getDemoProfile(), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('[rpgDatabase] Profile fetch error:', error.message);
      return { profile: null, error: new Error(error.message) };
    }

    return { profile: data as UserProfile, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch profile';
    console.error('[rpgDatabase] Unexpected error fetching profile:', errorMsg);
    return { profile: null, error: new Error(errorMsg) };
  }
}

/**
 * 2. Update User Profile
 * Updates public.profiles for the authenticated user only (enforced by RLS).
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) {
    const current = getDemoProfile();
    saveDemoProfile({ ...current, ...updates });
    return { error: null };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[rpgDatabase] Profile update error:', error.message);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to update profile';
    console.error('[rpgDatabase] Unexpected error updating profile:', errorMsg);
    return { error: new Error(errorMsg) };
  }
}

/**
 * 3. Fetch User Quests
 * Loads active quests belonging to the authenticated user from public.quests.
 */
export async function fetchUserQuests(userId: string): Promise<{ quests: Quest[]; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { quests: getDemoQuests(userId), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('quests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[rpgDatabase] Quests fetch error:', error.message);
      return { quests: [], error: new Error(error.message) };
    }

    return { quests: (data as Quest[]) || [], error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch quests';
    console.error('[rpgDatabase] Unexpected error fetching quests:', errorMsg);
    return { quests: [], error: new Error(errorMsg) };
  }
}

/**
 * 4. Create a User Quest
 * Creates a new task assigned to the authenticated user's UUID.
 */
export async function createUserQuest(
  userId: string,
  quest: Omit<Quest, 'id' | 'user_id' | 'created_at'>
): Promise<{ quest: Quest | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    const quests = getDemoQuests(userId);
    const newQuest: Quest = {
      ...quest,
      id: `quest-${Date.now()}`,
      user_id: userId,
      created_at: new Date().toISOString(),
    };
    saveDemoQuests([...quests, newQuest]);
    return { quest: newQuest, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('quests')
      .insert({
        user_id: userId,
        title: quest.title,
        description: quest.description || '',
        attribute: quest.attribute,
        xp_reward: quest.xp_reward,
        token_reward: quest.token_reward,
        is_completed: quest.is_completed || false,
        priority: quest.priority || 'medium',
        is_daily: quest.is_daily ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('[rpgDatabase] Create quest error:', error.message);
      return { quest: null, error: new Error(error.message) };
    }

    return { quest: data as Quest, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to create quest';
    console.error('[rpgDatabase] Unexpected error creating quest:', errorMsg);
    return { quest: null, error: new Error(errorMsg) };
  }
}
export interface QuestRewardFallback {
  xp: number;
  gold: number;
  title: string;
  category?: string;
}

export interface CompleteQuestResult {
  success: boolean;
  finalXp: number;
  finalGold: number;
  newLevel: number;
  newTotalXp?: number;
  newGold?: number;
  leveledUp: boolean;
  error: Error | null;
}

const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/**
 * 5. Complete User Quest (Idempotent & Rewarding)
 * Marks quest complete and safely updates profile XP, gold, and non-linear level.
 * Seamlessly handles both database UUIDs and cottage task codes.
 */
export async function completeUserQuest(
  userId: string,
  questId: string,
  currentStreak: number,
  fallback?: QuestRewardFallback
): Promise<CompleteQuestResult> {
  // Demo Mode Fallback
  if (!isSupabaseConfigured) {
    const quests = getDemoQuests(userId);
    const targetQuest = quests.find((q) => q.id === questId || q.title === fallback?.title);
    if (targetQuest?.is_completed) {
      return { success: false, finalXp: 0, finalGold: 0, newLevel: 1, leveledUp: false, error: null };
    }

    const streakMultiplier = 1 + Math.min(currentStreak, 30) * 0.02;
    const baseRewardXp = targetQuest?.xp_reward || fallback?.xp || 25;
    const baseRewardGold = targetQuest?.token_reward || fallback?.gold || 5;
    const finalXp = Math.round(baseRewardXp * streakMultiplier);
    const finalGold = baseRewardGold;

    // Update demo quests
    let updatedQuests: Quest[];
    if (targetQuest) {
      updatedQuests = quests.map((q) =>
        q.id === targetQuest.id ? { ...q, is_completed: true, completed_at: new Date().toISOString() } : q
      );
    } else {
      const newQ: Quest = {
        id: questId,
        user_id: userId,
        title: fallback?.title || questId,
        attribute: 'soul',
        xp_reward: baseRewardXp,
        token_reward: baseRewardGold,
        is_completed: true,
        completed_at: new Date().toISOString(),
        priority: 'medium',
        is_daily: true,
      };
      updatedQuests = [...quests, newQ];
    }
    saveDemoQuests(updatedQuests);

    // Update demo profile
    const profile = getDemoProfile();
    const newTotalXp = (profile.xp || 0) + finalXp;
    const newGold = (profile.gold || 0) + finalGold;
    let newLevel = profile.level || 1;
    while (newTotalXp >= getRequiredXp(newLevel)) {
      newLevel += 1;
    }
    const leveledUp = newLevel > (profile.level || 1);

    saveDemoProfile({
      ...profile,
      xp: newTotalXp,
      gold: newGold,
      level: newLevel,
      last_active_date: new Date().toISOString().split('T')[0],
    });

    return { success: true, finalXp, finalGold, newLevel, newTotalXp, newGold, leveledUp, error: null };
  }

  try {
    const streakMultiplier = 1 + Math.min(currentStreak, 30) * 0.02;
    let baseRewardXp = fallback?.xp || 25;
    let baseRewardGold = fallback?.gold || 5;

    // 1. Check or update in public.quests
    if (isUUID(questId)) {
      const { data: questData } = await supabase
        .from('quests')
        .select('*')
        .eq('id', questId)
        .eq('user_id', userId)
        .single();

      if (questData) {
        if (questData.is_completed) {
          return { success: false, finalXp: 0, finalGold: 0, newLevel: 1, leveledUp: false, error: new Error('Already completed') };
        }
        baseRewardXp = questData.xp_reward;
        baseRewardGold = questData.token_reward;

        await supabase
          .from('quests')
          .update({ is_completed: true, completed_at: new Date().toISOString() })
          .eq('id', questId)
          .eq('user_id', userId);
      }
    } else if (fallback?.title) {
      // Non-UUID cottage task code (e.g. 'int_01', 'vit_01'): match by title
      const { data: existingQuest } = await supabase
        .from('quests')
        .select('*')
        .eq('user_id', userId)
        .eq('title', fallback.title)
        .maybeSingle();

      if (existingQuest) {
        if (existingQuest.is_completed) {
          return { success: false, finalXp: 0, finalGold: 0, newLevel: 1, leveledUp: false, error: new Error('Already completed') };
        }
        baseRewardXp = existingQuest.xp_reward || baseRewardXp;
        baseRewardGold = existingQuest.token_reward || baseRewardGold;

        await supabase
          .from('quests')
          .update({ is_completed: true, completed_at: new Date().toISOString() })
          .eq('id', existingQuest.id)
          .eq('user_id', userId);
      } else {
        // Record this completed cottage task into public.quests
        await supabase.from('quests').insert({
          user_id: userId,
          title: fallback.title,
          description: fallback.title,
          attribute: 'soul',
          xp_reward: baseRewardXp,
          token_reward: baseRewardGold,
          is_completed: true,
          completed_at: new Date().toISOString(),
          is_daily: true,
        });
      }
    }

    const finalXp = Math.round(baseRewardXp * streakMultiplier);
    const finalGold = baseRewardGold;

    // 2. Fetch Profile from Supabase
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const currentXp = profileData?.xp || 0;
    const currentGold = profileData?.gold || 0;
    const currentLvl = profileData?.level || 1;

    const newTotalXp = currentXp + finalXp;
    const newGold = currentGold + finalGold;

    let calculatedLevel = currentLvl;
    while (newTotalXp >= getRequiredXp(calculatedLevel)) {
      calculatedLevel += 1;
    }
    const leveledUp = calculatedLevel > currentLvl;

    // 3. Update public.profiles in Supabase
    const { error: profileUpdateErr } = await supabase
      .from('profiles')
      .update({
        xp: newTotalXp,
        level: calculatedLevel,
        gold: newGold,
        last_active_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileUpdateErr) {
      console.warn('[rpgDatabase] Profile reward update error:', profileUpdateErr.message);
    }

    return {
      success: true,
      finalXp,
      finalGold,
      newLevel: calculatedLevel,
      newTotalXp,
      newGold,
      leveledUp,
      error: profileUpdateErr ? new Error(profileUpdateErr.message) : null,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Quest completion failed';
    console.error('[rpgDatabase] Quest completion exception:', errorMsg);
    return {
      success: false,
      finalXp: 0,
      finalGold: 0,
      newLevel: 1,
      leveledUp: false,
      error: new Error(errorMsg),
    };
  }
}

/**
 * 6. Fetch User Inventory
 * Retrieves themes, decorations, and items owned by the authenticated user.
 */
export async function fetchUserInventory(userId: string): Promise<{ items: InventoryItem[]; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return {
      items: [
        { id: 'inv-1', user_id: userId, item_id: 'cottage_day', item_type: 'theme', item_name: 'Countryside Cottage', is_equipped: true },
        { id: 'inv-2', user_id: userId, item_id: 'cat_cafe', item_type: 'theme', item_name: 'Cat Café Afternoon', is_equipped: false },
        { id: 'inv-3', user_id: userId, item_id: 'autumn_bookshop', item_type: 'theme', item_name: 'Autumn Bookshop', is_equipped: false },
      ],
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', userId)
      .order('purchased_at', { ascending: true });

    if (error) {
      console.error('[rpgDatabase] Inventory fetch error:', error.message);
      return { items: [], error: new Error(error.message) };
    }

    return { items: (data as InventoryItem[]) || [], error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch inventory';
    console.error('[rpgDatabase] Unexpected error fetching inventory:', errorMsg);
    return { items: [], error: new Error(errorMsg) };
  }
}

/**
 * 7. Equip Inventory Theme
 * Sets is_equipped = true for the target theme, false for others, and updates profiles.active_theme.
 */
export async function equipInventoryTheme(
  userId: string,
  itemId: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) {
    const current = getDemoProfile();
    saveDemoProfile({ ...current, active_theme: itemId as UserProfile['active_theme'] });
    return { error: null };
  }

  try {
    // 1. Unequip all themes for this user
    await supabase
      .from('inventory')
      .update({ is_equipped: false })
      .eq('user_id', userId)
      .eq('item_type', 'theme');

    // 2. Equip the target theme
    const { error: equipErr } = await supabase
      .from('inventory')
      .update({ is_equipped: true })
      .eq('user_id', userId)
      .eq('item_id', itemId);

    if (equipErr) {
      return { error: new Error(equipErr.message) };
    }

    // 3. Sync to profile active_theme
    await supabase
      .from('profiles')
      .update({ active_theme: itemId, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return { error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to equip theme';
    return { error: new Error(errorMsg) };
  }
}
