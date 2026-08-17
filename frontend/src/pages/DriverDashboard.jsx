import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, getCurrentUser, getWallet, getPendingRides, acceptRide, completeRide, rateRide } from '../services/api'
import { MapContainer, TileLayer, useMap, Marker, Circle } from 'react-leaflet'
import { User, FileText, Clock, Ticket, Gem, UserPlus, RefreshCw, Headset, HelpCircle, Moon, Sun, LogOut, Wallet, CloudSun, Radio, Compass, Navigation, Eye, EyeOff, Sliders } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './Driver.css'

function MapController({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, 15, { duration: 1.2 })
  }, [center, map])
  return null
}

const driverIcon = L.divIcon({
  className: 'custom-pin-icon',
  html: `<div style="background:#00E676;width:24px;height:24px;border-radius:50%;border:4px solid #18181b;box-shadow:0 3px 10px rgba(0,0,0,0.4);"></div>`,
  iconSize: [24, 24], iconAnchor: [12, 12]
})

const API = import.meta.env.VITE_API_URL || 'https://zomp-api.onrender.com/api'
const getToken = () => localStorage.getItem('zomp_token')

function formatNumber(value, decimals = 1, fallback = '0.0') {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(decimals) : fallback
}

// Algoritmo clássico CRC16 CCITT (0x1021) para geração do Pix estático
function calculateCRC16(str) {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    let code = str.charCodeAt(c);
    crc ^= (code << 8);
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  let hex = (crc & 0xFFFF).toString(16).toUpperCase();
  return hex.padStart(4, '0');
}

function generatePixPayload(key, amount, merchantName = 'Motorista Zomp', city = 'RIO DE JANEIRO') {
  let cleanKey = key.trim();
  const parts = [
    '000201', // Payload Format Indicator
    '26' + String(22 + cleanKey.length).padStart(2, '0') + '0014br.gov.bcb.pix01' + String(cleanKey.length).padStart(2, '0') + cleanKey, // Merchant Account Info
    '52040000', // Merchant Category Code
    '5303986', // Currency (Real)
  ];
  if (amount) {
    const valStr = Number(amount).toFixed(2);
    parts.push('54' + String(valStr.length).padStart(2, '0') + valStr);
  }
  parts.push('5802BR'); // Country Code
  const cleanName = merchantName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25).toUpperCase();
  parts.push('59' + String(cleanName.length).padStart(2, '0') + cleanName);
  const cleanCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 15).toUpperCase();
  parts.push('60' + String(cleanCity.length).padStart(2, '0') + cleanCity);
  parts.push('62070503***'); // Transaction ID
  const payloadWithoutCRC = parts.join('') + '6304';
  const crc = calculateCRC16(payloadWithoutCRC);
  return payloadWithoutCRC + crc;
}

// --- Som de Notificação (corrida normal) ---
const playRingSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playNote = (freq, startTime, duration, type='sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playNote(523.25, now, 0.15, 'square'); 
    playNote(659.25, now + 0.2, 0.15, 'square');
    playNote(783.99, now + 0.4, 0.4, 'square');
    playNote(523.25, now + 1.0, 0.15, 'square'); 
    playNote(659.25, now + 1.2, 0.15, 'square');
    playNote(783.99, now + 1.4, 0.4, 'square');
  } catch(e) { console.error('Audio falhou', e) }
}

// --- Som diferente para corrida LONGA / AGENDADA (tom grave, apenas 1x) ---
const playLongRideSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playNote = (freq, startTime, duration, type='sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    // Tom grave e suave — diferente do ring agudo
    playNote(349.23, now, 0.3, 'triangle');
    playNote(440.00, now + 0.35, 0.3, 'triangle');
    playNote(523.25, now + 0.7, 0.5, 'triangle');
    playNote(659.25, now + 1.3, 0.6, 'sine');
  } catch(e) { console.error('Audio longa falhou', e) }
}

// Detecta se a corrida é longa (>=15km) ou agendada/frete
const isLongOrScheduledRide = (ride) => {
  if (!ride) return false;
  const dist = parseFloat(ride.distanceKm) || 0;
  const vt = ride.vehicleType || '';
  return dist >= 15 || vt.includes('long') || vt.includes('intercity') || vt.includes('scheduled') || vt.includes('freight');
}

// Distância geodésica em KM (Fórmula de Haversine)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Lista Completa de FAQs para o Motorista Parceiro
const DRIVER_FAQS = [
  {
    q: '💰 Recebi um valor a mais na corrida (débito anterior do passageiro). Como funciona?',
    a: 'Quando um passageiro teve uma corrida anterior cancelada no percurso, o valor proporcional calculado é somado na próxima corrida dele. Como você recebeu esse valor total diretamente do passageiro (em dinheiro ou PIX), esse valor extra fica registrado no seu app como repasse à plataforma e será quitado de forma simples e automática quando você for comprar novos créditos na sua recarga!'
  },
  {
    q: '🎯 O que é o Sonar de Radar no mapa e como escolher meu raio de atuação?',
    a: 'O Sonar é o radar verde que envolve sua posição GPS no mapa. Você pode escolher a distância máxima que deseja trabalhar (500m, 1km, 3km, 5km, 10km, 15km, 20km, 30km, 50km ou Livre). O aplicativo priorizará e filtrará chamadas dentro do raio que você escolheu, garantindo que você rode apenas onde deseja!'
  },
  {
    q: '🌦️ Como funciona a previsão de Clima e Trânsito em tempo real?',
    a: 'No topo da tela do app você tem a previsão do tempo e temperatura em tempo real com base no seu GPS (via Open-Meteo) e o status do trânsito regional (🟢 Fluindo, 🟡 Moderado ou 🔴 Intenso em horários de pico). Você pode ocultar ou reexibir esse widget a qualquer momento no menu lateral em Preferências & Mapa.'
  },
  {
    q: '🎫 Como funcionam os Créditos e os pacotes de recarga?',
    a: 'Cada corrida concluída consome apenas 1 crédito (R$ 1,50). No menu "Meus Créditos" você pode adquirir pacotes com bônus e desconto: 10 créditos por R$ 15,00, 22 créditos por R$ 30,00 (+2 corridas grátis) ou 35 créditos por R$ 45,00 (+5 corridas grátis). O pagamento é confirmado via PIX na hora!'
  },
  {
    q: '❖ Chave PIX rápida no início da corrida',
    a: 'Assim que você aceita a corrida, o passageiro já tem acesso à sua chave PIX e ao valor total da viagem com botão de cópia rápida para poder adiantar o pagamento com segurança.'
  },
  {
    q: '🔥 O que é o Preço Imbatível Zomp?',
    a: 'É o compromisso da Zomp de cobrir os preços de Uber e 99. O passageiro envia o print da corrida no outro app e ganha desconto garantido. O motorista parceiro sempre recebe o valor integral e justo do seu trabalho!'
  },
  {
    q: '👑 Como funcionam os Royalties de R$ 0,30 por passageiro?',
    a: 'Ao indicar passageiros com seu QR Code ou transportá-los pela primeira vez, você ganha R$ 0,30 por cada corrida que eles fizerem no aplicativo durante 3 meses. Você pode solicitar o saque do saldo diretamente no menu Royalties!'
  }
];

export default function DriverDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(getCurrentUser())
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    if (!user || user.role !== 'DRIVER') { navigate('/motorista'); return }
  }, [navigate, user])

  // GPS Tracking
  const [myPos, setMyPos] = useState([-22.9068, -43.1729])
  useEffect(() => {
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => setMyPos([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.error(err), 
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      )
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    }
  }, [])

  // Online
  const [isOnline, setIsOnline] = useState(false)

  // Map Theme
  const [darkMap, setDarkMap] = useState(false)
  const lightTile = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

  // Clima e Trânsito na Região (Open-Meteo API Grátis)
  const [weather, setWeather] = useState({ temp: 26, icon: '☀️', desc: 'Ensolarado', wind: 12 })
  const [showWeatherTraffic, setShowWeatherTraffic] = useState(() => localStorage.getItem('zomp_driver_show_weather') !== 'false')
  const [showTrafficLayer, setShowTrafficLayer] = useState(() => localStorage.getItem('zomp_driver_traffic_layer') === 'true')
  
  // Raio de Atuação (Sonar de Radar em volta do motorista)
  const [workRadiusKm, setWorkRadiusKm] = useState(() => {
    const saved = localStorage.getItem('zomp_driver_radius');
    return saved !== null ? parseFloat(saved) : 10;
  })
  const [showRadiusSelector, setShowRadiusSelector] = useState(false)

  const workRadiusKmRef = useRef(workRadiusKm)
  const myPosRef = useRef(myPos)
  useEffect(() => { workRadiusKmRef.current = workRadiusKm }, [workRadiusKm])
  useEffect(() => { myPosRef.current = myPos }, [myPos])

  // Ao alterar o raio de atuação, filtra imediatamente as corridas pendentes em tela
  useEffect(() => {
    setPendingRides(prev => prev.filter(ride => {
      if (workRadiusKm <= 0) return true;
      if (!Array.isArray(myPos) || !myPos[0]) return false;
      const rideDist = parseFloat(ride.distanceKm) || 0;
      if (rideDist > workRadiusKm) return false;
      if (ride.originLat != null && ride.originLon != null) {
        const dOrig = getDistanceFromLatLonInKm(myPos[0], myPos[1], parseFloat(ride.originLat), parseFloat(ride.originLon));
        if (dOrig === null || dOrig > workRadiusKm) return false;
      }
      if (ride.destLat != null && ride.destLon != null) {
        const dDest = getDistanceFromLatLonInKm(myPos[0], myPos[1], parseFloat(ride.destLat), parseFloat(ride.destLon));
        if (dDest === null || dDest > workRadiusKm) return false;
      }
      return true;
    }));
  }, [workRadiusKm, myPos]);

  const formatRadiusLabel = (r) => {
    if (r === 0) return 'Livre 🌐';
    if (r === 0.5) return '500 m';
    if (r === 1) return '1 km';
    return `${r} km`;
  };

  // Atualização do Clima em Tempo Real via Open-Meteo
  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.current_weather) {
          const code = data.current_weather.weathercode;
          let icon = '☀️';
          let desc = 'Ensolarado';
          if (code === 0) { icon = '☀️'; desc = 'Céu Limpo'; }
          else if ([1, 2, 3].includes(code)) { icon = '⛅'; desc = 'Parcialmente Nublado'; }
          else if ([45, 48].includes(code)) { icon = '🌫️'; desc = 'Nevoeiro'; }
          else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) { icon = '🌧️'; desc = 'Chuva'; }
          else if ([95, 96, 99].includes(code)) { icon = '⛈️'; desc = 'Tempestade'; }

          setWeather({
            temp: Math.round(data.current_weather.temperature),
            wind: Math.round(data.current_weather.windspeed),
            icon,
            desc
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar clima gratuito:', e);
    }
  }, []);

  useEffect(() => {
    if (myPos && myPos[0]) {
      fetchWeather(myPos[0], myPos[1]);
      const wTimer = setInterval(() => fetchWeather(myPos[0], myPos[1]), 10 * 60 * 1000);
      return () => clearInterval(wTimer);
    }
  }, [myPos, fetchWeather]);

  const getTrafficInfo = () => {
    const hour = new Date().getHours();
    const isRush = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    const isModerate = (hour >= 11 && hour <= 14) || (hour >= 20 && hour <= 21);
    if (isRush) return { status: 'INTENSO', label: 'Trânsito Intenso (Pico)', color: '#ef4444', icon: '🔴' };
    if (isModerate) return { status: 'MODERADO', label: 'Trânsito Moderado', color: '#f59e0b', icon: '🟡' };
    return { status: 'FLUINDO', label: 'Trânsito Fluindo', color: '#10b981', icon: '🟢' };
  };

  // Slide to go online
  const [slideX, setSlideX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const slideTrackWidth = 280
  const slideThumbWidth = 60
  const slideThreshold = slideTrackWidth - slideThumbWidth - 10

  const handleSlideStart = (e) => {
    const isTestDriver = (user?.email === 'motorista@zomp.com' || user?.email === 'motorita@zomp.com');
    if (!isTestDriver && !user?.isApproved) {
      alert("📳 Seus dados estão em análise. Aguarde a aprovação da Zomp para acessar o modo Online.");
      return;
    }
    setIsSwiping(true)
  }
  const handleSlideMove = (e) => {
    if (!isSwiping) return
    const touch = e.touches ? e.touches[0] : e
    const track = e.currentTarget.closest('.slide-track')
    if (!track) return
    const rect = track.getBoundingClientRect()
    let x = touch.clientX - rect.left - slideThumbWidth / 2
    x = Math.max(0, Math.min(x, slideTrackWidth - slideThumbWidth))
    setSlideX(x)
  }
  const handleSlideEnd = () => {
    setIsSwiping(false)
    if (slideX >= slideThreshold) {
      const isTestDriver = (user?.email === 'motorista@zomp.com' || user?.email === 'motorita@zomp.com');
      if (!isTestDriver && (!user?.cnh || !user?.crlv)) {
        setSlideX(0);
        return alert("⚠️ Envie seus documentos no menu 'Documentos & Veículo' antes de ficar online.");
      }
      if (!isTestDriver && !user?.isApproved) {
        setSlideX(0);
        return alert("⏳ Seus dados estão em análise. Aguarde a aprovação da Zomp para acessar o modo Online.");
      }

      setIsOnline(true)
      setSlideX(0)
    } else {
      setSlideX(0)
    }
  }

  // Wallet & Credits
  const [wallet, setWallet] = useState({ balance: 0 })
  const [credits, setCredits] = useState(0)
  const [driverAppDebt, setDriverAppDebt] = useState(0)
  const [linkedPassengers, setLinkedPassengers] = useState(0)
  const [globalLaunchDate, setGlobalLaunchDate] = useState(null)

  const fetchWallet = useCallback(async () => {
    try {
      const d = await getWallet()
      setWallet(d)
    } catch (err) {
      console.warn('Erro ao buscar carteira:', err)
    }
  }, [])
  const fetchCredits = useCallback(async () => {
    try {
      // Conta de teste sempre tem 1000 créditos
      if ((user?.email === 'motorista@zomp.com' || user?.email === 'motorita@zomp.com')) {
        setCredits(1000);
        return;
      }
      const res = await fetch(`${API}/credits`, { headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } })
      const d = await res.json()
      if (d.credits !== undefined) setCredits(d.credits)
      if (d.driverAppDebt !== undefined) setDriverAppDebt(parseFloat(d.driverAppDebt) || 0)
    } catch (err) {
      console.warn('Erro ao buscar creditos:', err)
    }
  }, [user?.email])
  const fetchLinkedPassengers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/user/driver/linked-passengers`, { headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } })
      const d = await res.json()
      if (d.linkedPassengers !== undefined) setLinkedPassengers(d.linkedPassengers)
    } catch (err) {
      console.warn('Erro ao buscar passageiros vinculados:', err)
    }
  }, [])
  const fetchGlobalConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/config`)
      const d = await res.json()
      if (d.launchDate) setGlobalLaunchDate(d.launchDate)
    } catch (err) {
      console.warn('Erro ao buscar configuracao global:', err)
    }
  }, [])
  useEffect(() => { fetchWallet(); fetchCredits(); fetchLinkedPassengers(); fetchGlobalConfig() }, [fetchWallet, fetchCredits, fetchLinkedPassengers, fetchGlobalConfig])

  // Notification, WakeLock & Background Sync
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isOnline) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {}
    };

    if (isOnline) {
      requestWakeLock();
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [isOnline]);

  const sendNotification = async (title, body, ride) => {
    try {
      if ("Notification" in window) {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
        if (Notification.permission === "granted") {
          // Dispara via Service Worker para funcionar em segundo plano / tela de bloqueio
          if ('serviceWorker' in navigator) {
            try {
              const reg = await navigator.serviceWorker.ready;
              if (reg && reg.showNotification) {
                reg.showNotification(title, {
                  body,
                  icon: '/favicon.svg',
                  badge: '/favicon.svg',
                  tag: 'new-ride-' + (ride?.id || Date.now()),
                  renotify: true,
                  requireInteraction: true,
                  vibrate: [500, 200, 500, 200, 500, 200, 500],
                  data: { url: '/motorista', rideId: ride?.id }
                });
                return;
              }
            } catch (swErr) {
              console.warn('SW notification fallback:', swErr);
            }
          }

          // Fallback para Notification API padrão
          const n = new Notification(title, {
            body,
            icon: '/favicon.svg',
            vibrate: [500, 200, 500, 200, 500],
            tag: 'new-ride-' + (ride?.id || Date.now()),
            renotify: true,
            requireInteraction: true
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
        }
      }
    } catch (e) {
      console.warn('Notification error:', e);
    }
    if ("vibrate" in navigator) {
      try { navigator.vibrate([500, 200, 500, 200, 500]); } catch (e) {}
    }
  }

  // Pending Rides & Visualizações
  const [seenRidesCount, setSeenRidesCount] = useState({})
  const seenRidesCountRef = useRef({})
  const [completedRideData, setCompletedRideData] = useState(null)
  const [showPixCompletionModal, setShowPixCompletionModal] = useState(false)
  const [showDriverRatingModal, setShowDriverRatingModal] = useState(false)
  const [driverRatingStars, setDriverRatingStars] = useState(5)
  const [driverRatingComment, setDriverRatingComment] = useState('')
  const [isSubmittingDriverRating, setIsSubmittingDriverRating] = useState(false)

  const [pendingRides, setPendingRides] = useState([])
  const [activeRide, setActiveRide] = useState(null)
  const prevRideCountRef = useRef(0)
  const [rideCountdown, setRideCountdown] = useState(10)

  // Temporizador regressivo de 10 segundos para aceitar a corrida
  useEffect(() => {
    let countdownTimer;
    if (isOnline && pendingRides.length > 0 && !activeRide) {
      setRideCountdown(10);
      countdownTimer = setInterval(() => {
        setRideCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            // Auto-recusa ao expirar o tempo
            const rideId = pendingRides[0]?.id;
            if (rideId) {
              seenRidesCountRef.current[rideId] = (seenRidesCountRef.current[rideId] || 0) + 1;
              setSeenRidesCount({ ...seenRidesCountRef.current });
              setPendingRides(pr => pr.slice(1));
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (countdownTimer) clearInterval(countdownTimer); };
  }, [isOnline, pendingRides.length > 0 ? pendingRides[0]?.id : null, activeRide]);

  // Alarme sonoro — contínuo para corridas normais, apenas 1x para longas/agendadas
  useEffect(() => {
    let ringTimer;
    if (isOnline && pendingRides.length > 0 && !activeRide) {
      const ride = pendingRides[0];
      if (isLongOrScheduledRide(ride)) {
        // Corrida longa/agendada: som diferente, apenas 1 vez
        playLongRideSound();
      } else {
        // Corrida normal: alarme contínuo
        playRingSound();
        ringTimer = setInterval(() => {
          playRingSound();
        }, 3500);
      }
    }
    return () => {
      if (ringTimer) clearInterval(ringTimer);
    };
  }, [isOnline, pendingRides.length, activeRide]);

  useEffect(() => {
    let interval
    if (isOnline && !activeRide) {
      const poll = async () => {
        try { 
          const rawRides = await getPendingRides();
          const now = Date.now();
          const r = Array.isArray(rawRides) ? rawRides.filter(ride => {
            if (!ride.createdAt) return true;
            // Limite: corrida longa/agendada aparece 1x, normal aparece 2x
            const maxViews = isLongOrScheduledRide(ride) ? 1 : 2;
            if ((seenRidesCountRef.current[ride.id] || 0) >= maxViews) return false;

            const currentRadius = Number(workRadiusKmRef.current ?? workRadiusKm);
            const currentPos = myPosRef.current || myPos;

            // Filtro RIGOROSO de Raio de Atuação (Sonar)
            if (currentRadius > 0) {
              if (!Array.isArray(currentPos) || !currentPos[0]) return false;
              const driverLat = currentPos[0];
              const driverLon = currentPos[1];

              // 1. Se a distância total do trajeto for maior que o raio configurado, REJEITA (NÃO TOCA)
              const rideDist = parseFloat(ride.distanceKm) || 0;
              if (rideDist > currentRadius) {
                return false;
              }

              // 2. Validação do Início da Corrida (Origem)
              const origLat = ride.originLat != null ? parseFloat(ride.originLat) : null;
              const origLon = ride.originLon != null ? parseFloat(ride.originLon) : null;
              if (origLat != null && origLon != null) {
                const distOrigin = getDistanceFromLatLonInKm(driverLat, driverLon, origLat, origLon);
                if (distOrigin === null || distOrigin > currentRadius) {
                  return false; // Início fora do raio
                }
              } else if (currentRadius <= 15) {
                // Sem coordenadas comprovadas em raio restrito, BLOQUEIA (NÃO TOCA)
                return false;
              }

              // 3. Validação do Fim da Corrida (Destino)
              const dstLat = ride.destLat != null ? parseFloat(ride.destLat) : null;
              const dstLon = ride.destLon != null ? parseFloat(ride.destLon) : null;
              if (dstLat != null && dstLon != null) {
                const distDest = getDistanceFromLatLonInKm(driverLat, driverLon, dstLat, dstLon);
                if (distDest === null || distDest > currentRadius) {
                  return false; // Fim fora do raio
                }
              } else if (currentRadius <= 15) {
                // Sem coordenadas comprovadas em raio restrito, BLOQUEIA (NÃO TOCA)
                return false;
              }
            }

            const isLongOrScheduled = (parseFloat(ride.distanceKm) >= 50) || (ride.vehicleType && (ride.vehicleType.includes('long') || ride.vehicleType.includes('intercity') || ride.vehicleType.includes('scheduled') || ride.vehicleType.includes('freight')));
            if (isLongOrScheduled) return true;
            const ageMs = now - new Date(ride.createdAt).getTime();
            return ageMs <= 10 * 60 * 1000; // expira em 10 minutos
          }) : [];

          if (r.length > 0 && r.length > prevRideCountRef.current) {
            playRingSound();
            const first = r[0];
            sendNotification(
              `🚖 Nova Corrida — R$ ${Number(first.price).toFixed(2)}`,
              `Passageiro: ${first.passengerName || first.passenger?.name || 'Passageiro'}\nOrigem: ${first.origin?.split(',')[0]} → ${first.destination?.split(',')[0]}\nDistância: ${first.distanceKm} km`,
              first
            );
          }
          prevRideCountRef.current = r.length;
          setPendingRides(r) 
        } catch (err) {
          console.warn('Erro ao buscar corridas pendentes:', err)
        }
      }
      poll()
      interval = setInterval(poll, 3000)
    } else { 
      setPendingRides([])
      prevRideCountRef.current = 0 
    }
    return () => clearInterval(interval)
  }, [isOnline, activeRide])

  const handleAccept = async (rideId) => {
    try {
      const accepted = await acceptRide(rideId)
      setActiveRide(accepted)
      setPendingRides([])
      fetchCredits()
    } catch (e) {
      alert(e.message || 'Corrida indisponível.')
    }
  }

  const handleComplete = async () => {
    try {
      if (activeRide) {
        const finishedRide = { ...activeRide };
        await completeRide(activeRide.id);
        setCompletedRideData(finishedRide);
        setShowPixCompletionModal(true);
        setActiveRide(null);
        fetchWallet();
        fetchCredits();
      }
    } catch (err) { alert(err.message || 'Erro ao finalizar.') }
  }

  const handleNearDestination = async () => {
    try {
      if (activeRide) {
        const { nearDestinationRide } = await import('../services/api');
        await nearDestinationRide(activeRide.id);
        setActiveRide(prev => ({ ...prev, status: 'NEAR_DESTINATION' }));
      }
    } catch (err) {
      alert(err.message || 'Erro ao definir status da corrida.');
    }
  }

  // Menu & Screen
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeScreen, setActiveScreen] = useState(null)

  // History
  const [rideHistory, setRideHistory] = useState([])
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/rides`, { headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } })
        const d = await res.json()
        if (Array.isArray(d)) setRideHistory(d)
      } catch (err) {
        console.warn('Erro ao carregar historico do motorista:', err)
      }
    }
    load()
  }, [activeRide])

  // Profile & Docs
  const [profileData, setProfileData] = useState({ 
    name: user?.name || '', 
    email: user?.email || '', 
    phone: '',
    cnh: user?.cnh || '',
    crlv: user?.crlv || '',
    carPlate: user?.carPlate || '',
    carModel: user?.carModel || '',
    carColor: user?.carColor || '',
    pixKey: user?.pixKey || '',
  })



  // QR
  const [copied, setCopied] = useState(false)
  const referralLink = `${window.location.origin}/passageiro/cadastro?ref=${encodeURIComponent(user?.qrCode || '')}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}&bgcolor=ffffff&color=18181b`

  const handleCopy = () => {
    if (user?.qrCode) { navigator.clipboard.writeText(referralLink); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const handleLogout = () => { logout(); navigate('/motorista') }
  const openScreen = (s) => { setActiveScreen(s); setMenuOpen(false) }

  // Credit purchase: Payment Initialization (PIX)
  const [pixModal, setPixModal] = useState(null)
  
  // Modal de recarga de créditos (aparece quando credits <= 0)
  const [showRechargeModal, setShowRechargeModal] = useState(false)

  // Verificar créditos ao tentar ficar online
  const checkCreditsAndGoOnline = () => {
    const isTestDriver = (user?.email === 'motorista@zomp.com' || user?.email === 'motorita@zomp.com');
    if (!isTestDriver && (!user?.cnh || !user?.crlv)) {
      return alert("⚠️ Envie seus documentos no menu 'Documentos & Veículo' antes de ficar online.");
    }
    if (!isTestDriver && !user?.isApproved) {
      return alert("⏳ Seus dados estão em análise. Aguarde a aprovação da Zomp para acessar o modo Online.");
    }

    // Se não for conta de teste e não tiver créditos, mostrar modal de recarga
    if (!isTestDriver && Number(credits || 0) <= 0) {
      setShowRechargeModal(true);
      return;
    }

    setIsOnline(true);
  }

  // Tabela oficial de pacotes (mantém os descontos de 22 e 35 créditos)
  const CREDIT_PACKAGE_PRICES = { 10: 15, 22: 30, 35: 45 }

  const handleBuyCreditsInit = (qty, price) => {
    const resolvedPrice = price ?? CREDIT_PACKAGE_PRICES[qty] ?? qty * 1.5
    const totalToPay = Number(resolvedPrice) + Number(driverAppDebt || 0)
    const formattedPrice = totalToPay.toFixed(2)
    const pixPayload = `00020126580014br.gov.bcb.pix0136${Math.random().toString(36).substring(2,15)}-zomp0204${qty}C5204000053039865405${formattedPrice}5802BR5914ZOMP PAGAMENTOS6009SAO_PAULO62070503***6304ABCD`
    setPixModal({
      qty,
      basePrice: Number(resolvedPrice).toFixed(2),
      driverAppDebt: Number(driverAppDebt || 0),
      price: formattedPrice,
      pixKey: pixPayload
    })
  }

  const handleConfirmPixPayment = async () => {
    if (!pixModal) return
    try {
      const res = await fetch(`${API}/credits/purchase`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: pixModal.qty })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setCredits(d.credits)
      setDriverAppDebt(0)
      alert(d.message || 'Créditos adicionados e débitos com o app quitados com sucesso!')
      setPixModal(null)
    } catch (e) { alert(e.message || 'Erro na compra') }
  }

  const completedRides = rideHistory.filter(r => r.status === 'COMPLETED')
  const todayRides = completedRides.filter(r => new Date(r.createdAt).toDateString() === new Date().toDateString())

  return (
    <div className="driver-app">
      {/* MAP */}
      <div className="driver-map-bg">
        <MapContainer center={myPos} zoom={15} zoomControl={false} attributionControl={false} style={{ width: '100%', height: '100%' }}>
          <TileLayer url={darkMap ? darkTile : lightTile} />
          {/* Sonar de Raio de Atuação em volta do motorista */}
          {workRadiusKm > 0 && (
            <Circle
              center={myPos}
              radius={workRadiusKm * 1000}
              pathOptions={{
                color: '#00E676',
                fillColor: '#00E676',
                fillOpacity: isOnline ? 0.14 : 0.05,
                weight: 2.5,
                dashArray: '6, 6'
              }}
            />
          )}
          <MapController center={myPos} />
          <Marker position={myPos} icon={driverIcon} />
        </MapContainer>
      </div>

      {/* TOP HEADER COM MENU, CLIMA, TRÂNSITO E STATUS ONLINE */}
      <div className="driver-top-header-integrated">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button className="driver-menu-btn" onClick={() => setMenuOpen(true)}>☰</button>

          {/* Sonar / Raio de Atuação Rápido */}
          <button
            className="radius-badge-btn"
            onClick={() => setShowRadiusSelector(prev => !prev)}
            title="Ajustar Raio de Atuação (Sonar)"
          >
            <span>🎯</span>
            <span>{formatRadiusLabel(workRadiusKm)}</span>
          </button>

          {isOnline ? (
            <button className="driver-status-pill online" onClick={() => setIsOnline(false)}>
              <span className="status-dot"></span>
              Online
            </button>
          ) : (
            <button className="driver-status-pill" style={{ background: '#27272a', color: '#a1a1aa' }} onClick={checkCreditsAndGoOnline}>
              <span className="status-dot" style={{ background: '#71717a' }}></span>
              Offline
            </button>
          )}
        </div>

        {/* OVERLAY WIDGET: CLIMA & TRÂNSITO */}
        {showWeatherTraffic && (
          <div className="driver-widget-glass" style={{ marginTop: '10px' }}>
            <div className="weather-traffic-info" style={{ width: '100%', justifyContent: 'space-between' }}>
              {/* Clima Gratuito Open-Meteo */}
              <div className="weather-badge" title={`${weather.desc} • Vento ${weather.wind} km/h`}>
                <span style={{ fontSize: '1.1rem' }}>{weather.icon}</span>
                <span>{weather.temp}°C {weather.desc}</span>
              </div>
              
              {/* Trânsito */}
              <div className="traffic-badge" style={{ color: getTrafficInfo().color }}>
                <span>{getTrafficInfo().icon}</span>
                <span>{getTrafficInfo().label}</span>
              </div>
            </div>
          </div>
        )}

        {/* Seletor Rápido de Raio de Atuação */}
        {showRadiusSelector && (
          <div className="radius-selector-card" style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎯</span>
                <strong style={{ fontSize: '0.9rem' }}>Raio de Atuação (Sonar)</strong>
              </div>
              <button
                onClick={() => setShowRadiusSelector(false)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '4px 0 8px', fontSize: '0.75rem', color: '#a1a1aa' }}>
              Defina o alcance máximo das corridas a partir da sua posição atual:
            </p>

            <div className="radius-options-grid">
              {[0.5, 1, 3, 5, 10, 15, 20, 30, 50, 0].map(r => (
                <button
                  key={r}
                  className={`radius-chip ${workRadiusKm === r ? 'active' : ''}`}
                  onClick={() => {
                    setWorkRadiusKm(r);
                    localStorage.setItem('zomp_driver_radius', String(r));
                    setShowRadiusSelector(false);
                  }}
                >
                  {formatRadiusLabel(r)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM */}
      <div className="driver-bottom-bar">
        {activeRide ? (
          activeRide.status === 'NEAR_DESTINATION' ? (
            <div className="active-ride-card animate-fade-in-up">
              <div className="active-ride-header" style={{ borderBottom: '1px solid #e4e4e7', paddingBottom: '12px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🏁 Faltam 500m</h3>
                <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 800, background: '#fffbeb', padding: '4px 10px', borderRadius: '100px', border: '1px solid #fde68a' }}>CHEGANDO</span>
              </div>
              <div className="active-ride-body" style={{ marginTop: '14px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: '#52525b', fontWeight: 600, margin: '0 0 16px 0' }}>
                  Mostre o QR Code abaixo ao passageiro <strong>{activeRide.passengerName || activeRide.passenger?.name || 'Passageiro'}</strong> para receber o pagamento.
                </p>
                
                {profileData.pixKey ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '20px', border: '1px solid #e4e4e7', marginBottom: '16px' }}>
                    <div style={{ background: '#fff', padding: '10px', borderRadius: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'inline-block' }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generatePixPayload(profileData.pixKey, activeRide.price, user?.name || 'Motorista Zomp'))}`} 
                        alt="PIX QR Code" 
                        style={{ width: '180px', height: '180px', display: 'block' }} 
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chave Cadastrada</span>
                      <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: '#18181b', fontFamily: 'monospace', marginTop: '2px' }}>{profileData.pixKey}</span>
                      <span style={{ display: 'inline-block', fontSize: '1.25rem', fontWeight: 900, color: '#059669', marginTop: '8px' }}>R$ {formatNumber ? formatNumber(activeRide.price, 2, '0.00') : Number(activeRide.price).toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '16px', color: '#991b1b', fontSize: '0.85rem', fontWeight: 700, marginBottom: '16px', textAlign: 'center' }}>
                    ⚠️ Você não cadastrou sua chave PIX no perfil! Acesse o menu lateral &gt; Meu Perfil para cadastrar sua chave e liberar o QR Code.
                  </div>
                )}

                <button className="btn-premium btn-green" style={{ width: '100%' }} onClick={handleComplete}>
                  ✓ Confirmar Pagamento e Finalizar
                </button>
              </div>
            </div>
          ) : (
            <div className="active-ride-card">
              <div className="active-ride-header">
                <h3>🚗 Viagem em Andamento</h3>
                <span style={{fontSize:'0.75rem',color:'#059669',fontWeight:800,background:'#ecfdf5',padding:'4px 10px',borderRadius:'100px'}}>ATIVA</span>
              </div>
              <div className="active-ride-body">
                <div className="active-ride-info">
                  <div className="info-row">
                    <span className="info-label">Passageiro</span>
                    <div style={{textAlign:'right'}}>
                      <div className="info-value">{activeRide.passenger?.name || 'Passageiro'}</div>
                      <div style={{fontSize:'0.7rem', fontWeight:700, color:'#64748b'}}>
                         ⭐ {formatNumber ? formatNumber(activeRide.passenger?.rating, 1, '5.0') : (activeRide.passenger?.rating?.toFixed(1) || '5.0')} • {activeRide.passenger?.ridesCompleted || 0} viagens
                      </div>
                    </div>
                  </div>
                  <div className="info-row"><span className="info-label">Origem</span><span className="info-value" style={{maxWidth:'60%',textAlign:'right'}}>{activeRide.origin || '-'}</span></div>
                  {activeRide.stops && activeRide.stops.length > 0 && activeRide.stops.map((stop, i) => (
                    <div key={i} className="info-row" style={{background:'#fffbeb',padding:'8px 14px',borderRadius:'8px',marginTop:'2px'}}>
                      <span className="info-label" style={{color:'#92400e',fontWeight:700}}>📍 Parada {i+1}</span>
                      <span className="info-value" style={{maxWidth:'60%',textAlign:'right',color:'#b45309'}}>{stop}</span>
                    </div>
                  ))}
                  <div className="info-row"><span className="info-label">Destino</span><span className="info-value" style={{maxWidth:'60%',textAlign:'right'}}>{activeRide.destination || '-'}</span></div>
                  <div className="info-row"><span className="info-label">Distância</span><span className="info-value">{activeRide.distanceKm} km</span></div>
                  <div className="info-row" style={{background:'#ecfdf5',padding:'10px 14px',borderRadius:'10px',marginTop:'4px'}}>
                    <span className="info-label" style={{color:'#065f46',fontWeight:700}}>Ganho</span>
                    <span className="info-value" style={{color:'#059669',fontSize:'1.3rem'}}>R$ {formatNumber ? formatNumber(activeRide.price, 2, '0.00') : Number(activeRide.price).toFixed(2)}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button className="btn-premium btn-green" style={{ flex: 1.5, margin: 0 }} onClick={handleComplete}>✓ Finalizar Corrida</button>
                  <button className="btn-premium" style={{ flex: 1.2, margin: 0, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }} onClick={handleNearDestination}>Simular 500m 🏁</button>
                </div>
              </div>
            </div>
          )
        ) : pendingRides.length > 0 ? (
          <div className="ride-request-card animate-fade-in-up" style={{ border: '2px solid #10b981', boxShadow: '0 8px 30px rgba(16, 185, 129, 0.25)', position: 'relative', overflow: 'hidden' }}>
            {/* Barra de progresso do countdown */}
            <div style={{
              position: 'absolute', top: 0, left: 0,
              width: `${(rideCountdown / 10) * 100}%`,
              height: '4px',
              background: rideCountdown <= 3 ? '#ef4444' : '#10b981',
              transition: 'width 1s linear, background 0.3s',
              borderRadius: '0 2px 2px 0'
            }} />
            <div className="request-header" style={{ borderBottom: '1px solid #27272a', paddingBottom: '12px' }}>
              <div>
                <div className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 800 }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                  {pendingRides[0].vehicleType?.includes('freight') ? '📦 NOVO FRETE SOLICITADO' : '🚖 NOVA CORRIDA'}
                </div>
                {/* Badges de CORRIDA LONGA / AGENDADA */}
                {isLongOrScheduledRide(pendingRides[0]) && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {parseFloat(pendingRides[0].distanceKm) >= 15 && (
                      <span style={{ background: '#7c3aed', color: '#fff', fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px' }}>
                        🛣️ CORRIDA LONGA
                      </span>
                    )}
                    {(pendingRides[0].vehicleType?.includes('scheduled')) && (
                      <span style={{ background: '#2563eb', color: '#fff', fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px' }}>
                        📅 AGENDADA
                      </span>
                    )}
                    {pendingRides[0].vehicleType?.includes('freight') && (
                      <span style={{ background: '#d97706', color: '#fff', fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px' }}>
                        📦 FRETE
                      </span>
                    )}
                  </div>
                )}
                <div style={{display:'flex', alignItems:'center', gap:'8px', marginTop:'4px'}}>
                  <div style={{fontSize:'0.95rem',fontWeight:700,color:'#f4f4f5'}}>
                    {pendingRides[0].passengerName || pendingRides[0].passenger?.name || 'Passageiro'}
                  </div>
                  {(!pendingRides[0].passengerRidesCompleted && !pendingRides[0].passenger?.ridesCompleted) && (
                    <span className="ap-badge-new" style={{margin:0, padding:'1px 5px', fontSize:'0.6rem'}}>Novo</span>
                  )}
                </div>
                <div style={{fontSize:'0.72rem', color:'#a1a1aa', fontWeight:600, marginTop:'2px'}}>
                   ⭐ {formatNumber(pendingRides[0].passengerRating || pendingRides[0].passenger?.rating, 1, '5.0')} • {(pendingRides[0].passengerRidesCompleted ?? pendingRides[0].passenger?.ridesCompleted) || 0} viagens
                </div>
              </div>
              <div className="price" style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 900 }}>
                R$ {formatNumber(pendingRides[0].price, 2, '0.00')}
              </div>
            </div>
            <div className="request-body" style={{ marginTop: '12px' }}>
              <div className="request-route">
                <div className="route-dots"><div className="dot-green"></div><div className="dot-line"></div><div className="dot-red"></div></div>
                <div className="route-texts">
                  <div className="route-label">Embarque / Coleta</div>
                  <div className="route-addr" style={{ fontWeight: 600 }}>{pendingRides[0].origin || 'Origem'}</div>
                  {pendingRides[0].stops && pendingRides[0].stops.length > 0 && pendingRides[0].stops.map((stop, i) => (
                    <div key={i}>
                      <div className="route-label" style={{color:'#f59e0b'}}>📍 Parada {i+1}</div>
                      <div className="route-addr" style={{color:'#fde68a'}}>{stop}</div>
                    </div>
                  ))}
                  <div className="route-label" style={{ marginTop: '6px' }}>Destino / Entrega</div>
                  <div className="route-addr" style={{ fontWeight: 600 }}>{pendingRides[0].destination || 'Destino'}</div>
                </div>
              </div>
              <div className="request-meta" style={{ margin: '14px 0' }}>
                <span className="meta-tag">📏 {pendingRides[0].distanceKm} km</span>
                <span className="meta-tag">
                  {pendingRides[0].vehicleType?.includes('freight')
                    ? '🚚 Frete'
                    : pendingRides[0].vehicleType === 'moto'
                    ? '🏍️ Moto'
                    : '🚗 Carro'}
                </span>
                {pendingRides[0].stops && pendingRides[0].stops.length > 0 && (
                  <span className="meta-tag" style={{background:'#fffbeb',color:'#b45309'}}>📍 {pendingRides[0].stops.length} parada{pendingRides[0].stops.length > 1 ? 's' : ''}</span>
                )}
              </div>
              <div className="request-actions" style={{ gap: '10px' }}>
                <button 
                  className="btn-accept" 
                  style={{ flex: 1.6, padding: '14px', fontSize: '1rem', fontWeight: 900, background: '#10b981', color: '#fff', borderRadius: '12px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)', position: 'relative' }}
                  onClick={() => handleAccept(pendingRides[0].id)}
                >
                  ✓ Aceitar ({rideCountdown}s)
                </button>
                <button 
                  className="btn-reject" 
                  style={{ flex: 1, padding: '14px', fontSize: '0.9rem', fontWeight: 700, background: '#27272a', color: '#a1a1aa', borderRadius: '12px', border: '1px solid #3f3f46', cursor: 'pointer' }}
                  onClick={async () => {
                    const rideId = pendingRides[0].id;
                    seenRidesCountRef.current[rideId] = (seenRidesCountRef.current[rideId] || 0) + 1;
                    setSeenRidesCount({ ...seenRidesCountRef.current });
                    setPendingRides(prev => prev.slice(1));
                    try {
                      const { rejectRide } = await import('../services/api');
                      await rejectRide(rideId);
                    } catch (e) { console.error('Erro ao rejeitar', e) }
                  }}
                >
                  Recusar
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Offline = button to go online */
          !isOnline ? (
            <button
              className="btn-go-online"
              onClick={checkCreditsAndGoOnline}
              disabled={isOnline}
            >
              Ficar Online
            </button>
          ) : (
            /* Online + no rides available = searching */
            <div className="driver-idle-msg online-msg">
              <div className="spinner-ring"></div>
              <h3>Conectado</h3>
              <p>Buscando corridas na sua região...</p>
            </div>
          )
        )}
      </div>

      {/* SIDE MENU */}
      {menuOpen && (
        <div className="driver-side-overlay" onClick={() => setMenuOpen(false)}>
          <div className="driver-side-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div style={{textAlign: 'center', marginBottom: '20px'}}>
                <img src="/logo.svg" alt="Zomp Logo" style={{height: '40px', filter: 'drop-shadow(0 0 10px rgba(151, 233, 0, 0.4))'}} />
              </div>
              <div className="drawer-profile-box">
                <div className="drawer-avatar">{user?.name?.charAt(0) || 'M'}</div>
                <div className="drawer-user-info">
                  <h3>{user?.name}</h3>
                  <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                    <span style={{fontSize:'0.75rem', fontWeight:800, color:'#f59e0b'}}>⭐ {formatNumber(user?.rating, 1, '5.0')}</span>
                    <span style={{fontSize:'0.65rem', fontWeight:700, color:'#9ca3af'}}>• {user?.ridesCompleted || 0} viagens</span>
                  </div>
                </div>
              </div>
              <div className="drawer-balance-row">
                <div className="balance-item">
                  <span className="lbl">Aceitação</span>
                  <div className={`val ${((user?.ridesAccepted || 1) / (user?.ridesAccepted + user?.ridesMissed || 1) * 100) < 70 ? 'red' : 'green'}`}>
                    {(((user?.ridesAccepted || 1) / (user?.ridesAccepted + user?.ridesMissed || 1)) * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="balance-item">
                  <span className="lbl">Royalties</span>
                  <div className="val">R$ {Number(wallet.balance || 0).toFixed(2)}</div>
                </div>
              </div>
              <div className="drawer-credits-row">
                <div className="balance-item" style={{width:'100%'}}>
                  <span className="lbl">Créditos de Corrida</span>
                  <div className="val" style={{color:'#059669', fontSize:'1.4rem'}}>{Number(credits || 0)} <span style={{fontSize:'0.8rem', fontWeight:600, color:'#71717a'}}>créditos</span></div>
                </div>
              </div>
            </div>

            <div className="drawer-section-label">Principal</div>
            <nav className="drawer-nav">
              <button className={`drawer-nav-item ${activeScreen === 'PROFILE' ? 'active' : ''}`} onClick={() => openScreen('PROFILE')}>
                <span className="nav-icon"><User size={18} /></span> Perfil Interativo
              </button>
              <button className={`drawer-nav-item ${activeScreen === 'DOCS' ? 'active' : ''}`} onClick={() => openScreen('DOCS')}>
                <span className="nav-icon"><FileText size={18} /></span> Documentação
              </button>
              <button className={`drawer-nav-item ${activeScreen === 'HISTORY' ? 'active' : ''}`} onClick={() => openScreen('HISTORY')}>
                <span className="nav-icon"><Clock size={18} /></span> Histórico
              </button>
              
              <div className="drawer-section-label">Financeiro</div>
              <button className={`drawer-nav-item ${activeScreen === 'CREDITS' ? 'active' : ''}`} onClick={() => openScreen('CREDITS')}>
                <span className="nav-icon"><Ticket size={18} /></span> Meus Créditos
                <span className="nav-badge">{Number(credits || 0)}</span>
              </button>
              <button className={`drawer-nav-item ${activeScreen === 'ROYALTIES' ? 'active' : ''}`} onClick={() => openScreen('ROYALTIES')}>
                <span className="nav-icon"><Gem size={18} /></span> Extrato Royalties
              </button>

              <div className="drawer-section-label">Sistema & Ajuda</div>
              <button className={`drawer-nav-item ${activeScreen === 'REFERRAL' ? 'active' : ''}`} onClick={() => openScreen('REFERRAL')}>
                <span className="nav-icon"><UserPlus size={18} /></span> Indicar Passageiro
              </button>
              <button className={`drawer-nav-item ${activeScreen === 'SUPPORT' ? 'active' : ''}`} onClick={() => openScreen('SUPPORT')}>
                <span className="nav-icon"><Headset size={18} /></span> Suporte
              </button>
              <button className={`drawer-nav-item ${activeScreen === 'FAQ' ? 'active' : ''}`} onClick={() => openScreen('FAQ')}>
                <span className="nav-icon"><HelpCircle size={18} /></span> FAQ
              </button>

              <div className="drawer-section-label">Preferências & Mapa</div>
              <button
                className="drawer-nav-item"
                onClick={() => {
                  const nextVal = !showWeatherTraffic;
                  setShowWeatherTraffic(nextVal);
                  localStorage.setItem('zomp_driver_show_weather', String(nextVal));
                }}
              >
                <span className="nav-icon"><CloudSun size={18} /></span>
                {showWeatherTraffic ? 'Ocultar Clima & Trânsito' : 'Exibir Clima & Trânsito'}
              </button>

              <button
                className="drawer-nav-item"
                onClick={() => {
                  setShowRadiusSelector(true);
                  setMenuOpen(false);
                }}
              >
                <span className="nav-icon"><Radio size={18} /></span>
                Raio Sonar: {formatRadiusLabel(workRadiusKm)}
              </button>

              <button className="drawer-nav-item" onClick={() => { setDarkMap(!darkMap); setMenuOpen(false) }}>
                <span className="nav-icon">{darkMap ? <Sun size={18} /> : <Moon size={18} />}</span> {darkMap ? 'Modo Claro' : 'Mapa Escuro'}
              </button>

              <button
                className="drawer-nav-item"
                style={{ color: '#00E676', fontWeight: 800 }}
                onClick={async () => {
                  try {
                    if ('caches' in window) {
                      const names = await caches.keys();
                      await Promise.all(names.map(name => caches.delete(name)));
                    }
                    if ('serviceWorker' in navigator) {
                      const registrations = await navigator.serviceWorker.getRegistrations();
                      for (let reg of registrations) {
                        await reg.unregister();
                      }
                    }
                    window.location.reload(true);
                  } catch (e) {
                    window.location.reload();
                  }
                }}
              >
                <span className="nav-icon"><RefreshCw size={18} /></span>
                Atualizar App (Limpar Cache)
              </button>
            </nav>

            <div className="drawer-footer">
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={18} /> Sair da Conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PROFILE ===== */}
      {activeScreen === 'PROFILE' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Meu Perfil</h2></div>
          <div className="inner-body">
            <div style={{textAlign:'center',marginBottom:'28px'}}>
              <div className="profile-avatar-lg">{user?.name?.charAt(0)}</div>
              <h3 style={{fontSize:'1.2rem',fontWeight:800,marginBottom:'2px'}}>{user?.name}</h3>
              <p style={{color:'#71717a',fontWeight:600,fontSize:'0.9rem'}}>Motorista Parceiro</p>
            </div>
            <div className="form-field"><label className="form-label">Nome Completo</label><input className="form-input" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} /></div>
            <div className="form-field"><label className="form-label">E-mail</label><input className="form-input" type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Telefone</label><input className="form-input" type="tel" placeholder="(00) 00000-0000" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Chave PIX (Para Recebimento)</label><input className="form-input" placeholder="CPF, E-mail, ou Celular" value={profileData.pixKey} onChange={e => setProfileData({...profileData, pixKey: e.target.value})} /></div>
            <button className="btn-premium btn-dark" style={{marginTop:'8px'}} onClick={async () => { 
                try {
                  const res = await fetch(`${API}/user/profile`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(profileData)
                  });
                  if(!res.ok) throw new Error('Erro ao salvar');
                  const updatedUserLocal = {...user, ...profileData};
                  localStorage.setItem('zomp_user', JSON.stringify(updatedUserLocal));
                  setUser(updatedUserLocal);
                  alert('Perfil salvo!');
                  setActiveScreen(null);
                } catch(e) { alert(e.message) }
              }}>Salvar Alterações</button>
          </div>
        </div>
      )}

      {/* ===== DOCUMENTS & VEHICLES ===== */}
      {activeScreen === 'DOCS' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Documentos & Veículo</h2></div>
          <div className="inner-body">
            <div className="section-title">Informações do Veículo</div>
            <div className="premium-card" style={{padding: '16px'}}>
              <div className="form-field"><label className="form-label">Placa do Veículo</label><input className="form-input" placeholder="ABC-1234" value={profileData.carPlate} onChange={e => setProfileData({...profileData, carPlate: e.target.value.toUpperCase()})} /></div>
              <div className="form-field"><label className="form-label">Modelo</label><input className="form-input" placeholder="Ex: Chevrolet Onix" value={profileData.carModel} onChange={e => setProfileData({...profileData, carModel: e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Cor</label><input className="form-input" placeholder="Ex: Prata" value={profileData.carColor} onChange={e => setProfileData({...profileData, carColor: e.target.value})} /></div>
            </div>

            <div className="section-title" style={{marginTop: '20px'}}>Documentos (Fotos)</div>
            <div className="premium-card" style={{padding: '16px'}}>
              <div className="form-field">
                <label className="form-label">CNH</label>
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                  <input type="file" accept="image/*" style={{display:'none'}} id="upload-cnh" onChange={(e) => { if(e.target.files[0]) setProfileData({...profileData, cnh: 'uploaded'})}} />
                  <label htmlFor="upload-cnh" className="btn-premium btn-dark" style={{flex:1, textAlign:'center', padding:'10px'}}>+ Enviar CNH</label>
                  {profileData.cnh && <span style={{color: '#059669', fontWeight: 800}}>✓ OK</span>}
                </div>
              </div>
              <div className="form-field" style={{marginTop: '16px'}}>
                <label className="form-label">CRLV do Veículo</label>
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                  <input type="file" accept="image/*" style={{display:'none'}} id="upload-crlv" onChange={(e) => { if(e.target.files[0]) setProfileData({...profileData, crlv: 'uploaded'})}} />
                  <label htmlFor="upload-crlv" className="btn-premium btn-dark" style={{flex:1, textAlign:'center', padding:'10px'}}>+ Enviar CRLV</label>
                  {profileData.crlv && <span style={{color: '#059669', fontWeight: 800}}>✓ OK</span>}
                </div>
              </div>
            </div>

            <button className="btn-premium btn-green" style={{marginTop:'16px'}} onClick={async () => {
                try {
                  const res = await fetch(`${API}/user/profile`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(profileData)
                  });
                  if(!res.ok) throw new Error('Erro ao salvar');
                  const updatedUserLocal = {...user, ...profileData, isApproved: user.isApproved}; // preserve approval status from local
                  localStorage.setItem('zomp_user', JSON.stringify(updatedUserLocal));
                  setUser(updatedUserLocal);
                  alert('Documentos e dados salvos com sucesso!');
                  setActiveScreen(null);
                } catch(e) { alert(e.message) }
            }}>Salvar Documentos</button>
          </div>
        </div>
      )}

      {/* ===== HISTORY ===== */}
      {activeScreen === 'HISTORY' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Histórico</h2></div>
          <div className="inner-body">
            <div className="stats-row">
              <div className="stat-mini"><div className="stat-num">{completedRides.length}</div><div className="stat-lbl">Total</div></div>
              <div className="stat-mini"><div className="stat-num">{todayRides.length}</div><div className="stat-lbl">Hoje</div></div>
            </div>
            {rideHistory.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px 0'}}><p style={{fontSize:'2.5rem',marginBottom:'12px'}}>📋</p><p style={{color:'#71717a',fontWeight:700,fontSize:'0.95rem'}}>Nenhuma corrida ainda.</p></div>
            ) : rideHistory.map(ride => {
              const d = new Date(ride.createdAt)
              const dt = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
              return (
                <div key={ride.id} className="history-card">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                    <span style={{fontWeight:700,fontSize:'0.85rem',color:'#71717a'}}>{dt}</span>
                    <span style={{fontWeight:800,color: ride.status==='COMPLETED' ? '#059669' : '#ef4444',fontSize:'1.05rem'}}>R$ {formatNumber(ride.price, 2, '0.00')}</span>
                  </div>
                  <div style={{fontSize:'0.85rem',color:'#3f3f46',marginBottom:'4px',fontWeight:600}}>📍 {ride.origin || '-'}</div>
                  <div style={{fontSize:'0.85rem',color:'#3f3f46',marginBottom:'10px',fontWeight:600}}>🏁 {ride.destination || '-'}</div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    <span className="meta-tag">{ride.vehicleType === 'car' ? '🚗' : '🏍️'} {ride.distanceKm} km</span>
                    <span className="meta-tag" style={{background: ride.status==='COMPLETED' ? '#ecfdf5' : '#fef2f2', color: ride.status==='COMPLETED' ? '#059669' : '#ef4444'}}>{ride.status === 'COMPLETED' ? '✓ Concluída' : ride.status}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== CREDITS ===== */}
      {activeScreen === 'CREDITS' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Créditos</h2></div>
          <div className="inner-body">
            <div className="premium-card-dark">
              <div style={{position:'relative',zIndex:2}}>
                <div style={{fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'#9ca3af',marginBottom:'8px'}}>Seus Créditos</div>
                <div style={{display:'flex',alignItems:'baseline',gap:'6px',marginBottom:'6px'}}>
                  <span style={{fontSize:'3rem',fontWeight:800}}>{credits}</span>
                  <span style={{fontSize:'1rem',color:'#9ca3af',fontWeight:600}}>créditos</span>
                </div>
                <div style={{fontSize:'0.8rem',color:'#6b7280'}}>1 crédito = 1 corrida • R$ 1,50 cada</div>
              </div>
            </div>

            {credits <= 3 && (
              <div className="tip-card" style={{background:'#fef2f2',borderColor:'#fecaca'}}>
                <span className="tip-icon">⚠️</span>
                <div><div className="tip-title" style={{color:'#b91c1c'}}>Créditos baixos!</div><div className="tip-text" style={{color:'#dc2626'}}>Compre um pacote para continuar aceitando corridas.</div></div>
              </div>
            )}

            <div className="section-title" style={{marginTop:'20px'}}>Comprar Pacotes</div>

            <div className="credit-package" onClick={() => handleBuyCreditsInit(10)}>
              <div className="credit-pkg-icon" style={{background:'#ecfdf5'}}>🎫</div>
              <div className="credit-pkg-info"><h4>10 Créditos</h4><p>Pacote Básico • 10 corridas</p></div>
              <div className="credit-pkg-price"><div className="price">R$ 15,00</div><div className="unit">R$ 1,50/un</div></div>
            </div>

            <div className="credit-package popular" onClick={() => handleBuyCreditsInit(22)}>
              <div className="credit-pkg-icon" style={{background:'#d1fae5'}}>⭐</div>
              <div className="credit-pkg-info"><h4>22 Créditos</h4><p style={{color:'#059669',fontWeight:700}}>+2 Corridas Grátis</p></div>
              <div className="credit-pkg-price"><div className="price">R$ 30,00</div><div className="unit">R$ 1,36/un</div></div>
            </div>

            <div className="credit-package" onClick={() => handleBuyCreditsInit(35)} style={{background: '#fef3c7', borderColor: '#f59e0b', transform: 'scale(1.02)'}}>
              <div className="credit-pkg-icon" style={{background:'#f59e0b', color:'#fff'}}>🏆</div>
              <div className="credit-pkg-info"><h4>35 Créditos</h4><p style={{color:'#b45309',fontWeight:800}}>+5 Corridas Grátis (Econômico)</p></div>
              <div className="credit-pkg-price"><div className="price" style={{color:'#92400e'}}>R$ 45,00</div><div className="unit" style={{color:'#b45309'}}>R$ 1,28/un</div></div>
            </div>

            <div className="tip-card" style={{marginTop:'20px', background:'#ecfdf5', borderColor:'#a7f3d0'}}>
              <span className="tip-icon">🎁</span>
              <div><div className="tip-title">Presente de Cadastro!</div><div className="tip-text">Como cortesia por se cadastrar na plataforma Zomp, você recebeu automaticamente <b>10 créditos gratuitos</b> em sua conta. Aproveite para começar a gerar renda agora mesmo!</div></div>
            </div>
          </div>
        </div>
      )}

      {pixModal && (
        <div className="driver-side-overlay" style={{zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'}} onClick={() => setPixModal(null)}>
          <div className="premium-card" style={{width: '100%', maxWidth: '360px', padding: '22px', boxShadow: '0 24px 70px rgba(0,0,0,0.35)'}} onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '16px'}}>
              <div>
                <div style={{fontSize: '0.75rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '1px'}}>Pagamento PIX</div>
                <h3 style={{margin: '4px 0 0', fontSize: '1.35rem', fontWeight: 900}}>Comprar {pixModal.qty} créditos</h3>
              </div>
              <button type="button" onClick={() => setPixModal(null)} style={{border: 'none', background: '#f4f4f5', borderRadius: '999px', width: '34px', height: '34px', cursor: 'pointer', fontWeight: 900}}>×</button>
            </div>

            {pixModal.driverAppDebt > 0 && (
              <div style={{ background: '#fef2f2', border: '1.5px solid #f87171', borderRadius: '12px', padding: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#991b1b' }}>
                      VALOR EXTRA A REPASSAR AO APP
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#b91c1c', fontWeight: 600, lineHeight: 1.4 }}>
                      Você recebeu <strong>R$ {pixModal.driverAppDebt.toFixed(2)}</strong> a mais de corrida pendente de outro motorista/sistema. Este valor foi somado a esta recarga e será quitado com a plataforma.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '14px', padding: '14px', marginBottom: '14px'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#047857', fontWeight: 700, marginBottom: '2px' }}>
                <span>Pacote {pixModal.qty} créditos:</span>
                <span>R$ {pixModal.basePrice}</span>
              </div>
              {pixModal.driverAppDebt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, marginBottom: '4px' }}>
                  <span>Débito c/ App (Corrida Anterior):</span>
                  <span>+ R$ {pixModal.driverAppDebt.toFixed(2)}</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid #a7f3d0', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{fontSize: '0.85rem', color: '#047857', fontWeight: 800}}>Total PIX a Pagar</div>
                <div style={{fontSize: '1.8rem', fontWeight: 900, color: '#064e3b'}}>R$ {pixModal.price}</div>
              </div>
            </div>

            <textarea
              readOnly
              value={pixModal.pixKey}
              style={{width: '100%', minHeight: '96px', resize: 'none', border: '1px solid #e4e4e7', borderRadius: '12px', padding: '12px', fontSize: '0.78rem', fontWeight: 700, color: '#3f3f46', background: '#fafafa', marginBottom: '12px'}}
            />

            <button
              type="button"
              className="btn-premium btn-dark"
              style={{marginBottom: '10px'}}
              onClick={() => navigator.clipboard?.writeText(pixModal.pixKey)}
            >
              Copiar código PIX
            </button>
            <button type="button" className="btn-premium btn-green" onClick={handleConfirmPixPayment}>
              Confirmar pagamento
            </button>
          </div>
        </div>
      )}

      {/* ===== ROYALTIES ===== */}
      {activeScreen === 'ROYALTIES' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Royalties</h2></div>
          <div className="inner-body">
            <div className="premium-card-dark">
              <div style={{position:'relative',zIndex:2}}>
                <div style={{fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'#9ca3af',marginBottom:'8px'}}>Saldo de Royalties</div>
                <div style={{display:'flex',alignItems:'baseline',gap:'6px',marginBottom:'6px'}}>
                  <span style={{fontSize:'1.2rem',color:'#9ca3af'}}>R$</span>
                  <span style={{fontSize:'3rem',fontWeight:800}}>{Number(wallet.balance || 0).toFixed(2)}</span>
                </div>
                <div style={{fontSize:'0.8rem',color:'#6b7280'}}>R$ 0,30 por corrida de cada passageiro vinculado</div>
              </div>
            </div>

            <div className="stats-row">
              <div className="stat-mini"><div className="stat-num">{linkedPassengers}</div><div className="stat-lbl">Vinculados</div></div>
              <div className="stat-mini"><div className="stat-num">3 meses</div><div className="stat-lbl">Ciclo saque</div></div>
            </div>

            <button className="btn-premium btn-green" style={{marginTop:'8px'}} disabled={Number(wallet.balance || 0) < 1} onClick={() => alert('Saque solicitado!')}>
              {Number(wallet.balance || 0) >= 1 ? '💰 Solicitar Saque' : 'Saldo Insuficiente (mín. R$ 1,00)'}
            </button>

            <div className="tip-card" style={{marginTop:'16px'}}>
              <span className="tip-icon">👑</span>
              <div><div className="tip-title">Como funciona?</div><div className="tip-text">Cada passageiro que você transporta pela primeira vez fica vinculado por 2 anos a você. A cada corrida futura dele, R$ 0,30 é creditado na sua carteira.</div></div>
            </div>
          </div>
        </div>
      )}

      {/* ===== REFERRAL ===== */}
      {activeScreen === 'REFERRAL' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Indicar Passageiro</h2></div>
          <div className="inner-body">
            <div className="qr-card">
              <h3 style={{fontSize:'1.15rem',fontWeight:800,marginBottom:'4px'}}>Seu QR Code</h3>
              <p style={{color:'#71717a',fontSize:'0.85rem',fontWeight:600}}>Compartilhe para vincular passageiros</p>
              <img src={qrUrl} alt="QR Code" />
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',marginTop:'12px'}}>
                <code style={{background:'#f4f4f5',padding:'8px 16px',borderRadius:'100px',fontWeight:700,fontSize:'0.95rem',letterSpacing:'0.05em'}}>{user?.qrCode || '---'}</code>
                <button className="btn-premium btn-dark" style={{width:'auto',padding:'8px 16px',fontSize:'0.85rem',borderRadius:'100px'}} onClick={handleCopy}>
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </div>

            <div className="section-title">Como funciona</div>
            <div className="premium-card">
              <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
                {['Mostre o QR Code ao passageiro','Ele escaneia durante o cadastro','Vínculo de 2 anos criado!','Ganhe R$ 0,30 por corrida dele'].map((step, i) => (
                  <div key={i} style={{display:'flex',gap:'12px',alignItems:'center'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',background: i < 4 ? '#ecfdf5' : '#f4f4f5',color:'#059669',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'0.8rem',flexShrink:0}}>{i+1}</div>
                    <span style={{fontWeight:600,fontSize:'0.9rem',color:'#3f3f46'}}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="tip-card">
              <span className="tip-icon">💡</span>
              <div><div className="tip-title">Dica</div><div className="tip-text">Mesmo sem indicação, o primeiro passageiro que você levar é vinculado automaticamente a você!</div></div>
            </div>
          </div>
        </div>
      )}

      {/* ===== EXTERNAL ===== */}
      {activeScreen === 'EXTERNAL' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Corridas Externas</h2></div>
          <div className="inner-body">
            <div className="premium-card" style={{textAlign:'center',padding:'32px 20px'}}>
              <span style={{fontSize:'2.5rem',display:'block',marginBottom:'12px'}}>🔄</span>
              <h3 style={{fontWeight:800,fontSize:'1.1rem',marginBottom:'6px'}}>Integração Multi-App</h3>
              <p style={{color:'#71717a',fontWeight:600,fontSize:'0.85rem'}}>Receba corridas de outros aplicativos aqui na Zomp.</p>
            </div>
            {[{name:'99',color:'#00b14f',status:'Em breve'},{name:'Uber',color:'#000',status:'Em breve'},{name:'InDriver',color:'#2dbe60',status:'Em breve'}].map(app => (
              <div key={app.name} className="premium-card" style={{display:'flex',alignItems:'center',gap:'14px'}}>
                <div style={{width:'44px',height:'44px',borderRadius:'12px',background:app.color,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'0.9rem'}}>{app.name.charAt(0)}</div>
                <div style={{flex:1}}><div style={{fontWeight:700}}>{app.name}</div><div style={{fontSize:'0.8rem',color:'#f59e0b',fontWeight:700}}>{app.status}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== SUPPORT ===== */}
      {activeScreen === 'SUPPORT' && (
        <div className="driver-inner-screen">
          <div className="inner-header"><button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button><h2>Suporte</h2></div>
          <div className="inner-body">
            <div className="premium-card" style={{textAlign:'center',padding:'28px',marginBottom:'20px'}}>
              <span style={{fontSize:'2.5rem',display:'block',marginBottom:'8px'}}>🎧</span>
              <h3 style={{fontWeight:800,fontSize:'1.1rem',marginBottom:'4px'}}>Como podemos ajudar?</h3>
              <p style={{color:'#71717a',fontWeight:600,fontSize:'0.85rem'}}>Escolha um canal de atendimento</p>
            </div>
            {[
              {icon:'📧',title:'E-mail',sub:'suporte@zomp.app',bg:'#eff6ff',action:() => window.open('mailto:suporte@zomp.app')},
              {icon:'💬',title:'WhatsApp',sub:'Atendimento rápido',bg:'#ecfdf5',action:() => window.open('https://wa.me/5500000000000')},
              {icon:'📞',title:'Telefone',sub:'0800 000 ZOMP',bg:'#fef3c7',action:() => {}}
            ].map((item,i) => (
              <div key={i} className="support-item" onClick={item.action}>
                <div className="support-icon" style={{background:item.bg}}>{item.icon}</div>
                <div><div style={{fontWeight:700,fontSize:'0.95rem'}}>{item.title}</div><div style={{fontSize:'0.8rem',color:'#71717a',fontWeight:600}}>{item.sub}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== FAQ ===== */}
      {activeScreen === 'FAQ' && (
        <div className="driver-inner-screen">
          <div className="inner-header">
            <button className="inner-back-btn" onClick={() => setActiveScreen(null)}>←</button>
            <h2>Perguntas Frequentes (FAQ)</h2>
          </div>
          <div className="inner-body">
            <div className="premium-card" style={{ textAlign: 'center', padding: '24px 16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '2.4rem', display: 'block', marginBottom: '8px' }}>💡</span>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', margin: '0 0 4px' }}>Central de Dúvidas</h3>
              <p style={{ color: '#71717a', fontWeight: 600, fontSize: '0.82rem', margin: 0 }}>
                Tudo o que você precisa saber para faturar mais com a Zomp
              </p>
            </div>

            {DRIVER_FAQS.map((faq, i) => (
              <div
                key={i}
                className="faq-item"
                style={{
                  background: '#fff',
                  borderRadius: '14px',
                  border: '1px solid #e4e4e7',
                  marginBottom: '10px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <div
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    gap: '12px'
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#18181b', lineHeight: 1.35 }}>
                    {faq.q}
                  </span>
                  <span style={{
                    fontSize: '1rem',
                    transform: openFaq === i ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                    color: '#059669',
                    fontWeight: 900
                  }}>
                    ▾
                  </span>
                </div>
                {openFaq === i && (
                  <div
                    className="faq-answer"
                    style={{
                      padding: '0 16px 16px',
                      fontSize: '0.82rem',
                      color: '#4b5563',
                      lineHeight: 1.5,
                      borderTop: '1px solid #f4f4f5',
                      paddingTop: '12px'
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    
      {/* Modal de Recarga de Créditos */}
      {showRechargeModal && (
        <div className="modal-overlay" onClick={() => setShowRechargeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{color: '#ef4444', marginBottom: '16px'}}>⚠️ Créditos Insuficientes</h2>
            <p style={{marginBottom: '20px', fontSize: '1rem'}}>
              Você não tem créditos suficientes para ficar online e receber corridas.
            </p>
            <p style={{marginBottom: '20px', fontSize: '0.9rem', color: '#6b7280'}}>
              <b>1 crédito = 1 corrida</b> (R$ 1,50 por crédito)
            </p>
            <div style={{display: 'flex', gap: '12px', marginBottom: '16px'}}>
              <button 
                className="btn-premium btn-green" 
                onClick={() => {
                  setShowRechargeModal(false);
                  handleBuyCreditsInit(10);
                }}
              >
                Comprar 10 Créditos (R$ 15,00)
              </button>
            </div>
            <div style={{display: 'flex', gap: '12px', marginBottom: '16px'}}>
              <button 
                className="btn-premium btn-green" 
                onClick={() => {
                  setShowRechargeModal(false);
                  handleBuyCreditsInit(22);
                }}
              >
                Comprar 22 Créditos (R$ 30,00)
              </button>
            </div>
            <div style={{display: 'flex', gap: '12px', marginBottom: '20px'}}>
              <button 
                className="btn-premium btn-green" 
                onClick={() => {
                  setShowRechargeModal(false);
                  handleBuyCreditsInit(35);
                }}
              >
                Comprar 35 Créditos (R$ 45,00)
              </button>
            </div>
            <button 
              className="btn-secondary" 
              onClick={() => setShowRechargeModal(false)}
              style={{width: '100%'}}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL QR CODE PIX AO FINALIZAR CORRIDA ===== */}
      {showPixCompletionModal && completedRideData && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content animate-fade-in-up" style={{ textAlign: 'center', maxWidth: '380px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.8rem' }}>
              ❖
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#18181b', margin: '0 0 6px' }}>
              Recebimento PIX
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#71717a', margin: '0 0 16px' }}>
              Apresente o QR Code ao passageiro para receber o valor da corrida.
            </p>

            <div style={{
              background: '#fff', border: '2px solid #10b981', borderRadius: '16px',
              padding: '16px', display: 'inline-block', marginBottom: '16px',
              boxShadow: '0 10px 25px rgba(16, 185, 129, 0.2)'
            }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  generatePixPayload(user?.pixKey || 'motorista.zomp@pix.com.br', completedRideData.price, user?.name || 'Motorista Zomp')
                )}`} 
                alt="QR Code PIX" 
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>

            <div style={{ background: '#f4f4f5', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 700 }}>VALOR A RECEBER</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669' }}>
                R$ {Number(completedRideData.price).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '4px' }}>
                Chave PIX: <strong>{user?.pixKey || 'Não cadastrada'}</strong>
              </div>
            </div>

            <button
              className="btn-premium btn-green"
              style={{ width: '100%', padding: '16px', fontSize: '1rem', fontWeight: 900, borderRadius: '14px' }}
              onClick={() => {
                setShowPixCompletionModal(false);
                setShowDriverRatingModal(true);
              }}
            >
              ✓ Pagamento Confirmado & Avaliar ⭐
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL DE AVALIAÇÃO DO PASSAGEIRO PELO MOTORISTA ===== */}
      {showDriverRatingModal && completedRideData && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content animate-fade-in-up" style={{ textAlign: 'center', maxWidth: '380px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f4f4f5', border: '3px solid #18181b', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
              👤
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#18181b', margin: '0 0 6px' }}>
              Avaliar Passageiro
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#71717a', margin: '0 0 20px' }}>
              Como foi a viagem com <strong>{completedRideData.passengerName || completedRideData.passenger?.name || 'o Passageiro'}</strong>?
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setDriverRatingStars(star)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '2.2rem', transition: 'transform 0.15s',
                    transform: driverRatingStars >= star ? 'scale(1.15)' : 'scale(1)',
                    color: driverRatingStars >= star ? '#f59e0b' : '#d4d4d8'
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              value={driverRatingComment}
              onChange={(e) => setDriverRatingComment(e.target.value)}
              placeholder="Deixe um comentário sobre o passageiro (opcional)..."
              style={{
                width: '100%', minHeight: '70px', padding: '12px',
                borderRadius: '12px', border: '1px solid #e4e4e7',
                fontSize: '0.85rem', outline: 'none', resize: 'none',
                marginBottom: '20px', boxSizing: 'border-box'
              }}
            />

            <button
              disabled={isSubmittingDriverRating}
              className="btn-premium btn-green"
              style={{ width: '100%', padding: '16px', fontSize: '1rem', fontWeight: 900, borderRadius: '14px' }}
              onClick={async () => {
                setIsSubmittingDriverRating(true);
                try {
                  await rateRide(completedRideData.id, {
                    rating: driverRatingStars,
                    comment: driverRatingComment,
                    role: 'DRIVER'
                  });
                } catch (e) {
                  console.warn('Erro ao avaliar passageiro:', e);
                } finally {
                  setIsSubmittingDriverRating(false);
                  setShowDriverRatingModal(false);
                  setCompletedRideData(null);
                  setDriverRatingStars(5);
                  setDriverRatingComment('');
                }
              }}
            >
              {isSubmittingDriverRating ? 'Enviando...' : '✓ Finalizar Avaliação'}
            </button>
          </div>
        </div>
      )}

      </div>
  )
}
