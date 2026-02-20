-- FCM Companion v5 Migration
-- Run this in Supabase Dashboard SQL Editor

-- Student sentiment capture (one per user per case)
CREATE TABLE IF NOT EXISTS fcm_sentiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES fcm_users(id),
  case_id UUID REFERENCES fcm_cases(id),
  sentiment TEXT CHECK (sentiment IN ('confident', 'uncertain', 'lost')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, case_id)
);
ALTER TABLE fcm_sentiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all sentiments" ON fcm_sentiments FOR ALL USING (true) WITH CHECK (true);

-- Post-session quick captures (one takeaway per user per case)
CREATE TABLE IF NOT EXISTS fcm_session_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES fcm_users(id),
  case_id UUID REFERENCES fcm_cases(id),
  takeaway TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, case_id)
);
ALTER TABLE fcm_session_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all session captures" ON fcm_session_captures FOR ALL USING (true) WITH CHECK (true);
