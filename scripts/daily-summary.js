#!/usr/bin/env node

/**
 * Script de Resumen Diario
 * Compacta datos del día y genera estadísticas
 * Se ejecuta a las 00:00 UTC diariamente
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'gps-data.json');
const DAILY_SUMMARY_FILE = path.join(DATA_DIR, 'daily-summary.json');
const DAILY_HISTORY_DIR = path.join(DATA_DIR, 'daily-history');

/**
 * Carga datos existentes
 */
function loadData(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`⚠️ Error leyendo ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Guarda datos
 */
function saveData(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✓ Datos guardados en ${filePath}`);
  } catch (error) {
    console.error(`✗ Error guardando ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Obtiene fecha de ayer en formato YYYY-MM-DD
 */
function getYesterdayDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Filtra registros de un día específico
 */
function filterRecordsByDate(records, dateString) {
  return records.filter(record => {
    const recordDate = record.timestamp.split('T')[0];
    return recordDate === dateString;
  });
}

/**
 * Calcula estadísticas de un día
 */
function calculateDailyStats(records) {
  const stats = {
    date: '',
    totalRecords: records.length,
    syrus: {
      totalNewPositions: 0,
      totalPositions: 0,
      vehicles: {},
    },
    mixfm: {
      totalNewPositions: 0,
      totalPositions: 0,
      vehicles: {},
    },
    diferencia: 0,
  };

  if (records.length === 0) {
    return stats;
  }

  stats.date = records[0].timestamp.split('T')[0];

  // Acumular estadísticas por vehículo
  for (const record of records) {
    for (const [vehicleLabel, vehicleData] of Object.entries(record.vehiculos)) {
      if (!stats.syrus.vehicles[vehicleLabel]) {
        stats.syrus.vehicles[vehicleLabel] = { newPositions: 0, totalPositions: 0 };
      }
      if (!stats.mixfm.vehicles[vehicleLabel]) {
        stats.mixfm.vehicles[vehicleLabel] = { newPositions: 0, totalPositions: 0 };
      }

      // Syrus4G
      if (vehicleData.syrus?.newPositions !== undefined) {
        stats.syrus.vehicles[vehicleLabel].newPositions += vehicleData.syrus.newPositions;
        stats.syrus.vehicles[vehicleLabel].totalPositions += vehicleData.syrus.totalPositions;
        stats.syrus.totalNewPositions += vehicleData.syrus.newPositions;
        stats.syrus.totalPositions += vehicleData.syrus.totalPositions;
      }

      // Mix FM
      if (vehicleData.mixfm?.newPositions !== undefined) {
        stats.mixfm.vehicles[vehicleLabel].newPositions += vehicleData.mixfm.newPositions;
        stats.mixfm.vehicles[vehicleLabel].totalPositions += vehicleData.mixfm.totalPositions;
        stats.mixfm.totalNewPositions += vehicleData.mixfm.newPositions;
        stats.mixfm.totalPositions += vehicleData.mixfm.totalPositions;
      }
    }
  }

  stats.diferencia = stats.syrus.totalNewPositions - stats.mixfm.totalNewPositions;

  return stats;
}

/**
 * Función principal
 */
async function main() {
  console.log('\n📊 Iniciando resumen diario...');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}\n`);

  try {
    // Obtener datos del día anterior
    const yesterdayDate = getYesterdayDate();
    console.log(`📅 Procesando datos de: ${yesterdayDate}`);

    // Cargar datos actuales
    const currentData = loadData(DATA_FILE);
    if (!currentData || !currentData.records || currentData.records.length === 0) {
      console.log('⚠️ No hay datos para procesar');
      return;
    }

    // Filtrar registros del día anterior
    const yesterdayRecords = filterRecordsByDate(currentData.records, yesterdayDate);

    if (yesterdayRecords.length === 0) {
      console.log(`⚠️ No hay registros para ${yesterdayDate}`);
      return;
    }

    console.log(`✓ Registros encontrados: ${yesterdayRecords.length}`);

    // Calcular estadísticas del día
    const dailyStats = calculateDailyStats(yesterdayRecords);

    // Cargar resumen diario existente
    let dailySummary = loadData(DAILY_SUMMARY_FILE) || { days: [] };

    // Remover entrada anterior del mismo día si existe
    dailySummary.days = dailySummary.days.filter(day => day.date !== yesterdayDate);

    // Agregar nueva entrada
    dailySummary.days.push(dailyStats);

    // Ordenar por fecha
    dailySummary.days.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Guardar resumen
    saveData(DAILY_SUMMARY_FILE, dailySummary);

    // Guardar histórico diario
    const dailyHistoryFile = path.join(DAILY_HISTORY_DIR, `${yesterdayDate}.json`);
    saveData(dailyHistoryFile, {
      date: yesterdayDate,
      statistics: dailyStats,
      records: yesterdayRecords,
    });

    // Mostrar resumen
    console.log('\n📈 Resumen del día:');
    console.log(`   Fecha: ${dailyStats.date}`);
    console.log(`   Registros: ${dailyStats.totalRecords}`);
    console.log(`\n   Syrus4G:`);
    console.log(`   ├─ Posiciones nuevas: ${dailyStats.syrus.totalNewPositions}`);
    console.log(`   └─ Posiciones totales: ${dailyStats.syrus.totalPositions}`);
    console.log(`\n   Mix FM:`);
    console.log(`   ├─ Posiciones nuevas: ${dailyStats.mixfm.totalNewPositions}`);
    console.log(`   └─ Posiciones totales: ${dailyStats.mixfm.totalPositions}`);
    console.log(`\n   Diferencia (Syrus4G - Mix FM): ${dailyStats.diferencia} nuevas`);

    console.log(`\n   Por vehículo (Mix FM):`);
    for (const [vehicle, stats] of Object.entries(dailyStats.mixfm.vehicles)) {
      console.log(`   ${vehicle}: ${stats.newPositions} nuevas / ${stats.totalPositions} totales`);
    }

    console.log(`\n✅ Resumen completado exitosamente\n`);
  } catch (error) {
    console.error('\n❌ Error durante el resumen:', error.message);
    process.exit(1);
  }
}

main();
