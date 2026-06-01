/**
 * Data Loader - Carga datos históricos desde GitHub
 * Lee los datos generados por el workflow de polling
 */

class DataLoader {
  constructor() {
    this.dataUrl = 'https://raw.githubusercontent.com/jmalagonlap/tdm-s4-monitor/main/data/gps-data.json';
    this.dailySummaryUrl = 'https://raw.githubusercontent.com/jmalagonlap/tdm-s4-monitor/main/data/daily-summary.json';
    this.localStorageKey = 'tdm_s4_cache';
    this.dailySummaryKey = 'tdm_s4_daily_summary';
    this.cacheExpiry = 60 * 1000; // 1 minuto
  }

  /**
   * Obtiene datos del archivo JSON en GitHub
   */
  async fetchFromGitHub() {
    try {
      const response = await fetch(this.dataUrl);

      if (!response.ok) {
        console.warn(`Data not found on GitHub (${response.status}), using local data`);
        return null;
      }

      const data = await response.json();

      // Guardar en localStorage para usar como caché
      localStorage.setItem(this.localStorageKey, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));

      console.log(`✓ Datos cargados desde GitHub (${data.records?.length || 0} registros)`);
      return data;
    } catch (error) {
      console.warn('Error cargando datos desde GitHub:', error.message);
      return null;
    }
  }

  /**
   * Obtiene datos del caché local
   */
  getFromCache() {
    try {
      const cached = localStorage.getItem(this.localStorageKey);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);

      // Validar que el caché no esté expirado
      if (Date.now() - timestamp > this.cacheExpiry) {
        localStorage.removeItem(this.localStorageKey);
        return null;
      }

      console.log(`✓ Usando caché local (${data.records?.length || 0} registros)`);
      return data;
    } catch (error) {
      console.warn('Error leyendo caché local:', error.message);
      return null;
    }
  }

  /**
   * Obtiene datos (intenta GitHub primero, luego caché)
   */
  async getData() {
    // Intentar obtener de GitHub
    const githubData = await this.fetchFromGitHub();
    if (githubData) {
      return githubData;
    }

    // Fallback: usar caché
    const cachedData = this.getFromCache();
    if (cachedData) {
      return cachedData;
    }

    // Sin datos disponibles
    return { records: [] };
  }

  /**
   * Convierte formato del workflow al formato del dashboard
   */
  convertToChartData(gitHubData) {
    if (!gitHubData.records || gitHubData.records.length === 0) {
      return [];
    }

    return gitHubData.records.map(record => ({
      timestamp: record.timestamp,
      syrusTotal: record.syrusTotal,
      mixfmTotal: record.mixfmTotal,
      diferencia: record.diferencia,
      vehiculos: record.vehiculos,
    }));
  }

  /**
   * Obtiene resumen diario desde GitHub
   */
  async getDailySummary() {
    try {
      const response = await fetch(this.dailySummaryUrl);

      if (!response.ok) {
        console.warn(`Daily summary not found on GitHub (${response.status})`);
        return this.getDailySummaryFromCache();
      }

      const data = await response.json();

      // Guardar en localStorage para caché
      localStorage.setItem(this.dailySummaryKey, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));

      console.log(`✓ Resumen diario cargado desde GitHub (${data.days?.length || 0} días)`);
      return data;
    } catch (error) {
      console.warn('Error cargando resumen diario:', error.message);
      return this.getDailySummaryFromCache();
    }
  }

  /**
   * Obtiene resumen diario del caché local
   */
  getDailySummaryFromCache() {
    try {
      const cached = localStorage.getItem(this.dailySummaryKey);
      if (!cached) return { days: [] };

      const { data } = JSON.parse(cached);
      console.log(`✓ Usando caché local de resumen (${data.days?.length || 0} días)`);
      return data;
    } catch (error) {
      console.warn('Error leyendo caché de resumen:', error.message);
      return { days: [] };
    }
  }
}

// Instancia global
const dataLoader = new DataLoader();
