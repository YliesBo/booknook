// components/achievements/AchievementPreview.tsx
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiAward, FiChevronRight } from 'react-icons/fi';
import { getUserAchievements, checkAllAchievements } from '../../lib/achievements/achievementService';
import { getAchievementById, ACHIEVEMENTS } from '../../lib/achievements/achievementTypes';
import AchievementIcon from './AchievementIcon';

interface AchievementPreviewProps {
  userId: string;
  showCount?: number; // Number of achievements to show
}

export default function AchievementPreview({ userId, showCount = 4 }: AchievementPreviewProps) {
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (userId) {
      fetchAchievements();
    }
  }, [userId]);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      // Check for new achievements (you might want to avoid this on preview components for performance)
      await checkAllAchievements(userId);

      // Get user achievements
      const achievements = await getUserAchievements(userId);
      
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
      
      // Get recently completed achievements
      const completed = enrichedAchievements
        .filter(a => a.completed)
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
        .slice(0, showCount);
        
      setRecentAchievements(completed);
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  // If no completed achievements, show a different UI
  if (getCompletedCount() === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Mes succès</h2>
          <Link href="/achievements" className="text-blue-600 hover:text-blue-800 flex items-center text-sm">
            Voir tout
            <FiChevronRight className="ml-1" />
          </Link>
        </div>
        
        <div className="text-center py-6">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAward className="text-gray-400 text-2xl" />
          </div>
          <p className="text-gray-500 mb-2">Aucun succès débloqué pour l'instant</p>
          <p className="text-sm text-gray-400">
            Continuez à lire et suivre vos livres pour gagner des succès
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Mes succès</h2>
        <Link href="/achievements" className="text-blue-600 hover:text-blue-800 flex items-center text-sm">
          Voir tout
          <FiChevronRight className="ml-1" />
        </Link>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          {getCompletedCount()} / {getTotalCount()} débloqués
        </div>
        <div className="text-sm font-medium">
          {totalPoints} points
        </div>
      </div>
      
      <div className="w-full h-2 bg-gray-100 rounded-full mb-4">
        <div
          className="h-2 bg-blue-500 rounded-full"
          style={{ width: `${(getCompletedCount() / getTotalCount()) * 100}%` }}
        ></div>
      </div>
      
      {recentAchievements.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {recentAchievements.map((achievement) => (
            <Link 
              key={achievement.achievement_id}
              href="/achievements"
              className="bg-gray-50 rounded-lg p-2 hover:bg-gray-100"
            >
              <div className="flex flex-col items-center">
                <AchievementIcon 
                  category={achievement.details?.category}
                  difficulty={achievement.details?.difficulty}
                  completed={true}
                />
                <div className="text-xs text-center mt-1 font-medium truncate w-full">
                  {achievement.details?.title}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500">
          Aucun succès récent
        </p>
      )}
    </div>
  );
}