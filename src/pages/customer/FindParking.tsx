import React, { useEffect, useState } from 'react';
import { MapPin, DollarSign, Search, Car } from 'lucide-react';
import { supabase, ParkingZone } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BookingModal from '../../components/customer/BookingModal';

const typeLabel: Record<string, string> = { covered: 'Covered', rooftop: 'Rooftop', underground: 'Underground', open_air: 'Open Air' };
const statusColor: Record<string, string> = { active: 'bg-teal-100 text-teal-700', maintenance: 'bg-amber-100 text-amber-700', closed: 'bg-gray-100 text-gray-600' };

export default function FindParking({ onSessionBooked }: { onSessionBooked?: () => void }) {
  const { user } = useAuth();
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ParkingZone | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('parking_zones').select('*').order('name');
      setZones(data ?? []);
      setLoading(false);
    }
    load();
    const ch = supabase.channel('find_parking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_zones' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = zones.filter(z =>
    z.name.toLowerCase().includes(search.toLowerCase()) ||
    z.location.toLowerCase().includes(search.toLowerCase())
  );

  const occupancyPct = (z: ParkingZone) => z.total_spots > 0 ? Math.round((z.occupied_spots / z.total_spots) * 100) : 0;
  const freeSpots = (z: ParkingZone) => z.total_spots - z.occupied_spots;

  function handleBookingSuccess() {
    setSelected(null);
    onSessionBooked?.();
    async function reload() {
      const { data } = await supabase.from('parking_zones').select('*').order('name');
      setZones(data ?? []);
    }
    reload();
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading parking zones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Find Parking</h1>
        <p className="text-gray-500 mt-1">Browse available parking zones and book your spot with bKash payment</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search zones by name or location..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No parking zones found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(zone => {
            const pct = occupancyPct(zone);
            const free = freeSpots(zone);
            const isFull = zone.status !== 'active' || free === 0;
            return (
              <div
                key={zone.id}
                className={`bg-white rounded-2xl p-6 shadow-sm border transition-all ${
                  isFull ? 'border-gray-100 opacity-75' : 'border-gray-100 hover:border-blue-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{zone.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-400">{zone.location}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${statusColor[zone.status]}`}>
                    {zone.status}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">Occupancy</span>
                    <span className="text-sm font-semibold text-gray-900">{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct > 80 ? 'bg-red-400' : pct > 50 ? 'bg-amber-400' : 'bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-base font-bold text-gray-900">৳{zone.hourly_rate}/hr</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${free > 0 ? 'text-teal-600' : 'text-red-500'}`}>
                      {free}
                    </span>
                    <span className="text-sm text-gray-400"> spots free</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                  <span>{typeLabel[zone.zone_type]}</span>
                  <span>{zone.total_spots} total spots</span>
                </div>

                <button
                  onClick={() => { if (!isFull) setSelected(zone); }}
                  disabled={isFull}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isFull
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md shadow-blue-500/20'
                  }`}
                >
                  {zone.status === 'maintenance' ? 'Under Maintenance' : free === 0 ? 'Zone Full' : 'Book a Spot'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Modal */}
      {selected && (
        <BookingModal
          zone={selected}
          onClose={() => setSelected(null)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
