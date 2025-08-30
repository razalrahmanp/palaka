import { createClient } from '@supabase/supabase-js';

// Environment variable validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL. Please check your .env.local file.'
  );
}

if (!supabaseServiceKey) {
  throw new Error(
    'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. Please check your .env.local file.'
  );
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export { supabaseAdmin as supabase };
