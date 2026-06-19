import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'admin' | 'customer';
  created_at: string;
};

export type ParkingZone = {
  id: string;
  name: string;
  location: string;
  total_spots: number;
  occupied_spots: number;
  hourly_rate: number;
  zone_type: 'covered' | 'rooftop' | 'underground' | 'open_air';
  status: 'active' | 'maintenance' | 'closed';
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export type ParkingSession = {
  id: string;
  user_id: string;
  zone_id: string;
  vehicle_plate: string;
  vehicle_type: 'car' | 'suv' | 'motorcycle' | 'truck';
  spot_number: string;
  check_in: string;
  check_out: string | null;
  status: 'active' | 'completed' | 'cancelled';
  amount_paid: number;
  created_at: string;
  parking_zones?: ParkingZone;
};
