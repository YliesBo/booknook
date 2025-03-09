// lib/achievements/achievementTypes.ts

export type AchievementCategory = 
  | 'milestone' 
  | 'genre' 
  | 'series' 
  | 'author' 
  | 'consistency';

export type AchievementDifficulty = 
  | 'bronze' 
  | 'silver' 
  | 'gold' 
  | 'platinum';

export interface AchievementRequirement {
  type: string;
  target: number;
  [key: string]: any;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  difficulty: AchievementDifficulty;
  icon: string;
  points: number;
  requirements: AchievementRequirement;
  secretUntilUnlocked?: boolean;
}

// Helper function to generate a UUID from a string
export function stringToUUID(str: string): string {
  // Create a more robust deterministic UUID from string
  const hash = Array.from(str)
    .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) & 0xffffffff, 0);
  
  // Create parts of the UUID with proper lengths and formats
  const part1 = hash.toString(16).padStart(8, '0').substring(0, 8);
  const part2 = hash.toString(16).padStart(8, '0').substring(0, 4);
  // Use version 4 (random) UUID format by setting the high bits to 4
  const part3 = `4${hash.toString(16).padStart(8, '0').substring(0, 3)}`;
  // Use variant 1 (RFC4122) by setting the high bit to 8, 9, a, or b
  const part4 = ((hash >> 16) & 0x3fff | 0x8000).toString(16).substring(0, 4);
  const part5 = hash.toString(16).padStart(12, '0').substring(0, 12);
  
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Reading Milestones
  {
    id: stringToUUID('books-read-5'),
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
    id: stringToUUID('books-read-25'),
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
    id: stringToUUID('books-read-50'),
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
    id: stringToUUID('books-read-100'),
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
    id: stringToUUID('genre-diversity-3'),
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
    id: stringToUUID('genre-diversity-5'),
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
    id: stringToUUID('genre-diversity-10'),
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
    id: stringToUUID('series-completion-1'),
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
    id: stringToUUID('series-completion-3'),
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
    id: stringToUUID('series-completion-5'),
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
    id: stringToUUID('author-collection-3'),
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
    id: stringToUUID('author-collection-5'),
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
    id: stringToUUID('author-collection-10'),
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
    id: stringToUUID('reading-streak-7'),
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
    id: stringToUUID('reading-streak-30'),
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
    id: stringToUUID('reading-streak-100'),
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

// Helper functions to get achievements by various criteria
export const getAchievementById = (id: string): Achievement | undefined => {
  return ACHIEVEMENTS.find(achievement => achievement.id === id);
};

export const getAchievementsByCategory = (category: AchievementCategory): Achievement[] => {
  return ACHIEVEMENTS.filter(achievement => achievement.category === category);
};

export const getAchievementsByDifficulty = (difficulty: AchievementDifficulty): Achievement[] => {
  return ACHIEVEMENTS.filter(achievement => achievement.difficulty === difficulty);
};