import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iheyjovfbmrgwuswoatl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZXlqb3ZmYm1yZ3d1c3dvYXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NzgxNTksImV4cCI6MjA4NjQ1NDE1OX0.RD2dKpwOGDe2q6zP2RmF6uWhtUKRUwnmb8MbpjR_6hI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
