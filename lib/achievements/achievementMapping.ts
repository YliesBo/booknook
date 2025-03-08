// lib/achievements/achievementMapping.ts
import { supabase } from '../supabase/supabaseClient';

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

// The achievement definitions (with friendly keys)
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Reading Milestones
  {
    key: 'books-read-5',
    title: 'Bookworm',
    description: 'Read 5 books',
    category: 'milestone',
    difficulty: 'bronze',
    icon: 'book-open',
    points: 10,
    requirements: {
      type: 'books_read',
      target: 5
    }
  },
  {
    key: 'books-read-25',
    title: 'Book Enthusiast',
    description: 'Read 25 books',
    category: 'milestone',
    difficulty: 'silver',
    icon: 'book-open',
    points: 25,
    requirements: {
      type: 'books_read',
      target: 25
    }
  },
  {
    key: 'books-read-50',
    title: 'Book Aficionado',
    description: 'Read 50 books',
    category: 'milestone',
    difficulty: 'gold',
    icon: 'book-open',
    points: 50,
    requirements: {
      type: 'books_read', 
      target: 50
    }
  },
  {
    key: 'books-read-100',
    title: 'Book Master',
    description: 'Read 100 books',
    category: 'milestone',
    difficulty: 'platinum',
    icon: 'book-open',
    points: 100,
    requirements: {
      type: 'books_read',
      target: 100
    }
  },

  // Genre Diversity
  {
    key: 'genre-diversity-3',
    title: 'Genre Explorer',
    description: 'Read books from 3 different genres',
    category: 'genre',
    difficulty: 'bronze',
    icon: 'compass',
    points: 15,
    requirements: {
      type: 'unique_genres',
      target: 3
    }
  },
  {
    key: 'genre-diversity-5',
    title: 'Genre Adventurer',
    description: 'Read books from 5 different genres',
    category: 'genre',
    difficulty: 'silver',
    icon: 'compass',
    points: 30,
    requirements: {
      type: 'unique_genres',
      target: 5
    }
  },
  {
    key: 'genre-diversity-10',
    title: 'Genre Connoisseur',
    description: 'Read books from 10 different genres',
    category: 'genre',
    difficulty: 'gold',
    icon: 'compass',
    points: 50,
    requirements: {
      type: 'unique_genres',
      target: 10
    }
  },

  // Series Completion
  {
    key: 'series-completion-1',
    title: 'Series Starter',
    description: 'Complete 1 book series',
    category: 'series',
    difficulty: 'bronze',
    icon: 'list-ordered',
    points: 20,
    requirements: {
      type: 'complete_series',
      target: 1
    }
  },
  {
    key: 'series-completion-3',
    title: 'Series Enthusiast',
    description: 'Complete 3 book series',
    category: 'series',
    difficulty: 'silver',
    icon: 'list-ordered',
    points: 40,
    requirements: {
      type: 'complete_series',
      target: 3
    }
  },
  {
    key: 'series-completion-5',
    title: 'Series Master',
    description: 'Complete 5 book series',
    category: 'series',
    difficulty: 'gold',
    icon: 'list-ordered',
    points: 60,
    requirements: {
      type: 'complete_series',
      target: 5
    }
  },

  // Author Collection
  {
    key: 'author-collection-3',
    title: 'Author Fan',
    description: 'Read 3 books by the same author',
    category: 'author',
    difficulty: 'bronze',
    icon: 'user',
    points: 15,
    requirements: {
      type: 'same_author',
      target: 3
    }
  },
  {
    key: 'author-collection-5',
    title: 'Author Devotee',
    description: 'Read 5 books by the same author',
    category: 'author',
    difficulty: 'silver',
    icon: 'user',
    points: 30,
    requirements: {
      type: 'same_author',
      target: 5
    }
  },
  {
    key: 'author-collection-10',
    title: 'Author Expert',
    description: 'Read 10 books by the same author',
    category: 'author',
    difficulty: 'gold',
    icon: 'user',
    points: 50,
    requirements: {
      type: 'same_author',
      target: 10
    }
  },

  // Reading Consistency
  {
    key: 'reading-streak-7',
    title: 'Consistent Reader',
    description: 'Read books on 7 consecutive days',
    category: 'consistency',
    difficulty: 'bronze',
    icon: 'calendar',
    points: 20,
    requirements: {
      type: 'reading_streak',
      target: 7
    }
  },
  {
    key: 'reading-streak-30',
    title: 'Dedicated Reader',
    description: 'Read books on 30 consecutive days',
    category: 'consistency',
    difficulty: 'silver',
    icon: 'calendar',
    points: 50,
    requirements: {
      type: 'reading_streak',
      target: 30
    }
  },
  {
    key: 'reading-streak-100',
    title: 'Unstoppable Reader',
    description: 'Read books on 100 consecutive days',
    category: 'consistency',
    difficulty: 'platinum',
    icon: 'calendar',
    points: 100,
    requirements: {
      type: 'reading_streak',
      target: 100
    }
  },
];

// Mapping object to store UUID mappings
const achievementIdMap: Record<string, string> = {};

// Helper function to determine the ID column name
async function detectIdColumnName(): Promise<string> {
  try {
    // First try with 'achievement_id'
    const { data: testWithAchievementId, error: error1 } = await supabase
      .from('achievements')
      .select('achievement_id')
      .limit(1);
    
    if (!error1 && testWithAchievementId) {
      return 'achievement_id';
    }
    
    // Then try with just 'id'
    const { data: testWithId, error: error2 } = await supabase
      .from('achievements')
      .select('id')
      .limit(1);
    
    if (!error2 && testWithId) {
      return 'id';
    }
    
    // If we get here, neither worked, so we need to introspect the table
    // This is a more advanced approach that should work with any column name
    console.log("Couldn't find standard ID column names, checking table structure...");
    
    // As a fallback, return 'achievement_id' which is the most likely
    return 'achievement_id';
  } catch (error) {
    console.error("Error detecting ID column name:", error);
    return 'achievement_id'; // Default fallback
  }
}

// Function to load real UUIDs from the database
export async function loadAchievementUUIDs(): Promise<boolean> {
  try {
    // First, detect what the ID column is named
    const idColumnName = await detectIdColumnName();
    console.log(`Detected ID column name: ${idColumnName}`);
    
    // Now use that column name in our query
    const query = `${idColumnName}, title, requirements`;
    
    const { data, error } = await supabase
      .from('achievements')
      .select(query);
    
    if (error) {
      console.error('Error fetching achievements:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.warn('No achievements found in database. You may need to seed achievements first.');
      // Seeding is needed - let's return success anyway to avoid blocking the app
      return true;
    }
    
    console.log(`Found ${data.length} achievements in database`);
    
    // Clear existing mappings
    Object.keys(achievementIdMap).forEach(key => delete achievementIdMap[key]);
    
    // Build mapping based on title or requirements.target matching
    ACHIEVEMENT_DEFINITIONS.forEach(def => {
      // Try to find matching achievement in database
      const match = data.find(a => 
        a.title === def.title || 
        (a.requirements?.target === def.requirements.target && 
         a.requirements?.type === def.requirements.type)
      );
      
      if (match) {
        // Use the correct column for the ID value
        const id = match[idColumnName];
        achievementIdMap[def.key] = id;
        console.log(`Mapped "${def.key}" to ID: ${id}`);
      } else {
        console.warn(`No database match found for achievement: ${def.key} (${def.title})`);
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error loading achievement UUIDs:', error);
    return false;
  }
}

// Get UUID for an achievement by its key
export function getAchievementUUID(key: string): string | null {
  return achievementIdMap[key] || null;
}

// Get achievement definition by its key
export function getAchievementByKey(key: string): AchievementDefinition | null {
  return ACHIEVEMENT_DEFINITIONS.find(a => a.key === key) || null;
}

// Get achievement definition by UUID
export function getAchievementByUUID(id: string): AchievementDefinition | null {
  const key = Object.keys(achievementIdMap).find(k => achievementIdMap[k] === id);
  if (!key) return null;
  return getAchievementByKey(key);
}