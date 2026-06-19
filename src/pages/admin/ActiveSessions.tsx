import React, { useEffect, useState } from 'react';
import { Plus, Car, X, Clock, MapPin } from 'lucide-react';
import { supabase, ParkingZone, ParkingSession } from '../../lib/supabase';

const vehicleTypes = ['car', 'suv', 'motorcycle', 'truck'] as const;

export default function ActiveSessions() {
  const [sessions, setSessions] = useState<(ParkingSession & { parking_zones: ParkingZone })[]>([]);
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ vehicle_plate: '', vehicle_type: 'car' as typeof vehicleTypes[number], zone_id: '', spot_number: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const [{ data: s }, { data: z }] = await Promise.all([
      supabase.from('parking_sessions').select('*, parking_zones(*)').eq('status', 'active').order('check_in', { ascending: false }),
      supabase.from('parking_zones').select('*').eq('status', 'active').order('name'),
    ]);
    setSessions((s as any) ?? []);
    setZones(z ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel('active_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_sessions' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function handleCheckIn() {
    if (!form.vehicle_plate.trim() || !form.zone_id) { setError('Vehicle plate and zone are required'); return; }
    const zone = zones.find(z => z.id === form.zone_id);
    if (!zone) return;
    if (zone.occupied_spots >= zone.total_spots) { setError('Zone is full'); return; }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('parking_sessions').insert({
      vehicle_plate: form.vehicle_plate.toUpperCase(),
      vehicle_type: form.vehicle_type,
      zone_id: form.zone_id,
      spot_number: form.spot_number || `S${Math.floor(Math.random() * 900) + 100}`,
    });
    if (err) { setError(err.message); setSaving(false); return; }
    await supabase.from('parking_zones').update({ occupied_spots: zone.occupied_spots + 1 }).eq('id', zone.id);
    setSaving(false);
    setShowModal(false);
    setForm({ vehicle_plate: '', vehicle_type: 'car', zone_id: '', spot_number: '' });
    load();
  }

  async function handleCheckOut(session: ParkingSession & { parking_zones: ParkingZone }) {
    if (!confirm(`Check out ${session.vehicle_plate}?`)) return;
    const checkIn = new Date(session.check_in);
    const now = new Date();
    const hours = Math.max((now.getTime() - checkIn.getTime()) / (1000 * 60 * 60), 0.5);
    const amount = Math.round(hours * session.parking_zones.hourly_rate * 100) / 100;
    await supabase.from('parking_sessions').update({ check_out: now.toISOString(), status: 'completed', amount_paid: amount }).eq('id', session.id);
    const zone = session.parking_zones;
    await supabase.from('parking_zones').update({ occupied_spots: Math.max(zone.occupied_spots - 1, 0) }).eq('id', zone.id);
    load();
  }

  function elapsed(checkIn: string) {
    const ms = Date.now() - new Date(checkIn).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function estimateCost(session: ParkingSession & { parking_zones: ParkingZone }) {
    const hours = Math.max((Date.now() - new Date(session.check_in).getTime()) / 3600000, 0.5);
    return (hours * session.parking_zones.hourly_rate).toFixed(2);
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Active Sessions</h1>
          <p className="text-gray-500 mt-1">{sessions.length} vehicle{sessions.length !== 1 ? 's' : ''} currently parked</p>
        </div>
        <button onClick={() => { setShowModal(true); setError(''); }} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md shadow-blue-500/20">
          <Plus className="w-4 h-4" /> Check In
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Car className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg">No active parking sessions. Check in a vehicle to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Vehicle', 'Zone', 'Spot', 'Check In', 'Elapsed', 'Est. Cost', 'Action'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sessions.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Car className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{s.vehicle_plate}</p>
                        <p className="text-xs text-gray-400 capitalize">{s.vehicle_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700">{s.parking_zones?.name}</td>
                  <td className="px-5 py-4 text-sm font-mono text-gray-700">{s.spot_number || '-'}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{new Date(s.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-500" />
                      <span className="text-sm font-medium text-teal-600">{elapsed(s.check_in)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-gray-900">৳{estimateCost(s)}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleCheckOut(s)} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all">
                      Check Out
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Check In Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Check In Vehicle</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Plate</label>
                <input type="text" value={form.vehicle_plate} onChange={e => setForm(f => ({ ...f, vehicle_plate: e.target.value.toUpperCase() }))} placeholder="e.g. ABC-1234"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select value={form.vehicle_type} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                    {vehicleTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spot No. (optional)</label>
                  <input type="text" value={form.spot_number} onChange={e => setForm(f => ({ ...f, spot_number: e.target.value }))} placeholder="Auto-assign"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parking Zone</label>
                <select value={form.zone_id} onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                  <option value="">Select a zone</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name} — {z.total_spots - z.occupied_spots} free</option>)}
                </select>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCheckIn} disabled={saving} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {saving ? 'Checking In...' : 'Check In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
