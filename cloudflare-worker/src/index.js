/**
 * TDM S4 Monitor — Cloudflare Worker
 * Polling GPS cada 1 minuto + resúmenes diarios históricos
 *
 * KV keys:
 *   gps-data      → últimas 24h (minuto a minuto, max 1440 registros)
 *   daily-history → resúmenes diarios acumulados indefinidamente
 *
 * HTTP endpoints:
 *   GET /        → { records: [...24h], daily: [...history] }
 *   GET /poll    → disparo manual para pruebas
 */

const API_BASE_URL      = 'https://api.artimo.com.co';
const API_TOKENS_ENDPOINT = '/tokens';
const API_GPS_ENDPOINT  = '/rtdata/gpsv2/latest';
const MAX_RECORDS       = 1440; // 24h a 1 min/poll

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
   * HTTP handler — sirve datos al dashboard
   * Retorna { records: [...24h], daily: [...allDays] }
   */
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    };

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

    // GET / — retorna datos completos (24h + histórico diario)
    const [gpsData, dailyHistory] = await Promise.all([
      env.GPS_KV.get('gps-data',      { type: 'json' }),
      env.GPS_KV.get('daily-history',  { type: 'json' }),
    ]);

    const response = {
      records: (gpsData?.records)       || [],
      daily:   (dailyHistory?.days)     || [],
    };

    return new Response(JSON.stringify(response), { headers: corsHeaders });
  },

  /**
   * Cron trigger — cada minuto
   */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(pollGPS(env));
  },
};

// ─── Poll principal ───────────────────────────────────────────────────────────

async function pollGPS(env) {
  const username = env.ARTIMO_USERNAME;
  const password = env.ARTIMO_PASSWORD;

  if (!username || !password) {
    console.error('❌ Faltan ARTIMO_USERNAME / ARTIMO_PASSWORD');
    return;
  }

  console.log(`🚀 Poll — ${new Date().toISOString()}`);

  // 1. Token
  const token = await obtainToken(username, password);
  console.log('✓ Token');

  // 2. GPS
  const gpsMap = await getAllGPSData(token);
  console.log('✓ GPS');

  // 3. Datos previos
  const existing  = (await env.GPS_KV.get('gps-data', { type: 'json' })) || { records: [] };
  const prevRecord = existing.records.length > 0
    ? existing.records[existing.records.length - 1]
    : null;

  // 4. Procesar vehículos
  const timestamp  = new Date().toISOString();
  let syrusTotal   = 0;
  let mixfmTotal   = 0;
  const vehicleData = {};

  for (const v of VEHICLES) {
    const syrusRaw = gpsMap[v.idSyrus4G] || [];
    const mixfmRaw = gpsMap[v.idMixFM]   || [];

    const syrusResult = countNewGPS(syrusRaw, prevRecord?.vehiculos?.[v.label]?.syrus);
    const mixfmResult = countNewGPS(mixfmRaw, prevRecord?.vehiculos?.[v.label]?.mixfm);

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
    console.log(`  ${v.label}: S=${syrusResult.newCount} M=${mixfmResult.newCount}`);
  }

  // 5. Agregar registro y recortar a 24h
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

  // 6. Guardar en KV
  await env.GPS_KV.put('gps-data', JSON.stringify(existing));
  console.log(`✅ Registros en KV: ${existing.records.length}`);

  // 7. Compactar días anteriores al histórico diario
  await compactDailyIfNeeded(env, existing.records);
}

// ─── Compactación diaria ──────────────────────────────────────────────────────

/**
 * Detecta si hay días completos (no el de hoy) que aún no tienen
 * entrada en daily-history, y los agrega.
 */
async function compactDailyIfNeeded(env, records) {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

  // Agrupar registros por fecha (excluyendo hoy)
  const byDate = {};
  for (const r of records) {
    const d = new Date(r.timestamp).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    if (d === todayStr) continue; // hoy se compactará mañana
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(r);
  }

  const pastDates = Object.keys(byDate);
  if (pastDates.length === 0) return;

  // Leer histórico actual
  const history = (await env.GPS_KV.get('daily-history', { type: 'json' })) || { days: [] };
  const alreadySummarized = new Set(history.days.map(d => d.date));

  const datesToAdd = pastDates.filter(d => !alreadySummarized.has(d));
  if (datesToAdd.length === 0) return;

  for (const date of datesToAdd) {
    const dayRecords = byDate[date];
    let syrusTotal = 0;
    let mixfmTotal = 0;
    const vehiculos = {};

    for (const r of dayRecords) {
      syrusTotal += r.syrusTotal || 0;
      mixfmTotal += r.mixfmTotal || 0;

      if (r.vehiculos) {
        for (const [label, vData] of Object.entries(r.vehiculos)) {
          if (!vehiculos[label]) vehiculos[label] = { syrus: 0, mixfm: 0 };
          vehiculos[label].syrus += vData.syrus?.newPositions || 0;
          vehiculos[label].mixfm += vData.mixfm?.newPositions || 0;
        }
      }
    }

    history.days.push({
      date,
      syrusTotal,
      mixfmTotal,
      diferencia: syrusTotal - mixfmTotal,
      vehiculos,
    });

    console.log(`📊 Día compactado: ${date} → S=${syrusTotal} M=${mixfmTotal} (${dayRecords.length} registros)`);
  }

  // Ordenar por fecha ascendente
  history.days.sort((a, b) => a.date.localeCompare(b.date));

  await env.GPS_KV.put('daily-history', JSON.stringify(history));
}

// ─── API ÁRTIMO ───────────────────────────────────────────────────────────────

async function obtainToken(username, password) {
  const body = new URLSearchParams({ username, password, grant_type: 'password' });
  const res  = await fetch(`${API_BASE_URL}${API_TOKENS_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Accept':       'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Token ${res.status}: ${res.statusText}`);
  return (await res.json()).access_token;
}

async function getAllGPSData(token) {
  const res = await fetch(`${API_BASE_URL}${API_GPS_ENDPOINT}`, {
    headers: {
      'Accept':        'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`GPS ${res.status}: ${res.statusText}`);
  const data = await res.json();
  if (!Array.isArray(data)) return {};

  const map = {};
  for (const r of data) {
    if (!map[r.machineName]) map[r.machineName] = [];
    map[r.machineName].push(r);
  }
  return map;
}

// ─── Deduplicación ────────────────────────────────────────────────────────────

function countNewGPS(currentData, previousData) {
  const prevKeys = new Set(
    (previousData?.positions || []).map(p => `${p.latitude},${p.longitude},${p.date}`)
  );

  const newPositions = [];
  for (const r of currentData) {
    const date = r.lastDatetime || r.date || '';
    const key  = `${r.latitude},${r.longitude},${date}`;
    if (!prevKeys.has(key)) {
      newPositions.push({ date, latitude: r.latitude, longitude: r.longitude, speed: r.speed || 0 });
    }
  }

  return {
    newCount:   newPositions.length,
    totalCount: currentData.length,
    positions:  newPositions,
  };
}
