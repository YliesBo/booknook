// components/achievements/AchievementCard.tsx
import { FiAward, FiUser, FiBook, FiCompass, FiList, FiCalendar } from 'react-icons/fi';
import { Achievement, AchievementCategory, AchievementDifficulty } from '../../lib/achievements/achievementTypes';

interface UserAchievement {
  achievement_id: string;
  user_id: string;
  progress: {
    current: number;
    target: number;
  };
  completed: boolean;
  completed_at: string | null;
}

interface AchievementCardProps {
  userAchievement: UserAchievement;
  achievementDetails: Achievement | undefined;
}

export default function AchievementCard({ userAchievement, achievementDetails }: AchievementCardProps) {
  if (!achievementDetails) {
    return null;
  }

  const { progress, completed } = userAchievement;
  const { title, description, category, difficulty, icon, points } = achievementDetails;

  // Format date if achievement is completed
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (completed) return 100;
    
    const current = progress?.current || 0;
    const target = progress?.target || 1;
    
    return Math.min(Math.round((current / target) * 100), 100);
  };

  // Get icon based on category
  const getIcon = () => {
    switch (category) {
      case 'milestone':
        return <FiBook className="text-blue-500" size={24} />;
      case 'genre':
        return <FiCompass className="text-green-500" size={24} />;
      case 'series':
        return <FiList className="text-purple-500" size={24} />;
      case 'author':
        return <FiUser className="text-red-500" size={24} />;
      case 'consistency':
        return <FiCalendar className="text-yellow-500" size={24} />;
      default:
        return <FiAward className="text-blue-500" size={24} />;
    }
  };

  // Get background color based on difficulty
  const getBackgroundColor = () => {
    if (!completed) return 'bg-gray-100 text-black';
    
    switch (difficulty) {
      case 'bronze':
        return 'bg-yellow-700 text-white';
      case 'silver':
        return 'bg-gray-400 text-white';
      case 'gold':
        return 'bg-yellow-400 text-black';
      case 'platinum':
        return 'bg-blue-300 text-black';
      default:
        return 'bg-gray-200 text-black';
    }
  };

  // Get border color based on difficulty
  const getBorderColor = () => {
    if (!completed) return 'border-gray-200';
    
    switch (difficulty) {
      case 'bronze':
        return 'border-yellow-700';
      case 'silver':
        return 'border-gray-400';
      case 'gold':
        return 'border-yellow-400';
      case 'platinum':
        return 'border-blue-300';
      default:
        return 'border-gray-300';
    }
  };

  return (
    <div className={`rounded-lg shadow-sm overflow-hidden border-2 ${getBorderColor()} ${completed ? 'transform transition-transform hover:scale-105' : 'opacity-75'}`}>
      <div className={`p-4 flex justify-between items-center ${getBackgroundColor()}`}>
        <div className="flex items-center">
          <div className="bg-white rounded-full p-2 mr-3">
            {getIcon()}
          </div>
          <div>
            <h3 className="font-bold">{title}</h3>
            <p className="text-sm opacity-90">{description}</p>
          </div>
        </div>
        <div className="font-bold text-lg">{points} pts</div>
      </div>
      
      <div className="p-4 bg-white">
        {completed ? (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Débloqué le {formatDate(userAchievement.completed_at)}
            </div>
            <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
              Complété
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-600">
                Progression
              </span>
              <span className="text-sm font-medium text-gray-600">
                {progress?.current || 0} / {progress?.target || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}