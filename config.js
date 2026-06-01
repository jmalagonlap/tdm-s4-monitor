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

  // Credenciales para API ÁRTIMO
  API_USERNAME: window.ENV_ARTIMO_USERNAME || 'artimo',
  API_PASSWORD: window.ENV_ARTIMO_PASSWORD || 'Artimo2026!',

  // Vehículos monitoreados (prefijo CO_ para Colombia)
  // Syrus4G: placas con prefijo "1" | Mix FM: placas originales
  VEHICLES: [
    { id: 'CO_LKN501', idSyrus: 'CO_1LKN501', label: 'Vehículo 1' },
    { id: 'CO_JYX434', idSyrus: 'CO_1JYX434', label: 'Vehículo 2' },
    { id: 'CO_STE582', idSyrus: 'CO_1STE582', label: 'Vehículo 3' },
    { id: 'CO_STE577', idSyrus: 'CO_1STE577', label: 'Vehículo 4' },
    { id: 'CO_STE060', idSyrus: 'CO_1STE060', label: 'Vehículo 5' },
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
