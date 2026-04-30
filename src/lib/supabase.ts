import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wyjfilcjcbzjtupdaufc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5amZpbGNqY2J6anR1cGRhdWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNDIwODcsImV4cCI6MjA5MjkxODA4N30.XRQvRcNRtPF4Kj4iA6oxAOP6sQ6zZarGR3LfnTttWrM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)