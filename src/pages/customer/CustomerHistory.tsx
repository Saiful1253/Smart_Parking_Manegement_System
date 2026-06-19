import React, { useEffect, useState } from 'react';
import { Car, Search } from 'lucide-react';
import { supabase, ParkingSession, ParkingZone } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type SessionWithZone = ParkingSession & { parking_zones: ParkingZone };

export default function CustomerHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('parking_sessions').select('*, parking_zones(*)')
      .eq('user_id', user.id).neq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSessions((data as any) ?? []);
        setLoading(false);
      });
  }, [user]);

  const filtered = sessions.filter(s =>
    s.vehicle_plate.toLowerCase().includes(search.toLowerCase()) ||
    (s.parking_zones?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalSpent = sessions.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.amount_paid, 0);

  const statusColor: Record<string, string> = {
    completed: 'bg-teal-100 text-teal-700',
    cancelled: 'bg-gray-100 text-gray-600',
  };

  function duration(s: SessionWithZone) {
    if (!s.check_out) return '-';
    const ms = new Date(s.check_out).getTime() - new Date(s.check_in).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Parking History</h1>
        <p className="text-gray-500 mt-1">{sessions.length} sessions · ৳{totalSpent.toFixed(2)} total spent</p>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sessions..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Car className="w-12 h-12 mb-3 opacity-30" />
            <p>No parking history found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Car className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{s.vehicle_plate}</p>
                  <p className="text-xs text-gray-400 capitalize">{s.vehicle_type}</p>
                </div>
                <div className="text-sm text-gray-600 w-24 hidden sm:block">
                  <p className="font-medium">{s.parking_zones?.name}</p>
                </div>
                <div className="text-sm text-gray-600 w-32 hidden md:block">
                  <p className="font-medium">{new Date(s.check_in).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                  <p className="text-xs text-gray-400">{duration(s)} parked</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[s.status] || 'bg-gray-100 text-gray-600'}`}>
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </span>
                  <span className="text-sm font-bold text-gray-900 w-16 text-right">৳{s.amount_paid.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
