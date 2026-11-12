/**
 * Cliente da API REST do Jumanji.
 * Centraliza fetch, tratamento de erros e invalidação do cache offline.
 */
export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields || null;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(
      navigator.onLine
        ? 'Não foi possível conectar ao servidor. Tente novamente.'
        : 'Você está offline. Conecte-se à internet para salvar alterações.',
      0
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(
      data?.error || `Erro inesperado (${response.status}).`,
      response.status,
      data?.fields
    );
  }

  return data;
}

function clearOfflineCache() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => registration.active?.postMessage({ type: 'CLEAR_API_CACHE' }))
    .catch(() => {});
}

const afterWrite = (promise) =>
  promise.then((data) => {
    clearOfflineCache();
    return data;
  });

export const api = {
  health: () => request('/api/health'),

  meta: () => request('/api/meta'),

  stats: () => request('/api/stats'),

  players: {
    list: (search = '') =>
      request(`/api/players${search ? `?q=${encodeURIComponent(search)}` : ''}`),
    get: (id) => request(`/api/players/${id}`),
    create: (payload) => afterWrite(request('/api/players', { method: 'POST', body: payload })),
    update: (id, payload) =>
      afterWrite(request(`/api/players/${id}`, { method: 'PUT', body: payload })),
    remove: (id) => afterWrite(request(`/api/players/${id}`, { method: 'DELETE' })),
    journey: (id) => request(`/api/players/${id}/journey`),
    play: (id, payload) =>
      afterWrite(request(`/api/players/${id}/play`, { method: 'POST', body: payload })),
    reset: (id) => afterWrite(request(`/api/players/${id}/reset`, { method: 'POST' }))
  },

  missions: {
    list: () => request('/api/missions'),
    create: (payload) => afterWrite(request('/api/missions', { method: 'POST', body: payload })),
    update: (id, payload) =>
      afterWrite(request(`/api/missions/${id}`, { method: 'PUT', body: payload })),
    remove: (id) => afterWrite(request(`/api/missions/${id}`, { method: 'DELETE' }))
  }
};
