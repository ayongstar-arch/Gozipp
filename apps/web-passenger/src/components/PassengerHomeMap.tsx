'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface PassengerHomeMapProps {
  center: { lat: number; lng: number };
  triggerRecenter?: number;
}

// Controller to smoothly pan map when GPS coordinates update or recenter is clicked
const MapController: React.FC<{ center: [number, number]; triggerRecenter?: number }> = ({
  center,
  triggerRecenter,
}) => {
  const map = useMap();
  const prevCenterRef = useRef<[number, number]>(center);

  useEffect(() => {
    const [lat, lng] = center;
    const [prevLat, prevLng] = prevCenterRef.current;
    const hasMoved = Math.abs(lat - prevLat) > 0.0001 || Math.abs(lng - prevLng) > 0.0001;

    if (hasMoved || (triggerRecenter && triggerRecenter > 0)) {
      map.flyTo([lat, lng], 16, { duration: 1.2 });
      prevCenterRef.current = [lat, lng];
    }
  }, [center, triggerRecenter, map]);

  return null;
};

// Custom DivIcon for User Location with pulsing radar rings & "คุณอยู่ที่นี่" tooltip
const createUserIcon = () => {
  return L.divIcon({
    className: 'gozipp-user-marker',
    iconSize: [60, 60],
    iconAnchor: [30, 30],
    html: `
      <div style="position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;">
        <!-- Tooltip Badge -->
        <div style="position: absolute; bottom: 44px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; pointer-events: none; z-index: 50;">
          <div style="background: #0088ff; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; box-shadow: 0 4px 14px rgba(0,136,255,0.45); white-space: nowrap; font-family: inherit; letter-spacing: -0.2px;">
            คุณอยู่ที่นี่
          </div>
          <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #0088ff; margin-top: -1px;"></div>
        </div>
        <!-- Outer Pulse Radar Ring -->
        <div style="position: absolute; width: 64px; height: 64px; border-radius: 50%; background: rgba(0, 136, 255, 0.16); border: 1.5px solid rgba(0, 136, 255, 0.45); animation: userRadarPulse 2.4s ease-out infinite;"></div>
        <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(0, 136, 255, 0.25); border: 1px solid rgba(0, 136, 255, 0.6);"></div>
        <!-- Center Dot -->
        <div style="position: relative; z-index: 10; width: 18px; height: 18px; border-radius: 50%; background: #ffffff; border: 4px solid #0088ff; box-shadow: 0 0 16px rgba(0,136,255,0.9);"></div>
      </div>
    `,
  });
};

// Custom DivIcon for Motorbike Driver with Distance Tag
const createDriverIcon = (distanceText: string) => {
  return L.divIcon({
    className: 'gozipp-driver-marker',
    iconSize: [85, 36],
    iconAnchor: [18, 18],
    html: `
      <div style="display: flex; align-items: center; pointer-events: auto;">
        <!-- Emerald Motorcycle Circle Pin -->
        <div style="width: 36px; height: 36px; border-radius: 50%; background: #00d075; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0, 208, 117, 0.45); border: 2.5px solid #07151e; flex-shrink: 0; transform: scale(1); transition: transform 0.2s;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18.5" cy="17.5" r="3.5"/>
            <circle cx="5.5" cy="17.5" r="3.5"/>
            <circle cx="15" cy="5" r="1"/>
            <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
          </svg>
        </div>
        <!-- Distance Tag Pill -->
        <div style="margin-left: -4px; background: #00d075; color: #041a12; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 9999px; box-shadow: 0 2px 8px rgba(0,0,0,0.35); white-space: nowrap; border: 1.5px solid #07151e; font-family: inherit;">
          ${distanceText}
        </div>
      </div>
    `,
  });
};

export default function PassengerHomeMap({ center, triggerRecenter }: PassengerHomeMapProps) {
  const userIcon = useMemo(() => createUserIcon(), []);

  // 4 Nearby Win Drivers dynamically clustered around user's current GPS coordinates
  const drivers = useMemo(
    () => [
      {
        id: 'driver-1',
        lat: center.lat + 0.0035,
        lng: center.lng - 0.003,
        distance: '1.2 กม.',
      },
      {
        id: 'driver-2',
        lat: center.lat + 0.0022,
        lng: center.lng + 0.0028,
        distance: '850 ม.',
      },
      {
        id: 'driver-3',
        lat: center.lat - 0.0016,
        lng: center.lng + 0.0038,
        distance: '600 ม.',
      },
      {
        id: 'driver-4',
        lat: center.lat - 0.0038,
        lng: center.lng - 0.0032,
        distance: '1.5 กม.',
      },
    ],
    [center.lat, center.lng]
  );

  return (
    <div className="w-full h-full relative bg-[#1c1d1e] overflow-hidden">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={15}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
        style={{ width: '100%', height: '100%', background: '#1c1d1e' }}
      >
        <MapController center={[center.lat, center.lng]} triggerRecenter={triggerRecenter} />

        {/* ESRI World Dark Gray Canvas: High-speed, 100% Free, ZERO Watermark */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />

        {/* Center User Location Marker with radar & tooltip */}
        <Marker position={[center.lat, center.lng]} icon={userIcon} />

        {/* Nearby Drivers with distance badges */}
        {drivers.map((d) => (
          <Marker
            key={d.id}
            position={[d.lat, d.lng]}
            icon={createDriverIcon(d.distance)}
          />
        ))}
      </MapContainer>

      {/* Global CSS for animation */}
      <style jsx global>{`
        @keyframes userRadarPulse {
          0% {
            transform: scale(0.85);
            opacity: 0.9;
          }
          70% {
            transform: scale(1.55);
            opacity: 0;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        .leaflet-container {
          background-color: #1c1d1e !important;
          outline: none;
        }
      `}</style>
    </div>
  );
}
