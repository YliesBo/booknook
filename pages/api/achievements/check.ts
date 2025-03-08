// pages/api/achievements/check.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase/supabaseClient';
import { checkAllAchievements } from '../../../lib/achievements/achievementService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized - user not logged in' });
    }
    
    // Check all achievements
    const unlockedAchievements = await checkAllAchievements(session.user.id);
    
    return res.status(200).json({ 
      success: true,
      unlockedAchievements
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}