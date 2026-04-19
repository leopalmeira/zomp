import React, { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './AuthMapBg.css'

// Autopan Feature
function MapPanLoop() {
  const map = useMap();
  useEffect(() => {
    const interval = setInterval(() => {
      map.panBy([0.3, 0.3], { animate: false });
    }, 50);
    return () => clearInterval(interval);
  }, [map]);
  return null;
}

export default function AuthMapBg() {
  return (
    <div className="svg-map-container">
      
      {/* 1. REAL DARK TILE MAP */}
      <MapContainer 
        center={[-23.5505, -46.6333]} // Foco em São Paulo metrópole
        zoom={14} 
        zoomControl={false} 
        scrollWheelZoom={false} 
        dragging={false}
        doubleClickZoom={false}
        style={{ width: '100%', height: '100%', position: 'absolute', zIndex: 0, background: '#0c0f14' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          opacity={0.8}
        />
        <MapPanLoop />
      </MapContainer>

      {/* 2. ANIMATED GLOWING DOTS OVERLAY */}
      <svg 
        viewBox="0 0 400 800" 
        preserveAspectRatio="xMidYMax slice" 
        xmlns="http://www.w3.org/2000/svg"
        style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1}}
      >
        <defs>
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Traffic Dots ONLY - Simulating real street paths */}
        <g>
          {/* Grid Path A: West-East Main Ave */}
          <circle r="3.5" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="25s" repeatCount="indefinite" path="M-20,400 L180,400 L180,480 L420,480" />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="25s" repeatCount="indefinite" />
          </circle>

          {/* Grid Path B: South-North side street */}
          <circle r="3" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="18s" repeatCount="indefinite" path="M100,820 L100,500 L80,480 L80,200" />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="18s" repeatCount="indefinite" />
          </circle>

          {/* Grid Path C: Diagonal shortcut */}
          <circle r="3.2" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="30s" repeatCount="indefinite" path="M350,820 L150,620 L150,400 L250,300" />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="30s" repeatCount="indefinite" />
          </circle>

          {/* Grid Path D: Perimeter road */}
          <circle r="3.5" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="22s" repeatCount="indefinite" path="M420,700 L250,700 L200,650 L200,350 L-20,350" />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="22s" repeatCount="indefinite" />
          </circle>

          {/* Grid Path E: Random center turn */}
          <circle r="3" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="20s" repeatCount="indefinite" path="M-20,550 L120,550 L120,650 L350,650" />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="20s" repeatCount="indefinite" />
          </circle>
          
          {/* More fast "cars" */}
          <circle r="2.8" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="12s" begin="5s" repeatCount="indefinite" path="M180,820 L180,400 L-20,400" />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="12s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>
    </div>
  )
}
