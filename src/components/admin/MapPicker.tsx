import React, { useEffect, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';

declare global {
  interface Window {
    L: any;
  }
}

type Props = {
  latitude: string;
  longitude: string;
  onLocationSelect: (lat: string, lng: string) => void;
  onClose: () => void;
};

export default function MapPicker({ latitude, longitude, onLocationSelect, onClose }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [selectedLat, setSelectedLat] = useState(latitude);
  const [selectedLng, setSelectedLng] = useState(longitude);

  useEffect(() => {
    // Load Leaflet CSS and JS
    if (!document.getElementById('leaflet-picker-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-picker-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('leaflet-picker-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-picker-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setLeafletReady(true);
      document.head.appendChild(script);
    } else if (window.L) {
      setLeafletReady(true);
    }
  }, []);

  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;
    const L = window.L;

    // Default to Dhaka or existing coordinates
    const defaultLat = latitude ? parseFloat(latitude) : 23.815;
    const defaultLng = longitude ? parseFloat(longitude) : 90.4125;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        zoomControl: false,
      }).setView([defaultLat, defaultLng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Add click handler
      map.on('click', (e: any) => {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);
        setSelectedLat(lat);
        setSelectedLng(lng);

        // Move or create marker
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], {
            draggable: true,
          }).addTo(map);

          markerRef.current.on('dragend', (event: any) => {
            const pos = event.target.getLatLng();
            setSelectedLat(pos.lat.toFixed(6));
            setSelectedLng(pos.lng.toFixed(6));
          });
        }
      });

      // Add initial marker if coordinates exist
      if (latitude && longitude) {
        markerRef.current = L.marker([defaultLat, defaultLng], {
          draggable: true,
        }).addTo(map);

        markerRef.current.on('dragend', (event: any) => {
          const pos = event.target.getLatLng();
          setSelectedLat(pos.lat.toFixed(6));
          setSelectedLng(pos.lng.toFixed(6));
        });
      }

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletReady, latitude, longitude]);

  function handleConfirm() {
    onLocationSelect(selectedLat, selectedLng);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">Select Location on Map</h2>
              <p className="text-blue-100 text-sm">Click on the map to set zone location</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map */}
        <div ref={mapRef} className="w-full h-[400px]" style={{ zIndex: 0 }} />

        {/* Coordinates Display */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Latitude</label>
                <p className="font-mono font-bold text-gray-900">{selectedLat || '—'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Longitude</label>
                <p className="font-mono font-bold text-gray-900">{selectedLng || '—'}</p>
              </div>
            </div>
            <button
              onClick={handleConfirm}
              disabled={!selectedLat || !selectedLng}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
                !selectedLat || !selectedLng
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20'
              }`}
            >
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
