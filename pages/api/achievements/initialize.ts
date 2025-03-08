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
    // Check for auth cookie instead of relying on getSession()
    const supabaseCookie = req.cookies['supabase-auth-token'];
    
    if (!supabaseCookie) {
      return res.status(401).json({ 
        error: 'Unauthorized - auth cookie missing',
        session: null
      });
    }
    
    // Get user session from the API context
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return res.status(401).json({ 
        error: 'Error retrieving session', 
        details: sessionError.message
      });
    }
    
    if (!session || !session.user) {
      return res.status(401).json({ 
        error: 'Unauthorized - session invalid',
        sessionExists: !!session
      });
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
  } catch (error: any) {
    console.error('Error initializing achievement:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message || 'Unknown error'
    });
  }
}