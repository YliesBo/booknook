// pages/api/achievements/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase/supabaseClient';
import { getUserAchievements } from '../../../lib/achievements/achievementService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized - user not logged in' });
    }
    
    // Get user achievements
    const achievements = await getUserAchievements(session.user.id);
    
    return res.status(200).json({ achievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}