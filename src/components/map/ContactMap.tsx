'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function ContactMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Sede ATFAR Rosario: Corrientes 1572
    const officeCoord: [number, number] = [-32.949705, -60.655938];

    // Initialize map
    leafletMap.current = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: false, // disable scrolling for ease of reading contact page
    }).setView(officeCoord, 16);

    // Tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(leafletMap.current);

    // Custom Icon
    const officeIcon = L.divIcon({
      html: `<div style="background-color: #0d5c3e; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">A</div>`,
      className: 'custom-contact-icon',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    // Add marker
    const marker = L.marker(officeCoord, { icon: officeIcon }).addTo(leafletMap.current);
    
    marker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
        <strong style="font-size: 13px; color: #0d5c3e; display: block;">ATFAR Sede Central</strong>
        <span style="display: block; color: #64748b;">Calle Corrientes 1572, Rosario</span>
        <span style="display: block; color: #64748b; font-weight: 500; margin-top: 4px;">Atención: Lun a Vie 08 - 16 hs</span>
      </div>
    `).openPopup();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  return <div ref={mapRef} className="w-full h-full z-10" />;
}
