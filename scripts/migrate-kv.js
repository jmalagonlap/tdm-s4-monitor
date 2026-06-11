/**
 * migrate-kv.js — Migración de gps-data sin pérdida de datos
 *
 * Corre LOCALMENTE (sin límite de CPU de Cloudflare).
 * Lee gps-data via Cloudflare KV API, compacta días pasados a daily-history,
 * y escribe un gps-data limpio y compacto con solo los registros de hoy.
 *
 * Uso:
 *   $env:CF_API_TOKEN="tu_token"  (PowerShell)
 *   node scripts/migrate-kv.js
 */

const ACCOUNT_ID   = '6d6c7e7821bba249dfe871d917623efd';
const NAMESPACE_ID = 'cebc303d70d441aca8938aa42c278b60';
const API_TOKEN    = process.env.CF_API_TOKEN;

if (!API_TOKEN) {
  console.error('❌ Falta CF_API_TOKEN. Ejecútalo así:');
  console.error('   $env:CF_API_TOKEN="tu_token_aqui"');
  console.error('   node scripts/migrate-kv.js');
  process.exit(1);
}

const BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}`;

async function kvGet(key) {
  const res = await fetch(`${BASE}/values/${encodeURIComponent(key)}`, {
    headers: { 'Authorization': `Bearer ${API_TOKEN}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`KV GET "${key}": ${res.status} ${await res.text()}`);
  return res.text();
}

async function kvPut(key, value) {
  const res = await fetch(`${BASE}/values/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'text/plain',
    },
    body: value,
  });
  if (!res.ok) throw new Error(`KV PUT "${key}": ${res.status} ${await res.text()}`);
}

// Colombia = UTC-5, sin horario de verano
function bogotaDateStr(isoTimestamp) {
  const ms = new Date(isoTimestamp).getTime() - 5 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10); // "YYYY-MM-DD"
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  TDM S4 Monitor — Migración KV sin pérdida');
  console.log('═══════════════════════════════════════════\n');

  // 1. Leer datos actuales
  console.log('📥 Leyendo gps-data desde Cloudflare KV...');
  const gpsRaw = await kvGet('gps-data');
  if (!gpsRaw) {
    console.log('⚠️  gps-data vacío o no existe. Nada que migrar.');
    return;
  }
  const gpsData = JSON.parse(gpsRaw);
  const records = gpsData.records || [];
  console.log(`   ✓ ${records.length} registros encontrados`);

  console.log('📥 Leyendo daily-history...');
  const historyRaw = await kvGet('daily-history');
  const history    = historyRaw ? JSON.parse(historyRaw) : { days: [] };
  console.log(`   ✓ ${history.days.length} días ya en histórico`);

  // 2. Agrupar registros por fecha (Colombia)
  const todayStr = bogotaDateStr(new Date().toISOString());
  console.log(`\n📅 Hoy en Bogotá: ${todayStr}`);

  const byDate = {};
  for (const r of records) {
    const d = bogotaDateStr(r.timestamp);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(r);
  }

  const allDates = Object.keys(byDate).sort();
  console.log(`📊 Fechas en gps-data: ${allDates.join(', ')}`);

  // 3. Compactar días pasados que no estén aún en daily-history
  const alreadySaved = new Set(history.days.map(d => d.date));
  const pastDates    = allDates.filter(d => d < todayStr && !alreadySaved.has(d));

  if (pastDates.length === 0) {
    console.log('\n✓ Todos los días pasados ya están en daily-history. No hay nada que compactar.');
  } else {
    console.log(`\n📊 Compactando ${pastDates.length} día(s) a daily-history: ${pastDates.join(', ')}`);
    for (const date of pastDates) {
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

      console.log(`   ✓ ${date}: Syrus=${syrusTotal} MixFM=${mixfmTotal} (${dayRecords.length} registros)`);
    }

    history.days.sort((a, b) => a.date.localeCompare(b.date));
  }

  // 4. Construir gps-data compacto: solo registros de HOY, sin coordenadas
  const todayRecords = (byDate[todayStr] || []).map(r => ({
    timestamp:  r.timestamp,
    syrusTotal: r.syrusTotal || 0,
    mixfmTotal: r.mixfmTotal || 0,
    diferencia: (r.syrusTotal || 0) - (r.mixfmTotal || 0),
    vehiculos: r.vehiculos
      ? Object.fromEntries(
          Object.entries(r.vehiculos).map(([label, vData]) => [
            label,
            {
              placaSyrus: vData.placaSyrus || '',
              placaMixFM: vData.placaMixFM || '',
              syrus: {
                newPositions:   vData.syrus?.newPositions   || 0,
                totalPositions: vData.syrus?.totalPositions || 0,
              },
              mixfm: {
                newPositions:   vData.mixfm?.newPositions   || 0,
                totalPositions: vData.mixfm?.totalPositions || 0,
              },
              diferencia: (vData.syrus?.newPositions || 0) - (vData.mixfm?.newPositions || 0),
            },
          ])
        )
      : {},
  }));

  const gpsDataNew     = JSON.stringify({ records: todayRecords });
  const historyNew     = JSON.stringify(history);
  const gpsOldKB       = Math.round(gpsRaw.length     / 1024);
  const gpsNewKB       = Math.round(gpsDataNew.length / 1024);

  console.log(`\n💾 Tamaño gps-data:`);
  console.log(`   Antes : ${gpsOldKB} KB (${records.length} registros con coordenadas)`);
  console.log(`   Después: ${gpsNewKB} KB (${todayRecords.length} registros de hoy sin coordenadas)`);

  // 5. Guardar en KV
  console.log('\n📤 Guardando daily-history...');
  await kvPut('daily-history', historyNew);
  console.log('   ✓ daily-history guardado');

  console.log('📤 Guardando gps-data compacto...');
  await kvPut('gps-data', gpsDataNew);
  console.log('   ✓ gps-data guardado');

  // 6. Limpiar prev-positions (se regenera en el próximo poll)
  console.log('📤 Reseteando prev-positions...');
  await kvPut('prev-positions', JSON.stringify({ vehiculos: {} }));
  console.log('   ✓ prev-positions reseteado');

  // 7. Resumen final
  console.log('\n═══════════════════════════════════════════');
  console.log('  ✅ Migración completada sin pérdida de datos');
  console.log('═══════════════════════════════════════════\n');
  console.log('📊 Daily-history:');
  for (const day of history.days) {
    console.log(`   ${day.date}: Syrus=${day.syrusTotal} MixFM=${day.mixfmTotal} Dif=${day.diferencia}`);
  }
  console.log(`\n📋 gps-data hoy (${todayStr}): ${todayRecords.length} registros`);
  console.log('\n➡️  Próximo paso: despliega el Worker actualizado en Cloudflare');
  console.log('   y verifica https://tdm-gps-monitor.jmalagon.workers.dev');
}

main().catch(err => {
  console.error('\n❌ Error durante la migración:', err.message);
  process.exit(1);
});
