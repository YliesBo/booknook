// lib/achievements/achievementMapping.ts

import { supabase } from '../supabase/supabaseClient';
import { stringToUUID } from './achievementTypes';

interface DatabaseAchievement {
  achievement_id: string;
  title?: string;
  requirements?: {
    target?: number;
    type?: string;
  };
}

// Type for the achievement definition
type AchievementDefinition = {
  key: string;      // Friendly key like 'books-read-5'
  title: string;
  description: string;
  category: string;
  difficulty: string;
  icon: string;
  points: number;
  requirements: {
    type: string;
    target: number;
  };
};

// The achievement definitions remain the same as they were...
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // ... your existing definitions
];

// Mapping object to store UUID mappings
const achievementIdMap: Record<string, string> = {};

// Function to load real UUIDs from the database
export async function loadAchievementUUIDs(): Promise<boolean> {
  try {
    // First check if we need to initialize (map is empty)
    if (Object.keys(achievementIdMap).length > 0) {
      console.log("Achievement UUID mapping already loaded");
      return true;
    }

    console.log("Loading achievement UUIDs from database");
    
    // Query achievements from the database
    const { data, error } = await supabase
      .from('achievements')
      .select('achievement_id, title, requirements');
    
    if (error) {
      console.error('Error fetching achievements:', error);
      
      // Fall back to using generated UUIDs if DB fetch fails
      console.log('Falling back to generated UUIDs');
      
      ACHIEVEMENT_DEFINITIONS.forEach(def => {
        const generatedId = stringToUUID(def.key);
        achievementIdMap[def.key] = generatedId;
        console.log(`Generated UUID for "${def.key}": ${generatedId}`);
      });
      
      return true;
    }
    
    if (!data || data.length === 0) {
      console.warn('No achievements found in database. Using generated UUIDs instead.');
      
      // Generate UUIDs from definition keys
      ACHIEVEMENT_DEFINITIONS.forEach(def => {
        const generatedId = stringToUUID(def.key);
        achievementIdMap[def.key] = generatedId;
        console.log(`Generated UUID for "${def.key}": ${generatedId}`);
      });
      
      return true;
    }
    
    console.log(`Found ${data.length} achievements in database`);
    
    // Clear existing mappings
    Object.keys(achievementIdMap).forEach(key => delete achievementIdMap[key]);
    
    // Build mapping based on title or requirements.target matching
    ACHIEVEMENT_DEFINITIONS.forEach(def => {
      // Try to find matching achievement in database
      const match = data.find(a => {
        const dbAchievement = a as DatabaseAchievement;
        return dbAchievement.title === def.title || 
          (dbAchievement.requirements?.target === def.requirements.target && 
           dbAchievement.requirements?.type === def.requirements.type);
      });
      
      if (match) {
        // Use the achievement_id from the database
        achievementIdMap[def.key] = match.achievement_id;
        console.log(`Mapped "${def.key}" to ID: ${match.achievement_id}`);
      } else {
        // If no match found, generate a consistent UUID
        const generatedId = stringToUUID(def.key);
        achievementIdMap[def.key] = generatedId;
        console.log(`No database match found, using generated UUID for "${def.key}": ${generatedId}`);
      }
    });
    
    return true;
  } catch (error) {
    const err = error as Error;
    console.error('Error loading achievement UUIDs:', err.message);
    
    // Fall back to using generated UUIDs
    console.log('Falling back to generated UUIDs due to error');
    
    ACHIEVEMENT_DEFINITIONS.forEach(def => {
      const generatedId = stringToUUID(def.key);
      achievementIdMap[def.key] = generatedId;
    });
    
    return true; // Still return true so app can function
  }
}

// Get UUID for an achievement by its key
export function getAchievementUUID(key: string): string | null {
  // If the map is empty, generate the UUID on the fly
  if (Object.keys(achievementIdMap).length === 0) {
    return stringToUUID(key);
  }
  return achievementIdMap[key] || stringToUUID(key);
}

// Get achievement definition by its key
export function getAchievementByKey(key: string): AchievementDefinition | null {
  return ACHIEVEMENT_DEFINITIONS.find(a => a.key === key) || null;
}

// Get achievement definition by UUID
export function getAchievementByUUID(id: string): AchievementDefinition | null {
  const key = Object.keys(achievementIdMap).find(k => achievementIdMap[k] === id);
  if (!key) {
    // Try reverse lookup by comparing with generated UUIDs
    const foundKey = ACHIEVEMENT_DEFINITIONS.find(def => stringToUUID(def.key) === id)?.key;
    if (foundKey) return getAchievementByKey(foundKey);
    return null;
  }
  return getAchievementByKey(key);
}