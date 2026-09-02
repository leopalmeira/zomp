export const API_BASE = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001/api'
    : 'https://zomp-api.onrender.com/api'
);


export async function getPublicConfig() {
  try {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem('zomp_token');
}

function getHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function register({ name, email, password, role, referrerQrCode }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role, referrerQrCode }),
  });
  const data = await res.json();
  if (!res.ok) {
    let errMsg = data.error || 'Erro ao registrar';
    if (data.details && data.details.includes('Unique constraint failed') && data.details.includes('email')) {
      errMsg = 'Este e-mail já está cadastrado! Por favor, vá para a tela de Entrar (Login).';
    }
    throw new Error(errMsg);
  }
  return data;
}

export async function driverPreRegister(payload) {
  const res = await fetch(`${API_BASE}/auth/driver-pre-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao processar pré-cadastro');
  }
  if (data.token) {
    try {
      localStorage.setItem('zomp_token', data.token);
      localStorage.setItem('zomp_user', JSON.stringify(data.user));
    } catch (e) {
      console.warn('localStorage quota warning:', e);
    }
  }
  return data;
}

export async function login({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Credenciais inválidas');
  
  // Limpar localStorage para evitar quota exceeded
  try {
    localStorage.setItem('zomp_token', data.token);
    // Salvar apenas dados essenciais
    const essentialUser = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      isApproved: data.user.isApproved,
      qrCode: data.user.qrCode
    };
    localStorage.setItem('zomp_user', JSON.stringify(essentialUser));
  } catch {
    localStorage.clear();
    localStorage.setItem('zomp_token', data.token);
    localStorage.setItem('zomp_user', JSON.stringify(data.user));
  }
  
  return data;
}

export async function googleLogin(token, role, referrerQrCode) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, role, referrerQrCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na autenticação com Google');
  
  // Salvar apenas dados essenciais
  try {
    localStorage.setItem('zomp_token', data.token);
    const essentialUser = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      isApproved: data.user.isApproved,
      qrCode: data.user.qrCode,
      photo: data.user.photo
    };
    localStorage.setItem('zomp_user', JSON.stringify(essentialUser));
  } catch {
    localStorage.clear();
    localStorage.setItem('zomp_token', data.token);
    localStorage.setItem('zomp_user', JSON.stringify(data.user));
  }
  
  return data;
}

export function logout() {
  localStorage.removeItem('zomp_token');
  localStorage.removeItem('zomp_user');
}

export function getCurrentUser() {
  const raw = localStorage.getItem('zomp_user');
  return raw ? JSON.parse(raw) : null;
}

export async function updateProfile(data) {
  const res = await fetch(`${API_BASE}/users/profile`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao atualizar perfil');
  const d = await res.json();
  const c = getCurrentUser();
  const { photo, ...userWithoutPhoto } = d;
  localStorage.setItem('zomp_user', JSON.stringify({ ...c, ...userWithoutPhoto, photo: photo || c?.photo }));
  return d;
}

export function isAuthenticated() {
  return !!getToken();
}

export async function getWallet() {
  const res = await fetch(`${API_BASE}/wallet`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao buscar carteira');
  return data;
}

export async function requestWithdrawal() {
  const res = await fetch(`${API_BASE}/wallet/withdraw`, {
    method: 'POST',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao solicitar saque');
  return data;
}

export async function requestRide(payload) {
  const res = await fetch(`${API_BASE}/rides/request`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao solicitar corrida');
  return data;
}

export async function getRideHistory() {
  try {
    const res = await fetch(`${API_BASE}/rides`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      console.warn('getRideHistory failed with status:', res.status);
      return [];
    }
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch {
      console.warn('getRideHistory: non-JSON response');
      return [];
    }
  } catch (err) {
    console.warn('getRideHistory network error:', err);
    return [];
  }
}

export async function getPendingRides() {
  const res = await fetch(`${API_BASE}/rides/pending`, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao buscar corridas');
  return data;
}

export async function acceptRide(rideId) {
  const res = await fetch(`${API_BASE}/rides/${rideId}/accept`, {
    method: 'POST',
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao aceitar corrida');
  return data;
}

export async function rejectRide(rideId) {
  const res = await fetch(`${API_BASE}/rides/${rideId}/reject`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return res.ok;
}

export async function completeRide(rideId) {
  const res = await fetch(`${API_BASE}/rides/${rideId}/complete`, {
    method: 'POST',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao completar corrida');
  return data;
}

export async function getCredits() {
  const res = await fetch(`${API_BASE}/credits`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao buscar créditos');
  return data;
}

export async function purchaseCredits(quantity) {
  const res = await fetch(`${API_BASE}/credits/purchase`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ quantity }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao comprar créditos');
  return data;
}

export async function cancelRide(rideId, statusOrPayload) {
  const payload = typeof statusOrPayload === 'object' ? statusOrPayload : { status: statusOrPayload };
  const res = await fetch(`${API_BASE}/rides/${rideId}/cancel`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao cancelar corrida');
  return data;
}

export async function getUserDebt() {
  try {
    const res = await fetch(`${API_BASE}/user/debt`, {
      headers: getHeaders(),
    });
    if (!res.ok) return { pendingDebt: 0 };
    return await res.json();
  } catch {
    return { pendingDebt: 0 };
  }
}

export async function getGlobalConfig() {
  const res = await fetch(`${API_BASE}/config`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao buscar configurações');
  return data;
}

export async function nearDestinationRide(rideId) {
  const res = await fetch(`${API_BASE}/rides/${rideId}/near-destination`, {
    method: 'POST',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao atualizar status da corrida');
  return data;
}

export async function applyRideDiscount(rideId, discountAmount = 2.00) {
  const res = await fetch(`${API_BASE}/rides/${rideId}/discount`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ discountAmount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao aplicar desconto');
  return data;
}

export async function rateRide(rideId, { rating, comment, role }) {
  const res = await fetch(`${API_BASE}/rides/${rideId}/rate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ rating, comment, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao avaliar corrida');
  return data;
}

export async function validateScreenshot(imageBase64, printPrice, currentPrice) {
  const res = await fetch(`${API_BASE}/rides/validate-screenshot`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ imageBase64, printPrice, currentPrice }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Print não validado');
  return data;
}

export async function linkReferral(referrerQrCode) {
  const res = await fetch(`${API_BASE}/user/link-referral`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ referrerQrCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao vincular indicação');
  return data;
}

export async function getProfile() {
  const res = await fetch(`${API_BASE}/users/profile`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao buscar perfil');
  return data;
}

export async function getRideMessages(rideId) {
  const res = await fetch(`${API_BASE}/rides/${rideId}/messages`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao buscar mensagens');
  return data;
}

export async function sendRideMessage(rideId, text) {
  const res = await fetch(`${API_BASE}/rides/${rideId}/messages`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao enviar mensagem');
  return data;
}

export async function createSupportTicket(ticketData) {
  const res = await fetch(`${API_BASE}/support/tickets`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(ticketData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao abrir chamado');
  return data;
}

export async function getUserSupportTickets() {
  const res = await fetch(`${API_BASE}/support/tickets`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao buscar chamados');
  return data;
}

export async function getSupportMessages(ticketId) {
  const res = await fetch(`${API_BASE}/support/tickets/${ticketId}/messages`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao buscar mensagens do chamado');
  return data;
}

export async function sendSupportMessage(ticketId, text) {
  const res = await fetch(`${API_BASE}/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao enviar mensagem para suporte');
  return data;
}

export async function getTrafficNews() {
  const res = await fetch(`${API_BASE}/config/traffic-news`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao buscar notícias de trânsito');
  return data;
}

export async function getTournamentData() {
  try {
    const res = await fetch(`${API_BASE}/tournament/data`, {
      headers: getHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.tournament) return data.tournament;
    }
  } catch {
    // API indisponível — fallback local abaixo
  }

  // ─── FALLBACK LOCAL (sem backend) ───
  const user = getCurrentUser();
  const now = new Date();
  const day = now.getDate();
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // Determinar fase
  let phase;
  if (day <= 15) {
    phase = { phase: 'CLASSIFICATORIA', phaseLabel: 'Fase Classificatória', phaseDescription: 'Faça no mínimo 15 corridas/dia em pelo menos 10 dos 15 dias para se classificar ao Torneio.', daysLeft: 15 - day };
  } else if (day <= 22) {
    phase = { phase: 'TORNEIO', phaseLabel: 'Torneio Zomp — AO VIVO 🔴', phaseDescription: 'O Torneio está acontecendo agora! Faça o máximo de corridas para subir no ranking e conquistar os prêmios.', daysLeft: 22 - day };
  } else {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    phase = { phase: 'AGUARDANDO', phaseLabel: 'Aguardando Próximo Torneio', phaseDescription: 'O torneio deste mês já foi encerrado. A próxima fase classificatória começa no dia 1º do próximo mês.', daysLeft: lastDay - day };
  }

  // Nomes simulados
  const names = [
    'Ricardo S.','Fernando M.','Carlos E.','André L.','Marcos V.','Rafael T.','Lucas P.','Bruno C.','Diego R.','Thiago A.',
    'Gustavo H.','Eduardo N.','Rodrigo F.','Leandro B.','Felipe G.','Alexandre D.','João P.','Pedro H.','Matheus S.','Vinícius R.',
    'Daniel O.','Fabiano L.','Wagner M.','Cristiano A.','Marcelo J.','Roberto K.','Paulo C.','Henrique F.','Sérgio N.','Gabriel T.',
    'Renato V.','Júlio S.','Adriano P.','Leonardo M.','Caio R.'
  ];
  const baseRides = [142,135,128,118,112,105,99,94,88,83,79,75,71,67,64,61,58,55,52,49,46,44,42,40,38,36,34,32,30,28,26,24,22,20,18];

  // Seed determinístico baseado no mês para não mudar a cada refresh
  const seed = now.getMonth() * 31 + now.getFullYear();
  const pseudoRandom = (i) => ((seed * 9301 + i * 49297) % 233280) / 233280;

  const entries = baseRides.map((r, i) => ({
    id: `sim-${i}`,
    name: names[i] || `Motorista ${i+1}`,
    rides: Math.max(1, r + Math.floor(pseudoRandom(i) * 5) - 2),
    isSimulated: true,
    isCurrentUser: false
  }));

  // Motorista real
  const driverRides = user?.ridesCompleted || Math.floor(pseudoRandom(99) * 40 + 15);
  entries.push({
    id: user?.id || 'local-driver',
    name: user?.name || 'Você',
    rides: driverRides,
    isSimulated: false,
    isCurrentUser: true
  });

  entries.sort((a, b) => b.rides - a.rides);
  entries.forEach((e, idx) => { e.position = idx + 1; });

  const top30 = entries.slice(0, 30);
  const driverEntry = entries.find(e => e.isCurrentUser);
  const pos30 = entries[29];
  const pos20 = entries[19];
  const pos3 = entries[2];
  const pos1 = entries[0];

  const gaps = {
    toTop30: Math.max(0, (pos30?.rides || 0) - driverEntry.rides + 1),
    toTop20: Math.max(0, (pos20?.rides || 0) - driverEntry.rides + 1),
    toTop3: Math.max(0, (pos3?.rides || 0) - driverEntry.rides + 1),
    toTop1: Math.max(0, (pos1?.rides || 0) - driverEntry.rides + 1),
    rides30th: pos30?.rides || 0,
    rides20th: pos20?.rides || 0,
    rides3rd: pos3?.rides || 0,
    rides1st: pos1?.rides || 0
  };

  let smartTip = '';
  const pos = driverEntry.position;
  if (pos <= 3) {
    smartTip = `🏆 Parabéns! Você está no TOP 3 (#${pos}º)! Continue assim para garantir o Carro de R$ 100 Mil!`;
  } else if (pos <= 20) {
    smartTip = `🔥 Você está em #${pos}º lugar (Faixa PIX R$ 3.000)! Faltam ${gaps.toTop3} corridas para o Top 3 e disputar o Carro de R$ 100 Mil!`;
  } else if (pos <= 30) {
    smartTip = `📱 Você está em #${pos}º lugar (Faixa Smartphone Samsung)! Faltam ${gaps.toTop20} corridas para subir para a faixa PIX R$ 3.000!`;
  } else {
    smartTip = `💪 Você está em #${pos}º lugar com ${driverEntry.rides} corridas. O 30º colocado tem ${gaps.rides30th} corridas. Faça mais ${gaps.toTop30} corridas para entrar na zona de premiação (Top 30)!`;
  }

  return {
    month: monthNames[now.getMonth()],
    year: now.getFullYear(),
    phase,
    leaderboard: top30,
    driver: {
      id: user?.id || 'local-driver',
      name: user?.name || 'Motorista',
      rides: driverRides,
      position: driverEntry.position,
      isInTop30: driverEntry.position <= 30,
      gaps
    },
    smartTip,
    prizes: [
      { range: '1º ao 3º', prize: 'Carro de R$ 100.000,00', icon: '🚗', color: '#facc15' },
      { range: '4º ao 20º', prize: 'R$ 3.000,00 via PIX', icon: '💰', color: '#00E676' },
      { range: '21º ao 30º', prize: 'Smartphone Samsung', icon: '📱', color: '#38bdf8' }
    ],
    totalParticipants: entries.length
  };
}

