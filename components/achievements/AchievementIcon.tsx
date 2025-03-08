// components/achievements/AchievementIcon.tsx
import { FiAward, FiUser, FiBook, FiCompass, FiList, FiCalendar } from 'react-icons/fi';
import { AchievementCategory, AchievementDifficulty } from '../../lib/achievements/achievementTypes';

interface AchievementIconProps {
  category?: AchievementCategory;
  difficulty?: AchievementDifficulty;
  completed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function AchievementIcon({ 
  category = 'milestone',
  difficulty = 'bronze',
  completed = false,
  size = 'md'
}: AchievementIconProps) {
  // Get icon based on category
  const getIcon = () => {
    switch (category) {
      case 'milestone':
        return <FiBook />;
      case 'genre':
        return <FiCompass />;
      case 'series':
        return <FiList />;
      case 'author':
        return <FiUser />;
      case 'consistency':
        return <FiCalendar />;
      default:
        return <FiAward />;
    }
  };

  // Get icon color based on category
  const getIconColor = () => {
    if (!completed) return 'text-gray-400';
    
    switch (category) {
      case 'milestone':
        return 'text-blue-600';
      case 'genre':
        return 'text-green-600';
      case 'series':
        return 'text-purple-600';
      case 'author':
        return 'text-red-600';
      case 'consistency':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  // Get background color based on difficulty and completion status
  const getBackgroundColor = () => {
    if (!completed) return 'bg-gray-100';
    
    switch (difficulty) {
      case 'bronze':
        return 'bg-yellow-100';
      case 'silver':
        return 'bg-gray-200';
      case 'gold':
        return 'bg-yellow-200';
      case 'platinum':
        return 'bg-blue-100';
      default:
        return 'bg-gray-100';
    }
  };

  // Get border color based on difficulty and completion status
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

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8 text-sm';
      case 'lg':
        return 'w-16 h-16 text-2xl';
      case 'md':
      default:
        return 'w-12 h-12 text-xl';
    }
  };

  return (
    <div 
      className={`${getBackgroundColor()} ${getBorderColor()} ${getIconColor()} ${getSizeClasses()} rounded-full border-2 flex items-center justify-center`}
    >
      {getIcon()}
    </div>
  );
}