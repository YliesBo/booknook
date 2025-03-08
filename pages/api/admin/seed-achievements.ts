// pages/api/admin/seed-achievements.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase/supabaseClient';
import { ACHIEVEMENT_DEFINITIONS } from '../../../lib/achievements/achievementMapping';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Accept GET for easier testing and POST for standard API practice
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // First check if the achievements table even exists
    let tableExists = false;
    try {
      // Try to query achievements table
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .limit(1);
      
      tableExists = !error;
    } catch (error) {
      tableExists = false;
    }

    if (!tableExists) {
      return res.status(200).json({ 
        message: "The achievements table doesn't exist. Please create it first.",
        exists: false,
        tableNeeded: true
      });
    }

    // Since we know the table exists, let's check what column name is used for the ID
    let idColumnName = 'achievement_id'; // Default assumption
    try {
      // Try with achievement_id
      const { error: error1 } = await supabase
        .from('achievements')
        .select('achievement_id')
        .limit(1);
      
      if (error1) {
        // Try with id
        const { error: error2 } = await supabase
          .from('achievements')
          .select('id')
          .limit(1);
        
        if (!error2) {
          idColumnName = 'id';
        }
      }
    } catch (error) {
      console.log('Error detecting ID column name', error);
    }

    console.log(`Using column name '${idColumnName}' as the primary key`);

    // Check if achievements already exist
    const countQuery = `count(*)`; 
    const { count: existingCount, error: countError } = await supabase
      .from('achievements')
      .select(countQuery, { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting achievements:', countError);
      return res.status(500).json({ error: 'Error counting achievements' });
    }

    if (existingCount && existingCount > 0) {
      return res.status(200).json({ 
        message: `Found ${existingCount} existing achievements. No seeding required.`,
        exists: true,
        seeded: false,
        count: existingCount
      });
    }

    // Seed the achievements using the correct column structure
    const achievementsToInsert = ACHIEVEMENT_DEFINITIONS.map(def => {
      // Create base object
      const achievementData: any = {
        title: def.title,
        description: def.description,
        category: def.category,
        difficulty: def.difficulty,
        points: def.points,
        requirements: def.requirements
      };

      // For icon column name handling - check options
      if (idColumnName === 'achievement_id') {
        // If we're using achievement_id, icon field might be icon_path
        achievementData.icon_path = def.icon;
      } else {
        // Otherwise try both
        achievementData.icon = def.icon;
        achievementData.icon_path = def.icon;
      }

      return achievementData;
    });

    const { data, error } = await supabase
      .from('achievements')
      .insert(achievementsToInsert)
      .select();

    if (error) {
      console.error('Error seeding achievements:', error);
      return res.status(500).json({ 
        error: 'Error seeding achievements', 
        details: error.message,
        query: error.query
      });
    }

    return res.status(200).json({
      message: `Successfully seeded ${data.length} achievements`,
      exists: true,
      seeded: true,
      count: data.length,
      idColumnName,
      details: data.map(a => ({
        title: a.title,
        id: a[idColumnName]
      }))
    });
  } catch (error: any) {
    console.error('Error in seed achievements API:', error);
    return res.status(500).json({ 
      error: 'An error occurred',
      details: error.message || String(error)
    });
  }
}