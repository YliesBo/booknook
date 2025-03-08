// pages/api/achievements/initialize.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase/supabaseClient';
import { initializeAchievement } from '../../../lib/achievements/achievementService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { achievementId } = req.body;
  
  if (!achievementId) {
    return res.status(400).json({ error: 'Achievement ID is required' });
  }

  try {
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized - user not logged in' });
    }
    
    // Initialize achievement
    const achievement = await initializeAchievement(session.user.id, achievementId);
    
    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found or could not be initialized' });
    }
    
    return res.status(200).json({ 
      success: true,
      achievement
    });
  } catch (error) {
    console.error('Error initializing achievement:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}