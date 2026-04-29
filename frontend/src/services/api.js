const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

export async function login({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Credenciais inválidas');
  localStorage.setItem('zomp_token', data.token);
  localStorage.setItem('zomp_user', JSON.stringify(data.user));
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
  const res = await fetch(`${API_BASE}/user/profile`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Erro ao atualizar perfil');
  const d = await res.json();
  const c = getCurrentUser();
  localStorage.setItem('zomp_user', JSON.stringify({ ...c, ...d }));
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

export async function cancelRide(rideId, status) {
  const res = await fetch(`${API_BASE}/rides/${rideId}/cancel`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao cancelar corrida');
  return data;
}

export async function getGlobalConfig() {
  const res = await fetch(`${API_BASE}/config`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao buscar configurações');
  return data;
}
