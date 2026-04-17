import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, getCurrentUser } from '../services/api'
import { MapContainer, TileLayer, useMap, Marker, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './Passenger.css'

const createIcon = (color) => L.divIcon({
  className: 'custom-pin-icon',
  html: `<div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 4px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
})
const originIcon = createIcon('#00E676')
const destIcon = createIcon('#EF4444')

function MapController({ center, markers }) {
  const map = useMap()
  useEffect(() => {
    if (markers?.length === 2 && markers[0] && markers[1]) {
      const bounds = L.latLngBounds([markers[0], markers[1]])
      map.flyToBounds(bounds, { padding: [80, 80], animate: true })
    } else if (center) {
      map.flyTo(center, 16)
    }
  }, [center, markers, map])
  return null
}

export default function PassengerDashboard() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  
  const [mapCenter, setMapCenter] = useState([-22.9068, -43.1729])
  const [origin, setOrigin] = useState({ address: 'Meu Local Atual (GPS)', coords: null })
  const [destination, setDestination] = useState({ address: '', coords: null })
  
  const [suggestions, setSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [routeGeometry, setRouteGeometry] = useState([])
  const [routeParams, setRouteParams] = useState({ km: 0, total: 0 })
  const [rideState, setRideState] = useState('IDLE')
  
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [prioritizeFavs, setPrioritizeFavs] = useState(true)
  const [matchedDriver, setMatchedDriver] = useState(null)
  
  const favoriteDrivers = [
    { id: 1, name: 'Carlos', car: 'Chevrolet Onix', plate: 'BRA-2031', rating: '4.9', img: 'https://i.pravatar.cc/150?img=11' },
    { id: 2, name: 'Ana', car: 'Hyundai HB20', plate: 'XPT-9988', rating: '5.0', img: 'https://i.pravatar.cc/150?img=5' }
  ]

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const c = [pos.coords.latitude, pos.coords.longitude]
        setMapCenter(c)
        setOrigin({ address: 'Meu Local Atual (GPS)', coords: c })
      })
    }
  }, [])

  const fetchRoadRoute = async (o, d) => {
    try {
      setIsSearching(true)
      // OSM Routing
      const url = `https://router.project-osrm.org/route/v1/driving/${o[1]},${o[0]};${d[1]},${d[0]}?overview=full&geometries=geojson`
      const res = await fetch(url)
      const data = await res.json()
      if (data.routes?.[0]) {
        const r = data.routes[0]
        const km = (r.distance / 1000).toFixed(1)
        setRouteGeometry(r.geometry.coordinates.map(c => [c[1], c[0]]))
        setRouteParams({ km, total: (km * 2).toFixed(2) })
        setRideState('PRICED')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = async (val, type) => {
    if (val.length < 3) return
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=br&limit=5`)
      const d = await resp.json()
      setSuggestions(d.map(item => ({ ...item, targetType: type })))
    } catch (e) { console.error(e) }
  }

  const selectSuggestion = (s) => {
    const coords = [parseFloat(s.lat), parseFloat(s.lon)]
    const addr = s.display_name.split(',')[0]
    if (s.targetType === 'origin') {
      setOrigin({ address: addr, coords })
      setMapCenter(coords)
    } else {
      setDestination({ address: addr, coords })
    }
    setSuggestions([])
    // If we have both, trigger route
    const otherCoords = s.targetType === 'origin' ? destination.coords : origin.coords
    if (otherCoords) fetchRoadRoute(s.targetType === 'origin' ? coords : otherCoords, s.targetType === 'origin' ? otherCoords : coords)
  }

  const forceCalculate = async () => {
    setIsSearching(true)
    const resolve = async (addr) => {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&countrycodes=br&limit=1`)
      const d = await r.json()
      return d?.[0] ? [parseFloat(d[0].lat), parseFloat(d[0].lon)] : null
    }
    const oCoords = origin.coords || await resolve(origin.address)
    const dCoords = destination.coords || await resolve(destination.address)
    
    if (oCoords && dCoords) {
      setOrigin(prev => ({ ...prev, coords: oCoords }))
      setDestination(prev => ({ ...prev, coords: dCoords }))
      fetchRoadRoute(oCoords, dCoords)
    } else {
      alert("Não foi possível encontrar um dos endereços. Tente ser mais específico.")
    }
    setIsSearching(false)
  }

  const resetFlow = () => {
    setDestination({ address: '', coords: null })
    setRouteGeometry([])
    setRideState('IDLE')
    setIsSheetCollapsed(false)
  }

  return (
    <div className="passenger-app">
      <div className="passenger-map-bg">
        <MapContainer center={mapCenter} zoom={16} zoomControl={false} style={{width:'100%', height:'100%'}}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapController center={mapCenter} markers={origin.coords && destination.coords ? [origin.coords, destination.coords] : null} />
          {origin.coords && <Marker position={origin.coords} icon={originIcon} />}
          {destination.coords && < Marker position={destination.coords} icon={destIcon} />}
          {routeGeometry.length > 0 && <Polyline positions={routeGeometry} color="#000" weight={6} opacity={0.8} />}
        </MapContainer>
      </div>

      <div className="passenger-top-header">
        <div className="menu-btn" onClick={() => setIsMenuOpen(true)}>☰</div>
      </div>

      <div className={`passenger-bottom-sheet ${isSheetCollapsed ? 'collapsed' : ''}`}>
        <div className="sheet-drag-area" onClick={() => setIsSheetCollapsed(!isSheetCollapsed)}><div className="sheet-handle"></div></div>
        
        <div className="sheet-content-wrapper">
          {rideState === 'IDLE' && (
            <div className="state-idle animate-fade-in">
              <h2 className="sheet-title">Para onde vamos?</h2>
              <div className="route-inputs" style={{position:'relative'}}>
                <div className="route-timeline"><div className="dot-start"></div><div className="timeline-line"></div><div className="dot-end"></div></div>
                <div className="route-fields">
                  <input className="route-input" value={origin.address} onChange={e=>{setOrigin({...origin, address: e.target.value}); handleSearch(e.target.value,'origin')}} placeholder="Origem" />
                  <input className="route-input" value={destination.address} onChange={e=>{setDestination({...destination, address: e.target.value}); handleSearch(e.target.value,'dest')}} placeholder="Para onde?" />
                </div>
                {suggestions.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {suggestions.map((s,i) => <div key={i} className="suggestion-item" onClick={()=>selectSuggestion(s)}>{s.display_name.split(',').slice(0,2).join(',')}</div>)}
                  </div>
                )}
              </div>
              
              <button 
                className={`btn btn-primary w-full mt-4 font-bold ${isSearching ? 'opacity-50' : ''}`} 
                onClick={forceCalculate} 
                disabled={isSearching || origin.address.length < 5 || destination.address.length < 5}
              >
                {isSearching ? 'BUSCANDO ROTA...' : 'VER PREÇO E OPÇÕES'}
              </button>

              <div className="favorites-section mt-6">
                <div className="section-header"><h3>Motoristas Favoritos</h3><span className="badge-nearby">PRIORIDADE</span></div>
                <div className="favorites-scroll">
                  {favoriteDrivers.map(d => (
                    <div key={d.id} className="fav-driver-card">
                      <img src={d.img} className="fav-img" alt={d.name} />
                      <div className="fav-info"><span className="fav-name">{d.name}</span><span className="fav-dist">Até 10min</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {rideState === 'PRICED' && (
            <div className="state-priced animate-fade-in-up">
              <h2 className="sheet-title">Resumo</h2>
              <div className="price-box mb-4">
                 <div className="flex flex-col">
                    <span className="text-3xl font-black text-emerald-800">R$ {routeParams.total}</span>
                    <span className="text-xs font-bold text-emerald-600">{routeParams.km} KM percorridos</span>
                 </div>
              </div>
              <div className="prioritize-toggle mb-6">
                 <div><label className="font-bold">Priorizar Favoritos</label><p className="text-xs text-gray-500">Busca dedicada por 15s</p></div>
                 <label className="switch"><input type="checkbox" checked={prioritizeFavs} onChange={e=>setPrioritizeFavs(e.target.checked)} /><span className="slider round"></span></label>
              </div>
              <div className="action-buttons gap-3">
                 <button className="btn btn-secondary flex-1 py-4 font-bold" onClick={()=>alert('Agendado!')}>Agendar</button>
                 <button className="btn btn-primary flex-[2] py-4 font-bold text-lg" onClick={()=>{setRideState('SEARCHING'); setTimeout(()=>setRideState('ACCEPTED'), 3000)}}>Chamar Agora</button>
              </div>
              <button className="w-full mt-4 text-xs font-bold text-gray-400 uppercase" onClick={resetFlow}>Alterar Endereços</button>
            </div>
          )}

          {rideState === 'SEARCHING' && <div className="py-12 text-center"><div className="search-radar mb-6"></div><h3 className="text-xl font-bold">Buscando Motorista...</h3></div>}

          {rideState === 'ACCEPTED' && (
             <div className="state-accepted">
                <div className="flex justify-between items-center mb-6">
                  <span className="badge-nearby">MOTORISTA ACEITOU</span>
                  <span className="text-2xl font-black">4 min</span>
                </div>
                <div className="driver-card-large flex gap-4 items-center p-4 bg-gray-50 rounded-xl mb-6">
                   <img src={favoriteDrivers[0].img} className="w-14 h-14 rounded-full" alt="drv" />
                   <div className="flex-1 font-bold">{favoriteDrivers[0].name} <div className="text-amber-500">⭐ 4.9</div></div>
                   <div className="text-right font-bold text-sm">{favoriteDrivers[0].car}<br/><span className="bg-gray-200 px-1 rounded">{favoriteDrivers[0].plate}</span></div>
                </div>
                <button className="btn btn-secondary w-full py-4 font-bold" onClick={resetFlow}>Finalizar Viagem</button>
             </div>
          )}
        </div>
      </div>

      {isMenuOpen && (
        <div className="side-menu-overlay" onClick={()=>setIsMenuOpen(false)}>
          <div className="side-menu-drawer animate-slide-right p-6">
             <h2 className="font-black text-2xl mb-8">ZOMP</h2>
             <button className="w-full text-left py-4 border-b font-bold">Perfil</button>
             <button className="w-full text-left py-4 border-b font-bold">Histórico</button>
             <button className="w-full text-left py-4 border-b font-bold text-red-500" onClick={()=>{logout();navigate('/passageiro')}}>Sair</button>
          </div>
        </div>
      )}
    </div>
  )
}
