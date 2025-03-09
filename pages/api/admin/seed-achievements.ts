// pages/api/admin/seed-achievements.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase/supabaseClient';
import { ACHIEVEMENT_DEFINITIONS } from '../../../lib/achievements/achievementMapping';
import { stringToUUID } from '../../../lib/achievements/achievementTypes';

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

    // First check if the achievements table exists
    try {
      // Try to query the achievement table schema
      const { data: schema, error: schemaError } = await supabase.rpc('get_table_schema', { 
        table_name: 'achievements' 
      });
      
      if (schemaError) {
        // Table might not exist, let's create it
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS public.achievements (
            achievement_id UUID PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(50) NOT NULL,
            difficulty VARCHAR(50) NOT NULL,
            icon_path VARCHAR(255),
            points INTEGER NOT NULL,
            requirements JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `;
        
        // Execute the create table query
        const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
        
        if (createError) {
          console.error('Error creating achievements table:', createError);
          return res.status(500).json({ 
            error: 'Error creating achievements table',
            details: createError.message
          });
        }
        
        console.log('Created achievements table');
      }
    } catch (error) {
      console.error('Error checking/creating achievements table:', error);
      return res.status(500).json({ 
        error: 'Error checking/creating achievements table',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // Check if achievements already exist
    const { data: existingAchievements, error: countError } = await supabase
      .from('achievements')
      .select('achievement_id, title')
      .limit(1);

    const existingCount = existingAchievements?.length || 0;

    // Prepare achievements to insert with proper UUIDs
    const achievementsToInsert = ACHIEVEMENT_DEFINITIONS.map(def => {
      return {
        achievement_id: stringToUUID(def.key),
        title: def.title,
        description: def.description,
        category: def.category,
        difficulty: def.difficulty,
        icon_path: def.icon,
        points: def.points,
        requirements: def.requirements,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    // If some achievements exist, we'll update them instead of inserting
    if (existingCount > 0) {
      // For each achievement, update it if it exists
      const results = await Promise.all(achievementsToInsert.map(async (achievement) => {
        const { data, error } = await supabase
          .from('achievements')
          .upsert(achievement, { 
            onConflict: 'achievement_id',
            ignoreDuplicates: false 
          })
          .select('achievement_id, title');
        
        return { achievement: achievement.title, success: !error, error };
      }));
      
      return res.status(200).json({
        message: `Updated ${results.filter(r => r.success).length} achievements`,
        updated: true,
        results
      });
    } else {
      // If no achievements exist, insert them all at once
      const { data, error } = await supabase
        .from('achievements')
        .insert(achievementsToInsert)
        .select('achievement_id, title');

      if (error) {
        console.error('Error seeding achievements:', error);
        return res.status(500).json({ 
          error: 'Error seeding achievements', 
          details: error.message
        });
      }

      return res.status(200).json({
        message: `Successfully seeded ${data.length} achievements`,
        seeded: true,
        count: data.length
      });
    }
  } catch (error: any) {
    console.error('Error in seed achievements API:', error);
    return res.status(500).json({ 
      error: 'An error occurred',
      details: error.message || String(error)
    });
  }
}