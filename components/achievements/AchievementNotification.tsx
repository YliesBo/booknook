// components/achievements/AchievementNotification.tsx
import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { getAchievementById } from '../../lib/achievements/achievementTypes';
import { getUnnotifiedAchievements, markAchievementAsNotified } from '../../lib/achievements/achievementService';
import AchievementIcon from './AchievementIcon';

interface AchievementNotificationProps {
  userId: string;
}

export default function AchievementNotification({ userId }: AchievementNotificationProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentNotification, setCurrentNotification] = useState<any | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (userId) {
      checkForNotifications();
    }
  }, [userId]);

  const checkForNotifications = async () => {
    try {
      const unnotifiedAchievements = await getUnnotifiedAchievements(userId);
      
      if (unnotifiedAchievements.length > 0) {
        // Enrich with achievement details
        const enrichedNotifications = unnotifiedAchievements.map(achievement => {
          const details = getAchievementById(achievement.achievement_id);
          return { ...achievement, details };
        });
        
        setNotifications(enrichedNotifications);
        showNextNotification();
      }
    } catch (error) {
      console.error('Error checking for notifications:', error);
    }
  };

  const showNextNotification = () => {
    if (notifications.length > 0) {
      const [next, ...rest] = notifications;
      setCurrentNotification(next);
      setNotifications(rest);
      setIsVisible(true);
      
      // Auto-hide after 6 seconds
      setTimeout(() => {
        hideNotification();
      }, 6000);
    }
  };

  const hideNotification = async () => {
    setIsVisible(false);
    
    // Mark as notified in database
    if (currentNotification) {
      await markAchievementAsNotified(userId, currentNotification.achievement_id);
    }
    
    // Show next notification after a brief pause
    setTimeout(() => {
      setCurrentNotification(null);
      if (notifications.length > 0) {
        showNextNotification();
      }
    }, 300);
  };

  if (!currentNotification || !isVisible) {
    return null;
  }

  const { details } = currentNotification;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-all animate-slide-up">
        <div className="bg-blue-500 text-white px-4 py-2 flex items-center justify-between">
          <div className="font-bold">Succès débloqué !</div>
          <button 
            onClick={hideNotification}
            className="text-white hover:text-gray-200"
          >
            <FiX />
          </button>
        </div>
        
        <div className="p-4 flex items-center">
          <div className="mr-4">
            <AchievementIcon 
              category={details?.category}
              difficulty={details?.difficulty}
              completed={true}
              size="md"
            />
          </div>
          
          <div>
            <h3 className="font-bold text-lg">{details?.title}</h3>
            <p className="text-gray-600">{details?.description}</p>
            <div className="text-sm text-blue-600 font-medium mt-1">
              +{details?.points} points
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add this to global.css for the animation
/*
@keyframes slide-up {
  0% {
    transform: translateY(100%);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out forwards;
}
*/