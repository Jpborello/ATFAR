'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  registered: boolean;
  hasDebt?: boolean;
}

interface PharmacyMapProps {
  pharmacies: Pharmacy[];
  selectedPharmacyId: string | null;
  onMapClick: (lat: number, lng: number) => void;
  onSelectPharmacy: (id: string) => void;
}

export default function PharmacyMap({
  pharmacies,
  selectedPharmacyId,
  onMapClick,
  onSelectPharmacy,
}: PharmacyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapRef.current) return;

    // Centered in Rosario, Argentina
    const rosarioCenter: [number, number] = [-32.9511, -60.6663];

    // Initialize leaflet map
    leafletMap.current = L.map(mapRef.current).setView(rosarioCenter, 13);

    // Add Google Maps road map tile layer
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps',
    }).addTo(leafletMap.current);

    // Map click event
    leafletMap.current.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Update Markers when pharmacies change
  useEffect(() => {
    if (!leafletMap.current) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((marker) => {
      leafletMap.current?.removeLayer(marker);
    });
    markersRef.current = {};

    // Custom SVG Icons
    const createCustomIcon = (color: string) => {
      return L.divIcon({
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">F</div>`,
        className: 'custom-map-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
    };

    const registeredCleanIcon = createCustomIcon('#10b981'); // Green for registered & al dia
    const registeredDebtIcon = createCustomIcon('#ef4444');  // Red for registered & con deuda
    const unregisteredIcon = createCustomIcon('#8b5cf6');      // Purple for unregistered

    pharmacies.forEach((pharmacy) => {
      let icon = unregisteredIcon;
      if (pharmacy.registered) {
        icon = pharmacy.hasDebt ? registeredDebtIcon : registeredCleanIcon;
      }

      const marker = L.marker([pharmacy.lat, pharmacy.lng], {
        icon: icon,
      });

      marker.addTo(leafletMap.current!);
      
      const badgeColor = !pharmacy.registered ? '#8b5cf6' : (pharmacy.hasDebt ? '#ef4444' : '#10b981');
      const badgeText = !pharmacy.registered ? 'No Registrada' : (pharmacy.hasDebt ? 'Con Deuda' : 'Al Día');

      // Popup with basic details
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4;">
          <strong style="display: block; font-size: 14px;">${pharmacy.name}</strong>
          <span style="color: #64748b; display: block; margin-bottom: 6px;">${pharmacy.address}</span>
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; color: white; background-color: ${badgeColor};">${badgeText}</span>
        </div>
      `);

      marker.on('click', () => {
        onSelectPharmacy(pharmacy.id);
      });

      markersRef.current[pharmacy.id] = marker;
    });
  }, [pharmacies]);

  // Center map on selected pharmacy
  useEffect(() => {
    if (!leafletMap.current || !selectedPharmacyId) return;

    const selectedMarker = markersRef.current[selectedPharmacyId];
    if (selectedMarker) {
      const latLng = selectedMarker.getLatLng();
      leafletMap.current.setView(latLng, 15);
      selectedMarker.openPopup();
    }
  }, [selectedPharmacyId]);

  return (
    <div className="relative w-full h-[450px] rounded-2xl overflow-hidden border border-border shadow-inner">
      <div ref={mapRef} className="w-full h-full z-10" />
      <div className="absolute bottom-4 left-4 z-20 bg-card/95 backdrop-blur border border-border px-3.5 py-2.5 rounded-xl shadow-md text-xs space-y-1.5 glass">
        <div className="font-semibold text-foreground">Referencias de Control:</div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-white" />
          <span className="text-muted-foreground font-medium">Registrada (Al Día)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-red-500 border border-white" />
          <span className="text-muted-foreground font-medium">Registrada (Con Deuda)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-violet-500 border border-white" />
          <span className="text-muted-foreground font-medium">No Registrada / Alerta</span>
        </div>
        <div className="text-[10px] text-muted-foreground/80 pt-1">
          * Hacé clic en cualquier punto del mapa para geolocalizar una alerta.
        </div>
      </div>
    </div>
  );
}
