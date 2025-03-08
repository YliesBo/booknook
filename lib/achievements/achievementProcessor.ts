// lib/achievements/achievementProcessor.ts
import { supabase } from '../supabase/supabaseClient';
import { checkAllAchievements } from './achievementService';

/**
 * Processes unprocessed achievement events
 * @returns The number of events processed
 */
export async function processAchievementEvents(): Promise<number> {
  try {
    // Get unprocessed events
    const { data: events, error } = await supabase
      .from('achievement_events')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(50); // Process in batches to avoid overwhelming the system

    if (error) throw error;
    
    if (!events || events.length === 0) {
      return 0;
    }
    
    let processedCount = 0;
    
    // Process each event
    for (const event of events) {
      try {
        const userId = event.user_id;
        
        // Process different event types
        switch (event.event_type) {
          case 'status_changed_to_read':
          case 'book_completed':
            // Check all achievements for this user
            await checkAllAchievements(userId);
            break;
            
          default:
            console.warn(`Unknown event type: ${event.event_type}`);
        }
        
        // Mark the event as processed
        await supabase
          .from('achievement_events')
          .update({ processed: true })
          .eq('event_id', event.event_id);
        
        processedCount++;
      } catch (eventError) {
        console.error(`Error processing event ${event.event_id}:`, eventError);
      }
    }
    
    return processedCount;
  } catch (error) {
    console.error('Error processing achievement events:', error);
    return 0;
  }
}