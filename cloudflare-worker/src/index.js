/**
 * TDM S4 Monitor — Cloudflare Worker
 * Polling GPS cada 1 minuto + resúmenes diarios históricos
 *
 * KV keys:
 *   gps-data       → últimas 24h, solo CONTEOS (sin coordenadas) — JSON pequeño
 *   prev-positions → última posición por vehículo, solo para deduplicación (~1KB)
 *   daily-history  → resúmenes diarios acumulados indefinidamente
 *   auth-token     → token cacheado con expiración
 *
 * HTTP endpoints:
 *   GET /        → { records: [...24h], daily: [...history] }
 *   GET /poll    → disparo manual para pruebas
 */

const API_BASE_URL        = 'https://api.artimo.com.co';
const API_TOKENS_ENDPOINT = '/tokens';
const API_GPS_ENDPOINT    = '/rtdata/gpsv2/latest';
const MAX_RECORDS         = 1440; // 24h a 1 min/poll

const VEHICLES = [
  { idSyrus4G: 'CO_LKN501',  idMixFM: 'CO_1LKN501',  label: 'LKN501' },
  { idSyrus4G: 'CO_JYX434',  idMixFM: 'CO_1JYX434',  label: 'JYX434' },
  { idSyrus4G: 'CO_STE582',  idMixFM: 'CO_1STE582',  label: 'STE582' },
  { idSyrus4G: 'CO_STE577',  idMixFM: 'CO_1STE577',  label: 'STE577' },
  { idSyrus4G: 'CO_STE060',  idMixFM: 'CO_1STE060',  label: 'STE060' },
];

// Colombia = UTC-5, sin horario de verano
// Usar offset fijo es ~10× más rápido que toLocaleDateString con timeZone
function bogotaDateStr(isoTimestamp) {
  const bogotaMs = new Date(isoTimestamp).getTime() - 5 * 60 * 60 * 1000;
  return new Date(bogotaMs).toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === '/poll') {
      await pollGPS(env);
      return new Response(JSON.stringify({ ok: true, message: 'Poll ejecutado' }), {
        headers: corsHeaders,
      });
    }

    // GET /reset — limpia gps-data SIN leer el archivo grande (no consume CPU)
    // Úsalo solo cuando gps-data esté muy grande y cause exceededCpu
    if (url.pathname === '/reset') {
      await env.GPS_KV.put('gps-data',      JSON.stringify({ records: [] }));
      await env.GPS_KV.put('prev-positions', JSON.stringify({ vehiculos: {} }));
      return new Response(JSON.stringify({
        ok: true,
        message: 'gps-data limpiado. Los datos de daily-history siguen intactos.',
      }), { headers: corsHeaders });
    }

    // GET / — retorna datos al dashboard
    const [gpsData, dailyHistory] = await Promise.all([
      env.GPS_KV.get('gps-data',     { type: 'json' }),
      env.GPS_KV.get('daily-history', { type: 'json' }),
    ]);

    return new Response(JSON.stringify({
      records: gpsData?.records   || [],
      daily:   dailyHistory?.days || [],
    }), { headers: corsHeaders });
  },

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

  // 1. Token cacheado
  const token = await getOrRefreshToken(env, username, password);
  console.log('✓ Token');

  // 2. GPS con auto-refresh en 401
  let gpsMap;
  try {
    gpsMap = await getAllGPSData(token);
  } catch (err) {
    if (err.message.includes('401')) {
      console.log('🔄 Token expirado (401) — reintentando...');
      await env.GPS_KV.delete('auth-token');
      const freshToken = await getOrRefreshToken(env, username, password);
      gpsMap = await getAllGPSData(freshToken);
    } else {
      throw err;
    }
  }
  console.log('✓ GPS');

  // 3. Leer estado previo en paralelo (KV reads son async, no consumen CPU)
  const [existing, prevPos] = await Promise.all([
    env.GPS_KV.get('gps-data',       { type: 'json' }).then(d => d || { records: [] }),
    env.GPS_KV.get('prev-positions',  { type: 'json' }).then(d => d || { vehiculos: {} }),
  ]);

  // 4. Procesar vehículos
  const timestamp   = new Date().toISOString();
  let syrusTotal    = 0;
  let mixfmTotal    = 0;
  const vehicleData = {};
  const newPrevPos  = { vehiculos: {} }; // estado para el próximo poll (~1KB)

  for (const v of VEHICLES) {
    const syrusRaw = gpsMap[v.idSyrus4G] || [];
    const mixfmRaw = gpsMap[v.idMixFM]   || [];

    const prevVehicle = prevPos.vehiculos[v.label] || {};
    const syrusResult = countNewGPS(syrusRaw, prevVehicle.syrus || []);
    const mixfmResult = countNewGPS(mixfmRaw, prevVehicle.mixfm || []);

    // Solo conteos en el registro histórico — SIN coordenadas → JSON pequeño
    vehicleData[v.label] = {
      placaSyrus: v.idSyrus4G,
      placaMixFM: v.idMixFM,
      syrus: {
        newPositions:   syrusResult.newCount,
        totalPositions: syrusResult.totalCount,
      },
      mixfm: {
        newPositions:   mixfmResult.newCount,
        totalPositions: mixfmResult.totalCount,
      },
      diferencia: syrusResult.newCount - mixfmResult.newCount,
    };

    // Estado de posiciones para deduplicación del próximo poll
    newPrevPos.vehiculos[v.label] = {
      syrus: syrusResult.allPositions,
      mixfm: mixfmResult.allPositions,
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

  // 6. Guardar en KV en paralelo
  await Promise.all([
    env.GPS_KV.put('gps-data',      JSON.stringify(existing)),
    env.GPS_KV.put('prev-positions', JSON.stringify(newPrevPos)),
  ]);
  console.log(`✅ Registros en KV: ${existing.records.length}`);

  // 7. Compactar días anteriores al histórico diario
  await compactDailyIfNeeded(env, existing.records);
}

// ─── Compactación diaria ──────────────────────────────────────────────────────

async function compactDailyIfNeeded(env, records) {
  // Fecha de hoy en Bogotá (UTC-5) — fast, sin Intl API
  const todayStr = bogotaDateStr(new Date().toISOString());

  const byDate     = {};
  const todayRecs  = []; // registros de hoy (se quedan en gps-data)

  for (const r of records) {
    const d = bogotaDateStr(r.timestamp);
    if (d === todayStr) {
      todayRecs.push(r);
      continue;
    }
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(r);
  }

  const pastDates = Object.keys(byDate);
  if (pastDates.length === 0) return; // nada que compactar

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

  history.days.sort((a, b) => a.date.localeCompare(b.date));

  // Guardar histórico Y limpiar gps-data dejando solo registros de hoy.
  // Esto mantiene gps-data pequeño (~horas de hoy) después de cada compactación.
  await Promise.all([
    env.GPS_KV.put('daily-history', JSON.stringify(history)),
    env.GPS_KV.put('gps-data',      JSON.stringify({ records: todayRecs })),
  ]);

  console.log(`✅ gps-data limpiado: ${todayRecs.length} registros de hoy conservados`);
}

// ─── API ÁRTIMO ───────────────────────────────────────────────────────────────

async function getOrRefreshToken(env, username, password) {
  const cached = await env.GPS_KV.get('auth-token', { type: 'json' });
  const now    = Date.now();

  if (cached && cached.token && cached.expiresAt > now) {
    const minsLeft = Math.round((cached.expiresAt - now) / 60000);
    console.log(`✓ Token cacheado (expira en ${minsLeft} min)`);
    return cached.token;
  }

  console.log('🔐 Solicitando nuevo token...');
  const token = await obtainToken(username, password);
  const expiresAt = now + (110 * 60 * 1000);
  await env.GPS_KV.put('auth-token', JSON.stringify({ token, expiresAt }));
  console.log('✓ Token nuevo guardado (válido 110 min)');
  return token;
}

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
  // Comas literales — la API no acepta %2C (encodeURIComponent)
  const plates = VEHICLES.flatMap(v => [v.idSyrus4G, v.idMixFM]).join(',');
  const url    = `${API_BASE_URL}${API_GPS_ENDPOINT}?plates=${plates}`;

  console.log(`📡 GPS URL: ${url}`);

  let res;
  try {
    res = await fetch(url, {
      headers: {
        'Accept':        'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch (err) {
    throw new Error(`GPS fetch error: ${err.message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GPS ${res.status}: ${res.statusText} — ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    console.log(`⚠️ GPS response no es array: ${JSON.stringify(data).slice(0, 200)}`);
    return {};
  }

  const map = {};
  for (const r of data) {
    if (!map[r.machineName]) map[r.machineName] = [];
    map[r.machineName].push(r);
  }
  return map;
}

// ─── Deduplicación ────────────────────────────────────────────────────────────

/**
 * Compara posiciones actuales contra las del poll anterior.
 * prevPositions: array de { date, latitude, longitude } del poll anterior.
 * Retorna newCount (posiciones realmente nuevas) y allPositions (estado actual completo).
 */
function countNewGPS(currentData, prevPositions) {
  const prevKeys = new Set(
    (prevPositions || []).map(p => `${p.latitude},${p.longitude},${p.date}`)
  );

  let newCount = 0;
  const allPositions = [];

  for (const r of currentData) {
    const date = r.lastDatetime || r.date || '';
    const key  = `${r.latitude},${r.longitude},${date}`;
    const pos  = { date, latitude: r.latitude, longitude: r.longitude };

    allPositions.push(pos);

    if (!prevKeys.has(key)) {
      newCount++;
    }
  }

  return {
    newCount,
    totalCount:   currentData.length,
    allPositions, // guardado en prev-positions (KV pequeño, no en historial)
  };
}
