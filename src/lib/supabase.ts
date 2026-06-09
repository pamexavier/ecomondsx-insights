import { createClient } from '@supabase/supabase-js'

// Coloque os valores reais direto aqui para testar
const supabaseUrl = "https://grcayroeyqsmoahaagbh.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyY2F5cm9leXFzbW9haGFhZ2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MTU4NDAsImV4cCI6MjA5NjQ5MTg0MH0.Y-oSER8qz7Fltwo6x8kjVMFiSny-birKzs8S7fhR6hU"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)