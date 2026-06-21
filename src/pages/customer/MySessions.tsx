import React, { useEffect, useState, useCallback } from 'react';
import { Car, Clock, MapPin, X, Mail } from 'lucide-react';
import { supabase, ParkingSession, ParkingZone } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type SessionWithZone = ParkingSession & { parking_zones: ParkingZone };

export default function MySessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('parking_sessions')
      .select('*, parking_zones(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('check_in', { ascending: false });
    setSessions((data as any) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
    const tick = setInterval(() => setNow(new Date()), 30000);
    const ch = supabase.channel('my_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_sessions' }, load)
      .subscribe();
    return () => { clearInterval(tick); supabase.removeChannel(ch); };
  }, [load]);

  async function handleCheckOut(session: SessionWithZone) {
    if (!confirm('Check out now? You will be charged for the session.')) return;
    const hours = Math.max((Date.now() - new Date(session.check_in).getTime()) / 3600000, 0.5);
    const amount = Math.round(hours * session.parking_zones.hourly_rate * 100) / 100;
    await supabase.from('parking_sessions').update({ check_out: new Date().toISOString(), status: 'completed', amount_paid: amount }).eq('id', session.id);
    await supabase.from('parking_zones').update({ occupied_spots: Math.max(session.parking_zones.occupied_spots - 1, 0) }).eq('id', session.zone_id);
    load();
  }

  function elapsed(checkIn: string) {
    const ms = now.getTime() - new Date(checkIn).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function estimateCost(session: SessionWithZone) {
    const hours = Math.max((now.getTime() - new Date(session.check_in).getTime()) / 3600000, 0.5);
    return (hours * session.parking_zones.hourly_rate).toFixed(2);
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full mb-2">
          <Mail className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-700">{user?.email}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">My Active Sessions</h1>
        <p className="text-gray-500 mt-1">{sessions.length} active parking session{sessions.length !== 1 ? 's' : ''}</p>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Car className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">No active sessions</p>
          <p className="text-sm mt-1">Go to "Find Parking" to book a spot</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sessions.map(s => (
            <div key={s.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Car className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900 tracking-wider">{s.vehicle_plate}</p>
                    <p className="text-sm text-gray-400 capitalize">{s.vehicle_type}</p>
                  </div>
                </div>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">ACTIVE</span>
              </div>

              <div className="space-y-2.5 mb-5">
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{s.parking_zones?.name} — {s.parking_zones?.location}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>Checked in at {new Date(s.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {s.spot_number && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className="w-4 h-4 flex items-center justify-center text-gray-400 font-bold text-xs flex-shrink-0">#</div>
                    <span>Spot {s.spot_number}</span>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Time Elapsed</p>
                    <p className="text-2xl font-bold text-gray-900">{elapsed(s.check_in)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-0.5">Current Charge</p>
                    <p className="text-2xl font-bold text-blue-600">৳{estimateCost(s)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">৳{s.parking_zones?.hourly_rate}/hr · Min 30 min charge</p>
              </div>

              <button
                onClick={() => handleCheckOut(s)}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                Check Out Now
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
