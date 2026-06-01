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
 * Obtiene cantidad de GPS de una placa
 */
async function getGPSCount(placa, token) {
  try {
    const url = new URL(`${API_BASE_URL}${API_GPS_ENDPOINT}`);
    url.searchParams.append('Plates', placa);

    const response = await fetch(url.toString(), {
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
    const count = Array.isArray(data) ? data.length : 0;

    return count;
  } catch (error) {
    console.error(`✗ Error obteniendo GPS para ${placa}:`, error.message);
    return 0;
  }
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

    // Hacer polling de cada vehículo
    console.log('\n📡 Obteniendo GPS de vehículos...');
    const timestamp = new Date();
    let syrusTotal = 0;
    let mixfmTotal = 0;
    const vehicleData = {};

    for (const vehiculo of VEHICLES) {
      try {
        const syrusGPS = await getGPSCount(vehiculo.idSyrus, token);
        const mixfmGPS = await getGPSCount(vehiculo.id, token);

        vehicleData[vehiculo.label] = {
          placaSyrus: vehiculo.idSyrus,
          placaMixFM: vehiculo.id,
          syrus: syrusGPS,
          mixfm: mixfmGPS,
          diferencia: syrusGPS - mixfmGPS,
        };

        syrusTotal += syrusGPS;
        mixfmTotal += mixfmGPS;

        console.log(`✓ ${vehiculo.label}: Syrus4G=${syrusGPS}, Mix FM=${mixfmGPS}`);
      } catch (error) {
        console.error(`✗ Error con ${vehiculo.label}:`, error.message);
        vehicleData[vehiculo.label] = {
          placaSyrus: vehiculo.idSyrus,
          placaMixFM: vehiculo.id,
          syrus: 0,
          mixfm: 0,
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

    // Cargar datos existentes y agregar nuevo registro
    console.log('\n💾 Guardando datos...');
    const allData = loadExistingData();
    allData.records.push(record);

    // Mantener solo los últimos 1440 registros (24 horas con polling cada minuto)
    if (allData.records.length > 1440) {
      allData.records = allData.records.slice(-1440);
    }

    saveData(allData);

    console.log('\n📊 Resumen:');
    console.log(`   Syrus4G Total: ${syrusTotal}`);
    console.log(`   Mix FM Total:  ${mixfmTotal}`);
    console.log(`   Diferencia:    ${syrusTotal - mixfmTotal}`);
    console.log(`   Total registros: ${allData.records.length}`);

    console.log('\n✅ Poll completado exitosamente\n');
  } catch (error) {
    console.error('\n❌ Error durante el poll:', error.message);
    process.exit(1);
  }
}

main();
