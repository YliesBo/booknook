// lib/achievements/achievementService.ts
import { supabase } from '../supabase/supabaseClient';
import { 
  getAchievementUUID, 
  getAchievementByKey, 
  getAchievementByUUID,
  loadAchievementUUIDs,
  ACHIEVEMENT_DEFINITIONS
} from './achievementMapping';

export interface UserAchievement {
  achievement_id: string;
  user_id: string;
  progress: {
    current: number;
    target: number;
    [key: string]: any;
  };
  completed: boolean;
  completed_at: string | null;
  notified: boolean;
}

// Ensure UUIDs are loaded before using achievement functions
let mappingLoaded = false;
async function ensureMappingLoaded() {
  if (!mappingLoaded) {
    mappingLoaded = await loadAchievementUUIDs();
  }
  return mappingLoaded;
}

// Get all achievements for a user
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  if (!userId) return [];

  try {
    await ensureMappingLoaded();
    
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    return [];
  }
}

// Get a specific achievement for a user
export async function getUserAchievement(userId: string, achievementId: string): Promise<UserAchievement | null> {
  if (!userId || !achievementId) return null;

  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data;
  } catch (error) {
    console.error(`Error fetching user achievement ${achievementId}:`, error);
    return null;
  }
}

// Initialize an achievement for a user
export async function initializeAchievement(userId: string, achievementId: string): Promise<UserAchievement | null> {
  if (!userId || !achievementId) return null;

  try {
    // Check if it already exists
    const existingAchievement = await getUserAchievement(userId, achievementId);
    if (existingAchievement) return existingAchievement;

    // Get achievement details
    const achievementDef = getAchievementByUUID(achievementId);
    if (!achievementDef) {
      console.error(`Achievement not found for ID: ${achievementId}`);
      return null;
    }

    // Create new achievement progress
    const newAchievement: Omit<UserAchievement, 'achievement_id'> = {
      user_id: userId,
      progress: {
        current: 0,
        target: achievementDef.requirements.target,
      },
      completed: false,
      completed_at: null,
      notified: false
    };

    const { data, error } = await supabase
      .from('user_achievements')
      .insert({
        ...newAchievement,
        achievement_id: achievementId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error initializing achievement ${achievementId}:`, error);
    return null;
  }
}

// Update achievement progress
export async function updateAchievementProgress(
  userId: string, 
  achievementId: string, 
  progress: number
): Promise<UserAchievement | null> {
  if (!userId || !achievementId) return null;

  try {
    // Get or initialize the achievement
    let userAchievement = await getUserAchievement(userId, achievementId);
    if (!userAchievement) {
      userAchievement = await initializeAchievement(userId, achievementId);
      if (!userAchievement) return null;
    }

    // If already completed, don't update
    if (userAchievement.completed) return userAchievement;

    // Get achievement details
    const achievementDef = getAchievementByUUID(achievementId);
    if (!achievementDef) {
      console.error(`Achievement not found for ID: ${achievementId}`);
      return null;
    }

    const target = achievementDef.requirements.target;
    const newProgress = progress;
    const isCompleted = newProgress >= target;

    const updatedAchievement: Partial<UserAchievement> = {
      progress: {
        ...userAchievement.progress,
        current: newProgress
      },
      updated_at: new Date().toISOString()
    };

    // If newly completed, update completion status
    if (isCompleted && !userAchievement.completed) {
      updatedAchievement.completed = true;
      updatedAchievement.completed_at = new Date().toISOString();
      updatedAchievement.notified = false;
    }

    const { data, error } = await supabase
      .from('user_achievements')
      .update(updatedAchievement)
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .select()
      .single();

    if (error) throw error;

    // If newly completed, create achievement event
    if (isCompleted && !userAchievement.completed) {
      await createAchievementEvent(userId, achievementId);
    }

    return data;
  } catch (error) {
    console.error(`Error updating achievement ${achievementId} progress:`, error);
    return null;
  }
}

// Mark achievement as notified
export async function markAchievementAsNotified(userId: string, achievementId: string): Promise<boolean> {
  if (!userId || !achievementId) return false;

  try {
    const { error } = await supabase
      .from('user_achievements')
      .update({ notified: true })
      .eq('user_id', userId)
      .eq('achievement_id', achievementId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error marking achievement ${achievementId} as notified:`, error);
    return false;
  }
}

// Create an achievement event
export async function createAchievementEvent(
  userId: string, 
  achievementId: string
): Promise<boolean> {
  if (!userId || !achievementId) return false;

  try {
    const achievementDef = getAchievementByUUID(achievementId);
    if (!achievementDef) {
      console.error(`Achievement not found for ID: ${achievementId}`);
      return false;
    }

    const { error } = await supabase
      .from('achievement_events')
      .insert({
        user_id: userId,
        event_type: 'achievement_unlocked',
        event_data: {
          achievement_id: achievementId,
          achievement_title: achievementDef.title,
          achievement_description: achievementDef.description,
          points: achievementDef.points
        },
        processed: false,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error creating achievement event for ${achievementId}:`, error);
    return false;
  }
}

// Check for milestone achievements (books read)
export async function checkMilestoneAchievements(userId: string): Promise<string[]> {
  if (!userId) return [];

  try {
    await ensureMappingLoaded();
    
    // Get count of books marked as read
    const { count, error } = await supabase
      .from('reading_status')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'read');

    if (error) throw error;
    
    const booksRead = count || 0;
    const unlocked: string[] = [];

    // Check milestone achievements
    const milestoneAchievements = ACHIEVEMENT_DEFINITIONS.filter(a => a.category === 'milestone');
    
    for (const achievement of milestoneAchievements) {
      if (booksRead >= achievement.requirements.target) {
        const achievementId = getAchievementUUID(achievement.key);
        if (!achievementId) {
          console.warn(`No UUID found for achievement: ${achievement.key}`);
          continue;
        }
        
        const updated = await updateAchievementProgress(
          userId, 
          achievementId, 
          booksRead
        );
        
        if (updated && updated.completed && !updated.notified) {
          unlocked.push(achievementId);
        }
      }
    }

    return unlocked;
  } catch (error) {
    console.error('Error checking milestone achievements:', error);
    return [];
  }
}

// Check for genre diversity achievements
export async function checkGenreDiversityAchievements(userId: string): Promise<string[]> {
  if (!userId) return [];

  try {
    await ensureMappingLoaded();
    
    // Get unique genres from read books
    const { data, error } = await supabase.rpc('get_user_unique_genres', {
      user_id_param: userId,
      status_param: 'read'
    });

    if (error) throw error;
    
    const uniqueGenresCount = data?.length || 0;
    const unlocked: string[] = [];

    // Check genre diversity achievements
    const genreAchievements = ACHIEVEMENT_DEFINITIONS.filter(a => a.category === 'genre');
    
    for (const achievement of genreAchievements) {
      if (uniqueGenresCount >= achievement.requirements.target) {
        const achievementId = getAchievementUUID(achievement.key);
        if (!achievementId) {
          console.warn(`No UUID found for achievement: ${achievement.key}`);
          continue;
        }
        
        const updated = await updateAchievementProgress(
          userId, 
          achievementId, 
          uniqueGenresCount
        );
        
        if (updated && updated.completed && !updated.notified) {
          unlocked.push(achievementId);
        }
      }
    }

    return unlocked;
  } catch (error) {
    console.error('Error checking genre diversity achievements:', error);
    return [];
  }
}

// Check for author collection achievements
export async function checkAuthorCollectionAchievements(userId: string): Promise<string[]> {
  if (!userId) return [];

  try {
    await ensureMappingLoaded();
    
    // Get the author with the most books read
    const { data, error } = await supabase.rpc('get_top_authors_read_count', {
      user_id_param: userId
    });

    if (error) throw error;
    
    // Find the highest count of books by a single author
    const mostBooksPerAuthor = data?.length > 0 ? data[0].books_count : 0;
    const unlocked: string[] = [];

    // Check author collection achievements
    const authorAchievements = ACHIEVEMENT_DEFINITIONS.filter(a => a.category === 'author');
    
    for (const achievement of authorAchievements) {
      if (mostBooksPerAuthor >= achievement.requirements.target) {
        const achievementId = getAchievementUUID(achievement.key);
        if (!achievementId) {
          console.warn(`No UUID found for achievement: ${achievement.key}`);
          continue;
        }
        
        const updated = await updateAchievementProgress(
          userId, 
          achievementId, 
          mostBooksPerAuthor
        );
        
        if (updated && updated.completed && !updated.notified) {
          unlocked.push(achievementId);
        }
      }
    }

    return unlocked;
  } catch (error) {
    console.error('Error checking author collection achievements:', error);
    return [];
  }
}

// Check for series completion achievements
export async function checkSeriesCompletionAchievements(userId: string): Promise<string[]> {
  if (!userId) return [];

  try {
    await ensureMappingLoaded();
    
    // Get count of completed series
    const { data, error } = await supabase.rpc('get_completed_series_count', {
      user_id_param: userId
    });

    if (error) throw error;
    
    const completedSeriesCount = data || 0;
    const unlocked: string[] = [];

    // Check series completion achievements
    const seriesAchievements = ACHIEVEMENT_DEFINITIONS.filter(a => a.category === 'series');
    
    for (const achievement of seriesAchievements) {
      if (completedSeriesCount >= achievement.requirements.target) {
        const achievementId = getAchievementUUID(achievement.key);
        if (!achievementId) {
          console.warn(`No UUID found for achievement: ${achievement.key}`);
          continue;
        }
        
        const updated = await updateAchievementProgress(
          userId, 
          achievementId, 
          completedSeriesCount
        );
        
        if (updated && updated.completed && !updated.notified) {
          unlocked.push(achievementId);
        }
      }
    }

    return unlocked;
  } catch (error) {
    console.error('Error checking series completion achievements:', error);
    return [];
  }
}

// Check for reading streak achievements
export async function checkReadingStreakAchievements(userId: string): Promise<string[]> {
  if (!userId) return [];

  try {
    await ensureMappingLoaded();
    
    // Get current reading streak
    const { data, error } = await supabase.rpc('get_reading_streak', {
      user_id_param: userId
    });

    if (error) throw error;
    
    const currentStreak = data || 0;
    const unlocked: string[] = [];

    // Check reading streak achievements
    const streakAchievements = ACHIEVEMENT_DEFINITIONS.filter(a => a.category === 'consistency');
    
    for (const achievement of streakAchievements) {
      if (currentStreak >= achievement.requirements.target) {
        const achievementId = getAchievementUUID(achievement.key);
        if (!achievementId) {
          console.warn(`No UUID found for achievement: ${achievement.key}`);
          continue;
        }
        
        const updated = await updateAchievementProgress(
          userId, 
          achievementId, 
          currentStreak
        );
        
        if (updated && updated.completed && !updated.notified) {
          unlocked.push(achievementId);
        }
      }
    }

    return unlocked;
  } catch (error) {
    console.error('Error checking reading streak achievements:', error);
    return [];
  }
}

// Check all achievements for a user
export async function checkAllAchievements(userId: string): Promise<string[]> {
  if (!userId) return [];

  try {
    const milestoneAchievements = await checkMilestoneAchievements(userId);
    const genreAchievements = await checkGenreDiversityAchievements(userId);
    const authorAchievements = await checkAuthorCollectionAchievements(userId);
    const seriesAchievements = await checkSeriesCompletionAchievements(userId);
    const streakAchievements = await checkReadingStreakAchievements(userId);

    return [
      ...milestoneAchievements,
      ...genreAchievements,
      ...authorAchievements,
      ...seriesAchievements,
      ...streakAchievements
    ];
  } catch (error) {
    console.error('Error checking all achievements:', error);
    return [];
  }
}

// Get unnotified completed achievements
export async function getUnnotifiedAchievements(userId: string): Promise<UserAchievement[]> {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', true)
      .eq('notified', false);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching unnotified achievements:', error);
    return [];
  }
}

// Process achievement events
export async function processAchievementEvents(): Promise<number> {
  try {
    // Get unprocessed events
    const { data: events, error } = await supabase
      .from('achievement_events')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(50); // Process in batches

    if (error) throw error;
    
    if (!events || events.length === 0) {
      return 0;
    }
    
    let processedCount = 0;
    
    // Process each event
    for (const event of events) {
      try {
        const userId = event.user_id;
        
        // Process different event types
        switch (event.event_type) {
          case 'status_changed_to_read':
          case 'book_completed':
            // Check all achievements for this user
            await checkAllAchievements(userId);
            break;
            
          default:
            console.warn(`Unknown event type: ${event.event_type}`);
        }
        
        // Mark the event as processed
        await supabase
          .from('achievement_events')
          .update({ processed: true })
          .eq('event_id', event.event_id);
        
        processedCount++;
      } catch (eventError) {
        console.error(`Error processing event ${event.event_id}:`, eventError);
      }
    }
    
    return processedCount;
  } catch (error) {
    console.error('Error processing achievement events:', error);
    return 0;
  }
}