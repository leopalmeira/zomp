import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, getCurrentUser, requestRide, getRideHistory, applyRideDiscount, cancelRide, rateRide, validateScreenshot, getUserDebt, getRideMessages, sendRideMessage, createSupportTicket, getUserSupportTickets, getSupportMessages, sendSupportMessage, getProfile, updateProfile } from '../services/api'
import { MapContainer, TileLayer, useMap, Marker, Polyline, Popup } from 'react-leaflet'
import { User, Clock, Star, Calendar, LogOut, ChevronRight, MapPin, Send, Check, Camera, MessageSquare, MessageCircle, AlertTriangle, ShieldAlert, LifeBuoy, X, Sparkles, HelpCircle } from 'lucide-react'
import L from 'leaflet'
import Tesseract from 'tesseract.js'
import 'leaflet/dist/leaflet.css'
import './Passenger.css'

// Helper: Cálculo de desconto aplicado DIRETAMENTE sobre o valor do print da concorrência
export const calculateDiscountForPrintPrice = (val) => {
  const p = parseFloat(val) || 0;
  if (p >= 35.00) return 3.50; // Desconto de R$ 3,50 para print >= R$ 35,00
  if (p >= 25.00) return 2.00; // Desconto de R$ 2,00 (ex: R$ 27 vira R$ 25)
  if (p >= 15.00) return 2.00; // Desconto de R$ 2,00 para print de R$ 15,00 a R$ 24,99
  if (p >= 10.00) return 1.50; // Desconto de R$ 1,50 para print de R$ 10,00 a R$ 14,99
  return 1.00; // Desconto de R$ 1,00 para valores menores
};

// Helper: Extração de valores monetários via OCR no print do passageiro
export const extractPriceFromOcrText = (text) => {
  if (!text) return null;
  // 1. Procura primeiro valores explícitos com prefixo de moeda (ex: R$ 27,00, R$ 27.90)
  const explicitMatches = [];
  const explicitRegex = /(?:R\$\s*|BRL\s*|\$\s*)(\d{1,3}(?:[.,]\d{2}))/gi;
  let expMatch;
  while ((expMatch = explicitRegex.exec(text)) !== null) {
    const rawVal = expMatch[1].replace(',', '.');
    const val = parseFloat(rawVal);
    if (val >= 6.00 && val <= 500.00) {
      explicitMatches.push(val);
    }
  }
  if (explicitMatches.length > 0) {
    return explicitMatches[0];
  }

  // 2. Fallback: procura números com duas casas decimais no padrão financeiro
  const matches = [];
  const regex = /(\d{1,3}(?:[.,]\d{2}))/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const rawVal = match[1].replace(',', '.');
    const val = parseFloat(rawVal);
    if (val >= 6.00 && val <= 500.00) {
      matches.push(val);
    }
  }
  if (matches.length > 0) {
    return matches[0];
  }
  return null;
};


// Custom Map Icons
const createIcon = (color) => L.divIcon({
  className: 'custom-pin-icon',
  html: `<div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 4px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
})
const originIcon = createIcon('#00E676')
const destIcon = createIcon('#EF4444')
const stopIcon = createIcon('#F59E0B')

const sonarIcon = L.divIcon({
  className: 'custom-sonar-icon',
  html: `
    <div class="sonar-wrapper">
      <div class="sonar-center"></div>
      <div class="sonar-wave"></div>
      <div class="sonar-wave-2"></div>
      <div class="sonar-wave-3"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
})

// Helper: resolve address text to coordinates via Nominatim
async function resolveAddress(text) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&countrycodes=br&limit=1`
  )
  const data = await res.json()
  if (data && data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      name: data[0].display_name
    }
  }
  return null
}

const LOCAL_ADDRESS_FALLBACK = [
  { display_name: "Avenida Atlântica, Copacabana, Rio de Janeiro, RJ", lat: "-22.9711", lon: "-43.1822" },
  { display_name: "Rua Barata Ribeiro, Copacabana, Rio de Janeiro, RJ", lat: "-22.9688", lon: "-43.1856" },
  { display_name: "Avenida Rio Branco, Centro, Rio de Janeiro, RJ", lat: "-22.9035", lon: "-43.1794" },
  { display_name: "Praça Floriano, Cinelândia, Rio de Janeiro, RJ", lat: "-22.9094", lon: "-43.1758" },
  { display_name: "Avenida Vieira Souto, Ipanema, Rio de Janeiro, RJ", lat: "-22.9873", lon: "-43.2048" },
  { display_name: "Aeroporto Santos Dumont, Centro, Rio de Janeiro, RJ", lat: "-22.9109", lon: "-43.1671" },
  { display_name: "Aeroporto do Galeão, Rio de Janeiro, RJ", lat: "-22.8134", lon: "-43.2494" },
  { display_name: "Avenida Paulista, São Paulo, SP", lat: "-23.5614", lon: "-46.6559" },
  { display_name: "Rua Augusta, São Paulo, SP", lat: "-23.5592", lon: "-46.6583" },
  { display_name: "Avenida Brigadeiro Faria Lima, Pinheiros, São Paulo, SP", lat: "-23.5684", lon: "-46.6811" },
  { display_name: "Barra da Tijuca, Rio de Janeiro, RJ", lat: "-23.0003", lon: "-43.3658" },
  { display_name: "Leblon, Rio de Janeiro, RJ", lat: "-22.9847", lon: "-43.2231" },
  { display_name: "Rua das Laranjeiras, Rio de Janeiro, RJ", lat: "-22.9348", lon: "-43.1892" },
  { display_name: "Botafogo, Rio de Janeiro, RJ", lat: "-22.9519", lon: "-43.1804" },
  { display_name: "Niterói, Rio de Janeiro, RJ", lat: "-22.8856", lon: "-43.1153" }
];

// Helper: fetch real road route from OSRM
async function fetchOSRMRoute(originCoords, destCoords, stopsCoords = []) {
  const allCoords = [originCoords, ...stopsCoords, destCoords].filter(Boolean)
  const coordString = allCoords.map(c => `${c[1]},${c[0]}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`
  const res = await fetch(url)
  const data = await res.json()
  if (data.routes && data.routes.length > 0) {
    const route = data.routes[0]
    const km = (route.distance / 1000).toFixed(1)
    const durationMin = Math.ceil(route.duration / 60) // Convert seconds to minutes
    const geometry = route.geometry.coordinates.map(c => [c[1], c[0]])
    return { km, geometry, durationMin }
  }
  return null
}

// Map controller to auto-center/zoom
function MapController({ center, markers }) {
  const map = useMap()
  useEffect(() => {
    if (markers && markers.length === 2 && markers[0] && markers[1]) {
      const bounds = L.latLngBounds(markers)
      map.flyToBounds(bounds, { padding: [80, 80], animate: true })
    } else if (center) {
      map.flyTo(center, 16)
    }
  }, [center, markers, map])
  return null
}

// API Base URL and auth headers for direct fetch calls
const API_BASE = import.meta.env.VITE_API_URL || 'https://zomp-api.onrender.com/api';
function getHeaders() {
  const token = localStorage.getItem('zomp_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function PassengerDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(getCurrentUser())

  // ── 1. MAPA & ENDEREÇOS ──
  const [mapCenter, setMapCenter] = useState([-22.9068, -43.1729])
  const [originAddr, setOriginAddr] = useState('')
  const [originCoords, setOriginCoords] = useState(null)
  const [destAddr, setDestAddr] = useState('')
  const [destCoords, setDestCoords] = useState(null)
  const [gpsAddress, setGpsAddress] = useState('')
  const [gpsCoords, setGpsCoords] = useState(null)

  const originCoordsRef = useRef(null)
  const destCoordsRef = useRef(null)
  useEffect(() => { originCoordsRef.current = originCoords }, [originCoords])
  useEffect(() => { destCoordsRef.current = destCoords }, [destCoords])

  const [stops, setStops] = useState([])
  const stopsRef = useRef(stops)
  useEffect(() => { stopsRef.current = stops }, [stops])

  const [suggestions, setSuggestions] = useState([])
  const [sugTarget, setSugTarget] = useState(null)
  const debounceRef = useRef(null)

  // ── 2. ROTA & VEÍCULO ──
  const [routeGeometry, setRouteGeometry] = useState([])
  const [routeKm, setRouteKm] = useState('0')
  const [routeDuration, setRouteDuration] = useState(0)
  const [vehicleType, setVehicleType] = useState('car')
  const [isIntercity, setIsIntercity] = useState(false)
  const [passengersCount, setPassengersCount] = useState(1)

  // ── 3. ESTADO DA CORRIDA & CONEXÃO ──
  const [rideState, setRideState] = useState('IDLE')
  const [cancelCountdown, setCancelCountdown] = useState(119)
  const [activeRideId, setActiveRideId] = useState(null)
  const [currentRide, setCurrentRide] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchingDrivers, setSearchingDrivers] = useState([])

  // ── 4. PREÇO IMBATÍVEL & OCR ──
  const [hasCompetitionDiscount, setHasCompetitionDiscount] = useState(false)
  const [showCompetitionModal, setShowCompetitionModal] = useState(false)
  const [compPriceRead, setCompPriceRead] = useState(0)
  const [selectedTravelCategory, setSelectedTravelCategory] = useState('todos')
  const [isTravelSuggestionsOpen, setIsTravelSuggestionsOpen] = useState(false)
  const [isAnalyzingScreenshot, setIsAnalyzingScreenshot] = useState(false)
  const [calculatedDiscountAmount, setCalculatedDiscountAmount] = useState(2.00)
  const [competitorPrintPrice, setCompetitorPrintPrice] = useState(0)
  const [manualPriceInput, setManualPriceInput] = useState('')
  const [manualPriceError, setManualPriceError] = useState('')
  const [userPendingDebt, setUserPendingDebt] = useState(0)

  const userEmail = user?.email?.toLowerCase() || ''
  const isTestAccount = userEmail.includes('cliente@zomp') || userEmail.includes('cliente@zom') || userEmail.includes('teste')

  const [imbativelRidesLeft, setImbativelRidesLeft] = useState(() => {
    if (isTestAccount) return 999;
    const savedDate = localStorage.getItem('zomp_imbativel_date');
    const today = new Date().toISOString().split('T')[0];
    if (savedDate !== today) {
      localStorage.setItem('zomp_imbativel_date', today);
      localStorage.setItem('zomp_imbativel_rides_left', '3');
      return 3;
    }
    const saved = localStorage.getItem('zomp_imbativel_rides_left');
    return saved !== null ? parseInt(saved) : 3;
  });

  // ── 5. AGENDAMENTO, FRETE & PAGAMENTO ──
  const [scheduleData, setScheduleData] = useState({ date: '', time: '' })
  const [freightType, setFreightType] = useState('')
  const [freightDescription, setFreightDescription] = useState('')
  const [freightSecurityCode, setFreightSecurityCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  const [freightContactName, setFreightContactName] = useState('')
  const [freightContactPhone, setFreightContactPhone] = useState('')
  const [pixCopiedToast, setPixCopiedToast] = useState(false)

  // ── 6. AVALIAÇÃO DO MOTORISTA ──
  const [passengerRatingModalOpen, setPassengerRatingModalOpen] = useState(false)
  const [lastCompletedRide, setLastCompletedRide] = useState(null)
  const [passengerRatingStars, setPassengerRatingStars] = useState(5)
  const [passengerRatingComment, setPassengerRatingComment] = useState('')
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)
  const [ratingStars, setRatingStars] = useState(0)

  // ── 7. PERFIL & SELFIE ──
  const [profileData, setProfileData] = useState(() => {
    const u = getCurrentUser() || {}
    return { name: u.name || 'Passageiro', email: u.email || '' }
  })
  const [showSelfiePrompt, setShowSelfiePrompt] = useState(false)
  const [selfiePreview, setSelfiePreview] = useState(null)
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false)

  // ── 8. CHAT DA CORRIDA ──
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')

  // ── 9. SUPORTE DA PLATAFORMA ──
  const [supportTickets, setSupportTickets] = useState([])
  const [activeSupportTicket, setActiveSupportTicket] = useState(null)
  const [supportMessages, setSupportMessages] = useState([])
  const [supportCategory, setSupportCategory] = useState('PAGAMENTO')
  const [supportInput, setSupportInput] = useState('')
  const [isSendingSupport, setIsSendingSupport] = useState(false)
  const [isSupportLoading, setIsSupportLoading] = useState(false)
  const [isCreatingNewTicket, setIsCreatingNewTicket] = useState(false)

  // ── 10. UI & HISTÓRICO ──
  const [toast, setToast] = useState(null)
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuScreen, setMenuScreen] = useState('MAIN')
  const [expandedRide, setExpandedRide] = useState(null)
  const [prioritizeFavs, setPrioritizeFavs] = useState(true)
  const [rideHistory, setRideHistory] = useState([])

  const [scheduledRides, setScheduledRides] = useState(() => {
    try {
      const saved = localStorage.getItem('zomp_scheduled_rides')
      return saved ? JSON.parse(saved) : []
    } catch (e) { return [] }
  })

  const [favoriteDriversState, setFavoriteDriversState] = useState([
    { id: 1, name: 'Carlos Santos', car: 'Chevrolet Onix', plate: 'BRA-2031', rating: '4.9', img: 'https://i.pravatar.cc/150?img=11', pixKey: '(21) 98888-7777' },
    { id: 2, name: 'Ana Silva', car: 'Hyundai HB20', plate: 'XPT-9988', rating: '5.0', img: 'https://i.pravatar.cc/150?img=5', pixKey: 'anasilva@pix.com' }
  ])

  // Pricing state
  const FREIGHT_PRICE_PER_KM = 3.50
  const [config, setConfig] = useState({
    pricePerKmCar: 1.80, pricePerKmMoto: 1.40,
    minFareCar: 7.00, minFareMoto: 5.50,
    minKmPriceImbativel: 1.00, discountImbativel: 2.00
  })
  const MIN_PRICE = { car: 7.00, moto: 5.50 }

  // ── FUNÇÕES UTILITÁRIAS ESSENCIAIS ──
  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      const history = await getRideHistory();
      if (!Array.isArray(history)) {
        setRideHistory([]);
        return;
      }
      const formatted = [];
      for (const h of history) {
        try {
          const createdAt = h.createdAt || new Date().toISOString();
          const datePart = createdAt.split('T')[0];
          const dp = datePart.split('-');
          formatted.push({
            id: h.id,
            rawDate: new Date(createdAt),
            date: dp.length === 3 ? `${dp[2]}/${dp[1]}/${dp[0]}` : datePart,
            origin: h.origin || '-',
            dest: h.destination || '-',
            price: h.price != null ? Number(h.price).toFixed(2) : '0.00',
            vehicle: h.vehicleType === 'car' ? 'Carro' : 'Moto',
            status: h.status || 'UNKNOWN'
          });
        } catch (itemErr) {
          console.warn('Skipping malformed ride history item:', itemErr);
        }
      }
      setRideHistory(formatted);
    } catch (err) {
      console.error('Failed to load history', err);
      setRideHistory([]);
    }
  }, []);

  const loadSupportTickets = useCallback(async () => {
    try {
      setIsSupportLoading(true);
      const tickets = await getUserSupportTickets();
      if (Array.isArray(tickets)) {
        setSupportTickets(tickets);
        if (tickets.length > 0 && !activeSupportTicket) {
          setActiveSupportTicket(tickets[0]);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar chamados de suporte:', e);
    } finally {
      setIsSupportLoading(false);
    }
  }, [activeSupportTicket]);

  const handleCreateSupportTicket = async () => {
    if (!supportInput.trim()) return;
    setIsSendingSupport(true);
    try {
      const res = await createSupportTicket({
        category: supportCategory,
        subject: `Atendimento [${supportCategory}]`,
        message: supportInput.trim()
      });
      setSupportInput('');
      setIsCreatingNewTicket(false);
      await loadSupportTickets();
      if (res?.ticket) {
        setActiveSupportTicket(res.ticket);
      }
    } catch (e) {
      alert('Erro ao abrir chamado: ' + e.message);
    } finally {
      setIsSendingSupport(false);
    }
  };

  const handleSendSupportMessage = async () => {
    if (!supportInput.trim() || !activeSupportTicket?.id) return;
    setIsSendingSupport(true);
    try {
      const sent = await sendSupportMessage(activeSupportTicket.id, supportInput.trim());
      setSupportMessages(prev => [...prev, sent]);
      setSupportInput('');
    } catch (e) {
      alert('Erro ao enviar mensagem para o suporte: ' + e.message);
    } finally {
      setIsSendingSupport(false);
    }
  };

  const handleSendRideMessage = async (customText) => {
    const textToSend = (customText || chatInput).trim();
    if (!textToSend) return;
    const rideId = activeRideId || currentRide?.id;
    if (!rideId) return;

    setChatInput('');
    try {
      const sent = await sendRideMessage(rideId, textToSend);
      setChatMessages(prev => [...prev, sent]);
    } catch (e) {
      console.warn('Erro ao enviar mensagem:', e);
    }
  };

  // ── SINCRONIZAÇÃO EM TEMPO REAL DO PERFIL ──
  useEffect(() => {
    getProfile().then(data => {
      if (data && !data.error) {
        setUser(data);
        localStorage.setItem('zomp_user', JSON.stringify(data));
        setProfileData({
          name: data.name || 'Passageiro',
          email: data.email || '',
          phone: data.phone || ''
        });
      }
    }).catch(err => {
      console.warn('Erro ao sincronizar perfil do passageiro:', err);
    });
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'PASSENGER') {
      navigate('/passageiro');
      return;
    }
  }, [navigate, user]);

  useEffect(() => {
    async function loadConfig() {
      try {
        const { getGlobalConfig } = await import('../services/api');
        const cfg = await getGlobalConfig();
        setConfig(cfg);
      } catch (e) {
        console.warn('Failed to load global config, using defaults');
      }
    }
    loadConfig();
  }, []);

  useEffect(() => {
    localStorage.setItem('zomp_scheduled_rides', JSON.stringify(scheduledRides))
  }, [scheduledRides])

  useEffect(() => {
    loadHistory();
  }, [rideState, loadHistory]);

  // Manage 60-second countdown when ACCEPTED
  useEffect(() => {
    let timer;
    if (rideState === 'ACCEPTED' && cancelCountdown > 0) {
      timer = setInterval(() => {
        setCancelCountdown(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [rideState, cancelCountdown])

  // Real-time Ride Polling (No mock)
  useEffect(() => {
    let interval;
    if (activeRideId && (rideState === 'SEARCHING' || rideState === 'PENDING' || rideState === 'ACCEPTED' || rideState === 'NEAR_DESTINATION')) {
      const poll = async () => {
        try {
          const res = await fetch(`${API_BASE}/rides/${activeRideId}`, { headers: getHeaders() });
          const ride = await res.json();
          setCurrentRide(ride);
          if (ride.status === 'ACCEPTED' && (rideState === 'PENDING' || rideState === 'SEARCHING')) {
            setRideState('ACCEPTED');
          } else if (ride.status === 'NEAR_DESTINATION' && rideState === 'ACCEPTED') {
            setRideState('NEAR_DESTINATION');
          } else if (ride.status === 'COMPLETED') {
            setLastCompletedRide(ride);
            setPassengerRatingModalOpen(true);
            setRideState('IDLE');
            setActiveRideId(null);
            setCurrentRide(null);
            showToast('Corrida finalizada com sucesso!');
            loadHistory();
          } else if (ride.status === 'CANCELLED') {
            setRideState('IDLE');
            setActiveRideId(null);
            setCurrentRide(null);
            alert('A corrida foi cancelada.');
          }
        } catch (e) {}
      }
      poll();
      interval = setInterval(poll, 3000);
    }
    return () => clearInterval(interval);
  }, [activeRideId, rideState, loadHistory, showToast]);

  // Sincronização em tempo real do Chat com o Motorista durante a corrida
  useEffect(() => {
    let interval;
    const rideId = activeRideId || currentRide?.id;
    if (isChatOpen && rideId) {
      const fetchMsgs = async () => {
        try {
          const msgs = await getRideMessages(rideId);
          if (Array.isArray(msgs)) setChatMessages(msgs);
        } catch (e) {
          console.warn('Erro ao sincronizar mensagens da corrida:', e);
        }
      };
      fetchMsgs();
      interval = setInterval(fetchMsgs, 2500);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isChatOpen, activeRideId, currentRide?.id]);

  // Simulated searching drivers for sonar
  useEffect(() => {
    if (rideState === 'SEARCHING' && originCoords) {
      const [lat, lon] = originCoords;
      const mockDrivers = [
        { id: 1, pos: [lat + 0.0012, lon + 0.0012] },
        { id: 2, pos: [lat - 0.0014, lon + 0.0016] },
        { id: 3, pos: [lat + 0.0006, lon - 0.0018] }
      ];
      setSearchingDrivers(mockDrivers);
    } else {
      setSearchingDrivers([]);
    }
  }, [rideState, originCoords]);

  const pendingFeeAmount = rideHistory
    .filter(h => h.status === 'CANCELED_FEE' && !h.feePaid)
    .reduce((sum, h) => sum + parseFloat(h.price || 0), 0)

  const isTripIntercity = isIntercity || parseFloat(routeKm) > 90

  // Compute price based on vehicle type and distance
  const getPrice = (km, type, includeFee = false) => {
    const validStopsCount = stops.filter(s => s.coords || s.addr.length > 3).length
    const stopsFee = validStopsCount * 2.00
    
    let calculated;
    if (isTripIntercity && type === 'car') {
      calculated = parseFloat(km) * 1.70; // Taxa fixa Viagens Longas
    } else {
      calculated = parseFloat(km) * (type === 'car' ? config.pricePerKmCar : config.pricePerKmMoto);
    }
    
    const extraPsg = (type === 'car' && passengersCount > 1) ? (passengersCount - 1) * 2.50 : 0;
    const basePrice = Math.max(calculated, type === 'car' ? config.minFareCar : config.minFareMoto) + stopsFee + extraPsg

    // REGRA PREÇO IMBATÍVEL: se tivermos um print validado da concorrência (Uber/99)
    // O desconto incide DIRETAMENTE SOBRE O VALOR DO PRINT (ex: Zomp R$ 29, print Uber R$ 27 -> Desconto de R$ 2,00 -> Zomp Carro R$ 25, Moto ainda mais em conta)
    if (hasCompetitionDiscount && competitorPrintPrice > 0) {
      const discount = calculatedDiscountAmount || calculateDiscountForPrintPrice(competitorPrintPrice);
      let discountedPrintPrice;
      if (type === 'car') {
        discountedPrintPrice = Math.max(competitorPrintPrice - discount, config.minFareCar) + stopsFee + extraPsg;
      } else {
        // Moto com desconto adicional proporcional, garantindo valor mais barato e tarifa mínima
        const motoBase = (competitorPrintPrice - discount) * 0.72;
        discountedPrintPrice = Math.max(motoBase, config.minFareMoto) + stopsFee;
      }
      const finalDiscounted = includeFee ? discountedPrintPrice + pendingFeeAmount : discountedPrintPrice;
      return finalDiscounted.toFixed(2);
    }

    let finalPrice = includeFee ? basePrice + pendingFeeAmount : basePrice
    return finalPrice.toFixed(2)
  }

  // Função para buscar endereço real com base na latitude e longitude (Geocodificação Reversa)
  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const road = data.address.road || data.address.suburb || '';
          const house = data.address.house_number || '';
          const suburb = data.address.suburb || data.address.neighbourhood || '';
          const city = data.address.city || data.address.town || '';
          
          if (road) {
            const shortAddr = house 
              ? `${road}, ${house} - ${suburb || city}` 
              : `${road} - ${suburb || city}`;
            return shortAddr;
          }
          return data.display_name.split(',').slice(0, 3).join(',');
        }
      }
    } catch (e) {
      console.warn('Erro na geocodificação reversa:', e);
    }
    return 'Sua Localização';
  }

  // ============= Fetch user pending debt on load =============
  useEffect(() => {
    getUserDebt().then(res => {
      if (res && res.pendingDebt > 0) {
        setUserPendingDebt(parseFloat(res.pendingDebt));
      }
    }).catch(() => {});
  }, []);

  // ============= GPS tracking =============
  const hasInitializedGps = useRef(false);

  useEffect(() => {
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const c = [pos.coords.latitude, pos.coords.longitude]
          setMapCenter(c)
          setGpsCoords(c)
          
          // Busca o endereço reverso preciso do GPS em background
          if (!hasInitializedGps.current) {
            hasInitializedGps.current = true;
            try {
              const realAddress = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
              if (realAddress && realAddress !== 'Sua Localização') {
                setGpsAddress(realAddress);
              }
            } catch (err) {
              console.warn('Erro ao obter endereço do GPS:', err);
            }
          }
        },
        (err) => {
          console.error('GPS error:', err)
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      )
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    }
  }, [])

// Locais Populares e Categorias de Sugestões de Viagem
const POPULAR_DESTINATIONS = [
  // Aeroportos
  { category: 'aeroportos', categoryLabel: 'Aeroportos', icon: '✈️', title: 'Aeroporto Santos Dumont (SDU)', subtitle: 'Centro • Rio de Janeiro, RJ', display_name: 'Aeroporto Santos Dumont, Rio de Janeiro - RJ', lat: -22.9105, lon: -43.1631, tag: 'Nacional' },
  { category: 'aeroportos', categoryLabel: 'Aeroportos', icon: '✈️', title: 'Aeroporto Galeão (GIG)', subtitle: 'Ilha do Governador • Rio de Janeiro, RJ', display_name: 'Aeroporto Galeão, Rio de Janeiro - RJ', lat: -22.8148, lon: -43.2494, tag: 'Internacional' },
  
  // Shoppings
  { category: 'shoppings', categoryLabel: 'Shoppings', icon: '🛍️', title: 'Barra Shopping', subtitle: 'Av. das Américas • Barra da Tijuca, RJ', display_name: 'Barra Shopping, Avenida das Américas, Barra da Tijuca, Rio de Janeiro - RJ', lat: -22.9995, lon: -43.3602, tag: 'Compras' },
  { category: 'shoppings', categoryLabel: 'Shoppings', icon: '🛍️', title: 'Shopping Rio Sul', subtitle: 'Botafogo • Rio de Janeiro, RJ', display_name: 'Shopping Rio Sul, Rua Lauro Müller, Botafogo, Rio de Janeiro - RJ', lat: -22.9575, lon: -43.1772, tag: 'Zona Sul' },
  { category: 'shoppings', categoryLabel: 'Shoppings', icon: '🛍️', title: 'NorteShopping', subtitle: 'Av. Dom Hélder Câmara • Cachambi, RJ', display_name: 'NorteShopping, Avenida Dom Hélder Câmara, Cachambi, Rio de Janeiro - RJ', lat: -22.8872, lon: -43.2842, tag: 'Zona Norte' },
  { category: 'shoppings', categoryLabel: 'Shoppings', icon: '🛍️', title: 'Shopping Leblon', subtitle: 'Av. Afrânio de Melo Franco • Leblon, RJ', display_name: 'Shopping Leblon, Avenida Afrânio de Melo Franco, Leblon, Rio de Janeiro - RJ', lat: -22.9839, lon: -43.2201, tag: 'Premium' },
  { category: 'shoppings', categoryLabel: 'Shoppings', icon: '🛍️', title: 'Shopping Tijuca', subtitle: 'Av. Maracanã • Tijuca, RJ', display_name: 'Shopping Tijuca, Avenida Maracanã, Tijuca, Rio de Janeiro - RJ', lat: -22.9234, lon: -43.2355, tag: 'Tijuca' },
  
  // Praias
  { category: 'praias', categoryLabel: 'Praias', icon: '🏖️', title: 'Praia de Copacabana', subtitle: 'Av. Atlântica • Copacabana, RJ', display_name: 'Copacabana, Rio de Janeiro - RJ', lat: -22.9698, lon: -43.1868, tag: 'Posto 4' },
  { category: 'praias', categoryLabel: 'Praias', icon: '🏖️', title: 'Praia de Ipanema', subtitle: 'Av. Vieira Souto • Ipanema, RJ', display_name: 'Ipanema, Rio de Janeiro - RJ', lat: -22.9848, lon: -43.2003, tag: 'Posto 9' },
  { category: 'praias', categoryLabel: 'Praias', icon: '🏖️', title: 'Praia da Barra da Tijuca', subtitle: 'Av. Lúcio Costa • Barra da Tijuca, RJ', display_name: 'Barra da Tijuca, Rio de Janeiro - RJ', lat: -23.0004, lon: -43.3659, tag: 'Orla' },
  { category: 'praias', categoryLabel: 'Praias', icon: '🏖️', title: 'Praia do Leblon', subtitle: 'Av. Delfim Moreira • Leblon, RJ', display_name: 'Leblon, Rio de Janeiro - RJ', lat: -22.9839, lon: -43.2238, tag: 'Posto 12' },
  { category: 'praias', categoryLabel: 'Praias', icon: '🏖️', title: 'Praia do Recreio', subtitle: 'Recreio dos Bandeirantes, RJ', display_name: 'Recreio dos Bandeirantes, Rio de Janeiro - RJ', lat: -23.0272, lon: -43.4653, tag: 'Posto 10' },

  // Turismo & Lazer
  { category: 'turismo', categoryLabel: 'Turismo', icon: '⚽', title: 'Estádio do Maracanã', subtitle: 'Av. Presidente Castelo Branco • Maracanã, RJ', display_name: 'Estádio do Maracanã, Rio de Janeiro - RJ', lat: -22.9121, lon: -43.2302, tag: 'Futebol' },
  { category: 'turismo', categoryLabel: 'Turismo', icon: '🏛️', title: 'Cristo Redentor / Corcovado', subtitle: 'Parque Nacional da Tijuca • Alto da Boa Vista, RJ', display_name: 'Cristo Redentor, Rio de Janeiro - RJ', lat: -22.9519, lon: -43.2105, tag: 'Maravilha' },
  { category: 'turismo', categoryLabel: 'Turismo', icon: '🚡', title: 'Pão de Açúcar (Bondinho)', subtitle: 'Av. Pasteur • Urca, RJ', display_name: 'Pão de Açúcar, Urca, Rio de Janeiro - RJ', lat: -22.9556, lon: -43.1672, tag: 'Turismo' },
  { category: 'turismo', categoryLabel: 'Turismo', icon: '🎵', title: 'Arcos da Lapa & Circo Voador', subtitle: 'Lapa • Centro, RJ', display_name: 'Lapa, Centro, Rio de Janeiro - RJ', lat: -22.9129, lon: -43.1802, tag: 'Noite' },

  // Centros & Terminais
  { category: 'terminais', categoryLabel: 'Terminais', icon: '🚌', title: 'Rodoviária Novo Rio', subtitle: 'Av. Francisco Bicalho • Santo Cristo, RJ', display_name: 'Rodoviária Novo Rio, Rio de Janeiro - RJ', lat: -22.8989, lon: -43.2097, tag: 'Viagens' },
  { category: 'terminais', categoryLabel: 'Terminais', icon: '🏢', title: 'Centro da Cidade (Carioca / Cinelândia)', subtitle: 'Centro Financeiro • Rio de Janeiro, RJ', display_name: 'Centro, Rio de Janeiro - RJ', lat: -22.9068, lon: -43.1729, tag: 'Comércio' },
  { category: 'terminais', categoryLabel: 'Terminais', icon: '🌉', title: 'Niterói (Centro / Icaraí)', subtitle: 'Região Metropolitana • RJ', display_name: 'Niterói, RJ', lat: -22.8833, lon: -43.1036, tag: 'Ponte' },
  { category: 'terminais', categoryLabel: 'Terminais', icon: '🚂', title: 'Central do Brasil (Trens & Metrô)', subtitle: 'Praça Cristiano Otoni • Centro, RJ', display_name: 'Central do Brasil, Centro, Rio de Janeiro - RJ', lat: -22.9035, lon: -43.1915, tag: 'Estação' },
  { category: 'terminais', categoryLabel: 'Terminais', icon: '🛍️', title: 'Madureira (Mercadão & Parque)', subtitle: 'Madureira • Zona Norte, RJ', display_name: 'Madureira, Rio de Janeiro - RJ', lat: -22.8732, lon: -43.3392, tag: 'Zona Norte' },
  { category: 'terminais', categoryLabel: 'Terminais', icon: '🏬', title: 'Méier (Dias da Cruz)', subtitle: 'Méier • Zona Norte, RJ', display_name: 'Méier, Rio de Janeiro - RJ', lat: -22.8986, lon: -43.2777, tag: 'Zona Norte' },
  { category: 'terminais', categoryLabel: 'Terminais', icon: '🌴', title: 'Botafogo (Praia de Botafogo)', subtitle: 'Botafogo • Zona Sul, RJ', display_name: 'Botafogo, Rio de Janeiro - RJ', lat: -22.9519, lon: -43.1857, tag: 'Zona Sul' }
];

  // Destinos filtrados para os cards de sugestões da tela inicial
  const filteredDestinations = useMemo(() => {
    if (selectedTravelCategory === 'todos') {
      return POPULAR_DESTINATIONS;
    }
    return POPULAR_DESTINATIONS.filter(d => d.category === selectedTravelCategory);
  }, [selectedTravelCategory]);

  // ============= Sugestões de GPS instantâneas para partida =============
  const showOriginGpsSuggestions = useCallback(() => {
    setSugTarget('origin');
    const items = [];
    if (gpsCoords) {
      items.push({
        isGps: true,
        title: 'Usar Localização Atual (GPS)',
        subtitle: gpsAddress || 'Localização precisa obtida do seu aparelho',
        display_name: gpsAddress || 'Sua Localização',
        lat: gpsCoords[0],
        lon: gpsCoords[1],
        icon: '📍'
      });
    } else if (Array.isArray(mapCenter) && mapCenter[0] !== 0) {
      items.push({
        isGps: true,
        title: 'Usar Localização Atual (GPS)',
        subtitle: 'Localização do mapa / GPS',
        display_name: 'Sua Localização',
        lat: mapCenter[0],
        lon: mapCenter[1],
        icon: '📍'
      });
    }
    items.push(...POPULAR_DESTINATIONS.slice(0, 4));
    setSuggestions(items);
  }, [gpsCoords, gpsAddress, mapCenter]);

  // ============= Sugestões instantâneas para Destino ao focar campo =============
  const showDestSuggestions = useCallback((filterCat = null) => {
    setSugTarget('dest');
    let pool = POPULAR_DESTINATIONS;
    if (filterCat && filterCat !== 'todos') {
      pool = pool.filter(p => p.category === filterCat);
    }
    const recents = (rideHistory || [])
      .filter(h => h.destination && h.destination.length > 2)
      .slice(0, 3)
      .map(h => ({
        title: h.destination.split(',')[0]?.trim() || h.destination,
        subtitle: 'Destino Recente',
        display_name: h.destination,
        isRecent: true,
        icon: '🕒'
      }));

    const merged = [...recents, ...pool];
    const unique = [];
    const seen = new Set();
    for (const item of merged) {
      const key = (item.title || item.display_name).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    setSuggestions(unique.slice(0, 8));
  }, [rideHistory]);

  // ============= Seleção rápida de sugestão de viagem (1 toque) =============
  const handleSelectDestinationSuggestion = async (item) => {
    setIsLoading(true);
    try {
      const shortAddr = item.title ? `${item.title}${item.subtitle ? ', ' + item.subtitle : ''}` : item.display_name;
      let coords = (item.lat && item.lon) ? [item.lat, item.lon] : null;
      if (!coords) {
        const resolved = await resolveAddress(item.display_name || item.title);
        if (resolved) coords = [resolved.lat, resolved.lon];
      }

      setDestAddr(shortAddr);
      if (coords) {
        setDestCoords(coords);
        destCoordsRef.current = coords;
      }

      let oCoords = originCoordsRef.current;
      if (!oCoords) {
        if (gpsCoords) {
          oCoords = gpsCoords;
        } else if (Array.isArray(mapCenter) && mapCenter[0] !== 0) {
          oCoords = mapCenter;
        } else {
          try {
            const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 3000 }));
            oCoords = [pos.coords.latitude, pos.coords.longitude];
          } catch (e) {
            oCoords = [-22.9068, -43.1729];
          }
        }
        setOriginCoords(oCoords);
        originCoordsRef.current = oCoords;
        if (!originAddr) setOriginAddr('Sua Localização');
      }

      setSuggestions([]);
      setIsTravelSuggestionsOpen(false);

      if (oCoords && coords) {
        await calculateRoute(oCoords, coords, []);
      }
    } catch (err) {
      console.warn('Erro ao selecionar sugestão de viagem:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ============= Address search with fast debounce =============
  const searchAddress = useCallback((text, target) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSugTarget(target)

    const trimmed = text.trim()
    if (trimmed.length < 2) {
      if (target === 'origin') {
        showOriginGpsSuggestions();
      } else {
        showDestSuggestions();
      }
      return
    }

    // Busca rápida instantânea no fallback local enquanto pesquisa na rede
    const queryClean = trimmed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const quickLocal = POPULAR_DESTINATIONS.filter(addr => {
      const nameClean = (addr.title + ' ' + addr.display_name + ' ' + (addr.category || '')).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return nameClean.includes(queryClean);
    });
    
    // Adiciona o item de GPS no topo para a partida
    const gpsItem = (target === 'origin' && (gpsCoords || mapCenter)) ? [{
      isGps: true,
      title: 'Usar Localização Atual (GPS)',
      subtitle: gpsAddress || 'Localização precisa do seu aparelho',
      display_name: gpsAddress || 'Sua Localização',
      lat: (gpsCoords ? gpsCoords[0] : mapCenter[0]),
      lon: (gpsCoords ? gpsCoords[1] : mapCenter[1]),
      icon: '📍'
    }] : [];

    if (quickLocal.length > 0 || gpsItem.length > 0) {
      setSuggestions([...gpsItem, ...quickLocal].slice(0, 6));
    }

    debounceRef.current = setTimeout(async () => {
      let remoteResults = [];
      try {
        const latRef = gpsCoords ? gpsCoords[0] : mapCenter[0];
        const lonRef = gpsCoords ? gpsCoords[1] : mapCenter[1];
        // Tenta Photon ancorado no GPS do aparelho
        const photonRes = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=6&lat=${latRef}&lon=${lonRef}&lang=pt`
        );
        if (photonRes.ok) {
          const photonData = await photonRes.json();
          if (photonData?.features && photonData.features.length > 0) {
            remoteResults = photonData.features.map(f => {
              const p = f.properties;
              const name = p.name || p.street || '';
              const city = p.city || p.county || p.state || 'Rio de Janeiro';
              const district = p.district || p.suburb || '';
              const subtitle = [district, city].filter(Boolean).join(', ') || 'Brasil';
              const fullName = [name, subtitle].filter(Boolean).join(', ');
              return {
                display_name: fullName,
                title: name || fullName,
                subtitle: subtitle,
                lat: f.geometry.coordinates[1],
                lon: f.geometry.coordinates[0],
                icon: '📍'
              };
            });
          }
        }
      } catch (e) {}

      // Fallback para Nominatim se Photon não retornar
      if (remoteResults.length === 0) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&countrycodes=br&limit=6`
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              remoteResults = data.map(d => {
                const parts = d.display_name.split(',');
                return {
                  display_name: d.display_name,
                  title: parts[0]?.trim() || d.display_name,
                  subtitle: parts.slice(1, 3).join(',').trim() || 'Brasil',
                  lat: parseFloat(d.lat),
                  lon: parseFloat(d.lon),
                  icon: '📍'
                };
              });
            }
          }
        } catch (e) {}
      }

      const merged = [...gpsItem, ...remoteResults, ...quickLocal];
      const unique = [];
      const seen = new Set();
      for (const item of merged) {
        const key = item.isGps ? 'gps_fixed_key' : (item.title?.toLowerCase() || item.display_name?.toLowerCase());
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

      setSuggestions(unique.slice(0, 6));
    }, 200);
  }, [gpsCoords, gpsAddress, mapCenter, showOriginGpsSuggestions, showDestSuggestions]);

  // ============= Select suggestion =============
  const handleSelectSuggestion = async (s) => {
    const coords = [parseFloat(s.lat), parseFloat(s.lon)]

    // Extract house number from what user typed
    const typedText = sugTarget === 'origin' ? originAddr : destAddr
    const numberMatch = typedText.match(/\d+/)
    const houseNumber = numberMatch ? numberMatch[0] : ''

    const parts = s.display_name.split(',')
    const streetName = parts[0]?.trim() || s.title || ''
    const bairro = parts.length > 2 ? parts[parts.length - 4]?.trim() || parts[1]?.trim() : parts[1]?.trim() || ''
    const cidade = parts.length > 3 ? parts[parts.length - 3]?.trim() || '' : ''
    const shortAddr = houseNumber
      ? `${streetName} ${houseNumber}, ${bairro}${cidade ? ', ' + cidade : ''}`
      : `${streetName}, ${bairro}${cidade ? ', ' + cidade : ''}`

    if (sugTarget === 'origin') {
      setOriginAddr(shortAddr)
      setOriginCoords(coords)
      setMapCenter(coords)
    } else if (sugTarget === 'dest') {
      setDestAddr(shortAddr)
      setDestCoords(coords)
    } else if (sugTarget && sugTarget.startsWith('stop_')) {
      const idx = parseInt(sugTarget.split('_')[1])
      const newStops = [...stops]
      newStops[idx] = { addr: shortAddr, coords }
      setStops(newStops)
    }

    setSuggestions([])

    // Trigger route calc if both origin and dest are set
    const oCoords = sugTarget === 'origin' ? coords : originCoordsRef.current
    const dCoords = sugTarget === 'dest' ? coords : destCoordsRef.current
    const sCoords = sugTarget.startsWith('stop_') 
      ? stopsRef.current.map((s, i) => i === parseInt(sugTarget.split('_')[1]) ? coords : s.coords) 
      : stopsRef.current.map(s => s.coords)

    if (oCoords && dCoords) {
      await calculateRoute(oCoords, dCoords, sCoords.filter(Boolean))
    }
  }

  // ============= Função para resolver endereço textual para coordenadas =============
  const resolveAddress = async (text) => {
    if (!text || typeof text !== 'string' || text.trim().length < 2) return null;
    const trimmed = text.trim();

    // 1. Busca rápida na lista local
    const queryClean = trimmed.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const localMatch = POPULAR_DESTINATIONS.find(p => {
      const nameClean = (p.title + ' ' + p.display_name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return nameClean.includes(queryClean) || queryClean.includes(p.title.toLowerCase());
    });
    if (localMatch) {
      return { lat: localMatch.lat, lon: localMatch.lon, display_name: localMatch.display_name };
    }

    // 2. Busca no Photon (rápido e sem rate-limit)
    try {
      const pRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=1&lat=-22.9068&lon=-43.1729&lang=pt`);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData?.features && pData.features.length > 0) {
          const f = pData.features[0];
          return {
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            display_name: f.properties.name || trimmed
          };
        }
      }
    } catch (e) {}

    // 3. Fallback Nominatim
    try {
      const nRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&countrycodes=br&limit=1`);
      if (nRes.ok) {
        const nData = await nRes.json();
        if (Array.isArray(nData) && nData.length > 0) {
          return {
            lat: parseFloat(nData[0].lat),
            lon: parseFloat(nData[0].lon),
            display_name: nData[0].display_name
          };
        }
      }
    } catch (e) {}

    return null;
  };

  // ============= Enter seleciona primeira sugestão ou geocode direto e calcula rota =============
  const handleEnterKey = async (e, target) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    setIsLoading(true);
    setSuggestions([]);

    try {
      // 1. Se há sugestões ativas, usa a primeira
      if (suggestions.length > 0) {
        await handleSelectSuggestion(suggestions[0]);
        return;
      }

      // 2. Caso contrário, resolve o texto digitado
      const text = target === 'origin' ? originAddr : target === 'dest' ? destAddr : '';
      if (!text || text.trim().length < 2) {
        // Se deu enter com destino preenchido e origem vazia, tenta calcular com GPS
        if (target === 'dest' && destAddr.trim().length >= 2) {
          await handleForceCalculate();
        }
        return;
      }

      const resolved = await resolveAddress(text);
      if (resolved) {
        const coords = [resolved.lat, resolved.lon];
        if (target === 'origin') {
          setOriginAddr(resolved.display_name || text);
          setOriginCoords(coords);
          setMapCenter(coords);
          originCoordsRef.current = coords;
        } else if (target === 'dest') {
          setDestAddr(resolved.display_name || text);
          setDestCoords(coords);
          destCoordsRef.current = coords;
        }

        // Se já tiver ou conseguir a origem, dispara o cálculo de rota
        await handleForceCalculate();
      } else {
        await handleForceCalculate();
      }
    } catch (err) {
      console.warn('Erro ao processar Enter no endereço:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // ============= Calculate route (core function) =============
  const calculateRoute = async (oCoords, dCoords, sCoords = []) => {
    setIsLoading(true)
    try {
      const result = await fetchOSRMRoute(oCoords, dCoords, sCoords)
      if (result) {
        setRouteGeometry(result.geometry)
        setRouteKm(result.km)
        setRouteDuration(result.durationMin)
        // Somente vai para PRICED se não estiver na tela de FRETE
        setRideState(prev => prev === 'FREIGHT' ? 'FREIGHT' : 'PRICED')
        setIsSheetCollapsed(false)
      } else {
        alert('Não foi possível calcular a rota. Tente endereços mais específicos.')
      }
    } catch (e) {
      console.error('Route calculation error:', e)
      alert('Erro ao calcular rota. Verifique sua conexão.')
    } finally {
      setIsLoading(false)
    }
  }

  // ============= Force calculate (button click ou Enter) =============
  const handleForceCalculate = async () => {
    setIsLoading(true)
    try {
      // 1. Resolução da Origem (se vazia, usa GPS/mapCenter atual)
      let oCoords = originCoordsRef.current
      if (!oCoords) {
        if (originAddr && originAddr.trim().length >= 2 && originAddr !== 'Sua Localização') {
          const resolved = await resolveAddress(originAddr)
          if (resolved) {
            oCoords = [resolved.lat, resolved.lon]
            setOriginCoords(oCoords)
            originCoordsRef.current = oCoords
          }
        }
        
        // Se ainda não tiver oCoords, usa o mapCenter do GPS
        if (!oCoords) {
          if (Array.isArray(mapCenter) && mapCenter.length === 2 && mapCenter[0] !== 0) {
            oCoords = mapCenter
            setOriginCoords(oCoords)
            originCoordsRef.current = oCoords
            if (!originAddr) setOriginAddr('Sua Localização')
          } else {
            try {
              const gpsPos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: true, timeout: 4000, maximumAge: 10000
                })
              })
              oCoords = [gpsPos.coords.latitude, gpsPos.coords.longitude]
              setOriginCoords(oCoords)
              setMapCenter(oCoords)
              originCoordsRef.current = oCoords
              if (!originAddr) setOriginAddr('Sua Localização')
            } catch (gpsErr) {
              const resolved = await resolveAddress('Centro, Rio de Janeiro')
              if (resolved) {
                oCoords = [resolved.lat, resolved.lon]
                setOriginCoords(oCoords)
                originCoordsRef.current = oCoords
              }
            }
          }
        }
      }

      // 2. Resolução do Destino
      let dCoords = destCoordsRef.current
      if (!dCoords && destAddr && destAddr.trim().length >= 2) {
        const resolved = await resolveAddress(destAddr)
        if (resolved) {
          dCoords = [resolved.lat, resolved.lon]
          setDestCoords(dCoords)
          destCoordsRef.current = dCoords
        }
      }

      // 3. Resolução das Paradas
      let resolvedStops = []
      const currentStops = stopsRef.current
      for (let i = 0; i < currentStops.length; i++) {
        let sc = currentStops[i].coords
        if (!sc && currentStops[i].addr.length >= 2) {
          const res = await resolveAddress(currentStops[i].addr)
          if (res) sc = [res.lat, res.lon]
        }
        if (sc) resolvedStops.push(sc)
      }

      // 4. Se tiver origem e destino, calcula a rota
      if (oCoords && dCoords) {
        await calculateRoute(oCoords, dCoords, resolvedStops)
      } else if (!dCoords) {
        alert('Por favor, informe o endereço de destino.')
      } else {
        alert('Não foi possível localizar o ponto de partida. Verifique o GPS ou digite o endereço.')
      }
    } catch (e) {
      console.error('Force calculate error:', e)
    } finally {
      setIsLoading(false)
    }
  }

  // ============= Call now =============
  const handleCallNow = async () => {
    setIsLoading(true);
    try {
      if (pendingFeeAmount > 0) {
        setRideHistory(prev => prev.map(h => h.status === 'CANCELED_FEE' ? { ...h, feePaid: true } : h))
      }

      const rideOrigin = originAddr?.trim() || 'Sua Localização';
      const rideDest = destAddr?.trim() || 'Destino Solicitado';
      let ridePrice = parseFloat(getPrice(routeKm, vehicleType, true)) || 10.0;
      const rideDistance = parseFloat(routeKm) || 1.0;

      // Se o desconto imbatível foi ativado, aplica o desconto diretamente SOBRE O VALOR DO PRINT
      if (hasCompetitionDiscount && competitorPrintPrice > 0) {
        const discount = calculatedDiscountAmount || calculateDiscountForPrintPrice(competitorPrintPrice);
        const stopsFee = stops.filter(s => s.addr).length * 2.00;
        const extraPsg = (vehicleType === 'car' && passengersCount > 1) ? (passengersCount - 1) * 2.50 : 0;
        if (vehicleType === 'car') {
          ridePrice = Math.max(competitorPrintPrice - discount, config.minFareCar) + stopsFee + extraPsg;
        } else {
          const motoBase = (competitorPrintPrice - discount) * 0.72;
          ridePrice = Math.max(motoBase, config.minFareMoto) + stopsFee;
        }
        if (pendingFeeAmount > 0) {
          ridePrice += pendingFeeAmount;
        }
      }

      // Fallback e garantia de coordenadas precisas de início e fim da corrida
      let finalOriginLat = originCoords ? originCoords[0] : (Array.isArray(mapCenter) && mapCenter[0] ? mapCenter[0] : null);
      let finalOriginLon = originCoords ? originCoords[1] : (Array.isArray(mapCenter) && mapCenter[1] ? mapCenter[1] : null);
      let finalDestLat = destCoords ? destCoords[0] : null;
      let finalDestLon = destCoords ? destCoords[1] : null;

      if ((!finalOriginLat || !finalDestLat) && Array.isArray(routeGeometry) && routeGeometry.length >= 2) {
        if (!finalOriginLat) {
          finalOriginLat = routeGeometry[0][0];
          finalOriginLon = routeGeometry[0][1];
        }
        if (!finalDestLat) {
          finalDestLat = routeGeometry[routeGeometry.length - 1][0];
          finalDestLon = routeGeometry[routeGeometry.length - 1][1];
        }
      }

      const ridePayload = {
        origin: rideOrigin,
        destination: rideDest,
        price: ridePrice,
        distanceKm: rideDistance,
        vehicleType,
        originLat: finalOriginLat,
        originLon: finalOriginLon,
        destLat: finalDestLat,
        destLon: finalDestLon
      };

      const newRide = await requestRide(ridePayload);
      console.log('Ride created via API:', newRide);
      if (newRide && newRide.id) {
        setActiveRideId(newRide.id);
        setCurrentRide(newRide);
      }

      // Quita e limpa o débito pendente do passageiro no estado local (não volta a aparecer)
      setUserPendingDebt(0);

      // Limpa totalmente o print de tela para nunca persistir em novas solicitações
      setManualPriceInput('');
      setHasCompetitionDiscount(false);
      setShowCompetitionModal(false);
      setCompetitorPrintPrice(0);
      setCalculatedDiscountAmount(0);
      setManualPriceError('');
      setIsAnalyzingScreenshot(false);

      setRideState('SEARCHING');
    } catch (e) {
      console.error('Erro ao chamar motorista:', e);
      alert('Erro ao solicitar corrida. Tente novamente.');
      setManualPriceInput('');
      setHasCompetitionDiscount(false);
      setShowCompetitionModal(false);
      setCompetitorPrintPrice(0);
      setCalculatedDiscountAmount(0);
      setManualPriceError('');
      setIsAnalyzingScreenshot(false);
      setRideState('IDLE');
    } finally {
      setIsLoading(false);
    }
  }

  // ============= Reset =============
  const resetFlow = () => {
    setDestAddr('')
    setDestCoords(null)
    setRouteGeometry([])
    setRouteKm('0')
    setVehicleType('car')
    setScheduleData({ date: '', time: '' })
    setRideState('IDLE')
    setIsSheetCollapsed(false)
    setCancelCountdown(119)
    setIsChatOpen(false)
    setChatMessages([])
    setActiveRideId(null)
    setCurrentRide(null)
    setIsIntercity(false)
    setPassengersCount(1)
    setStops([])
    // Reset competition discount (per-trip only - nunca persiste para novas solicitações)
    setHasCompetitionDiscount(false)
    setShowCompetitionModal(false)
    setCompPriceRead(0)
    setManualPriceInput('')
    setCompetitorPrintPrice(0)
    setCalculatedDiscountAmount(0)
    setManualPriceError('')
    setIsAnalyzingScreenshot(false)
  }

  // ============= Markers for map =============
  const allMarkers = [originCoords, ...stops.map(s => s.coords), destCoords].filter(Boolean)

  return (
    <div className="passenger-app">

      {/* ===== MAP ===== */}
      <div className="passenger-map-bg">
        <MapContainer center={mapCenter} zoom={16} zoomControl={false} style={{width:'100%', height:'100%'}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          <MapController center={mapCenter} markers={allMarkers} />
          {originCoords && (
            <Marker position={originCoords} icon={rideState === 'SEARCHING' ? sonarIcon : originIcon}>
              <Popup autoPan={false}>
                <div style={{fontWeight:800}}>{rideState === 'SEARCHING' ? 'Buscando motoristas...' : 'Partida'}</div>
                <div style={{fontSize:'0.75rem'}}>{originAddr}</div>
              </Popup>
            </Marker>
          )}
          {rideState === 'SEARCHING' && searchingDrivers.map(drv => (
             <Marker key={`searching-drv-${drv.id}`} position={drv.pos} icon={L.divIcon({
               className: 'custom-car-pin-animated',
               html: `<div style="background:#18181b;width:32px;height:32px;border-radius:50%;border:3px solid #00E676;box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">🚗</div>`,
               iconSize: [32, 32],
               iconAnchor: [16, 16]
             })} />
          ))}
          {stops.filter(s => s.coords).map((stop, i) => (
             <Marker key={`stop-marker-${i}`} position={stop.coords} icon={stopIcon}>
               <Popup autoPan={false}>
                 <div style={{fontWeight:800}}>Parada {i+1}</div>
                 <div style={{fontSize:'0.75rem'}}>{stop.addr}</div>
               </Popup>
             </Marker>
          ))}
          {destCoords && (
            <Marker position={destCoords} icon={destIcon}>
              <Popup autoPan={false}>
                <div style={{fontWeight:800}}>Destino</div>
                <div style={{fontSize:'0.75rem'}}>{destAddr}</div>
              </Popup>
            </Marker>
          )}
          
          {Array.isArray(routeGeometry) && routeGeometry.length > 0 && (
            <Polyline positions={routeGeometry} color="#00E676" weight={6} opacity={0.9} lineCap="round" />
          )}
        </MapContainer>
      </div>

      {/* ===== TOP HEADER + ADDRESS INPUTS (always visible) ===== */}
      <div className="passenger-top-header">
        <div className="menu-btn" onClick={() => setIsMenuOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </div>
      </div>

      {/* ===== FIXED ADDRESS BAR (always on top) ===== */}
      {rideState === 'IDLE' && (
        <div className="fixed-address-bar animate-fade-in">
          <div className="route-inputs">
            <div className="route-timeline" style={{paddingTop: '8px', paddingBottom: '8px'}}>
              <div className="dot-start" style={{width:'6px', height:'6px'}}></div>
              <div className="timeline-line"></div>
              {stops.map((_, si) => (
                <React.Fragment key={`dot-stop-${si}`}>
                  <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#f59e0b',border:'1px solid #fff',boxShadow:'0 1px 4px rgba(0,0,0,0.15)',zIndex:1}}></div>
                  <div className="timeline-line"></div>
                </React.Fragment>
              ))}
              <div className="dot-end" style={{width:'6px', height:'6px'}}></div>
            </div>
            <div className="route-fields">
              <input
                className="route-input"
                value={originAddr}
                onFocus={() => {
                  if (!originAddr || originAddr.trim().length === 0) {
                    showOriginGpsSuggestions();
                  }
                }}
                onChange={(e) => {
                  const v = e.target.value
                  setOriginAddr(v)
                  setOriginCoords(null)
                  if (!v || v.trim().length === 0) {
                    showOriginGpsSuggestions();
                  } else {
                    searchAddress(v, 'origin')
                  }
                }}
                onKeyDown={(e) => handleEnterKey(e, 'origin')}
                placeholder="Partida (ou toque para GPS)"
              />
              {stops.map((stop, si) => (
                <div key={`stop-${si}`} className="stop-input-row">
                  <input
                    className="route-input"
                    style={{flex:1}}
                    value={stop.addr}
                    onChange={(e) => {
                      const v = e.target.value
                      const newStops = [...stops]
                      newStops[si] = { addr: v, coords: null }
                      setStops(newStops)
                      searchAddress(v, `stop_${si}`)
                    }}
                    placeholder={`Parada ${si + 1}`}
                  />
                  <button 
                    className="remove-stop-btn" 
                    onMouseDown={(e) => { e.preventDefault(); setStops(stops.filter((_, i) => i !== si)) }}
                    title="Remover parada"
                  >✕</button>
                </div>
              ))}
              <input
                className="route-input"
                style={{borderTop: (stops.length > 0 || originAddr) ? '1px solid #f1f5f9' : 'none'}}
                value={destAddr}
                onFocus={() => {
                  if (!destAddr || destAddr.trim().length === 0) {
                    showDestSuggestions();
                  }
                }}
                onChange={(e) => {
                  const v = e.target.value
                  setDestAddr(v)
                  setDestCoords(null)
                  if (!v || v.trim().length === 0) {
                    showDestSuggestions();
                  } else {
                    searchAddress(v, 'dest')
                  }
                }}
                onKeyDown={(e) => handleEnterKey(e, 'dest')}
                placeholder="Para onde vamos? (Destino)"
              />
            </div>

            {/* Compact Add Stop Button — até 5 paradas */}
            {stops.length < 5 && (
              <button 
                className="add-stop-mini-btn" 
                onMouseDown={(e) => { e.preventDefault(); setStops([...stops, { addr: '', coords: null }]) }}
                title="Adicionar Parada"
              >
                +
              </button>
            )}

            {/* Suggestions dropdown */}
            {suggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {suggestions.map((s, i) => (
                  <div 
                    key={i} 
                    className="suggestion-item" 
                    onMouseDown={(e) => { 
                      e.preventDefault(); 
                      handleSelectSuggestion(s); 
                    }}
                    style={s.isGps ? { background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' } : {}}
                  >
                    <div className="suggestion-icon-wrap" style={s.isGps ? { background: '#dcfce7' } : {}}>
                      {s.isGps ? (
                        <span style={{ fontSize: '1rem' }}>📍</span>
                      ) : s.icon ? (
                        <span style={{ fontSize: '1rem' }}>{s.icon}</span>
                      ) : (
                        <MapPin size={15} color="#059669" />
                      )}
                    </div>
                    <div className="suggestion-text">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span className="suggestion-main" style={s.isGps ? { color: '#15803d', fontWeight: 800 } : {}}>
                          {s.title || s.display_name.split(',')[0]}
                        </span>
                        {s.tag && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#059669', background: '#dcfce7', padding: '1px 6px', borderRadius: '100px', flexShrink: 0 }}>
                            {s.tag}
                          </span>
                        )}
                      </div>
                      <span className="suggestion-sub" style={s.isGps ? { color: '#166534', fontWeight: 600 } : {}}>
                        {s.subtitle || s.display_name.split(',').slice(1, 3).join(',').trim()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {destAddr.trim().length >= 2 && !isLoading && (
            <button
              onClick={handleForceCalculate}
              style={{
                marginTop: '10px',
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#fff',
                fontWeight: 900,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(5, 150, 105, 0.35)',
                transition: 'all 0.2s'
              }}
            >
              <span>🚖</span> VER PREÇOS & PEDIR CARRO
            </button>
          )}

          {isLoading && (
            <div style={{marginTop:'10px', textAlign:'center', fontSize:'0.85rem', color:'#059669', fontWeight:700}}>
              ⏳ Calculando melhor rota...
            </div>
          )}
        </div>
      )}

      {/* ===== BOTTOM SHEET (Aparece apenas quando houver ação/fluxo em andamento) ===== */}
      {rideState !== 'IDLE' && (
        <div className={`passenger-bottom-sheet ${isSheetCollapsed ? 'collapsed' : ''}`}>
          <div className="sheet-drag-area" onClick={() => setIsSheetCollapsed(!isSheetCollapsed)}>
            <div className="sheet-handle"></div>
          </div>

          <div className="sheet-content-wrapper">

            {/* ---- STATE: FREIGHT ---- */}
            {rideState === 'FREIGHT' && (
              <div className="state-freight animate-fade-in-up">
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px'}}>
                  <button onClick={() => { setRideState('IDLE'); setFreightType(null); setFreightDescription(''); setRouteGeometry([]); setRouteKm('0'); }} style={{background:'none',border:'none',cursor:'pointer',fontSize:'1.4rem',padding:'4px'}}>←</button>
                  <h2 className="sheet-title" style={{margin:0}}>🚚 Frete: {freightType === 'caixas' ? 'Caixas' : 'Sacos & Sacolas'}</h2>
              </div>

              {/* Freight Address Inputs */}
              <div className="route-inputs" style={{marginBottom:'16px'}}>
                <div className="route-timeline">
                  <div className="dot-start"></div>
                  <div className="timeline-line"></div>
                  <div className="dot-end"></div>
                </div>
                <div className="route-fields">
                  <input
                    className="route-input start-input"
                    value={originAddr}
                    onChange={(e) => {
                      const v = e.target.value
                      setOriginAddr(v)
                      setOriginCoords(null)
                      searchAddress(v, 'origin')
                    }}
                    onKeyDown={(e) => handleEnterKey(e, 'origin')}
                    placeholder="Endereço de coleta"
                  />
                  <input
                    className="route-input end-input"
                    value={destAddr}
                    onChange={(e) => {
                      const v = e.target.value
                      setDestAddr(v)
                      setDestCoords(null)
                      searchAddress(v, 'dest')
                    }}
                    onKeyDown={(e) => handleEnterKey(e, 'dest')}
                    placeholder="Endereço de entrega"
                  />
                </div>
                {suggestions.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {suggestions.map((s, i) => (
                      <div key={i} className="suggestion-item" onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s) }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>{s.display_name.split(',').slice(0, 3).join(',')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Description */}
              <div style={{marginBottom:'16px'}}>
                <label style={{fontSize:'0.85rem',fontWeight:700,color:'#374151',display:'block',marginBottom:'8px'}}>Descrição do Produto</label>
                <textarea
                  value={freightDescription}
                  onChange={(e) => setFreightDescription(e.target.value)}
                  placeholder={freightType === 'caixas' ? 'Ex: 3 caixas de mudança, peso aprox. 20kg cada...' : 'Ex: 5 sacolas de compras do supermercado...'}
                  style={{
                    width:'100%',
                    minHeight:'80px',
                    padding:'14px',
                    borderRadius:'14px',
                    border:'1px solid #d1d5db',
                    fontSize:'0.9rem',
                    fontFamily:'inherit',
                    resize:'vertical',
                    outline:'none',
                    transition:'border-color 0.2s',
                    boxSizing:'border-box',
                    marginBottom:'12px'
                  }}
                  onFocus={(e) => e.target.style.borderColor='#10b981'}
                  onBlur={(e) => e.target.style.borderColor='#d1d5db'}
                />

                <div style={{display:'flex', gap:'12px', flexWrap:'wrap'}}>
                  <div style={{flex:1, minWidth:'150px'}}>
                    <label style={{fontSize:'0.75rem',fontWeight:700,color:'#374151',display:'block',marginBottom:'6px'}}>Quem receberá? (Opcional)</label>
                    <input
                      value={freightContactName}
                      onChange={(e) => setFreightContactName(e.target.value)}
                      placeholder="Nome de quem recebe"
                      style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #d1d5db',fontSize:'0.9rem',outline:'none'}}
                    />
                  </div>
                  <div style={{flex:1, minWidth:'150px'}}>
                    <label style={{fontSize:'0.75rem',fontWeight:700,color:'#374151',display:'block',marginBottom:'6px'}}>Telefone de Contato (Opcional)</label>
                    <input
                      type="tel"
                      value={freightContactPhone}
                      onChange={(e) => setFreightContactPhone(e.target.value)}
                      placeholder="(21) 99999-9999"
                      style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #d1d5db',fontSize:'0.9rem',outline:'none'}}
                    />
                  </div>
                </div>
              </div>

              {/* Freight Price Result */}
              {parseFloat(routeKm) > 0 && (
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'16px',padding:'20px',marginBottom:'16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                    <span style={{fontSize:'0.85rem',fontWeight:700,color:'#166534'}}>Distância</span>
                    <span style={{fontSize:'0.95rem',fontWeight:800,color:'#166534'}}>{routeKm} km</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'1rem',fontWeight:800,color:'#166534'}}>Valor do Frete</span>
                    <span style={{fontSize:'1.4rem',fontWeight:900,color:'#059669'}}>R$ {Math.max(parseFloat(routeKm) * FREIGHT_PRICE_PER_KM, 15.00).toFixed(2)}</span>
                  </div>
                  <p style={{margin:'12px 0 0',fontSize:'0.75rem',color:'#6b7280',fontWeight:600}}>Valor final calculado pela distância da rota</p>
                </div>
              )}

              {/* Payment Method Selector */}
              {parseFloat(routeKm) > 0 && (
                <div style={{marginBottom:'16px'}}>
                  <label style={{fontSize:'0.85rem',fontWeight:700,color:'#374151',display:'block',marginBottom:'8px'}}>Forma de Pagamento</label>
                  <div style={{display:'flex', gap:'12px'}}>
                    <button
                      onClick={() => setPaymentMethod('PIX')}
                      style={{
                        flex:1, padding:'14px', borderRadius:'12px', fontWeight:800, cursor:'pointer', transition:'all 0.2s',
                        border: paymentMethod === 'PIX' ? '2px solid #10b981' : '1px solid #d1d5db',
                        background: paymentMethod === 'PIX' ? '#ecfdf5' : '#fff',
                        color: paymentMethod === 'PIX' ? '#059669' : '#4b5563'
                      }}
                    >
                      <span style={{fontSize:'1.1rem', marginRight:'4px'}}>❖</span> PIX
                    </button>
                    <button
                      onClick={() => setPaymentMethod('DINHEIRO')}
                      style={{
                        flex:1, padding:'14px', borderRadius:'12px', fontWeight:800, cursor:'pointer', transition:'all 0.2s',
                        border: paymentMethod === 'DINHEIRO' ? '2px solid #10b981' : '1px solid #d1d5db',
                        background: paymentMethod === 'DINHEIRO' ? '#ecfdf5' : '#fff',
                        color: paymentMethod === 'DINHEIRO' ? '#059669' : '#4b5563'
                      }}
                    >
                      <span style={{fontSize:'1.1rem', marginRight:'4px'}}>💵</span> Dinheiro
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Freight */}
              <button
                className="btn btn-primary btn-request"
                style={{width:'100%', padding:'16px', fontWeight:800, fontSize:'1rem', borderRadius:'14px', background:'#059669'}}
                disabled={!freightDescription.trim()}
                onClick={async () => {
                  if (parseFloat(routeKm) === 0) {
                    alert('Por favor, selecione um endereço válido nas sugestões para calcularmos a distância do frete.');
                    return;
                  }
                  if (!freightDescription.trim()) {
                    alert('Por favor, descreva o que será transportado.');
                    return;
                  }
                  const newCode = Math.floor(1000 + Math.random() * 9000).toString();
                  setFreightSecurityCode(newCode);

                  const freightPrice = Math.max(parseFloat(routeKm) * FREIGHT_PRICE_PER_KM, 15.00);
                  try {
                    let finalFreightOriginLat = originCoords ? originCoords[0] : (Array.isArray(mapCenter) && mapCenter[0] ? mapCenter[0] : null);
                    let finalFreightOriginLon = originCoords ? originCoords[1] : (Array.isArray(mapCenter) && mapCenter[1] ? mapCenter[1] : null);
                    let finalFreightDestLat = destCoords ? destCoords[0] : null;
                    let finalFreightDestLon = destCoords ? destCoords[1] : null;

                    const ridePayload = {
                      origin: originAddr?.trim() || 'Coleta Frete',
                      destination: destAddr?.trim() || 'Entrega Frete',
                      price: freightPrice,
                      distanceKm: parseFloat(routeKm) || 1.0,
                      vehicleType: `freight_${freightType || 'caixas'}`,
                      originLat: finalFreightOriginLat,
                      originLon: finalFreightOriginLon,
                      destLat: finalFreightDestLat,
                      destLon: finalFreightDestLon
                    };
                    const newRide = await requestRide(ridePayload);
                    if (newRide?.id) {
                      setActiveRideId(newRide.id);
                      setCurrentRide(newRide);
                    }
                  } catch (e) {
                    console.warn('Erro ao registrar frete:', e);
                  }

                  alert(`✅ Frete solicitado!\n\nTipo: ${freightType === 'caixas' ? 'Caixas' : 'Sacos & Sacolas'}\nDescrição: ${freightDescription}\nContato: ${freightContactName || 'Não informado'} ${freightContactPhone ? `(${freightContactPhone})` : ''}\nColeta: ${originAddr}\nEntrega: ${destAddr}\nDistância: ${routeKm} km\nValor: R$ ${freightPrice.toFixed(2)}\nPagamento: ${paymentMethod === 'PIX' ? 'PIX ❖' : 'Dinheiro 💵'}\n\nCódigo Temporário: ${newCode}\n\nProcurando motorista...`);
                  setRideState('SEARCHING');
                }}
              >
                🚚 SOLICITAR FRETE {parseFloat(routeKm) > 0 ? `— R$ ${Math.max(parseFloat(routeKm) * FREIGHT_PRICE_PER_KM, 15.00).toFixed(2)}` : ''}
              </button>
            </div>
          )}

          {/* ---- STATE: PRICED ---- */}
          {rideState === 'PRICED' && (
            <div className="state-priced animate-fade-in-up">
              <h2 className="sheet-title" style={{marginBottom:'8px'}}>Resumo da Viagem</h2>
              <p className="route-desc">{originAddr} → {stops.filter(s => s.addr).map(s => s.addr).join(' → ')}{stops.filter(s => s.addr).length > 0 ? ' → ' : ''}{destAddr}</p>

              {stops.filter(s => s.addr).length > 0 && (
                <div style={{
                  background:'#fffbeb', border:'1px solid #fde68a', padding:'12px 16px',
                  borderRadius:'12px', marginBottom:'16px', display:'flex',
                  alignItems:'center', gap:'10px'
                }}>
                  <span style={{fontSize:'1.1rem'}}>📍</span>
                  <div>
                    <span style={{fontWeight:700, color:'#92400e', fontSize:'0.85rem'}}>
                      {stops.filter(s => s.addr).length} parada{stops.filter(s => s.addr).length > 1 ? 's' : ''} adicionada{stops.filter(s => s.addr).length > 1 ? 's' : ''}
                    </span>
                    <span style={{fontWeight:800, color:'#b45309', fontSize:'0.85rem', marginLeft:'8px'}}>
                      +R$ {(stops.filter(s => s.addr).length * 2).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Vehicle Type Selector */}
              <div className="vehicle-selector">
                <div
                  className={`vehicle-option ${vehicleType === 'car' ? 'active' : ''}`}
                  onClick={() => setVehicleType('car')}
                >
                  <div style={{display:'flex', alignItems:'center', gap:'12px', width:'100%'}}>
                    <span className="vehicle-icon">🚗</span>
                    <div className="vehicle-details">
                      <span className="vehicle-name">{isTripIntercity ? 'Carro Seguro' : 'Carro'}</span>
                      <span className="vehicle-price">R$ {(parseFloat(getPrice(routeKm, 'car', false)) + userPendingDebt).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {vehicleType === 'car' && (
                    <div className="integrated-counter-border" onClick={(e) => e.stopPropagation()}>
                       <div className="counter-label">
                         <User size={12} />
                         <span>Pessoas</span>
                       </div>
                       <div className="counter-actions-spaced">
                         <button onClick={() => setPassengersCount(Math.max(1, passengersCount - 1))}>-</button>
                         <span className="count">{passengersCount}</span>
                         <button onClick={() => setPassengersCount(Math.min(4, passengersCount + 1))}>+</button>
                       </div>
                    </div>
                  )}
                  <span className="vehicle-info">{isTripIntercity ? 'Viagem Longa' : 'Conforto'}</span>
                </div>
                
                {!isTripIntercity && (
                  <div
                    className={`vehicle-option ${vehicleType === 'moto' ? 'active' : ''}`}
                    onClick={() => setVehicleType('moto')}
                  >
                    <span className="vehicle-icon">🏍️</span>
                    <div className="vehicle-details">
                      <span className="vehicle-name">Moto</span>
                      <span className="vehicle-price">R$ {(parseFloat(getPrice(routeKm, 'moto', false)) + userPendingDebt).toFixed(2)}</span>
                    </div>
                    <span className="vehicle-info">Econômico</span>
                  </div>
                )}
              </div>

              <div className="price-box">
                <div className="price-val">
                  <span className="currency">R$</span> {(parseFloat(getPrice(routeKm, vehicleType, false)) + userPendingDebt).toFixed(2)}
                </div>
                <div className="dist-val">
                  {routeKm} km estimado
                  {userPendingDebt > 0 && (
                    <span style={{ color: '#ef4444', fontWeight: 800, display: 'block', fontSize: '0.72rem', marginTop: '2px' }}>
                      (inclui R$ {userPendingDebt.toFixed(2)} de débito anterior a quitar nesta corrida)
                    </span>
                  )}
                </div>
              </div>

              {parseFloat(routeKm) * (vehicleType === 'car' ? config.pricePerKmCar : config.pricePerKmMoto) < (vehicleType === 'car' ? config.minFareCar : config.minFareMoto) && (
                <p className="hint-text" style={{marginBottom:'12px', color:'#f59e0b'}}>
                  ⚠️ Tarifa mínima aplicada ({vehicleType === 'car' ? `Carro: R$ ${parseFloat(config.minFareCar).toFixed(2)}` : `Moto: R$ ${parseFloat(config.minFareMoto).toFixed(2)}`})
                </p>
              )}

              {/* Payment Method Selector */}
              <div style={{marginBottom:'16px'}}>
                <label style={{fontSize:'0.85rem',fontWeight:700,color:'#374151',display:'block',marginBottom:'8px'}}>Forma de Pagamento</label>
                <div style={{display:'flex', gap:'12px'}}>
                  <button
                    onClick={() => setPaymentMethod('PIX')}
                    style={{
                      flex:1, padding:'14px', borderRadius:'12px', fontWeight:800, cursor:'pointer', transition:'all 0.2s',
                      border: paymentMethod === 'PIX' ? '2px solid #10b981' : '1px solid #d1d5db',
                      background: paymentMethod === 'PIX' ? '#ecfdf5' : '#fff',
                      color: paymentMethod === 'PIX' ? '#059669' : '#4b5563'
                    }}
                  >
                    <span style={{fontSize:'1.1rem', marginRight:'4px'}}>❖</span> PIX
                  </button>
                  <button
                    onClick={() => setPaymentMethod('DINHEIRO')}
                    style={{
                      flex:1, padding:'14px', borderRadius:'12px', fontWeight:800, cursor:'pointer', transition:'all 0.2s',
                      border: paymentMethod === 'DINHEIRO' ? '2px solid #10b981' : '1px solid #d1d5db',
                      background: paymentMethod === 'DINHEIRO' ? '#ecfdf5' : '#fff',
                      color: paymentMethod === 'DINHEIRO' ? '#059669' : '#4b5563'
                    }}
                  >
                    <span style={{fontSize:'1.1rem', marginRight:'4px'}}>💵</span> Dinheiro
                  </button>
                </div>
              </div>

              {/* Discriminativo Transparente de Débito Pendente da Corrida Anterior */}
              {userPendingDebt > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
                  border: '2px solid #ef4444',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '16px',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '1.6rem' }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 4px', fontSize: '0.92rem', fontWeight: 900, color: '#991b1b' }}>
                        DÉBITO PENDENTE DE CORRIDA ANTERIOR
                      </h4>
                      <p style={{ margin: '0 0 10px', fontSize: '0.76rem', color: '#7f1d1d', fontWeight: 600, lineHeight: 1.4 }}>
                        Sua última corrida foi encerrada durante o percurso. O valor proporcional de <strong>R$ {userPendingDebt.toFixed(2)}</strong> referente ao KM percorrido será quitado ao final desta nova corrida.
                      </p>
                      
                      {/* Discriminativo Transparente de Valores */}
                      <div style={{
                        background: '#fff',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        border: '1px solid #fca5a5'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#4b5563', marginBottom: '4px' }}>
                          <span>🚗 Tarifa da Nova Corrida:</span>
                          <strong style={{ color: '#111827' }}>R$ {getPrice(routeKm, vehicleType, false)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#dc2626', marginBottom: '6px' }}>
                          <span>⏱️ Débito da Corrida Anterior:</span>
                          <strong>+ R$ {userPendingDebt.toFixed(2)}</strong>
                        </div>
                        <div style={{
                          borderTop: '1px solid #fee2e2',
                          paddingTop: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.92rem',
                          fontWeight: 900,
                          color: '#991b1b'
                        }}>
                          <span>Total a Pagar ao Final:</span>
                          <span>R$ {(parseFloat(getPrice(routeKm, vehicleType, false)) + userPendingDebt).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === PREÇO IMBATÍVEL — Upload de Print da Uber/99 (Sempre visível) === */}
              {(isTestAccount || imbativelRidesLeft > 0) && (
                <div style={{
                  marginTop: '8px',
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
                  border: '2px solid #fecaca',
                  borderRadius: '16px',
                  padding: '18px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '1.6rem' }}>🔥</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: '#b91c1c' }}>
                        PREÇO IMBATÍVEL ZOMP
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 600, color: '#991b1b' }}>
                        Viu mais barato na Uber ou 99? Envie o print da corrida com percurso e valor para cobrirmos com desconto exclusivo! ({isTestAccount ? 'Ilimitado - Conta de Testes' : `${imbativelRidesLeft} restante${imbativelRidesLeft > 1 ? 's' : ''} hoje`})
                      </p>
                    </div>
                  </div>

                  <div style={{
                    background: '#fff',
                    border: '2px dashed #fca5a5',
                    borderRadius: '14px',
                    padding: '18px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      id="imbativel-screenshot-priced"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        setIsAnalyzingScreenshot(true);
                        setManualPriceError('');
                        setHasCompetitionDiscount(false);

                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          const imageSrc = ev.target.result;
                          try {
                            const zompBasePrice = parseFloat(getPrice(routeKm, vehicleType, false)) || 35.0;
                            
                            // 1. Tenta OCR inteligente no client-side para extrair o valor real do print da Uber/99
                            let detectedPrintPrice = null;
                            try {
                              const ocrPromise = Tesseract.recognize(imageSrc, 'por+eng');
                              const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
                              const ocrResult = await Promise.race([ocrPromise, timeoutPromise]);
                              if (ocrResult?.data?.text) {
                                detectedPrintPrice = extractPriceFromOcrText(ocrResult.data.text);
                              }
                            } catch (ocrErr) {
                              console.warn('Aviso no OCR client-side, prosseguindo com fallback inteligente:', ocrErr);
                            }

                            // Se não detectou via OCR, utiliza como valor inicial do print uma estimativa realista
                            const initialPrintVal = detectedPrintPrice || (zompBasePrice > 12 ? (zompBasePrice - 3.0) : 25.0);

                            // 2. Valida no backend
                            const result = await validateScreenshot(imageSrc, initialPrintVal, zompBasePrice);
                            
                            setIsAnalyzingScreenshot(false);
                            const finalPrintPrice = detectedPrintPrice || result.printPrice || initialPrintVal;
                            const discount = calculateDiscountForPrintPrice(finalPrintPrice);

                            setCompetitorPrintPrice(finalPrintPrice);
                            setCalculatedDiscountAmount(discount);
                            setManualPriceInput(imageSrc);
                            setHasCompetitionDiscount(true);
                            setShowCompetitionModal(true);
                            setManualPriceError('');
                            
                            const leftCount = isTestAccount ? 999 : (result.ridesLeftToday ?? 3);
                            setImbativelRidesLeft(leftCount);
                            if (!isTestAccount) {
                              localStorage.setItem('zomp_imbativel_rides_left', String(leftCount));
                            }
                          } catch (err) {
                            setIsAnalyzingScreenshot(false);
                            setManualPriceError(err.message || 'Erro ao validar print da concorrência.');
                            setHasCompetitionDiscount(false);
                            setShowCompetitionModal(false);
                            setManualPriceInput('');
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <label htmlFor="imbativel-screenshot-priced" style={{ cursor: 'pointer', display: 'block' }}>
                      {isAnalyzingScreenshot ? (
                        <div style={{ padding: '10px 0' }}>
                          <div style={{ fontSize: '1.8rem', animation: 'spin 1s linear infinite' }}>🔍</div>
                          <p style={{ margin: '8px 0 2px', fontSize: '0.85rem', fontWeight: 800, color: '#b91c1c' }}>
                            Inteligência Zomp analisando print...
                          </p>
                          <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af' }}>
                            Lendo valores e percurso da Uber / 99
                          </p>
                        </div>
                      ) : manualPriceInput && manualPriceInput.startsWith('data:image') ? (
                        <div>
                          <img 
                            src={manualPriceInput} 
                            alt="Print da concorrência" 
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '100px', 
                              borderRadius: '10px', 
                              marginBottom: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                            }} 
                          />
                          <p style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, margin: 0 }}>
                            ✅ Print Uber/99 verificado! Toque para alterar.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <Camera size={28} color="#ef4444" style={{ marginBottom: '6px' }} />
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#b91c1c' }}>
                            Enviar Print da Uber ou 99
                          </p>
                          <p style={{ margin: '3px 0 0', fontSize: '0.68rem', fontWeight: 600, color: '#9ca3af' }}>
                            Toque para anexar o print com trajeto e valor
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  {manualPriceError && (
                    <p style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 800, margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '1rem' }}>⚠️</span> {manualPriceError}
                    </p>
                  )}

                  {hasCompetitionDiscount && !manualPriceError && (
                    <div className="animate-bounce-subtle" style={{
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      padding: '16px',
                      borderRadius: '14px',
                      border: '2px solid #34d399',
                      marginTop: '12px',
                      boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.4)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Check size={18} strokeWidth={3} /> <span>PRINT UBER/99 VALIDADO!</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCompetitionModal(true)}
                          style={{
                            background: 'rgba(255,255,255,0.25)',
                            border: '1px solid rgba(255,255,255,0.4)',
                            color: '#fff',
                            borderRadius: '8px',
                            padding: '3px 8px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          Ver Destaque ↗
                        </button>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '100px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.9rem' }}>🏆</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fff' }}>MAIS BARATO QUE UBER E 99!</span>
                      </div>

                      {/* Campo para conferir ou ajustar o valor lido do print */}
                      <div style={{
                        background: 'rgba(0,0,0,0.25)',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid rgba(255,255,255,0.15)'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: '#ecfdf5', fontWeight: 800, display: 'block' }}>
                            📱 Valor no print da concorrência (Uber/99):
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                            O desconto é aplicado diretamente sobre este valor
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem' }}>R$</span>
                          <input
                            type="number"
                            step="0.10"
                            value={competitorPrintPrice || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setCompetitorPrintPrice(val);
                              const disc = calculateDiscountForPrintPrice(val);
                              setCalculatedDiscountAmount(disc);
                            }}
                            style={{
                              width: '80px',
                              padding: '6px 8px',
                              borderRadius: '8px',
                              border: '2px solid #34d399',
                              background: '#fff',
                              color: '#065f46',
                              fontWeight: 900,
                              fontSize: '1rem',
                              textAlign: 'right'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '10px' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#ecfdf5', fontWeight: 600 }}>
                            Valor no Print: <span style={{ textDecoration: 'line-through' }}>R$ {competitorPrintPrice.toFixed(2)}</span>
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: '1.1rem', color: '#fff', fontWeight: 900 }}>
                            Novo Preço Zomp: <span style={{ fontSize: '1.4rem', color: '#a7f3d0' }}>R$ {Math.max(competitorPrintPrice - calculatedDiscountAmount, 8.00).toFixed(2)}</span>
                          </p>
                        </div>
                        <div style={{ background: '#fff', color: '#059669', padding: '6px 14px', borderRadius: '10px', fontWeight: 900, fontSize: '0.9rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                          <span style={{ display: 'block', fontSize: '0.65rem', color: '#047857', fontWeight: 700 }}>ECONOMIA</span>
                          -R$ {calculatedDiscountAmount.toFixed(2)}
                        </div>
                      </div>

                      {/* Dica para cancelar na concorrência */}
                      <div style={{
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>💡</span>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#ecfdf5', fontWeight: 600, lineHeight: '1.4' }}>
                          O Zomp cobriu o preço do print! Cancele no outro app e chame agora pelo Zomp por <strong>R$ {Math.max(competitorPrintPrice - calculatedDiscountAmount, 8.00).toFixed(2)}</strong> com desconto direto sobre o print.
                        </p>
                      </div>

                      {/* Botão de chamada rápida com desconto */}
                      <button
                        onClick={handleCallNow}
                        disabled={isLoading}
                        style={{
                          width: '100%',
                          marginTop: '12px',
                          padding: '14px',
                          borderRadius: '12px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #fff 0%, #f0fdf4 100%)',
                          color: '#047857',
                          fontWeight: 900,
                          fontSize: '1rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                          transition: 'all 0.2s',
                          opacity: isLoading ? 0.7 : 1
                        }}
                      >
                        <span style={{ fontSize: '1.3rem' }}>⚡</span>
                        {isLoading ? 'Chamando...' : `CHAMAR ZOMP POR R$ ${Math.max(competitorPrintPrice - calculatedDiscountAmount, 8.00).toFixed(2)} — MAIS BARATO!`}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="action-buttons mt-4">
                <button className="btn btn-schedule" onClick={() => setRideState('SCHEDULING')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {' '}Agendar
                </button>
                <button className="btn btn-primary btn-request" onClick={handleCallNow}>
                  Chamar Agora
                </button>
              </div>

              <button
                className="btn btn-secondary"
                style={{width:'100%', marginTop:'12px'}}
                onClick={resetFlow}
              >
                ← Alterar endereços
              </button>
            </div>
          )}

          {/* ---- STATE: SCHEDULING ---- */}
          {rideState === 'SCHEDULING' && (
            <div className="state-scheduling animate-fade-in">
              <h2 className="sheet-title">Agendar Partida</h2>
              <p className="route-desc">{originAddr} → {destAddr}</p>

              <div className="vehicle-selector" style={{marginBottom:'16px'}}>
                <div className={`vehicle-option ${vehicleType === 'car' ? 'active' : ''}`} onClick={() => setVehicleType('car')}>
                  <span className="vehicle-icon">🚗</span>
                  <div className="vehicle-details"><span className="vehicle-name">Carro</span><span className="vehicle-price">R$ {getPrice(routeKm, 'car')}</span></div>
                </div>
                <div className={`vehicle-option ${vehicleType === 'moto' ? 'active' : ''}`} onClick={() => setVehicleType('moto')}>
                  <span className="vehicle-icon">🏍️</span>
                  <div className="vehicle-details"><span className="vehicle-name">Moto</span><span className="vehicle-price">R$ {getPrice(routeKm, 'moto')}</span></div>
                </div>
              </div>

              <p className="hint-text" style={{marginBottom:'16px'}}>Escolha a data e hora da partida. Corridas com +2h de antecedência pré-acionam seus favoritos.</p>

              <div className="scheduling-inputs">
                <input
                  type="date"
                  className="schedule-input"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData({...scheduleData, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
                <input
                  type="time"
                  className="schedule-input"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData({...scheduleData, time: e.target.value})}
                />
              </div>

              <div className="price-box" style={{marginTop:'16px'}}>
                <div className="price-val">
                  <span className="currency">R$</span> {getPrice(routeKm, vehicleType)}
                </div>
                <div className="dist-val">{routeKm} km • {vehicleType === 'car' ? 'Carro' : 'Moto'}</div>
              </div>

              <div className="action-buttons mt-4">
                <button className="btn btn-secondary" style={{flex:1}} onClick={() => setRideState('PRICED')}>
                  ← Voltar
                </button>
                <button
                  className="btn btn-primary"
                  style={{flex:2}}
                  disabled={!scheduleData.date || !scheduleData.time}
                  onClick={() => {
                    const newRide = {
                      id: Date.now(),
                      origin: originAddr,
                      dest: destAddr,
                      date: scheduleData.date,
                      time: scheduleData.time,
                      vehicle: vehicleType,
                      price: getPrice(routeKm, vehicleType),
                      km: routeKm
                    }
                    setScheduledRides(prev => [...prev, newRide])
                    alert(`✅ Viagem agendada com sucesso!\n\n📅 ${scheduleData.date} às ${scheduleData.time}\n${vehicleType === 'car' ? '🚗 Carro' : '🏍️ Moto'} — R$ ${getPrice(routeKm, vehicleType)}`)
                    resetFlow()
                  }}
                >
                  Confirmar Agendamento
                </button>
              </div>
            </div>
          )}

          {/* ---- STATE: SEARCHING ---- */}
          {rideState === 'SEARCHING' && (
            <div className="state-searching animate-fade-in text-center">
              <div className="search-radar"></div>
              <h3 style={{marginTop:'24px'}}>
                Buscando motoristas...
              </h3>
              <p className="hint-text">Aguarde enquanto conectamos você ao melhor parceiro próximo.</p>

              {hasCompetitionDiscount && (
                <div style={{
                  background: '#ecfdf5', border: '1px solid #34d399',
                  borderRadius: '12px', padding: '12px', marginTop: '12px',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <Check size={18} color="#059669" strokeWidth={3} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#059669' }}>
                    Desconto Imbatível de R$ {calculatedDiscountAmount.toFixed(2)} sobre o print será aplicado!
                  </span>
                </div>
              )}

              <button className="btn btn-secondary mt-4 w-full" onClick={async () => {
                if (activeRideId) {
                  try {
                    await cancelRide(activeRideId, 'CANCELLED');
                  } catch (err) {
                    console.warn('Erro ao cancelar corrida no backend:', err);
                  }
                }
                setActiveRideId(null);
                setCurrentRide(null);
                setHasCompetitionDiscount(false);
                setManualPriceError('');
                setManualPriceInput('');
                setRideState('PRICED');
              }}>
                Cancelar Busca
              </button>
            </div>
          )}

          {/* ---- STATE: ACCEPTED ---- */}
          {rideState === 'ACCEPTED' && (currentRide || favoriteDriversState.length > 0) && (
            <div className="state-accepted animate-fade-in-up">
              <div className="match-header">
                <span className="badge-nearby">MOTORISTA A CAMINHO</span>
                <h3>{routeDuration ? `${routeDuration} min` : '4 min'}</h3>
              </div>
              <div className="driver-card-large" style={{marginBottom: '12px'}}>
                <img src={currentRide?.driverPhoto || favoriteDriversState[0].img} alt={currentRide?.driverName || favoriteDriversState[0].name} className="drv-avatar" />
                <div className="drv-info">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <h4>{currentRide?.driverName || favoriteDriversState[0].name}</h4>
                  </div>
                  <div className="drv-metrics" style={{display:'flex', gap:'12px', alignItems:'center'}}>
                    <div className="drv-rating">⭐ {Number(currentRide?.driverRating || favoriteDriversState[0].rating).toFixed(1)}</div>
                    <div className="drv-rides" style={{fontSize:'0.75rem', fontWeight:700, color:'#64748b'}}>
                       {(currentRide?.driverRidesCompleted || 0) > 0 ? `${currentRide.driverRidesCompleted} corridas` : <span className="ap-badge-new" style={{margin:0}}>Novo</span>}
                    </div>
                  </div>
                </div>
                <div className="drv-car">
                  <span className="car-model">{currentRide?.driverCarColor ? `${currentRide.driverCarColor} ` : ''}{currentRide?.driverCarModel || favoriteDriversState[0].car}</span>
                  <span className="car-plate">{currentRide?.driverCarPlate || favoriteDriversState[0].plate}</span>
                </div>
              </div>

              {/* Card de Pagamento PIX Antecipado ao Motorista */}
              <div style={{
                background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                border: '2px solid #34d399',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px',
                boxShadow: '0 4px 15px rgba(5, 150, 105, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.4rem' }}>⚡</span>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#065f46' }}>
                      PAGAMENTO PIX ANTECIPADO
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#047857' }}>
                      Adiante o pagamento por PIX ao motorista para maior agilidade no desembarque!
                    </div>
                  </div>
                </div>
                <div style={{
                  background: '#fff', border: '1px solid #a7f3d0',
                  borderRadius: '12px', padding: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 700 }}>Chave PIX do Motorista</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827' }}>
                      {currentRide?.driverPixKey || 'Chave cadastrada no app'}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                      Valor: R$ {Number(currentRide?.price || getPrice(routeKm, vehicleType, true)).toFixed(2)}
                    </div>
                  </div>
                  <button
                    style={{
                      background: pixCopiedToast ? '#10b981' : '#059669', color: '#fff', border: 'none',
                      padding: '8px 14px', borderRadius: '10px', fontWeight: 800,
                      fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      const pix = currentRide?.driverPixKey || 'Chave cadastrada no app';
                      navigator.clipboard.writeText(pix);
                      setPixCopiedToast(true);
                      showToast('✅ Chave PIX copiada com sucesso!');
                      setTimeout(() => setPixCopiedToast(false), 3000);
                    }}
                  >
                    {pixCopiedToast ? '✓ Copiado!' : '📋 Copiar'}
                  </button>
                </div>
              </div>

              {routeDuration > 0 && (
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0', 
                  borderRadius: '12px', padding: '12px', marginBottom: '16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '1.2rem'}}>📍</span>
                    <div>
                      <div style={{fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Chegada ao destino em</div>
                      <div style={{fontWeight: 800, color: '#065f46'}}>Aprox. {routeDuration} min</div>
                    </div>
                  </div>
                  <div style={{fontWeight: 800, fontSize: '1.1rem', color: '#166534'}}>
                    ~ {routeKm} km
                  </div>
                </div>
              )}

              {freightType && freightSecurityCode && (
                <div style={{background: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '16px', marginBottom: '16px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                    <span style={{fontSize: '1.2rem'}}>🔐</span>
                    <span style={{fontWeight: 800, color: '#92400e', fontSize: '1rem'}}>Código de Segurança</span>
                  </div>
                  <div style={{background: '#fef3c7', padding: '12px', borderRadius: '12px', textAlign: 'center', marginBottom: '12px', border: '2px dashed #f59e0b'}}>
                    <span style={{fontSize: '2rem', fontWeight: 900, color: '#d97706', letterSpacing: '4px'}}>{freightSecurityCode}</span>
                  </div>
                  <p style={{margin: 0, fontSize: '0.8rem', color: '#b45309', fontWeight: 600, lineHeight: 1.4}}>
                    <strong style={{color: '#92400e'}}>Importante:</strong> Informe este código fornecido ao motorista nas pontas de <strong>Retirada e Entrega</strong>. O motorista será obrigado a anexar <strong>2 fotos</strong> (na Origem e no Destino) para validar seu frete.
                  </p>
                </div>
              )}

              <div className="action-buttons mt-4">
                <button 
                  className="btn btn-secondary" 
                  style={{flex:1}}
                  onClick={() => setIsChatOpen(true)}
                >
                  💬 Mensagem
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{flex:1, color:'#ef4444', display:'flex', flexDirection:'column', alignItems:'center', gap:'2px'}} 
                  onClick={async () => {
                    const statusVal = cancelCountdown > 0 ? 'CANCELED_FREE' : 'CANCELED_FEE';
                    const msg = cancelCountdown > 0 
                      ? 'Deseja realmente cancelar gratuitamente a corrida?' 
                      : 'O período de cancelamento grátis expirou. Uma taxa de deslocamento será cobrada na sua próxima corrida. Deseja cancelar mesmo assim?';

                    if (confirm(msg)) {
                      if (activeRideId) {
                        try {
                          const res = await cancelRide(activeRideId, {
                            status: statusVal,
                            isMidRideCancel: true,
                            distanceTravelledKm: parseFloat(routeKm) * 0.5
                          });
                          if (res && res.debtAdded && res.proportionalPrice > 0) {
                            alert(`⚠️ Corrida encerrada no percurso!\n\nPercurso percorrido: ${res.proportionPct}% do trajeto contratado.\nValor proporcional calculado: R$ ${res.proportionalPrice.toFixed(2)}.\n\nEste valor ficou acumulado na sua conta e será adicionado automaticamente na sua próxima corrida caso não seja pago agora.`);
                            setUserPendingDebt(res.proportionalPrice);
                          }
                        } catch (e) {
                          console.error('Erro ao cancelar ride no backend', e);
                        }
                      }
                      
                      const d = new Date()
                      const today = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
                      setRideHistory(prev => [{ id: Date.now(), date: today, origin: originAddr, dest: destAddr, price: statusVal === 'CANCELED_FREE' ? '0.00' : '2.80', vehicle: vehicleType === 'car' ? 'Carro' : 'Moto', status: statusVal }, ...prev])
                      resetFlow()
                    }
                  }}
                >
                  <span style={{fontWeight: 800}}>Cancelar</span>
                  {cancelCountdown > 0 ? (
                    <span style={{fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700}}>Grátis ({Math.floor(cancelCountdown / 60)}:{(cancelCountdown % 60).toString().padStart(2, '0')})</span>
                  ) : (
                    <span style={{fontSize: '0.7rem', color: '#ef4444', fontWeight: 700}}>Taxa Aplicável</span>
                  )}
                </button>
              </div>

              {/* Botão de simular chegada para ir para a tela de avaliação */}
              <button 
                className="btn btn-primary mt-4" 
                style={{width: '100%', background: '#059669', color: '#fff'}}
                onClick={() => {
                  setRatingStars(0);
                  setRideState('RATING');
                }}
              >
                Cheguei ao Destino 🏁
              </button>
            </div>
          )}

          {/* ---- STATE: NEAR_DESTINATION ---- */}
          {rideState === 'NEAR_DESTINATION' && currentRide && (
            <div className="state-near-destination animate-fade-in-up" style={{ padding: '20px 0' }}>
              <div className="match-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge-nearby" style={{ background: '#f59e0b', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '100px' }}>ÚLTIMOS 500 METROS</span>
                <h3 style={{ color: '#d97706', margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Chegando!</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600, margin: '0 0 20px 0', lineHeight: 1.4, textAlign: 'center' }}>
                Falta muito pouco para o seu destino. Prepare o pagamento para o motorista no Pix abaixo.
              </p>

              <div className="driver-card-large" style={{ marginBottom: '20px' }}>
                <img src={currentRide.driverPhoto || 'https://i.pravatar.cc/150?img=11'} alt={currentRide.driverName} className="drv-avatar" />
                <div className="drv-info">
                  <h4>{currentRide.driverName || 'Seu Motorista'}</h4>
                  <div className="drv-metrics" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="drv-rating">⭐ {Number(currentRide.driverRating || 5.0).toFixed(1)}</div>
                  </div>
                </div>
                <div className="drv-car">
                  <span className="car-model">{currentRide.driverCarModel || 'Carro Zomp'}</span>
                  <span className="car-plate">{currentRide.driverCarPlate || 'ZOMP-000'}</span>
                </div>
              </div>

              {paymentMethod === 'PIX' && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '1.2rem', color: '#10b981' }}>❖</span>
                    <span style={{ fontWeight: 800, color: '#15803d', fontSize: '1rem' }}>Pagar via PIX</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem' }}>Valor da Viagem:</span>
                    <span style={{ fontWeight: 900, color: '#166534', fontSize: '1.25rem' }}>R$ {Number(currentRide.price || 0).toFixed(2)}</span>
                  </div>
                  
                  {currentRide.driverPixKey ? (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#166534', marginBottom: '6px', textTransform: 'uppercase' }}>Chave PIX do Motorista</label>
                      <div style={{ background: '#ffffff', border: '1px solid #dcfce7', padding: '10px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#166534', fontSize: '0.9rem', wordBreak: 'break-all', marginRight: '8px' }}>
                          {currentRide.driverPixKey}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(currentRide.driverPixKey);
                            alert('Chave PIX copiada com sucesso!');
                          }}
                          style={{ background: '#10b981', border: 'none', padding: '8px 14px', borderRadius: '8px', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '10px', color: '#991b1b', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center' }}>
                      ⚠️ Chave PIX não cadastrada pelo motorista. Realize o pagamento diretamente em dinheiro.
                    </div>
                  )}
                  <p style={{ margin: '12px 0 0 0', fontSize: '0.72rem', color: '#166534', fontWeight: 600, lineHeight: 1.4, textAlign: 'center' }}>
                    Após transferir o valor, o motorista finalizará a corrida no painel dele.
                  </p>
                </div>
              )}

              {paymentMethod === 'DINHEIRO' && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '16px', borderRadius: '16px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.5rem' }}>💵</span>
                  <div>
                    <span style={{ fontWeight: 800, color: '#1e40af', display: 'block', fontSize: '0.95rem' }}>Pagamento em Dinheiro</span>
                    <span style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600 }}>Prepare o valor de <strong>R$ {Number(currentRide.price || 0).toFixed(2)}</strong> para pagar ao motorista no destino.</span>
                  </div>
                </div>
              )}

              <div className="action-buttons mt-4">
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '14px', fontWeight: 700 }}
                  onClick={() => setIsChatOpen(true)}
                >
                  💬 Chat com Motorista
                </button>
              </div>
            </div>
          )}

          {/* ---- STATE: RATING ---- */}
          {rideState === 'RATING' && (
            <div className="state-rating animate-fade-in-up" style={{textAlign: 'center', padding: '20px 0'}}>
              <h2 className="sheet-title" style={{marginBottom: '8px'}}>Corrida Finalizada!</h2>
              <p className="hint-text" style={{marginBottom: '24px'}}>Como foi a viagem com {favoriteDriversState[0]?.name || 'seu motorista'}?</p>
              
              {favoriteDriversState[0]?.img && (
                <img src={favoriteDriversState[0].img} alt={favoriteDriversState[0].name} style={{width:'80px',height:'80px',borderRadius:'50%',marginBottom:'16px',boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
              )}
              
              {paymentMethod === 'PIX' && (
                <div style={{background: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '16px', marginBottom: '24px', textAlign: 'left'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                    <span style={{fontSize: '1.2rem', color: '#10b981'}}>❖</span>
                    <span style={{fontWeight: 800, color: '#92400e', fontSize: '1rem'}}>Pagamento via PIX</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
                    <span style={{fontWeight: 600, color: '#b45309', fontSize: '0.9rem'}}>Valor Total:</span>
                    <span style={{fontWeight: 900, color: '#b45309', fontSize: '1.2rem'}}>R$ {freightType ? Math.max(parseFloat(routeKm) * FREIGHT_PRICE_PER_KM, 15.00).toFixed(2) : getPrice(routeKm, vehicleType)}</span>
                  </div>
                  <div style={{background: '#fef3c7', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{fontFamily: 'monospace', fontWeight: 600, color: '#d97706'}}>{favoriteDriversState[0].pixKey || 'Chave não cadastrada'}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(favoriteDriversState[0].pixKey || '');
                        alert('Chave PIX copiada com sucesso!');
                      }}
                      style={{background: '#f59e0b', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem'}}
                    >
                      Copiar Chave
                    </button>
                  </div>
                  <p style={{margin: '12px 0 0', fontSize: '0.75rem', color: '#b45309', fontWeight: 600, lineHeight: 1.4}}>
                    Realize a transferência PIX para liberar o motorista e registrar sua corrida.
                  </p>
                </div>
              )}

              <div style={{display:'flex',justifyContent:'center',gap:'8px',marginBottom:'32px'}}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span 
                    key={star} 
                    onClick={() => setRatingStars(star)}
                    style={{
                      fontSize: '2.5rem', 
                      cursor: 'pointer',
                      color: ratingStars >= star ? '#f59e0b' : '#e2e8f0',
                      transition: 'color 0.2s ease'
                    }}>
                    ★
                  </span>
                ))}
              </div>

              <button 
                className="btn btn-primary"
                style={{width: '100%', padding: '16px', fontSize: '1.05rem'}}
                disabled={ratingStars === 0}
                onClick={() => {
                  // Finalizar e salvar histórico
                  const d = new Date();
                  const today = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                  setRideHistory(prev => [{ id: Date.now(), date: today, origin: originAddr, dest: destAddr, price: getPrice(routeKm, vehicleType), vehicle: vehicleType === 'car' ? 'Carro' : 'Moto', status: 'COMPLETED' }, ...prev]);
                  
                  alert('Obrigado pela sua avaliação! 🌟');
                  resetFlow();
                }}
              >
                Enviar Avaliação
              </button>
            </div>
          )}

        </div>
      </div>
      )}

      {/* ===== SIDE MENU ===== */}
      {isMenuOpen && (
        <div className="side-menu-overlay" onClick={() => { setIsMenuOpen(false); setMenuScreen('MAIN') }}>
          <div className="side-menu-drawer animate-slide-right" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-close" onClick={() => { setIsMenuOpen(false); setMenuScreen('MAIN') }}>✕</div>
            <div className="menu-nav-list">

              {/* Logo no topo */}
              <div style={{padding: '48px 20px 0'}}>
                <img src="/logo.svg" alt="Zomp" style={{height: '26px'}} />
              </div>

              {menuScreen === 'MAIN' && (
                <>
                  {/* Header do usuário */}
                  <div className="menu-user-header">
                    <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                      <div className="user-avatar-large">
                        {user?.name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <h3 style={{margin:0, color:'#1a1a1a', fontSize:'0.95rem', fontWeight:700}}>
                          {user?.name || 'Passageiro'}
                        </h3>
                        <div style={{
                          fontSize:'0.65rem', color:'#059669', fontWeight:700,
                          letterSpacing:'1px', marginTop:'3px', textTransform:'uppercase'
                        }}>
                          Passageiro Elite
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Seção: VIAGENS ── */}
                  <div className="menu-section-label">Viagens</div>

                  <button className="menu-nav-btn" onClick={() => { resetFlow(); setIsMenuOpen(false) }}>
                    <span className="nav-icon"><MapPin size={17} /></span>
                    Nova Viagem
                  </button>

                  <button className="menu-nav-btn" onClick={() => setMenuScreen('SCHEDULED')}>
                    <span className="nav-icon"><Calendar size={17} /></span>
                    Agendamentos
                    {scheduledRides.length > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        background: '#dcfce7',
                        color: '#059669',
                        borderRadius: '50%',
                        width: '22px', height: '22px',
                        display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 800
                      }}>{scheduledRides.length}</span>
                    )}
                  </button>

                  {/* ── Seção: SERVIÇOS ── */}
                  <div className="menu-section-label">Serviços Especiais</div>
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('LONG_TRIPS')}>
                    <span className="nav-icon"><Send size={17} /></span>
                    Viagens Longas
                  </button>

                  <button className="menu-nav-btn" onClick={() => setMenuScreen('HISTORY')}>
                    <span className="nav-icon"><Clock size={17} /></span>
                    Histórico
                  </button>

                  {/* ── Seção: AJUDA & SUPORTE ── */}
                  <div className="menu-section-label">Ajuda & Suporte</div>

                  <button className="menu-nav-btn" style={{ color: '#059669', fontWeight: 700 }} onClick={() => setMenuScreen('SUPPORT')}>
                    <span className="nav-icon"><LifeBuoy size={17} color="#059669" /></span>
                    Suporte & Reportar Problemas
                  </button>

                  <div className="menu-spacer"></div>

                  {/* ── Logout ── */}
                  <button className="menu-nav-btn text-danger" onClick={() => { logout(); navigate('/passageiro') }}>
                    <span className="nav-icon"><LogOut size={17} /></span>
                    Sair do App
                  </button>
                </>
              )}

              {/* ===== TELA DE SUPORTE & REPORTAR PROBLEMAS DO PASSAGEIRO ===== */}
              {menuScreen === 'SUPPORT' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('MAIN')} style={{ color: 'var(--primary)', marginBottom: '8px', fontWeight: 700 }}>
                    ← Voltar ao Menu
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#090d16', margin: '0 0 2px' }}>Suporte Zomp</h3>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, fontWeight: 600 }}>Atendimento Oficial & Resolução de Problemas</p>
                    </div>
                    <button
                      className="btn"
                      style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 800, background: isCreatingNewTicket ? '#e2e8f0' : 'var(--primary)', color: '#000', borderRadius: '10px' }}
                      onClick={() => setIsCreatingNewTicket(!isCreatingNewTicket)}
                    >
                      {isCreatingNewTicket ? 'Ver Chamados' : '+ Novo Chamado'}
                    </button>
                  </div>

                  {isCreatingNewTicket ? (
                    <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid #cbd5e1', padding: '16px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Selecione a Categoria
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '14px' }}>
                        {[
                          { id: 'PAGAMENTO', label: '💳 Pagamentos / PIX' },
                          { id: 'CORRIDA', label: '🚗 Corrida & Trajeto' },
                          { id: 'SEGURANCA', label: '🚨 Segurança & Conduta' },
                          { id: 'CADASTRO', label: '👤 Minha Conta' },
                          { id: 'OUTROS', label: '💬 Outros Assuntos' },
                        ].map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSupportCategory(cat.id)}
                            style={{
                              padding: '10px 8px',
                              borderRadius: '10px',
                              border: supportCategory === cat.id ? '2px solid #059669' : '1px solid #e2e8f0',
                              background: supportCategory === cat.id ? '#ecfdf5' : '#f8fafc',
                              color: supportCategory === cat.id ? '#065f46' : '#334155',
                              fontWeight: 800,
                              fontSize: '0.76rem',
                              cursor: 'pointer',
                              textAlign: 'center'
                            }}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Descreva seu problema ou dúvida
                      </div>
                      <textarea
                        value={supportInput}
                        onChange={(e) => setSupportInput(e.target.value)}
                        placeholder="Ex: Tive um problema com o valor cobrado na corrida, gostaria de ajuda do suporte..."
                        style={{
                          width: '100%',
                          minHeight: '90px',
                          padding: '12px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          color: '#090d16',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          outline: 'none',
                          marginBottom: '14px',
                          boxSizing: 'border-box'
                        }}
                      />

                      <button
                        disabled={isSendingSupport || !supportInput.trim()}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '14px', fontWeight: 900, fontSize: '0.95rem' }}
                        onClick={handleCreateSupportTicket}
                      >
                        {isSendingSupport ? 'Enviando...' : '🚀 Abrir Chamado no Suporte'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      {/* Lista de Chamados */}
                      {supportTickets.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 16px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💬</div>
                          <h4 style={{ margin: '0 0 6px', color: '#18181b', fontWeight: 800 }}>Nenhum chamado aberto</h4>
                          <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.82rem' }}>Precisa de ajuda com alguma corrida, cobrança ou sugestão?</p>
                          <button className="btn btn-primary" onClick={() => setIsCreatingNewTicket(true)} style={{ padding: '10px 20px', fontWeight: 800, fontSize: '0.85rem' }}>
                            Falar com o Suporte Agora
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
                          {/* Seletor de Chamado */}
                          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }} className="hide-scrollbar">
                            {supportTickets.map(ticket => (
                              <button
                                key={ticket.id}
                                onClick={() => setActiveSupportTicket(ticket)}
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: '10px',
                                  border: activeSupportTicket?.id === ticket.id ? '2px solid #059669' : '1px solid #e2e8f0',
                                  background: activeSupportTicket?.id === ticket.id ? '#ecfdf5' : '#fff',
                                  color: activeSupportTicket?.id === ticket.id ? '#065f46' : '#64748b',
                                  fontWeight: 800,
                                  fontSize: '0.78rem',
                                  whiteSpace: 'nowrap',
                                  cursor: 'pointer'
                                }}
                              >
                                #{ticket.id.substring(0, 6)} • {ticket.category}
                              </button>
                            ))}
                          </div>

                          {/* Chat Box do Chamado Ativo */}
                          {activeSupportTicket && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '16px', border: '1.5px solid #cbd5e1', overflow: 'hidden' }}>
                              <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#090d16' }}>{activeSupportTicket.subject || 'Atendimento'}</span>
                                  <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>Protocolo: #{activeSupportTicket.id.substring(0, 8).toUpperCase()}</div>
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669' }}>
                                  ● Aberto
                                </span>
                              </div>

                              <div style={{ flex: 1, padding: '14px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '42vh' }}>
                                {supportMessages.map(msg => (
                                  <div
                                    key={msg.id}
                                    style={{
                                      alignSelf: msg.senderRole === 'USER' ? 'flex-end' : 'flex-start',
                                      background: msg.senderRole === 'USER' ? 'var(--primary)' : '#fff',
                                      color: msg.senderRole === 'USER' ? '#000' : '#18181b',
                                      border: msg.senderRole === 'USER' ? 'none' : '1px solid #e2e8f0',
                                      padding: '10px 14px',
                                      borderRadius: msg.senderRole === 'USER' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                      maxWidth: '85%',
                                      fontSize: '0.86rem',
                                      fontWeight: 600,
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                    }}
                                  >
                                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: msg.senderRole === 'USER' ? '#064e3b' : '#059669', marginBottom: '3px' }}>
                                      {msg.senderName}
                                    </div>
                                    {msg.text}
                                  </div>
                                ))}
                              </div>

                              <div style={{ padding: '10px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: '8px' }}>
                                <input
                                  type="text"
                                  value={supportInput}
                                  onChange={(e) => setSupportInput(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendSupportMessage(); }}
                                  placeholder="Digite sua mensagem para o suporte..."
                                  style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    borderRadius: '100px',
                                    border: '1.5px solid #cbd5e1',
                                    outline: 'none',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: '#090d16'
                                  }}
                                />
                                <button
                                  disabled={isSendingSupport || !supportInput.trim()}
                                  onClick={handleSendSupportMessage}
                                  style={{
                                    background: 'var(--primary)',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '38px',
                                    height: '38px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontWeight: 900
                                  }}
                                >
                                  ➤
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {menuScreen === 'PROFILE' && (
                <div className="animate-fade-in">
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('MAIN')} style={{color: 'var(--primary)', marginBottom: '4px'}}>
                    ← Voltar
                  </button>
                  <h3 style={{fontSize: '1.3rem', fontWeight: 800, marginBottom: '24px'}}>Meu Perfil</h3>
                  
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px'}}>
                    <div style={{width: '90px', height: '90px', borderRadius: '50%', background: 'var(--primary)', color: '#000', fontSize: '2.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px'}}>
                      {profileData.name.charAt(0)}
                    </div>
                  </div>

                  <div style={{marginBottom: '16px'}}>
                    <label style={{display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px'}}>Nome Completo</label>
                    <input 
                      type="text" 
                      className="route-input" 
                      style={{background: '#f4f4f5', padding: '12px', borderRadius: '8px', border: '1px solid #e4e4e7'}}
                      value={profileData.name} 
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})} 
                    />
                  </div>

                  <div style={{marginBottom: '24px'}}>
                    <label style={{display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px'}}>E-mail</label>
                    <input 
                      type="email" 
                      className="route-input" 
                      style={{background: '#f4f4f5', padding: '12px', borderRadius: '8px', border: '1px solid #e4e4e7'}}
                      value={profileData.email} 
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})} 
                    />
                  </div>

                  <button className="btn btn-primary" style={{width: '100%'}} onClick={() => {
                    alert('Perfil atualizado localmente com sucesso!')
                    setMenuScreen('MAIN')
                  }}>
                    Salvar Alterações
                  </button>
                </div>
              )}

              {menuScreen === 'HISTORY' && (
                <div className="animate-fade-in">
                  <button className="menu-nav-btn" onClick={() => setMenuScreen('MAIN')} style={{color: 'var(--primary)', marginBottom: '4px'}}>
                    ← Voltar
                  </button>
                  <h3 style={{fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px'}}>Histórico de Corridas</h3>
                  
                  {rideHistory.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '32px 0'}}>
                      <p style={{color: '#71717a', fontWeight: 600}}>Nenhum histórico encontrado.</p>
                    </div>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                      {rideHistory.map(ride => (
                        <div key={ride.id} className="scheduled-ride-card" style={{cursor: 'default', opacity: (ride.status === 'CANCELED_FEE' || ride.status === 'CANCELED_FREE') ? 0.75 : 1}}>
                          
                          {ride.status === 'CANCELED_FEE' && (
                            <div style={{background: '#fef2f2', color: '#b91c1c', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '12px', border: '1px solid #fecaca'}}>
                              ⚠️ Cancelada (Taxa de deslocamento de R$ 2,80 a ser cobrada na próxima corrida)
                            </div>
                          )}
                          {ride.status === 'CANCELED_FREE' && (
                            <div style={{background: '#f4f4f5', color: '#52525b', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '12px', border: '1px solid #e4e4e7'}}>
                              ✕ Cancelada gratuitamente
                            </div>
                          )}

                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                            <div style={{fontWeight: 800}}>📅 {ride.date}</div>
                            <div style={{
                              fontWeight: 800, 
                              color: ride.status === 'CANCELED_FEE' ? '#b91c1c' : (ride.status === 'CANCELED_FREE' ? '#a1a1aa' : '#065f46')
                            }}>
                              R$ {ride.price}
                            </div>
                          </div>
                          <div style={{fontSize: '0.85rem', color: '#71717a', marginBottom: '4px'}}>📍 <b>De:</b> {ride.origin}</div>
                          <div style={{fontSize: '0.85rem', color: '#71717a'}}>🏁 <b>Para:</b> {ride.dest}</div>
                          <div style={{marginTop: '12px', display: 'inline-block', padding: '4px 8px', background: '#e4e4e7', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'}}>
                            {ride.vehicle}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE CHAT EM TEMPO REAL COM O MOTORISTA ===== */}
      {isChatOpen && (
        <div className="side-menu-overlay" style={{ zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <div className="side-menu-drawer animate-slide-up" style={{
            width: '100%', 
            maxWidth: '480px',
            height: '86vh', 
            top: 'auto', 
            bottom: 0, 
            left: '50%',
            transform: 'translateX(-50%)',
            borderRadius: '24px 24px 0 0',
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.3)'
          }}>
            {/* Header do Chat */}
            <div style={{ padding: '16px 20px', borderBottom: '1.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={currentRide?.driverPhoto || favoriteDriversState[0].img}
                    style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #00E676' }}
                    alt=""
                  />
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', background: '#00E676', border: '2px solid #fff' }} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#090d16' }}>
                    {currentRide?.driverName || favoriteDriversState[0].name}
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                    {currentRide?.driverCarModel || favoriteDriversState[0].car} • {currentRide?.driverCarPlate || favoriteDriversState[0].plate}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>
            
            {/* Lista de Mensagens */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 8px', fontWeight: 600 }}>
                🔒 Conversa segura e monitorada pela Central Zomp
              </div>

              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#64748b' }}>Envie uma mensagem para o motorista</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Use os atalhos rápidos abaixo ou digite seu recado.</div>
                </div>
              )}

              {chatMessages.map(msg => {
                const isMe = msg.senderRole === 'PASSENGER' || msg.sender === 'me';
                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      background: isMe ? 'linear-gradient(135deg, #059669, #00E676)' : '#ffffff',
                      color: isMe ? '#000000' : '#090d16',
                      border: isMe ? 'none' : '1.5px solid #cbd5e1',
                      padding: '10px 16px',
                      borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      maxWidth: '82%',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{ fontSize: '0.66rem', fontWeight: 800, color: isMe ? 'rgba(0,0,0,0.6)' : '#059669', marginBottom: '2px' }}>
                      {isMe ? 'Você' : (msg.senderName || 'Motorista')}
                    </div>
                    {msg.text}
                  </div>
                );
              })}
            </div>

            {/* Mensagens Rápidas Inteligentes do Passageiro */}
            <div style={{ padding: '8px 12px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '6px', overflowX: 'auto' }} className="hide-scrollbar">
              {[
                '📍 Estou no local de embarque',
                '🚪 Já estou descendo',
                '👕 Camisa azul / Perto da portaria',
                '⏳ Pode aguardar 2 minutinhos?',
                '❓ Onde você está?'
              ].map((quickText, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendRideMessage(quickText)}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '6px 12px',
                    borderRadius: '100px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#090d16',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {quickText}
                </button>
              ))}
            </div>

            {/* Input de Envio de Mensagem */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendRideMessage();
                }}
                placeholder="Digite sua mensagem para o motorista..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '100px', 
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc', 
                  outline: 'none',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  color: '#090d16'
                }} 
              />
              <button 
                disabled={!chatInput.trim()}
                onClick={() => {
                  const newMsg = {id: Date.now(), sender: 'me', text: chatInput.trim()}
                  setChatMessages(prev => [...prev, newMsg])
                  setChatInput('')

                  setTimeout(() => {
                    setChatMessages(prev => [...prev, {id: Date.now()+1, sender: 'driver', text: 'Tudo bem! Estou chegando.'}])
                  }, 2000)
                }}
                style={{
                  background: chatInput.trim() ? '#18181b' : '#a1a1aa', color: '#fff', 
                  border: 'none', borderRadius: '50%', width: '48px', height: '48px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s'
                }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- SELFIE PROMPT OVERLAY (SIMPLIFIED ONBOARDING) --- */}
      {showSelfiePrompt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', 
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '400px', 
            padding: '32px', textAlign: 'center', position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,230,118,0.1)', 
              color: '#00E676', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 20px'
            }}>
              <Camera size={32} />
            </div>
            
            <h2 style={{fontSize: '1.5rem', fontWeight: 800, color: '#18181b', marginBottom: '12px'}}>
              Validar Perfil Zomp
            </h2>
            <p style={{fontSize: '0.95rem', color: '#52525b', lineHeight: 1.5, marginBottom: '24px'}}>
              Para sua segurança e de nossos motoristas, precisamos de uma selfie nítida para validar seu perfil antes da primeira corrida.
            </p>

            <div style={{
              width: '180px', height: '180px', borderRadius: '50%', background: '#f4f4f5',
              margin: '0 auto 24px', overflow: 'hidden', border: '4px solid #fff',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)', position: 'relative'
            }}>
              {selfiePreview ? (
                <img src={selfiePreview} alt="Preview" style={{width:'100%', height:'100%', objectFit:'cover'}} />
              ) : (
                <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#a1a1aa'}}>
                  <User size={64} opacity={0.3} />
                </div>
              )}
            </div>

            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              id="selfie-input"
              hidden
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setSelfiePreview(ev.target.result);
                  reader.readAsDataURL(file);
                }
              }}
            />

            <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
              <button 
                onClick={() => document.getElementById('selfie-input').click()}
                style={{
                  padding: '16px', borderRadius: '16px', border: '2.5px solid #18181b', 
                  background: 'none', color: '#18181b', fontWeight: 800, fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                {selfiePreview ? '📷 Trocar Foto' : '🤳 Abrir Câmera'}
              </button>

              <button 
                disabled={!selfiePreview || isUploadingSelfie}
                onClick={async () => {
                  setIsUploadingSelfie(true);
                  try {
                    const { updateProfile } = await import('../services/api');
                    await updateProfile({ photo: selfiePreview });
                    setShowSelfiePrompt(false);
                    // Force update local storage user if needed
                    const u = JSON.parse(localStorage.getItem('zomp_user') || '{}');
                    u.photo = selfiePreview;
                    localStorage.setItem('zomp_user', JSON.stringify(u));
                  } catch (e) {
                    alert('Erro ao enviar foto. Tente novamente.');
                  }
                  setIsUploadingSelfie(false);
                }}
                style={{
                  padding: '16px', borderRadius: '16px', border: 'none', 
                  background: selfiePreview ? 'linear-gradient(135deg, #059669, #00E676)' : '#e4e4e7', 
                  color: selfiePreview ? '#000' : '#a1a1aa', fontWeight: 800, fontSize: '1rem',
                  cursor: selfiePreview ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s'
                }}
              >
                {isUploadingSelfie ? 'Enviando...' : '🚀 Finalizar Validação'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Avaliação do Motorista pelo Passageiro */}
      {passengerRatingModalOpen && lastCompletedRide && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="animate-fade-in-up" style={{
            background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '380px',
            padding: '28px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
          }}>
            <div style={{
              width: '70px', height: '70px', borderRadius: '50%', background: '#ecfdf5',
              border: '3px solid #10b981', margin: '0 auto 16px', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {lastCompletedRide.driverPhoto ? (
                <img src={lastCompletedRide.driverPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '2rem' }}>🚗</span>
              )}
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: 900, color: '#18181b' }}>
              Viagem Concluída!
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#71717a' }}>
              Como foi sua experiência com <strong>{lastCompletedRide.driverName || 'o Motorista'}</strong>?
            </p>

            {/* Estrelas */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setPassengerRatingStars(star)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '2rem', transition: 'transform 0.15s',
                    transform: passengerRatingStars >= star ? 'scale(1.15)' : 'scale(1)',
                    color: passengerRatingStars >= star ? '#f59e0b' : '#d4d4d8'
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              value={passengerRatingComment}
              onChange={(e) => setPassengerRatingComment(e.target.value)}
              placeholder="Deixe um elogio ou comentário (opcional)..."
              style={{
                width: '100%', minHeight: '70px', padding: '12px',
                borderRadius: '12px', border: '1px solid #e4e4e7',
                fontSize: '0.85rem', outline: 'none', resize: 'none',
                marginBottom: '20px', boxSizing: 'border-box'
              }}
            />

            <button
              disabled={isSubmittingRating}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px',
                background: '#059669', color: '#fff', fontWeight: 900,
                fontSize: '1rem', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(5, 150, 105, 0.4)'
              }}
              onClick={async () => {
                setIsSubmittingRating(true);
                try {
                  await rateRide(lastCompletedRide.id, {
                    rating: passengerRatingStars,
                    comment: passengerRatingComment,
                    role: 'PASSENGER'
                  });
                  showToast('⭐ Obrigado por avaliar!');
                } catch (e) {
                  console.warn('Erro ao enviar avaliação:', e);
                } finally {
                  setIsSubmittingRating(false);
                  setPassengerRatingModalOpen(false);
                  setLastCompletedRide(null);
                  setPassengerRatingStars(5);
                  setPassengerRatingComment('');
                }
              }}
            >
              {isSubmittingRating ? 'Enviando...' : '✓ Enviar Avaliação'}
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL DE PREÇO IMBATÍVEL (CONSEGUIMOS BATER O PREÇO DA CONCORRÊNCIA) ===== */}
      {showCompetitionModal && hasCompetitionDiscount && competitorPrintPrice > 0 && (
        <div className="competition-modal-overlay">
          <div className="competition-modal-card">
            {/* Botão Fechar X no canto superior direito */}
            <button 
              className="competition-modal-close" 
              onClick={() => setShowCompetitionModal(false)}
              title="Fechar"
            >
              <X size={20} />
            </button>

            {/* Cabeçalho com Destaque */}
            <div className="competition-modal-header">
              <div className="competition-modal-badge">
                <span>🔥</span>
                <span>Preço Imbatível Zomp</span>
              </div>
              <h2 className="competition-modal-title">
                CONSEGUIMOS BATER O PREÇO DA CONCORRÊNCIA!
              </h2>
              <p className="competition-modal-subtitle">
                Seu print da Uber / 99 foi lido com sucesso. Aplicamos o desconto diretamente em cima do valor da concorrência!
              </p>
            </div>

            {/* Box Comparativo de Preços */}
            <div className="competition-price-comparison-box">
              <div className="price-item competitor">
                <span className="price-label">📱 Print Uber/99</span>
                <span className="price-val strikethrough">R$ {competitorPrintPrice.toFixed(2)}</span>
              </div>

              <div className="price-divider">
                <span>VS</span>
              </div>

              <div className="price-item zomp-highlight">
                <span className="price-label">⚡ Novo Preço Zomp</span>
                <span className="price-val highlight">
                  R$ {getPrice(routeKm, vehicleType, false)}
                </span>
              </div>
            </div>

            {/* Banner de Economia */}
            <div className="competition-savings-banner">
              <Sparkles size={18} />
              <span>Você economiza <strong>R$ {calculatedDiscountAmount.toFixed(2)}</strong> sobre o preço do print!</span>
            </div>

            {/* Seletor de Veículo: Escolher Carro ou Moto */}
            <div className="competition-vehicle-selector">
              <label className="selector-title">Escolha seu Veículo:</label>
              <div className="selector-options">
                <div 
                  className={`vehicle-card ${vehicleType === 'car' ? 'selected' : ''}`}
                  onClick={() => setVehicleType('car')}
                >
                  <div className="veh-top">
                    <span className="veh-icon">🚗</span>
                    {vehicleType === 'car' && <span className="veh-check">✓</span>}
                  </div>
                  <span className="veh-name">Carro</span>
                  <span className="veh-sub">Conforto & Mais Seguro</span>
                  <span className="veh-price">R$ {getPrice(routeKm, 'car', false)}</span>
                </div>

                <div 
                  className={`vehicle-card ${vehicleType === 'moto' ? 'selected' : ''}`}
                  onClick={() => setVehicleType('moto')}
                >
                  <div className="veh-top">
                    <span className="veh-icon">🏍️</span>
                    {vehicleType === 'moto' && <span className="veh-check">✓</span>}
                  </div>
                  <span className="veh-name">Moto</span>
                  <span className="veh-sub">Rápida & Mais Barata</span>
                  <span className="veh-price">R$ {getPrice(routeKm, 'moto', false)}</span>
                </div>
              </div>
            </div>

            {/* Botão de Chamar Agora */}
            <button 
              className="competition-call-btn"
              disabled={isLoading}
              onClick={async () => {
                setShowCompetitionModal(false);
                await handleCallNow();
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>⚡</span>
              {isLoading 
                ? 'Chamando Motorista...' 
                : `CHAMAR ${vehicleType === 'car' ? 'CARRO' : 'MOTO'} POR R$ ${getPrice(routeKm, vehicleType, false)}`
              }
            </button>

            <p className="competition-footer-hint">
              💡 Cancele a corrida no app concorrente e chame o Zomp com economia garantida!
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
          background: '#000', color: '#fff', padding: '12px 24px', borderRadius: '100px',
          zIndex: 10000, fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
