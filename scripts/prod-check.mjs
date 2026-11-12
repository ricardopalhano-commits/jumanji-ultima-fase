const base = 'https://jumanji-ultima-fase.onrender.com/api';

async function req(path, options = {}) {
  const res = await fetch(base + path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) }
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

const created = await req('/players', {
  method: 'POST',
  body: JSON.stringify({ name: 'Teste Deploy', avatar: 'mouse' })
});
console.log('create', created.status, JSON.stringify(created.body).slice(0, 200));
const id = created.body?.id ?? created.body?.item?.id;
if (!id) throw new Error('Não foi possível criar o jogador de teste.');

const journey = await req(`/players/${id}/journey`);
console.log('journey', journey.status, JSON.stringify(journey.body).slice(0, 200));

const play = await req(`/players/${id}/play`, {
  method: 'POST',
  body: JSON.stringify({ approach: 'forca' })
});
console.log('play', play.status, JSON.stringify(play.body).slice(0, 240));

const reset = await req(`/players/${id}/reset`, { method: 'POST', body: JSON.stringify({}) });
console.log('reset', reset.status, JSON.stringify(reset.body).slice(0, 160));

const removed = await req(`/players/${id}`, { method: 'DELETE', body: JSON.stringify({}) });
console.log('delete', removed.status, JSON.stringify(removed.body).slice(0, 120));

const check = await req('/players');
console.log('players now', check.status, check.body?.items?.map((p) => p.name).join(', '));
