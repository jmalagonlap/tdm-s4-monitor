#!/usr/bin/env node

/**
 * Script para hacer polling del API ÁRTIMO GPS
 * Ejecutado por GitHub Actions cada minuto
 * Guarda los datos en data/gps-data.json
 */

const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'https://api.artimo.com.co';
const API_TOKENS_ENDPOINT = '/tokens';
const API_GPS_ENDPOINT = '/rtdata/gpsv2/latest';

const VEHICLES = [
  { id: 'CO_LKN501', idSyrus: 'CO_1LKN501', label: 'Vehículo 1' },
  { id: 'CO_JYX434', idSyrus: 'CO_1JYX434', label: 'Vehículo 2' },
  { id: 'CO_STE582', idSyrus: 'CO_1STE582', label: 'Vehículo 3' },
  { id: 'CO_STE577', idSyrus: 'CO_1STE577', label: 'Vehículo 4' },
  { id: 'CO_STE060', idSyrus: 'CO_1STE060', label: 'Vehículo 5' },
];

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'gps-data.json');

/**
 * Obtiene token del API ÁRTIMO
 */
async function obtainToken(username, password) {
  try {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('grant_type', 'password');

    const response = await fetch(`${API_BASE_URL}${API_TOKENS_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✓ Token obtenido (expira en ${data.expires_in} minutos)`);
    return data.access_token;
  } catch (error) {
    console.error('✗ Error obteniendo token:', error.message);
    throw error;
  }
}

/**
 * Obtiene TODAS las posiciones GPS (1 solo llamado)
 * Retorna un mapa de placa → posiciones
 */
async function getAllGPSData(token) {
  try {
    const response = await fetch(`${API_BASE_URL}${API_GPS_ENDPOINT}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return {};
    }

    // Agrupar por placa
    const gpsMap = {};
    for (const record of data) {
      const plate = record.machineName; // Nombre de la placa
      if (!gpsMap[plate]) {
        gpsMap[plate] = [];
      }
      gpsMap[plate].push(record);
    }

    return gpsMap;
  } catch (error) {
    console.error(`✗ Error obteniendo GPS:`, error.message);
    return {};
  }
}

/**
 * Obtiene datos filtrados para una placa específica
 */
function getFilteredGPSData(gpsMap, placa) {
  return gpsMap[placa] || [];
}

/**
 * Cuenta posiciones GPS nuevas (deduplicadas)
 * Una posición es "nueva" si es diferente a las vistas antes
 */
function countNewGPS(currentData, previousData = {}) {
  const seenPositions = new Set();

  // Cargar posiciones previas
  if (previousData.positions && Array.isArray(previousData.positions)) {
    previousData.positions.forEach(pos => {
      const key = `${pos.latitude},${pos.longitude},${pos.date}`;
      seenPositions.add(key);
    });
  }

  // Contar posiciones nuevas
  let newCount = 0;
  const newPositions = [];

  for (const record of currentData) {
    const key = `${record.latitude},${record.longitude},${record.date}`;

    if (!seenPositions.has(key)) {
      seenPositions.add(key);
      newCount++;
      newPositions.push({
        date: record.date,
        latitude: record.latitude,
        longitude: record.longitude,
        speed: record.speed,
        timestamp: record.timeStamp, // Hora de llegada a plataforma
      });
    }
  }

  return {
    newCount,
    totalCount: currentData.length,
    positions: newPositions,
  };
}

/**
 * Carga datos existentes
 */
function loadExistingData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { records: [] };
  }

  try {
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('✗ Error leyendo datos existentes:', error.message);
    return { records: [] };
  }
}

/**
 * Guarda datos
 */
function saveData(data) {
  try {
    // Crear directorio si no existe
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`✓ Datos guardados en ${DATA_FILE}`);
  } catch (error) {
    console.error('✗ Error guardando datos:', error.message);
    throw error;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('\n🚀 Iniciando poll de GPS...');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}\n`);

  const username = process.env.ARTIMO_USERNAME;
  const password = process.env.ARTIMO_PASSWORD;

  if (!username || !password) {
    console.error('✗ Error: ARTIMO_USERNAME o ARTIMO_PASSWORD no configurados');
    process.exit(1);
  }

  try {
    // Obtener token
    console.log('🔐 Obteniendo token de autenticación...');
    const token = await obtainToken(username, password);

    // Hacer polling - UN SOLO LLAMADO al API
    console.log('\n📡 Obteniendo GPS (1 llamado para todos los vehículos)...');
    const timestamp = new Date();
    let syrusTotal = 0;
    let mixfmTotal = 0;
    const vehicleData = {};

    // Obtener TODOS los GPS en UN SOLO llamado
    const gpsMap = await getAllGPSData(token);

    // Cargar datos previos para detectar duplicados
    const allData = loadExistingData();
    const previousData = allData.records.length > 0 ? allData.records[allData.records.length - 1] : null;

    for (const vehiculo of VEHICLES) {
      try {
        // Obtener datos filtrados para este vehículo
        const syrusRawData = getFilteredGPSData(gpsMap, vehiculo.idSyrus);
        const mixfmRawData = getFilteredGPSData(gpsMap, vehiculo.id);

        // Contar posiciones nuevas (deduplicadas)
        const syrusGPSResult = countNewGPS(
          syrusRawData,
          previousData?.vehiculos?.[vehiculo.label]?.syrus || {}
        );
        const mixfmGPSResult = countNewGPS(
          mixfmRawData,
          previousData?.vehiculos?.[vehiculo.label]?.mixfm || {}
        );

        vehicleData[vehiculo.label] = {
          placaSyrus: vehiculo.idSyrus,
          placaMixFM: vehiculo.id,
          syrus: {
            newPositions: syrusGPSResult.newCount,
            totalPositions: syrusGPSResult.totalCount,
            positions: syrusGPSResult.positions,
          },
          mixfm: {
            newPositions: mixfmGPSResult.newCount,
            totalPositions: mixfmGPSResult.totalCount,
            positions: mixfmGPSResult.positions,
          },
          diferencia: syrusGPSResult.newCount - mixfmGPSResult.newCount,
        };

        syrusTotal += syrusGPSResult.newCount;
        mixfmTotal += mixfmGPSResult.newCount;

        console.log(`✓ ${vehiculo.label}: Syrus4G=${syrusGPSResult.newCount} nuevas (${syrusGPSResult.totalCount} total), Mix FM=${mixfmGPSResult.newCount} nuevas (${mixfmGPSResult.totalCount} total)`);
      } catch (error) {
        console.error(`✗ Error con ${vehiculo.label}:`, error.message);
        vehicleData[vehiculo.label] = {
          placaSyrus: vehiculo.idSyrus,
          placaMixFM: vehiculo.id,
          syrus: { newPositions: 0, totalPositions: 0, positions: [] },
          mixfm: { newPositions: 0, totalPositions: 0, positions: [] },
          diferencia: 0,
          error: true,
        };
      }
    }

    // Crear registro
    const record = {
      timestamp: timestamp.toISOString(),
      syrusTotal,
      mixfmTotal,
      diferencia: syrusTotal - mixfmTotal,
      vehiculos: vehicleData,
    };

    // Cargar datos existentes actualizados y agregar nuevo registro
    console.log('\n💾 Guardando datos...');
    const updatedData = loadExistingData();
    updatedData.records.push(record);

    // Mantener solo los últimos 1440 registros (24 horas con polling cada minuto)
    if (updatedData.records.length > 1440) {
      updatedData.records = updatedData.records.slice(-1440);
    }

    saveData(updatedData);

    console.log('\n📊 Resumen:');
    console.log(`   Syrus4G Total: ${syrusTotal}`);
    console.log(`   Mix FM Total:  ${mixfmTotal}`);
    console.log(`   Diferencia:    ${syrusTotal - mixfmTotal}`);
    console.log(`   Total registros: ${updatedData.records.length}`);

    console.log('\n✅ Poll completado exitosamente\n');
  } catch (error) {
    console.error('\n❌ Error durante el poll:', error.message);
    process.exit(1);
  }
}

main();
