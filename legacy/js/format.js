const numberFmt = new Intl.NumberFormat('pt-BR');
const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

export function formatNumber(value) {
  return numberFmt.format(Number(value) || 0);
}

export function formatDate(value) {
  if (!value) return '—';
  const raw = String(value).trim();
  // SQLite grava 'YYYY-MM-DD HH:MM:SS' em UTC; Postgres devolve ISO com fuso.
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withZone = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10).split('-').reverse().join('/');
  return dateFmt.format(date);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const raw = String(value).trim();
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withZone = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) return raw;
  return dateTimeFmt.format(date);
}

export function pluralize(count, singular, plural) {
  return Number(count) === 1 ? singular : plural;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return map[character];
  });
}

export function initials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const STATUS_LABELS = {
  pronto: 'Pronto para jogar',
  em_jogo: 'Em aventura',
  lenda: 'Lenda da selva',
  eliminado: 'Sem vidas'
};

export const STATUS_TONES = {
  pronto: 'info',
  em_jogo: 'gold',
  lenda: 'jade',
  eliminado: 'danger'
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || 'Pronto para jogar';
}

export function statusTone(status) {
  return STATUS_TONES[status] || 'info';
}

export function difficultyTone(difficulty) {
  const value = Number(difficulty) || 1;
  if (value <= 3) return 'facil';
  if (value <= 6) return 'media';
  return 'dificil';
}

export function difficultyLabel(difficulty) {
  const value = Number(difficulty) || 1;
  if (value <= 3) return 'Tranquila';
  if (value <= 6) return 'Arriscada';
  if (value <= 8) return 'Perigosa';
  return 'Quase impossível';
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
