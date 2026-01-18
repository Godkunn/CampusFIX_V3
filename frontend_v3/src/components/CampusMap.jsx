import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- FIX LEAFLET ICON BUG ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// NIT Agartala Coordinates
const ARYABHATTA_COORDS = [23.8436, 91.4217]; 

export default function CampusMap({ role, issueCount }) {
  return (
    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', height: '350px', width: '100%', borderRadius: '20px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
      
      {/* Header */}
      <div style={{ padding: '15px', background: 'white', borderBottom: '1px solid #e2e8f0', zIndex: 10, position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem' }}>
            🗺️ Live Campus Map
        </h3>
        {role !== 'student' && (
            <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                {issueCount} Pending Issues
            </span>
        )}
      </div>

      <MapContainer 
        center={ARYABHATTA_COORDS} 
        zoom={16} 
        scrollWheelZoom={false} 
        style={{ height: "100%", width: "100%", zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={ARYABHATTA_COORDS}>
          <Popup>
            <div style={{ textAlign: 'center' }}>
                <strong>NIT Agartala</strong><br />
                Aryabhatta Hostel
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}