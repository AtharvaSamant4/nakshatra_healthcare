-- Enable Row Level Security (RLS) on all tables to prevent unauthorized data access
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies ensuring users can only read/edit their own data

-- Example Policy 1: Patients can read their own profiles, Doctors can read any patient they are assigned to
CREATE POLICY "patient_select_own" ON patients
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "doctor_read_assigned_patients" ON patients
  FOR SELECT
  USING (auth.jwt()->>'role' = 'doctor' AND auth.uid() = doctor_id);

-- Example Policy 2: Patient can read their own prescriptions
CREATE POLICY "prescriptions_patient_select" ON prescriptions
  FOR SELECT
  USING (auth.uid() = patient_id);

-- Example Policy 3: Only the assigned doctor can add/edit a prescription
CREATE POLICY "doctor_prescribe" ON prescriptions
  FOR ALL
  USING (auth.jwt()->>'role' = 'doctor' AND auth.uid() = doctor_id)
  WITH CHECK (auth.jwt()->>'role' = 'doctor' AND auth.uid() = doctor_id);

-- Note: In a production Supabase instance, all JWT payload info is available
-- through auth.jwt(). Ensure frontend authenticates against Supabase Auth properly!
