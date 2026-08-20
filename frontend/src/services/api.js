export const API_BASE = import.meta.env.VITE_API_URL || 'https://zomp-api.onrender.com/api';

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



