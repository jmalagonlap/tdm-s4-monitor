/**
 * Configuración centralizada
 * Lee de Vercel env vars o usa defaults
 */

const CONFIG = {
  // API ÁRTIMO
  API_BASE_URL: window.ENV_ARTIMO_API_URL || 'https://api.artimo.co',
  API_ENDPOINT: '/gps/latest',
  API_TOKEN: window.ENV_ARTIMO_API_TOKEN || 'development-token',

  // Polling
  POLL_INTERVAL: 60000, // 1 minuto

  // Credenciales por defecto (para desarrollo)
  DEFAULT_USERS: {
    'artimo': window.ENV_ARTIMO_PASSWORD || 'Artimo2026!',
  },

  // Vehículos monitoreados
  VEHICLES: [
    { id: 'LKN501', label: 'Vehículo 1' },
    { id: 'JYX434', label: 'Vehículo 2' },
    { id: 'STE582', label: 'Vehículo 3' },
    { id: 'STE577', label: 'Vehículo 4' },
    { id: 'STE060', label: 'Vehículo 5' },
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
