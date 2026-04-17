const API_BASE = 'http://localhost:3001/api';

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
  if (!res.ok) throw new Error(data.error || 'Erro ao registrar');
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
  const res = await fetch(`${API_BASE}/rides`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao buscar histórico');
  return data;
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

export async function completeRide(rideId) {
  const res = await fetch(`${API_BASE}/rides/${rideId}/complete`, {
    method: 'POST',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao completar corrida');
  return data;
}
