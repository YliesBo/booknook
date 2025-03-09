// pages/api/admin/fix-database.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase/supabaseClient';
import { ACHIEVEMENT_DEFINITIONS } from '../../../lib/achievements/achievementMapping';
import { stringToUUID } from '../../../lib/achievements/achievementTypes';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests or GET for easy testing
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if user is authenticated and admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin (optional, remove if not needed)
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('user_id', session.user.id)
      .single();
      
    if (!userData?.is_admin) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    // 1. Check if tables exist and create them if needed
    const tables = [
      {
        name: 'achievements',
        sql: `
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
        `
      },
      {
        name: 'user_achievements',
        sql: `
          CREATE TABLE IF NOT EXISTS public.user_achievements (
            user_id UUID NOT NULL,
            achievement_id UUID NOT NULL,
            progress JSONB NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT FALSE,
            completed_at TIMESTAMP WITH TIME ZONE,
            notified BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, achievement_id)
          );
        `
      },
      {
        name: 'achievement_events',
        sql: `
          CREATE TABLE IF NOT EXISTS public.achievement_events (
            event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            event_data JSONB,
            processed BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `
      }
    ];

    // Check and create each table
    const tableResults = await Promise.all(
      tables.map(async (table) => {
        try {
          // Check if table exists
          const { data, error } = await supabase
            .from(table.name)
            .select('*')
            .limit(1);
            
          if (error && error.code === '42P01') { // Table doesn't exist
            // Create table
            const { error: createError } = await supabase.rpc('exec_sql', { 
              sql: table.sql 
            });
            
            if (createError) {
              return { 
                table: table.name, 
                status: 'error',
                message: `Failed to create: ${createError.message}`
              };
            }
            
            return { 
              table: table.name, 
              status: 'created'
            };
          }
          
          return { 
            table: table.name, 
            status: 'exists'
          };
        } catch (error) {
          return { 
            table: table.name, 
            status: 'error',
            message: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );

    // 2. Clean up and rebuild achievements table
    const { data: existingAchievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('achievement_id, title');
      
    let cleanupResults = { deleted: 0, seeded: 0 };
    
    if (achievementsError && achievementsError.code !== '42P01') {
      console.error('Error checking achievements table:', achievementsError);
    } else if (!achievementsError) {
      // Delete all achievements with invalid UUIDs
      const invalidIds = (existingAchievements || []).filter(a => {
        try {
          // Try to parse as UUID
          const parts = a.achievement_id.split('-');
          return parts.length !== 5 || parts.some(p => p.endsWith('00000000'));
        } catch {
          return true; // Any error means it's invalid
        }
      }).map(a => a.achievement_id);
      
      if (invalidIds.length > 0) {
        // Delete invalid achievements
        const { error: deleteError } = await supabase
          .from('achievements')
          .delete()
          .in('achievement_id', invalidIds);
          
        if (!deleteError) {
          cleanupResults.deleted = invalidIds.length;
        }
      }
      
      // Prepare proper achievements to insert
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
      
      // Upsert achievements (insert or update)
      const { data: upsertResult, error: upsertError } = await supabase
        .from('achievements')
        .upsert(achievementsToInsert, {
          onConflict: 'achievement_id',
          ignoreDuplicates: false
        });
        
      if (!upsertError) {
        cleanupResults.seeded = achievementsToInsert.length;
      }
    }

    // 3. Clean up invalid user achievements
    const { data: userAchievements, error: userAchievementsError } = await supabase
      .from('user_achievements')
      .select('user_id, achievement_id');
      
    let userAchievementResults = { deleted: 0 };
    
    if (userAchievementsError && userAchievementsError.code !== '42P01') {
      console.error('Error checking user_achievements table:', userAchievementsError);
    } else if (!userAchievementsError) {
      // Find invalid achievement_id values
      const invalidUserAchievements = (userAchievements || []).filter(ua => {
        try {
          // Try to parse as UUID
          const parts = ua.achievement_id.split('-');
          return parts.length !== 5 || parts.some(p => p.endsWith('00000000'));
        } catch {
          return true; // Any error means it's invalid
        }
      });
      
      if (invalidUserAchievements.length > 0) {
        // Delete each invalid entry individually
        await Promise.all(
          invalidUserAchievements.map(async (ua) => {
            const { error } = await supabase
              .from('user_achievements')
              .delete()
              .eq('user_id', ua.user_id)
              .eq('achievement_id', ua.achievement_id);
              
            if (!error) {
              userAchievementResults.deleted++;
            }
          })
        );
      }
    }

    return res.status(200).json({
      success: true,
      tables: tableResults,
      achievements: cleanupResults,
      userAchievements: userAchievementResults
    });
  } catch (error) {
    console.error('Error cleaning up database:', error);
    return res.status(500).json({ 
      error: 'An error occurred',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}