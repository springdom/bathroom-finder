import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tqseiseyegxacdxzearh.supabase.co';  // Paste your Project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxc2Vpc2V5ZWd4YWNkeHplYXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NTk0MzgsImV4cCI6MjA4MjEzNTQzOH0.tWTVYkFk8m17tQfSoBfcozlvRg0VYd23_tFgo5b97uA'; // Paste your anon public key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase initialized');