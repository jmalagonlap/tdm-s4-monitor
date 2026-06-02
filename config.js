/**
 * Configuración centralizada
 * Lee de Vercel env vars o usa defaults
 */

const CONFIG = {
  // API ÁRTIMO — Base URL hardcodeada
  API_BASE_URL: 'https://api.artimo.com.co',
  API_ENDPOINT: '/rtdata/gpsv2/latest',
  API_TOKENS_ENDPOINT: '/tokens',

  // Polling
  POLL_INTERVAL: 60000, // 1 minuto
  TOKEN_REFRESH_INTERVAL: 110 * 60 * 1000, // 110 minutos (token válido por 120 min)

  // Credenciales para API ÁRTIMO (se cargan desde API en init)
  API_USERNAME: 'artimo',
  API_PASSWORD: 'Artimo2026!',

  // Vehículos monitoreados (prefijo CO_ para Colombia)
  // Syrus4G: placas SIN prefijo "1" (ej: CO_LKN501)
  // Mix FM:  placas CON prefijo "1" (ej: CO_1LKN501)
  VEHICLES: [
    { idSyrus4G: 'CO_LKN501', idMixFM: 'CO_1LKN501', label: 'LKN501' },
    { idSyrus4G: 'CO_JYX434', idMixFM: 'CO_1JYX434', label: 'JYX434' },
    { idSyrus4G: 'CO_STE582', idMixFM: 'CO_1STE582', label: 'STE582' },
    { idSyrus4G: 'CO_STE577', idMixFM: 'CO_1STE577', label: 'STE577' },
    { idSyrus4G: 'CO_STE060', idMixFM: 'CO_1STE060', label: 'STE060' },
  ],

  // Almacenamiento
  DATA_STORAGE_KEY: 'tdm_s4_monitor_data',
  SESSION_STORAGE_KEY: 'artimo_session_tdm_s4',
  MAX_RECORDS_DISPLAY: 100,
  MAX_CHART_POINTS: 144, // 24 horas @ 60s

  // UI
  CHART_UPDATE_INTERVAL: 500, // ms
};

// Inyectar credenciales desde Vercel si existen
if (window.ENV_ARTIMO_USERNAME) {
  CONFIG.DEFAULT_USERS[window.ENV_ARTIMO_USERNAME] = window.ENV_ARTIMO_PASSWORD || 'Artimo2026!';
}

// Detectar ambiente
CONFIG.IS_DEVELOPMENT = (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.includes('localhost:')
);

CONFIG.IS_PRODUCTION = !CONFIG.IS_DEVELOPMENT;
