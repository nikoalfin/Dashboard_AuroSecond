const SUPABASE_URL = 'https://rmmtoylsxqmjyjubrvra.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZysD20hVCcd4eZNM5eRgig_5NThJpAA';
const TABLE_MOTOR = 'aurosecond-dashboard';
const TABLE_SALDO_MODAL = 'saldo_modal';
const BUCKET_NAME = 'motor-images';

function getSupabase() {
  if (!window._supabaseInstance && window.supabase) {
    window._supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return window._supabaseInstance;
}
