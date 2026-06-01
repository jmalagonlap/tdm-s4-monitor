/**
 * TDM S4 Monitor - Dashboard
 * Carga datos desde GitHub (guardados por el workflow)
 * No requiere login ni polling al API ÁRTIMO
 */

class TDMMonitor {
  constructor() {
    this.data = [];
    this.updateInterval = 60 * 1000; // 60 segundos
    this.updateTimer = null;
    this.chart = null;
    this.dataUrl = 'https://raw.githubusercontent.com/jmalagonlap/tdm-s4-monitor/main/data/gps-data.json';
  }

  async init() {
    console.log('📡 Inicializando TDM S4 Monitor...');

    // Mostrar dashboard directamente (sin login)
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('dashboardContainer').style.display = 'block';

    // Cargar datos inicialmente
    await this.updateData();

    // Inicializar UI
    this.renderVehiclesTable();
    this.renderDataTable();
    this.initChart();

    // Actualizar cada 60 segundos
    this.startAutoUpdate();

    // Event listeners
    document.getElementById('clearDataBtn')?.addEventListener('click', () => this.clearData());
    document.getElementById('exportDataBtn')?.addEventListener('click', () => this.exportData());
    document.getElementById('logoutBtn')?.addEventListener('click', () => location.reload());

    console.log('✓ Dashboard listo');
  }

  /**
   * Actualiza datos desde GitHub
   */
  async updateData() {
    try {
      console.log('📥 Cargando datos desde GitHub...');
      const response = await fetch(this.dataUrl);

      if (!response.ok) {
        console.warn(`Error ${response.status} cargando desde GitHub`);
        document.getElementById('statusText').textContent = 'Error cargando datos';
        return;
      }

      const githubData = await response.json();

      if (githubData.records && githubData.records.length > 0) {
        this.data = githubData.records;
        console.log(`✓ ${this.data.length} registros cargados desde GitHub`);

        // Actualizar UI
        this.updateDashboard();
        document.getElementById('statusText').textContent = 'Activo';
        document.getElementById('statusText').classList.add('active');
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      document.getElementById('statusText').textContent = 'Error de conexión';
    }
  }

  /**
   * Inicia actualización automática
   */
  startAutoUpdate() {
    this.updateTimer = setInterval(() => this.updateData(), this.updateInterval);
  }

  /**
   * Actualiza el dashboard
   */
  updateDashboard() {
    const ultimoRecord = this.data[this.data.length - 1];
    if (!ultimoRecord) return;

    // Stats cards
    document.getElementById('syrusTotal').textContent = (ultimoRecord.syrusTotal || 0).toLocaleString();
    document.getElementById('mixfmTotal').textContent = (ultimoRecord.mixfmTotal || 0).toLocaleString();
    document.getElementById('diferencia').textContent = (ultimoRecord.diferencia || 0).toLocaleString();

    // Timestamp
    const date = new Date(ultimoRecord.timestamp);
    const timeStr = date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    document.getElementById('lastUpdate').textContent = timeStr;

    // Actualizar tabla y gráfico
    this.renderVehiclesTable();
    this.renderDataTable();
    if (this.chart) {
      this.updateChart();
    }
  }

  /**
   * Renderiza tabla de comparativa por vehículo
   */
  renderVehiclesTable() {
    const tbody = document.getElementById('vehiclesTableBody');
    tbody.innerHTML = '';

    const ultimoRecord = this.data[this.data.length - 1];
    if (!ultimoRecord || !ultimoRecord.vehiculos) return;

    for (const [label, vData] of Object.entries(ultimoRecord.vehiculos)) {
      const row = document.createElement('tr');

      const syrus = vData.syrus?.newPositions || 0;
      const mixfm = vData.mixfm?.newPositions || 0;
      const diff = syrus - mixfm;

      const status = vData.error
        ? '<span class="status-badge inactive">Error</span>'
        : '<span class="status-badge active">Activo</span>';

      row.innerHTML = `
        <td><strong>${label}</strong></td>
        <td class="syrus-col">${syrus.toLocaleString()}</td>
        <td class="mixfm-col">${mixfm.toLocaleString()}</td>
        <td class="diff-col">${diff.toLocaleString()}</td>
        <td>${status}</td>
      `;

      tbody.appendChild(row);
    }
  }

  /**
   * Renderiza tabla de datos históricos
   */
  renderDataTable() {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';

    const recordsToShow = this.data.slice(-100).reverse();

    for (const record of recordsToShow) {
      const row = document.createElement('tr');
      const date = new Date(record.timestamp);
      const timeStr = date.toLocaleString('es-CO');

      row.innerHTML = `
        <td>${timeStr}</td>
        <td>${record.syrusTotal || 0}</td>
        <td>${record.mixfmTotal || 0}</td>
        <td>${record.diferencia || 0}</td>
      `;

      tbody.appendChild(row);
    }
  }

  /**
   * Inicializa gráfico
   */
  initChart() {
    const ctx = document.getElementById('comparisonChart');
    if (!ctx) return;

    this.chart = new Chart(ctx.getContext('2d'), {
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
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'GPS Recibidos',
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

    const maxDataPoints = 144;
    const recordsToShow = this.data.slice(-maxDataPoints);

    const labels = recordsToShow.map((r) => {
      const date = new Date(r.timestamp);
      return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    });

    const syrusData = recordsToShow.map((r) => r.syrusTotal || 0);
    const mixfmData = recordsToShow.map((r) => r.mixfmTotal || 0);
    const diferenciaData = recordsToShow.map((r) => r.diferencia || 0);

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = syrusData;
    this.chart.data.datasets[1].data = mixfmData;
    this.chart.data.datasets[2].data = diferenciaData;
    this.chart.update();
  }

  /**
   * Limpia datos
   */
  clearData() {
    if (confirm('¿Estás seguro de que deseas borrar todos los datos locales?')) {
      this.data = [];
      this.renderVehiclesTable();
      this.renderDataTable();
      if (this.chart) {
        this.updateChart();
      }
      alert('Datos borrados');
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
      csv += `"${date.toISOString()}",${record.syrusTotal || 0},${record.mixfmTotal || 0},${record.diferencia || 0}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tdm-s4-monitor-${Date.now()}.csv`;
    link.click();
  }

  destroy() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
  }
}

// Inicializar cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
  const monitor = new TDMMonitor();
  monitor.init();

  window.addEventListener('beforeunload', () => {
    monitor.destroy();
  });
});
