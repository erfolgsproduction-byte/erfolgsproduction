
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://djochkfbwqleudizlbcs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqb2Noa2Zid3FsZXVkaXpsYmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0Njg2MDcsImV4cCI6MjA4NDA0NDYwN30.R5GaWwGpjKz_ZZNar1dqWulVjaExSMH_DBK2Xhosqeo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
