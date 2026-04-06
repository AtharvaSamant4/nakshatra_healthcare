"use client"

import { createClient } from '@supabase/supabase-js'

// These must be provided in frontend/.env.local 
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
