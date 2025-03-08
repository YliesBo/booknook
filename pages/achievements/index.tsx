// pages/achievements/index.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../lib/hooks/useProtectedRoute';
import Link from 'next/link';
import { FiAward, FiArrowLeft, FiFilter, FiChevronDown } from 'react-icons/fi';
import { getUserAchievements, checkAllAchievements } from '../../lib/achievements/achievementService';
import { getAchievementById, AchievementCategory, ACHIEVEMENTS } from '../../lib/achievements/achievementTypes';
import AchievementCard from '../../components/achievements/AchievementCard';

export default function Achievements() {
  const { user } = useAuth();
  useProtectedRoute();

  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<AchievementCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      // Check for new achievements
      if (user) {
        await checkAllAchievements(user.id);
      }

      // Get all user achievements
      const achievements = await getUserAchievements(user?.id || '');
      
      // Enrich with achievement details
      const enrichedAchievements = achievements.map(userAchievement => {
        const achievementDetails = getAchievementById(userAchievement.achievement_id);
        return {
          ...userAchievement,
          details: achievementDetails
        };
      });

      // Calculate total points
      const points = enrichedAchievements.reduce((sum, achievement) => {
        if (achievement.completed && achievement.details) {
          return sum + achievement.details.points;
        }
        return sum;
      }, 0);

      setUserAchievements(enrichedAchievements);
      setTotalPoints(points);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompletedCount = () => {
    return userAchievements.filter(a => a.completed).length;
  };

  const getTotalCount = () => {
    return ACHIEVEMENTS.length;
  };

  const getFilteredAchievements = () => {
    if (filterCategory === 'all') {
      return userAchievements;
    }
    return userAchievements.filter(a => a.details?.category === filterCategory);
  };

  // Group achievements by category
  const groupedAchievements = () => {
    const filtered = getFilteredAchievements();
    const grouped: Record<string, any[]> = {};

    filtered.forEach(achievement => {
      const category = achievement.details?.category || 'unknown';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(achievement);
    });

    return grouped;
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'milestone': return 'Jalons de lecture';
      case 'genre': return 'Diversité des genres';
      case 'series': return 'Séries complétées';
      case 'author': return 'Collection d\'auteurs';
      case 'consistency': return 'Constance de lecture';
      default: return 'Autres';
    }
  };

  // Initialize achievements that don't exist in the database
  useEffect(() => {
    if (user && userAchievements.length > 0) {
      const existingIds = new Set(userAchievements.map(a => a.achievement_id));
      
      // Find achievements that need to be initialized
      const missingAchievements = ACHIEVEMENTS.filter(a => !existingIds.has(a.id));
      
      if (missingAchievements.length > 0) {
        // This could be optimized with a batch insert
        const initializeAll = async () => {
          for (const achievement of missingAchievements) {
            try {
              const response = await fetch('/api/achievements/initialize', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  achievementId: achievement.id
                }),
              });
              
              if (!response.ok) {
                console.error(`Failed to initialize achievement ${achievement.id}`);
              }
            } catch (error) {
              console.error(`Error initializing achievement ${achievement.id}:`, error);
            }
          }
          
          // Refresh achievements after initialization
          fetchAchievements();
        };
        
        initializeAll();
      }
    }
  }, [user, userAchievements]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center mb-6">
        <Link href="/profile" className="text-gray-600 hover:text-gray-900 mr-3">
          <FiArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Mes succès</h1>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-blue-100 p-3 rounded-full mr-4">
              <FiAward className="text-blue-600 text-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Total des points</h2>
              <p className="text-gray-600">{totalPoints} points</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center md:items-end">
            <div className="text-lg font-semibold">
              {getCompletedCount()} / {getTotalCount()} succès débloqués
            </div>
            <div className="w-full md:w-48 h-3 bg-gray-200 rounded-full mt-2">
              <div
                className="h-3 bg-blue-500 rounded-full"
                style={{ width: `${(getCompletedCount() / getTotalCount()) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Tous les succès</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <FiFilter className="mr-1" />
          Filtrer
          <FiChevronDown className={`ml-1 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as AchievementCategory | 'all')}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="all">Toutes les catégories</option>
              <option value="milestone">Jalons de lecture</option>
              <option value="genre">Diversité des genres</option>
              <option value="series">Séries complétées</option>
              <option value="author">Collection d'auteurs</option>
              <option value="consistency">Constance de lecture</option>
            </select>
          </div>
        </div>
      )}

      {/* Achievement lists by category */}
      {Object.entries(groupedAchievements()).map(([category, achievements]) => (
        <div key={category} className="mb-8">
          <h3 className="text-lg font-semibold mb-4">{getCategoryLabel(category)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <AchievementCard
                key={achievement.achievement_id}
                userAchievement={achievement}
                achievementDetails={achievement.details}
              />
            ))}
          </div>
        </div>
      ))}

      {userAchievements.length === 0 && (
        <div className="text-center py-10 bg-white rounded-lg shadow-md">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-gray-500">
            Vous n'avez pas encore de succès. Continuez à lire pour en débloquer !
          </p>
        </div>
      )}
    </div>
  );
}