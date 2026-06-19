import React, { useEffect, useState } from 'react';
import { MapPin, Car, Timer, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { supabase, ParkingZone, ParkingSession } from '../../lib/supabase';

function StatCard({ title, value, sub, icon, color }: { title: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: z }, { data: s }] = await Promise.all([
        supabase.from('parking_zones').select('*').order('name'),
        supabase.from('parking_sessions').select('*, parking_zones(name)').order('created_at', { ascending: false }).limit(20),
      ]);
      setZones(z ?? []);
      setSessions(s ?? []);
      setLoading(false);
    }
    load();
    const channel = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_sessions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_zones' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalSpots = zones.reduce((s, z) => s + z.total_spots, 0);
  const totalOccupied = zones.reduce((s, z) => s + z.occupied_spots, 0);
  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const revenue = sessions.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.amount_paid, 0);

  const maxOccupancy = Math.max(...zones.map(z => z.total_spots), 1);

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard title="Total Zones" value={String(zones.length)} icon={<MapPin className="w-6 h-6 text-blue-500" />} color="bg-blue-50" />
        <StatCard title="Total Spots" value={String(totalSpots)} sub={`${totalOccupied} occupied`} icon={<Car className="w-6 h-6 text-teal-500" />} color="bg-teal-50" />
        <StatCard title="Active Sessions" value={String(activeSessions)} icon={<Timer className="w-6 h-6 text-slate-500" />} color="bg-slate-100" />
        <StatCard title="Revenue" value={`৳${revenue.toFixed(2)}`} sub="From completed sessions" icon={<DollarSign className="w-6 h-6 text-blue-500" />} color="bg-blue-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Zone Occupancy</h2>
          <div className="flex items-end justify-around gap-4 h-48">
            {zones.map(zone => {
              const pct = zone.total_spots > 0 ? (zone.occupied_spots / zone.total_spots) * 100 : 0;
              const freePct = 100 - pct;
              return (
                <div key={zone.id} className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full flex flex-col-reverse gap-1 h-40">
                    <div className="w-full bg-blue-500 rounded-t-sm transition-all" style={{ height: `${pct}%`, minHeight: pct > 0 ? '4px' : '0' }} />
                    <div className="w-full bg-teal-400 rounded-t-sm transition-all" style={{ height: `${freePct}%`, minHeight: freePct > 0 ? '4px' : '0' }} />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{zone.name}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-sm" /><span className="text-xs text-gray-500">Occupied</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-teal-400 rounded-sm" /><span className="text-xs text-gray-500">Available</span></div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3 overflow-y-auto max-h-72">
            {sessions.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No sessions yet</p>}
            {sessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Car className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.vehicle_plate}</p>
                  <p className="text-xs text-gray-400">{(s.parking_zones as any)?.name || 'Zone'}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-teal-100 text-teal-700' : s.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{formatTime(s.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
