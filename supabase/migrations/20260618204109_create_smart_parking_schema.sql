/*
# SmartPark - Smart Parking System Schema

## Overview
Creates all tables needed for the SmartPark system with admin and customer roles.

## New Tables

### profiles
- `id` (uuid, PK, references auth.users)
- `email` (text)
- `full_name` (text)
- `phone` (text)
- `role` (text: 'admin' | 'customer')
- `created_at` (timestamptz)

### parking_zones
- `id` (uuid, PK)
- `name` (text) - Zone display name e.g. "Zone A"
- `location` (text) - Physical location description
- `total_spots` (int) - Total number of spots
- `occupied_spots` (int) - Currently occupied spots
- `hourly_rate` (numeric) - Price per hour
- `zone_type` (text) - 'covered', 'rooftop', 'underground', 'open_air'
- `status` (text) - 'active', 'maintenance', 'closed'
- `latitude` (numeric) - Map lat coordinate
- `longitude` (numeric) - Map lng coordinate
- `created_at` (timestamptz)

### parking_sessions
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users)
- `zone_id` (uuid, FK to parking_zones)
- `vehicle_plate` (text)
- `vehicle_type` (text) - 'car', 'suv', 'motorcycle', 'truck'
- `spot_number` (text)
- `check_in` (timestamptz)
- `check_out` (timestamptz, nullable)
- `status` (text) - 'active', 'completed', 'cancelled'
- `amount_paid` (numeric)
- `created_at` (timestamptz)

## Security
- RLS enabled on all tables
- profiles: users read/update own profile; admins read all
- parking_zones: public read; admin write
- parking_sessions: customers see own; admins see all
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text DEFAULT '',
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Parking Zones table
CREATE TABLE IF NOT EXISTS parking_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  total_spots int NOT NULL DEFAULT 0,
  occupied_spots int NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 2.00,
  zone_type text NOT NULL DEFAULT 'covered' CHECK (zone_type IN ('covered', 'rooftop', 'underground', 'open_air')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'closed')),
  latitude numeric,
  longitude numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE parking_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zones_select_all" ON parking_zones;
CREATE POLICY "zones_select_all" ON parking_zones FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "zones_insert_admin" ON parking_zones;
CREATE POLICY "zones_insert_admin" ON parking_zones FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "zones_update_admin" ON parking_zones;
CREATE POLICY "zones_update_admin" ON parking_zones FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "zones_delete_admin" ON parking_zones;
CREATE POLICY "zones_delete_admin" ON parking_zones FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Parking Sessions table
CREATE TABLE IF NOT EXISTS parking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES parking_zones(id) ON DELETE CASCADE,
  vehicle_plate text NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'car' CHECK (vehicle_type IN ('car', 'suv', 'motorcycle', 'truck')),
  spot_number text DEFAULT '',
  check_in timestamptz DEFAULT now(),
  check_out timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  amount_paid numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE parking_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select_own_or_admin" ON parking_sessions;
CREATE POLICY "sessions_select_own_or_admin" ON parking_sessions FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "sessions_insert_own" ON parking_sessions;
CREATE POLICY "sessions_insert_own" ON parking_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_update_own_or_admin" ON parking_sessions;
CREATE POLICY "sessions_update_own_or_admin" ON parking_sessions FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "sessions_delete_own_or_admin" ON parking_sessions;
CREATE POLICY "sessions_delete_own_or_admin" ON parking_sessions FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON parking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_zone_id ON parking_sessions(zone_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON parking_sessions(status);
CREATE INDEX IF NOT EXISTS idx_zones_status ON parking_zones(status);

-- Seed initial parking zones (Dhaka, Bangladesh area based on screenshots)
INSERT INTO parking_zones (name, location, total_spots, occupied_spots, hourly_rate, zone_type, status, latitude, longitude)
SELECT 'Zone A', 'Ground Floor, Main Building', 50, 32, 3.50, 'covered', 'active', 23.8103, 90.4125
WHERE NOT EXISTS (SELECT 1 FROM parking_zones WHERE name = 'Zone A');

INSERT INTO parking_zones (name, location, total_spots, occupied_spots, hourly_rate, zone_type, status, latitude, longitude)
SELECT 'Zone B', 'Rooftop Level 5', 80, 45, 2.00, 'rooftop', 'active', 23.8223, 90.4280
WHERE NOT EXISTS (SELECT 1 FROM parking_zones WHERE name = 'Zone B');

INSERT INTO parking_zones (name, location, total_spots, occupied_spots, hourly_rate, zone_type, status, latitude, longitude)
SELECT 'Zone C', 'Underground Parking, B1', 120, 98, 5.00, 'underground', 'active', 23.8150, 90.4195
WHERE NOT EXISTS (SELECT 1 FROM parking_zones WHERE name = 'Zone C');

INSERT INTO parking_zones (name, location, total_spots, occupied_spots, hourly_rate, zone_type, status, latitude, longitude)
SELECT 'Zone D', 'Open Lot, East Wing', 30, 12, 1.50, 'open_air', 'active', 23.8070, 90.4060
WHERE NOT EXISTS (SELECT 1 FROM parking_zones WHERE name = 'Zone D');

INSERT INTO parking_zones (name, location, total_spots, occupied_spots, hourly_rate, zone_type, status, latitude, longitude)
SELECT 'Zone E', 'West Annex', 40, 0, 2.50, 'covered', 'maintenance', 23.8010, 90.4160
WHERE NOT EXISTS (SELECT 1 FROM parking_zones WHERE name = 'Zone E');

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
