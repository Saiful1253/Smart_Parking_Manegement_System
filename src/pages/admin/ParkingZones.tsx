import React, { useEffect, useState } from 'react';
import { Plus, MapPin, Pencil, Trash2, X, DollarSign } from 'lucide-react';
import { supabase, ParkingZone } from '../../lib/supabase';

const zoneTypes = ['covered', 'rooftop', 'underground', 'open_air'] as const;
const statusOptions = ['active', 'maintenance', 'closed'] as const;

const typeLabel: Record<string, string> = { covered: 'Covered', rooftop: 'Rooftop', underground: 'Underground', open_air: 'Open Air' };
const statusColor: Record<string, string> = { active: 'bg-teal-100 text-teal-700', maintenance: 'bg-amber-100 text-amber-700', closed: 'bg-red-100 text-red-700' };

type FormData = {
  name: string;
  location: string;
  total_spots: number;
  occupied_spots: number;
  hourly_rate: number;
  zone_type: typeof zoneTypes[number];
  status: typeof statusOptions[number];
  latitude: string;
  longitude: string;
};

const defaultForm: FormData = {
  name: '', location: '', total_spots: 50, occupied_spots: 0, hourly_rate: 2.00,
  zone_type: 'covered', status: 'active', latitude: '', longitude: '',
};

export default function ParkingZones() {
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ParkingZone | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const { data } = await supabase.from('parking_zones').select('*').order('name');
    setZones(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel('zones').on('postgres_changes', { event: '*', schema: 'public', table: 'parking_zones' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(defaultForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(zone: ParkingZone) {
    setEditing(zone);
    setForm({
      name: zone.name, location: zone.location, total_spots: zone.total_spots,
      occupied_spots: zone.occupied_spots, hourly_rate: zone.hourly_rate,
      zone_type: zone.zone_type, status: zone.status,
      latitude: zone.latitude != null ? String(zone.latitude) : '',
      longitude: zone.longitude != null ? String(zone.longitude) : '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Zone name is required'); return; }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name, location: form.location,
      total_spots: Number(form.total_spots), occupied_spots: Number(form.occupied_spots),
      hourly_rate: Number(form.hourly_rate), zone_type: form.zone_type, status: form.status,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    };
    let err;
    if (editing) {
      ({ error: err } = await supabase.from('parking_zones').update(payload).eq('id', editing.id));
    } else {
      ({ error: err } = await supabase.from('parking_zones').insert(payload));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowModal(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this zone? All sessions for this zone will also be removed.')) return;
    await supabase.from('parking_zones').delete().eq('id', id);
    load();
  }

  const occupancyPct = (z: ParkingZone) => z.total_spots > 0 ? Math.round((z.occupied_spots / z.total_spots) * 100) : 0;

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parking Zones</h1>
          <p className="text-gray-500 mt-1">Manage your parking areas and capacity</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md shadow-blue-500/20">
          <Plus className="w-4 h-4" /> Add Zone
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {zones.map(zone => {
          const pct = occupancyPct(zone);
          const free = zone.total_spots - zone.occupied_spots;
          return (
            <div key={zone.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{zone.name}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm text-gray-400">{zone.location}</span>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${statusColor[zone.status]}`}>
                  {zone.status}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-500">Occupancy</span>
                  <span className="text-sm font-semibold text-gray-900">{pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-400' : pct > 50 ? 'bg-amber-400' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[['TOTAL', zone.total_spots, 'text-gray-900'], ['OCCUPIED', zone.occupied_spots, 'text-blue-500'], ['FREE', free, 'text-teal-500']].map(([label, val, cls]) => (
                  <div key={String(label)} className="text-center bg-gray-50 rounded-xl py-2">
                    <p className={`text-xl font-bold ${cls}`}>{val}</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">৳{zone.hourly_rate}/hr</span>
                  <span className="text-xs text-gray-400 ml-1">{typeLabel[zone.zone_type]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(zone)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(zone.id)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">{editing ? 'Edit Zone' : 'Add Zone'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {([['name', 'Zone Name', 'text', 'e.g. Zone A'], ['location', 'Location', 'text', 'e.g. Ground Floor']] as const).map(([field, label, type, ph]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={ph}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                {([['total_spots', 'Total Spots', 1], ['occupied_spots', 'Occupied', 0], ['hourly_rate', 'Hourly Rate (৳)', 0.01]] as const).map(([f, l, step]) => (
                  <div key={f}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{l}</label>
                    <input type="number" step={step} min={0} value={(form as any)[f]} onChange={e => setForm(frm => ({ ...frm, [f]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zone Type</label>
                  <select value={form.zone_type} onChange={e => setForm(f => ({ ...f, zone_type: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                    {zoneTypes.map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                    {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input type="number" step="any" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="23.8103"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input type="number" step="any" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="90.4125"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Zone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
