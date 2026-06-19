import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Car, Clock, X } from 'lucide-react';
import { supabase, ParkingZone } from '../../lib/supabase';
import BookingModal from '../../components/customer/BookingModal';

declare global {
  interface Window {
    L: any;
  }
}

export default function ParkingMap({ onSessionBooked }: { onSessionBooked?: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [leafletReady, setLeafletReady] = useState(false);
  const [selected, setSelected] = useState<ParkingZone | null>(null);
  const [sidebarZone, setSidebarZone] = useState<ParkingZone | null>(null);

  useEffect(() => {
    // Load Leaflet CSS and JS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setLeafletReady(true);
      document.head.appendChild(script);
    } else if (window.L) {
      setLeafletReady(true);
    }

    loadZones();
  }, []);

  async function loadZones() {
    const { data } = await supabase.from('parking_zones').select('*').order('name');
    setZones(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!leafletReady || !mapRef.current || zones.length === 0) return;
    const L = window.L;

    if (!mapInstanceRef.current) {
      const defaultLat = zones.find(z => z.latitude)?.latitude ?? 23.815;
      const defaultLng = zones.find(z => z.longitude)?.longitude ?? 90.4125;
      const map = L.map(mapRef.current).setView([defaultLat, defaultLng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    // Clear and re-add markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    zones.forEach(zone => {
      if (!zone.latitude || !zone.longitude) return;

      const free = zone.total_spots - zone.occupied_spots;
      const pct = zone.total_spots > 0 ? (zone.occupied_spots / zone.total_spots) * 100 : 0;

      let color = '#3b82f6'; // blue
      let statusText = 'Available';
      if (zone.status !== 'active') {
        color = '#f59e0b'; // amber/maintenance
        statusText = 'Maintenance';
      } else if (free === 0) {
        color = '#ef4444'; // red
        statusText = 'Full';
      } else if (pct > 80) {
        color = '#f59e0b'; // amber
        statusText = 'Limited';
      }

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:44px;height:44px;cursor:pointer">
            <div style="width:44px;height:44px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
              <span style="transform:rotate(45deg);color:white;font-size:13px;font-weight:bold">${zone.status === 'active' ? free : '!'}</span>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 44],
      });

      const marker = L.marker([zone.latitude, zone.longitude], { icon })
        .addTo(mapInstanceRef.current)
        .on('click', () => setSidebarZone(zone));

      // Add popup on hover
      marker.bindPopup(`
        <div style="font-family:system-ui;padding:8px;min-width:150px">
          <strong style="font-size:14px">${zone.name}</strong><br/>
          <span style="color:#666;font-size:12px">${zone.location}</span><br/>
          <div style="margin-top:6px;display:flex;justify-content:space-between;font-size:12px">
            <span>Available: </span>
            <strong style="color:${free > 0 ? '#10b981' : '#ef4444'}">${free} spots</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px">
            <span>Rate: </span>
            <strong>৳${zone.hourly_rate}/hr</strong>
          </div>
        </div>
      `);

      markersRef.current.push(marker);
    });
  }, [leafletReady, zones]);

  const freeSpots = (z: ParkingZone) => z.total_spots - z.occupied_spots;
  const statusColor: Record<string, string> = { active: 'bg-teal-100 text-teal-700', maintenance: 'bg-amber-100 text-amber-700', closed: 'bg-gray-100 text-gray-600' };

  function handleBookingSuccess() {
    setSelected(null);
    setSidebarZone(null);
    onSessionBooked?.();
    loadZones();
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full min-h-[500px]" style={{ zIndex: 0 }} />

        {/* Map Legend */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg z-[1000]">
          <p className="text-xs font-semibold text-gray-700 mb-2">Available Spots</p>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600">Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-gray-600">Limited</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600">Full</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 bg-blue-500/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg z-[1000]">
          <p className="text-white text-sm font-medium">Click on a marker to select a zone and book</p>
        </div>
      </div>

      {/* Sidebar with zone info */}
      {sidebarZone && (
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{sidebarZone.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-200" />
                  <span className="text-sm text-blue-100">{sidebarZone.location}</span>
                </div>
              </div>
              <button
                onClick={() => setSidebarZone(null)}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 flex-1">
            {/* Status Badge */}
            <div className="mb-4">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor[sidebarZone.status]}`}>
                {sidebarZone.status.toUpperCase()}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <Car className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-blue-600">{freeSpots(sidebarZone)}</p>
                <p className="text-xs text-gray-500">Free Spots</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <Clock className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-600">৳{sidebarZone.hourly_rate}</p>
                <p className="text-xs text-gray-500">Per Hour</p>
              </div>
            </div>

            {/* Occupancy */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Occupancy</span>
                <span className="font-medium text-gray-700">
                  {sidebarZone.occupied_spots}/{sidebarZone.total_spots}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    freeSpots(sidebarZone) === 0 ? 'bg-red-400' :
                    sidebarZone.occupied_spots / sidebarZone.total_spots > 0.8 ? 'bg-amber-400' : 'bg-blue-500'
                  }`}
                  style={{ width: `${(sidebarZone.occupied_spots / sidebarZone.total_spots) * 100}%` }}
                />
              </div>
            </div>

            {/* Details */}
            <div className="text-sm text-gray-600 space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Total Spots</span>
                <span className="font-medium text-gray-900">{sidebarZone.total_spots}</span>
              </div>
              <div className="flex justify-between">
                <span>Type</span>
                <span className="font-medium text-gray-900 capitalize">{sidebarZone.zone_type.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Book Button */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => setSelected(sidebarZone)}
              disabled={freeSpots(sidebarZone) === 0 || sidebarZone.status !== 'active'}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                freeSpots(sidebarZone) === 0 || sidebarZone.status !== 'active'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg shadow-pink-500/20'
              }`}
            >
              {sidebarZone.status !== 'active' ? 'Not Available' : freeSpots(sidebarZone) === 0 ? 'Zone Full' : 'Book This Spot'}
            </button>
          </div>
        </div>
      )}

      {/* Zone List */}
      {!sidebarZone && (
        <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 bg-white">
            <h3 className="font-bold text-gray-900">Nearby Parking Zones</h3>
            <p className="text-xs text-gray-500 mt-0.5">Click on a zone or map marker to see details</p>
          </div>
          <div className="p-2">
            {zones.map(zone => (
              <button
                key={zone.id}
                onClick={() => {
                  setSidebarZone(zone);
                  if (zone.latitude && zone.longitude && mapInstanceRef.current) {
                    mapInstanceRef.current.setView([zone.latitude, zone.longitude], 15);
                  }
                }}
                className="w-full text-left p-3 rounded-xl hover:bg-white transition-colors mb-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{zone.name}</p>
                    <p className="text-xs text-gray-400 truncate">{zone.location}</p>
                  </div>
                  <div className="ml-3 text-right">
                    <p className={`text-sm font-bold ${
                      zone.status !== 'active' ? 'text-amber-500' :
                      freeSpots(zone) > 0 ? 'text-blue-600' : 'text-red-500'
                    }`}>
                      {zone.status !== 'active' ? 'Maintenance' : freeSpots(zone)}
                    </p>
                    <p className="text-xs text-gray-400">{zone.status === 'active' ? 'spots' : ''}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
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
