import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Global connection pool to prevent re-initialization
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        // Connection pooling configuration
        schema: 'public',
      },
      auth: {
        persistSession: false, // Disable session persistence for server-side
      },
      realtime: {
        params: {
          eventsPerSecond: 10, // Limit real-time events
        },
      },
      global: {
        headers: {
          'x-application-name': 'palaka-erp',
        },
      },
    });
  }
  
  return supabaseInstance;
}

// Export singleton instance
export const supabase = getSupabaseClient();