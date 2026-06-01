/**
 * TDM S4 Monitor - API Monitor y Dashboard
 * Monitorea telemetrías Syrus4G vs Anterior en tiempo real
 */

class TDMMonitor {
  constructor() {
    // Usar configuración centralizada
    this.apiBaseUrl = CONFIG.API_BASE_URL;
    this.apiEndpoint = CONFIG.API_ENDPOINT;
    this.pollInterval = CONFIG.POLL_INTERVAL;
    this.vehiculos = CONFIG.VEHICLES;

    // Data storage
    this.dataKey = CONFIG.DATA_STORAGE_KEY;
    this.data = this.loadData();
    this.pollTimeout = null;
    this.chart = null;

    // Token management
    this.apiToken = null;
    this.apiTokenExpiry = null;
    this.tokenRefreshInterval = null;
    this.apiUsername = null;
    this.apiPassword = null;

    // UI Elements
    this.loginOverlay = document.getElementById('loginOverlay');
    this.dashboardContainer = document.getElementById('dashboardContainer');
    this.loginBtn = document.getElementById('loginBtn');
    this.logoutBtn = document.getElementById('logoutBtn');
    this.usernameInput = document.getElementById('username');
    this.passwordInput = document.getElementById('password');
    this.loginError = document.getElementById('loginError');
  }

  /**
   * Inicia la aplicación
   */
  async init() {
    // Cargar datos históricos desde GitHub (generados por workflow)
    await this.loadHistoricalData();

    // Verificar SSO o sesión existente
    if (artimoAuth.checkSSO() || artimoAuth.isSessionValid()) {
      this.showDashboard();
      this.startMonitoring();
    } else {
      this.showLogin();
    }

    // Event listeners
    this.loginBtn.addEventListener('click', () => this.handleLogin());
    this.usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    this.passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    this.logoutBtn.addEventListener('click', () => artimoAuth.logout());

    // Botones de datos
    document.getElementById('clearDataBtn').addEventListener('click', () => this.clearData());
    document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());

    // Actualizar tabla de vehículos inicialmente
    this.renderVehiclesTable();
    this.renderDataTable();
    this.initChart();
  }

  /**
   * Maneja el login local
   */
  handleLogin() {
    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value;

    if (!username || !password) {
      this.showLoginError('Por favor completa todos los campos');
      return;
    }

    if (artimoAuth.localLogin(username, password)) {
      // Usar credenciales configuradas en CONFIG (desde env vars)
      this.apiUsername = CONFIG.API_USERNAME;
      this.apiPassword = CONFIG.API_PASSWORD;

      this.loginError.classList.remove('show');
      this.usernameInput.value = '';
      this.passwordInput.value = '';
      this.showDashboard();
      this.startMonitoring();
    } else {
      this.showLoginError('Usuario o contraseña incorrectos');
      this.passwordInput.value = '';
    }
  }

  /**
   * Muestra overlay de login
   */
  showLogin() {
    this.loginOverlay.style.display = 'flex';
    this.dashboardContainer.style.display = 'none';
    this.usernameInput.focus();
  }

  /**
   * Muestra el dashboard
   */
  showDashboard() {
    this.loginOverlay.style.display = 'none';
    this.dashboardContainer.style.display = 'block';
  }

  /**
   * Muestra error de login
   */
  showLoginError(message) {
    this.loginError.textContent = message;
    this.loginError.classList.add('show');
  }

  /**
   * Carga datos históricos desde GitHub (generados por workflow)
   */
  async loadHistoricalData() {
    try {
      if (!window.dataLoader) {
        console.warn('DataLoader no disponible');
        return;
      }

      console.log('📥 Cargando datos históricos desde GitHub...');
      const githubData = await dataLoader.getData();

      if (githubData.records && githubData.records.length > 0) {
        // Convertir y fusionar con datos locales
        const convertedData = dataLoader.convertToChartData(githubData);

        // Mantener solo los datos más recientes
        this.data = convertedData.slice(-100);
        this.saveData();

        console.log(`✓ Cargados ${this.data.length} registros históricos desde GitHub`);

        // Actualizar dashboard si ya estamos autenticados
        if (this.data.length > 0) {
          const latestRecord = this.data[this.data.length - 1];
          this.updateDashboard(latestRecord);
          this.renderVehiclesTable();
          this.renderDataTable();
          if (this.chart) {
            this.updateChart();
          }
        }
      }
    } catch (error) {
      console.warn('Error cargando datos históricos:', error.message);
    }
  }

  /**
   * Inicia monitoreo periódico
   */
  startMonitoring() {
    // Primera petición inmediata
    this.pollGPSData();
  }

  /**
   * Obtiene token del API ÁRTIMO
   * @returns {Promise<string>}
   */
  async obtainToken() {
    try {
      if (!this.apiUsername || !this.apiPassword) {
        throw new Error('Credenciales no configuradas');
      }

      const formData = new URLSearchParams();
      formData.append('username', this.apiUsername);
      formData.append('password', this.apiPassword);
      formData.append('grant_type', 'password');

      const response = await fetch(`${this.apiBaseUrl}${CONFIG.API_TOKENS_ENDPOINT}`, {
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

      // Token válido por expires_in minutos
      this.apiToken = data.access_token;
      this.apiTokenExpiry = Date.now() + (data.expires_in * 60 * 1000);

      console.log('Token obtenido exitosamente', { expires_in: data.expires_in });
      return this.apiToken;
    } catch (error) {
      console.error('Error obteniendo token:', error);
      this.updateStatus('Error de autenticación API', '');
      throw error;
    }
  }

  /**
   * Obtiene token válido, obteniendo uno nuevo si es necesario
   * @returns {Promise<string>}
   */
  async getValidToken() {
    // Si no hay token o está expirado, obtener uno nuevo
    if (!this.apiToken || Date.now() >= this.apiTokenExpiry) {
      return this.obtainToken();
    }
    return this.apiToken;
  }

  /**
   * Limpia el token actual
   */
  clearToken() {
    this.apiToken = null;
    this.apiTokenExpiry = null;
  }

  /**
   * Hace polling del API GPS
   */
  async pollGPSData() {
    try {
      const timestamp = new Date();
      let syrusTotal = 0;
      let mixfmTotal = 0;
      const vehicleData = {};

      // Para cada vehículo, obtener GPS
      for (const vehiculo of this.vehiculos) {
        try {
          // Obtener GPS de ambas placas
          const syrusGPS = await this.getGPSCount(vehiculo.idSyrus);
          const mixfmGPS = await this.getGPSCount(vehiculo.id);

          vehicleData[vehiculo.label] = {
            placaSyrus: vehiculo.idSyrus,
            placaMixFM: vehiculo.id,
            syrus: syrusGPS,
            mixfm: mixfmGPS,
            diferencia: syrusGPS - mixfmGPS,
            timestamp: timestamp,
          };

          syrusTotal += syrusGPS;
          mixfmTotal += mixfmGPS;
        } catch (error) {
          console.error(`Error obteniendo datos para ${vehiculo.label}:`, error);
          vehicleData[vehiculo.label] = {
            placaSyrus: vehiculo.idSyrus,
            placaAnterior: vehiculo.id,
            syrus: 0,
            anterior: 0,
            diferencia: 0,
            timestamp: timestamp,
            error: true,
          };
        }
      }

      // Guardar registro
      const record = {
        timestamp: timestamp.toISOString(),
        syrusTotal,
        mixfmTotal,
        diferencia: syrusTotal - mixfmTotal,
        vehiculos: vehicleData,
      };

      this.data.push(record);
      this.saveData();

      // Actualizar UI
      this.updateDashboard(record);
      this.updateStatus('Activo', 'active');

    } catch (error) {
      console.error('Error en polling:', error);
      this.updateStatus('Error en API', '');
    }

    // Próxima petición en 60 segundos
    this.pollTimeout = setTimeout(() => this.pollGPSData(), this.pollInterval);
  }

  /**
   * Obtiene cantidad de GPS de una placa
   * @param {string} placa - Placa en formato CO_XXXXX
   * @returns {Promise<number>}
   */
  async getGPSCount(placa) {
    try {
      // Obtener token válido
      const token = await this.getValidToken();

      // Realizar petición al API ÁRTIMO
      const url = new URL(`${this.apiBaseUrl}${this.apiEndpoint}`);
      url.searchParams.append('Plates', placa);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Token expirado, limpiar y reintentar
        this.clearToken();
        return this.getGPSCount(placa);
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // El API retorna array de objetos GPS
      // Cada objeto representa un registro de posición
      const count = Array.isArray(data) ? data.length : 0;

      console.log(`GPS para ${placa}: ${count} registros`);
      return count;
    } catch (error) {
      console.error(`Error obteniendo GPS para ${placa}:`, error);
      // En ambiente de desarrollo, retornar datos simulados si API falla
      if (this.isDevelopment()) {
        return Math.floor(Math.random() * 100) + 50;
      }
      throw error;
    }
  }

  /**
   * Actualiza el dashboard con nuevos datos
   */
  updateDashboard(record) {
    // Stats cards
    document.getElementById('syrusTotal').textContent = record.syrusTotal.toLocaleString();
    document.getElementById('mixfmTotal').textContent = record.mixfmTotal.toLocaleString();
    document.getElementById('diferencia').textContent = record.diferencia.toLocaleString();

    // Timestamp
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    document.getElementById('lastUpdate').textContent = timeStr;

    // Actualizar tabla de vehículos
    this.renderVehiclesTable();

    // Actualizar gráfico
    if (this.chart) {
      this.updateChart();
    }

    // Actualizar tabla de datos
    this.renderDataTable();
  }

  /**
   * Actualiza el estado
   */
  updateStatus(text, className) {
    const statusText = document.getElementById('statusText');
    statusText.textContent = text;
    if (className) {
      statusText.classList.add(className);
    } else {
      statusText.classList.remove('active');
    }
  }

  /**
   * Renderiza tabla de comparativa por vehículo
   */
  renderVehiclesTable() {
    const tbody = document.getElementById('vehiclesTableBody');
    tbody.innerHTML = '';

    const ultimoRecord = this.data[this.data.length - 1];
    if (!ultimoRecord) return;

    for (const [label, vData] of Object.entries(ultimoRecord.vehiculos)) {
      const row = document.createElement('tr');

      const status = vData.error
        ? '<span class="status-badge inactive">Error</span>'
        : '<span class="status-badge active">Activo</span>';

      row.innerHTML = `
        <td><strong>${label}</strong></td>
        <td class="syrus-col">${vData.syrus.toLocaleString()}</td>
        <td class="mixfm-col">${vData.mixfm.toLocaleString()}</td>
        <td class="diff-col">${vData.diferencia.toLocaleString()}</td>
        <td>${status}</td>
      `;

      tbody.appendChild(row);
    }
  }

  /**
   * Renderiza tabla de registro de datos
   */
  renderDataTable() {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';

    // Últimos 100 registros
    const recordsToShow = this.data.slice(-100).reverse();

    for (const record of recordsToShow) {
      const row = document.createElement('tr');
      const date = new Date(record.timestamp);
      const timeStr = date.toLocaleString('es-CO');

      row.innerHTML = `
        <td>${timeStr}</td>
        <td>${record.syrusTotal}</td>
        <td>${record.mixfmTotal}</td>
        <td>${record.diferencia}</td>
      `;

      tbody.appendChild(row);
    }
  }

  /**
   * Inicializa gráfico
   */
  initChart() {
    const ctx = document.getElementById('comparisonChart').getContext('2d');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Syrus4G',
            data: [],
            borderColor: '#2E7D32',
            backgroundColor: 'rgba(46, 125, 50, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#2E7D32',
          },
          {
            label: 'Mix FM',
            data: [],
            borderColor: '#1976D2',
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#1976D2',
          },
          {
            label: 'Diferencia',
            data: [],
            borderColor: '#F57C00',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.3,
            pointRadius: 2,
            pointBackgroundColor: '#F57C00',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { family: "'Open Sans', Arial, sans-serif", weight: '600' },
              padding: 15,
              usePointStyle: true,
            },
          },
          title: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'GPS Recibidos',
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });

    this.updateChart();
  }

  /**
   * Actualiza datos en el gráfico
   */
  updateChart() {
    if (!this.chart) return;

    const maxDataPoints = 144; // 24 horas con polling cada minuto
    const recordsToShow = this.data.slice(-maxDataPoints);

    const labels = recordsToShow.map((r) => {
      const date = new Date(r.timestamp);
      return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    });

    const syrusData = recordsToShow.map((r) => r.syrusTotal);
    const mixfmData = recordsToShow.map((r) => r.mixfmTotal);
    const diferenciaData = recordsToShow.map((r) => r.diferencia);

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = syrusData;
    this.chart.data.datasets[1].data = mixfmData;
    this.chart.data.datasets[2].data = diferenciaData;
    this.chart.update();
  }

  /**
   * Guarda datos en localStorage
   */
  saveData() {
    try {
      localStorage.setItem(this.dataKey, JSON.stringify(this.data));
    } catch (error) {
      console.error('Error guardando datos:', error);
    }
  }

  /**
   * Carga datos del localStorage
   */
  loadData() {
    try {
      const stored = localStorage.getItem(this.dataKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error cargando datos:', error);
      return [];
    }
  }

  /**
   * Limpia todos los datos
   */
  clearData() {
    if (confirm('¿Estás seguro de que deseas borrar todos los datos? Esta acción no se puede deshacer.')) {
      this.data = [];
      this.saveData();
      this.renderVehiclesTable();
      this.renderDataTable();
      if (this.chart) {
        this.updateChart();
      }
      alert('Datos borrados exitosamente');
    }
  }

  /**
   * Exporta datos a CSV
   */
  exportData() {
    if (this.data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    let csv = 'Timestamp,Syrus4G Total,Mix FM Total,Diferencia\n';

    for (const record of this.data) {
      const date = new Date(record.timestamp);
      const timeStr = date.toISOString();
      csv += `"${timeStr}",${record.syrusTotal},${record.mixfmTotal},${record.diferencia}\n`;
    }

    // Crear y descargar archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tdm-s4-monitor-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Verifica si está en desarrollo
   */
  isDevelopment() {
    return CONFIG.IS_DEVELOPMENT;
  }

  /**
   * Destruye la instancia
   */
  destroy() {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
    }
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const monitor = new TDMMonitor();
  monitor.init();

  // Limpiar polling al descargar
  window.addEventListener('beforeunload', () => {
    monitor.destroy();
  });
});
