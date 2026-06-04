/**
 * TDM S4 Monitor — Cloudflare Worker
 * Polling GPS cada 1 minuto sin depender de GitHub ni Vercel
 *
 * Env vars necesarias (Cloudflare dashboard → Worker → Settings → Variables):
 *   ARTIMO_USERNAME  — usuario API ÁRTIMO
 *   ARTIMO_PASSWORD  — contraseña API ÁRTIMO
 *
 * KV binding necesario: GPS_KV
 */

const API_BASE_URL = 'https://api.artimo.com.co';
const API_TOKENS_ENDPOINT = '/tokens';
const API_GPS_ENDPOINT = '/rtdata/gpsv2/latest';
const MAX_RECORDS = 1440; // 24h a 1 min/poll

const VEHICLES = [
  { idSyrus4G: 'CO_LKN501', idMixFM: 'CO_1LKN501', label: 'LKN501' },
  { idSyrus4G: 'CO_JYX434', idMixFM: 'CO_1JYX434', label: 'JYX434' },
  { idSyrus4G: 'CO_STE582', idMixFM: 'CO_1STE582', label: 'STE582' },
  { idSyrus4G: 'CO_STE577', idMixFM: 'CO_1STE577', label: 'STE577' },
  { idSyrus4G: 'CO_STE060', idMixFM: 'CO_1STE060', label: 'STE060' },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export default {
  /**
   * HTTP handler — el dashboard llama aquí para leer los datos
   * GET https://tdm-gps-monitor.<account>.workers.dev
   */
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    };

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // GET /poll — disparo manual para pruebas
    if (url.pathname === '/poll') {
      await pollGPS(env);
      return new Response(JSON.stringify({ ok: true, message: 'Poll ejecutado' }), {
        headers: corsHeaders,
      });
    }

    // GET / — retorna datos actuales
    const data = await env.GPS_KV.get('gps-data', { type: 'json' });
    return new Response(JSON.stringify(data || { records: [] }), {
      headers: corsHeaders,
    });
  },

  /**
   * Cron trigger — ejecuta el poll automáticamente
   * Configurado en wrangler.toml: "* * * * *" (cada minuto)
   */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(pollGPS(env));
  },
};

// ─── Polling ──────────────────────────────────────────────────────────────────

async function pollGPS(env) {
  const username = env.ARTIMO_USERNAME;
  const password = env.ARTIMO_PASSWORD;

  if (!username || !password) {
    console.error('❌ Faltan ARTIMO_USERNAME / ARTIMO_PASSWORD en env vars');
    return;
  }

  console.log(`🚀 Iniciando poll — ${new Date().toISOString()}`);

  // 1. Obtener token
  const token = await obtainToken(username, password);
  console.log('✓ Token obtenido');

  // 2. Obtener GPS (1 solo llamado)
  const gpsMap = await getAllGPSData(token);
  console.log('✓ GPS recibido');

  // 3. Cargar datos previos desde KV
  const existing = (await env.GPS_KV.get('gps-data', { type: 'json' })) || { records: [] };
  const prevRecord = existing.records.length > 0
    ? existing.records[existing.records.length - 1]
    : null;

  // 4. Procesar vehículos
  const timestamp = new Date().toISOString();
  let syrusTotal = 0;
  let mixfmTotal = 0;
  const vehicleData = {};

  for (const v of VEHICLES) {
    const syrusRaw = gpsMap[v.idSyrus4G] || [];
    const mixfmRaw  = gpsMap[v.idMixFM]  || [];

    const syrusResult = countNewGPS(syrusRaw, prevRecord?.vehiculos?.[v.label]?.syrus);
    const mixfmResult  = countNewGPS(mixfmRaw,  prevRecord?.vehiculos?.[v.label]?.mixfm);

    vehicleData[v.label] = {
      placaSyrus: v.idSyrus4G,
      placaMixFM: v.idMixFM,
      syrus: {
        newPositions:   syrusResult.newCount,
        totalPositions: syrusResult.totalCount,
        positions:      syrusResult.positions,
      },
      mixfm: {
        newPositions:   mixfmResult.newCount,
        totalPositions: mixfmResult.totalCount,
        positions:      mixfmResult.positions,
      },
      diferencia: syrusResult.newCount - mixfmResult.newCount,
    };

    syrusTotal += syrusResult.newCount;
    mixfmTotal += mixfmResult.newCount;
    console.log(`  ${v.label}: Syrus=${syrusResult.newCount} MixFM=${mixfmResult.newCount}`);
  }

  // 5. Guardar en KV
  existing.records.push({
    timestamp,
    syrusTotal,
    mixfmTotal,
    diferencia: syrusTotal - mixfmTotal,
    vehiculos: vehicleData,
  });

  if (existing.records.length > MAX_RECORDS) {
    existing.records = existing.records.slice(-MAX_RECORDS);
  }

  await env.GPS_KV.put('gps-data', JSON.stringify(existing));
  console.log(`✅ Guardado. Total registros: ${existing.records.length}`);
}

// ─── API ÁRTIMO ───────────────────────────────────────────────────────────────

async function obtainToken(username, password) {
  const body = new URLSearchParams({ username, password, grant_type: 'password' });

  const res = await fetch(`${API_BASE_URL}${API_TOKENS_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`Token error ${res.status}: ${res.statusText}`);
  const data = await res.json();
  return data.access_token;
}

async function getAllGPSData(token) {
  const res = await fetch(`${API_BASE_URL}${API_GPS_ENDPOINT}`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error(`GPS error ${res.status}: ${res.statusText}`);
  const data = await res.json();
  if (!Array.isArray(data)) return {};

  // Agrupar por placa
  const map = {};
  for (const record of data) {
    const plate = record.machineName;
    if (!map[plate]) map[plate] = [];
    map[plate].push(record);
  }
  return map;
}

// ─── Deduplicación ────────────────────────────────────────────────────────────

function countNewGPS(currentData, previousData) {
  const prevPositions = previousData?.positions || [];
  const prevKeys = new Set(
    prevPositions.map(p => `${p.latitude},${p.longitude},${p.date}`)
  );

  const newPositions = [];
  for (const r of currentData) {
    const date = r.lastDatetime || r.date || '';
    const key  = `${r.latitude},${r.longitude},${date}`;
    if (!prevKeys.has(key)) {
      newPositions.push({
        date,
        latitude:  r.latitude,
        longitude: r.longitude,
        speed:     r.speed || 0,
      });
    }
  }

  return {
    newCount:   newPositions.length,
    totalCount: currentData.length,
    positions:  newPositions,
  };
}
