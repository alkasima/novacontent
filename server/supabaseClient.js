const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

let supabase = null;
if (config.SUPABASE_URL && config.SUPABASE_SERVICE_KEY) {
  supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });
} else {
  console.warn('Supabase not configured. Auth and DB routes will return errors.');
}

module.exports = { supabase };
