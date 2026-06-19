import React, { useEffect, useState } from 'react';
import { Search, Car, Filter } from 'lucide-react';
import { supabase, ParkingSession, ParkingZone } from '../../lib/supabase';

type SessionWithZone = ParkingSession & { parking_zones: ParkingZone };

export default function SessionHistory() {
  const [sessions, setSessions] = useState<SessionWithZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('parking_sessions')
        .select('*, parking_zones(*)')
        .order('created_at', { ascending: false });
      setSessions((data as any) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = sessions.filter(s => {
    const matchSearch = s.vehicle_plate.toLowerCase().includes(search.toLowerCase()) ||
      (s.parking_zones?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = sessions.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.amount_paid, 0);

  function elapsed(s: SessionWithZone) {
    const start = new Date(s.check_in);
    const end = s.check_out ? new Date(s.check_out) : new Date();
    const h = (end.getTime() - start.getTime()) / 3600000;
    return `${h.toFixed(1)}h elapsed`;
  }

  const statusColor: Record<string, string> = {
    completed: 'bg-teal-100 text-teal-700',
    active: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-gray-100 text-gray-600',
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Session History</h1>
        <p className="text-gray-500 mt-1">{sessions.length} sessions · ৳{totalRevenue.toFixed(2)} total revenue</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by plate or zone..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 min-w-[140px]">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Car className="w-12 h-12 mb-3 opacity-30" />
            <p>No sessions found</p>
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
                <div className="text-sm text-gray-600 w-24">
                  <p className="font-medium">{s.parking_zones?.name}</p>
                  <p className="text-xs text-gray-400">Zone</p>
                </div>
                <div className="text-sm text-gray-600 w-40">
                  <p className="font-medium">{new Date(s.check_in).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-xs text-gray-400">{elapsed(s)}</p>
                </div>
                <div className="flex items-center gap-3 w-32 justify-end">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[s.status]}`}>
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </span>
                  <span className="text-sm font-bold text-gray-900">৳{s.amount_paid.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
