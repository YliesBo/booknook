// pages/api/achievements/process-events.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase/supabaseClient';
import { processAchievementEvents } from '../../../lib/achievements/achievementProcessor';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Accept both GET and POST for easier testing
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Optional: Check for admin or auth
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized - user not logged in' });
    }
    
    // Process events
    const processedCount = await processAchievementEvents();
    
    return res.status(200).json({ 
      success: true,
      processedCount,
      message: `Processed ${processedCount} achievement events`
    });
  } catch (error) {
    console.error('Error processing events:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}