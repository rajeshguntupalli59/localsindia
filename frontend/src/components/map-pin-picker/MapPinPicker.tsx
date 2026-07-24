'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L, { type LatLngExpression } from 'leaflet';
import { motion } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Leaflet's default marker icon references relative image paths that break
// under bundlers — re-point them at the CDN copy explicitly.
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DEFAULT_CENTER: [number, number] = [20.5, 78.9]; // India-wide fallback, low zoom

function DraggableMarker({
  position,
  onMove,
}: {
  position: [number, number];
  onMove: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      onMove([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <Marker
      position={position as LatLngExpression}
      draggable
      icon={markerIcon}
      eventHandlers={{
        dragend: (e) => {
          const pos = e.target.getLatLng();
          onMove([pos.lat, pos.lng]);
        },
      }}
    />
  );
}

interface Props {
  initialCenter?: { lat: number; lng: number };
  onClose: () => void;
  onConfirm: (pos: { latitude: number; longitude: number }) => void;
}

export default function MapPinPicker({ initialCenter, onClose, onConfirm }: Props) {
  const [position, setPosition] = useState<[number, number]>(
    initialCenter ? [initialCenter.lat, initialCenter.lng] : DEFAULT_CENTER
  );

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Drop a pin at your exact location"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-4 top-[8%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[560px]
          z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" style={{ color: 'var(--li-primary)' }} />
            <span className="text-sm font-bold text-slate-800">Drop a pin at your exact location</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-[360px] shrink-0">
          <MapContainer
            center={position}
            zoom={initialCenter ? 15 : 5}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <DraggableMarker position={position} onMove={setPosition} />
          </MapContainer>
        </div>

        <p className="px-4 py-2 text-xs text-slate-400 shrink-0">
          Drag the pin or tap the map to set your exact spot.
        </p>

        <div className="p-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => onConfirm({ latitude: position[0], longitude: position[1] })}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--li-primary)' }}
          >
            Use this location
          </button>
        </div>
      </motion.div>
    </>
  );
}
