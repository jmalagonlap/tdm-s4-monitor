/**
 * TDM S4 Monitor - Dashboard v3
 * Carga datos desde Vercel (guardados por workflow de GitHub Actions)
 * Login idéntico al ÁRTIMO HUB · Acumulados diarios y totales históricos
 */

// ─── Autenticación (mismo esquema que ÁRTIMO HUB) ─────────────────────────────

const CREDS = [
  { user: 'artimo',   pass: 'Artimo2026!' },
  { user: 'jmalagon', pass: 'Artimo2026!' },
  { user: 'tdm',      pass: 'Artimo2026!' },
];
const SESSION_KEY = 'artimo_tdm_session';
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 horas

function doLogin() {
  const u = document.getElementById('lu').value.trim();
  const p = document.getElementById('lp').value;

  if (CREDS.some(c => c.user === u && c.pass === p)) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: u, ts: Date.now() }));
    const ls = document.getElementById('login-screen');
    ls.style.transition = 'opacity 260ms ease-out';
    ls.style.opacity = '0';
    setTimeout(() => {
      ls.style.display = 'none';
      showDashboard();
    }, 250);
  } else {
    const err = document.getElementById('lf-err');
    err.classList.add('show');
    setTimeout(() => err.classList.remove('show'), 3000);
  }
}

function doLogout() {
  localStorage.removeItem(SESSION_KEY);
  const dash = document.getElementById('dashboardContainer');
  dash.style.display = 'none';
  const ls = document.getElementById('login-screen');
  ls.style.opacity = '0';
  ls.style.display = 'flex';
  requestAnimationFrame(() => {
    ls.style.transition = 'opacity 220ms ease-out';
    ls.style.opacity = '1';
  });
  document.getElementById('lu').value = '';
  document.getElementById('lp').value = '';
}

function togglePwd() {
  const el = document.getElementById('lp');
  const show = el.type === 'password';
  el.type = show ? 'text' : 'password';
  document.getElementById('eye-svg').innerHTML = show
    ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
    : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
}

function showDashboard() {
  const dash = document.getElementById('dashboardContainer');
  dash.style.display = 'flex';
  // Arrancar el monitor si aún no está corriendo
  if (!window._monitor) {
    window._monitor = new TDMMonitor();
    window._monitor.init();
  }
}

// ─── Monitor ──────────────────────────────────────────────────────────────────

class TDMMonitor {
  constructor() {
    this.data = [];
    this.updateInterval = 60 * 1000; // 60 segundos
    this.updateTimer = null;
    this.chart = null;
    // Cloudflare Worker — actualiza cada minuto sin GitHub ni Vercel
    // Reemplazar con la URL real del worker después de desplegarlo
    this.dataUrl = 'https://tdm-gps-monitor.REEMPLAZAR.workers.dev';
  }

  async init() {
    console.log('📡 TDM S4 Monitor v3 listo');

    await this.updateData();

    this.renderVehiclesTable();
    this.renderDataTable();
    this.initChart();
    this.startAutoUpdate();

    document.getElementById('clearDataBtn')?.addEventListener('click', () => this.clearData());
    document.getElementById('exportDataBtn')?.addEventListener('click', () => this.exportData());
    document.getElementById('logoutBtn')?.addEventListener('click', () => doLogout());
  }

  // ─── Datos desde Vercel ───────────────────────────────────────────────────

  async updateData() {
    try {
      console.log('📥 Cargando datos...');
      // Cache-bust para evitar que el CDN de GitHub sirva versión antigua
      const response = await fetch(this.dataUrl + '?nocache=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) {
        console.warn(`Error ${response.status} cargando datos`);
        document.getElementById('statusText').textContent = 'Error cargando datos';
        return;
      }

      const json = await response.json();

      if (json.records && json.records.length > 0) {
        this.data = json.records;
        console.log(`✓ ${this.data.length} registros cargados`);
        this.updateDashboard();
        document.getElementById('statusText').textContent = 'Activo';
        document.getElementById('statusText').classList.add('active');
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      document.getElementById('statusText').textContent = 'Error de conexión';
    }
  }

  startAutoUpdate() {
    this.updateTimer = setInterval(() => this.updateData(), this.updateInterval);
  }

  // ─── Cálculos acumulados ─────────────────────────────────────────────────

  /**
   * Retorna la fecha local Colombia en formato "YYYY-MM-DD"
   */
  getTodayStr() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }); // "2026-06-01"
  }

  /**
   * Acumulado del día de hoy y desglose por vehículo
   */
  getTodayAccumulated() {
    const today = this.getTodayStr();
    let syrus = 0;
    let mixfm = 0;
    const vehiculos = {};

    for (const record of this.data) {
      // Comparar fecha en zona Colombia
      const recDate = new Date(record.timestamp).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
      if (recDate !== today) continue;

      syrus += record.syrusTotal || 0;
      mixfm += record.mixfmTotal || 0;

      if (record.vehiculos) {
        for (const [label, vData] of Object.entries(record.vehiculos)) {
          if (!vehiculos[label]) {
            vehiculos[label] = {
              placaSyrus: vData.placaSyrus || '',
              placaMixFM: vData.placaMixFM || '',
              syrus: 0,
              mixfm: 0,
              error: false,
            };
          }
          vehiculos[label].syrus += vData.syrus?.newPositions || 0;
          vehiculos[label].mixfm += vData.mixfm?.newPositions || 0;
          if (vData.error) vehiculos[label].error = true;
        }
      }
    }

    return { syrus, mixfm, diferencia: syrus - mixfm, vehiculos };
  }

  /**
   * Acumulado total histórico (todos los registros en gps-data.json)
   */
  getAllTimeAccumulated() {
    let syrus = 0;
    let mixfm = 0;
    for (const record of this.data) {
      syrus += record.syrusTotal || 0;
      mixfm += record.mixfmTotal || 0;
    }
    return { syrus, mixfm, diferencia: syrus - mixfm };
  }

  /**
   * Agrupa registros por día para la gráfica
   */
  getDailyTotals() {
    const byDay = {};
    for (const record of this.data) {
      const day = new Date(record.timestamp).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
      if (!byDay[day]) byDay[day] = { syrus: 0, mixfm: 0 };
      byDay[day].syrus += record.syrusTotal || 0;
      byDay[day].mixfm += record.mixfmTotal || 0;
    }
    return byDay;
  }

  /**
   * Extrae la placa legible quitando prefijo CO_ (y CO_1 → 1)
   * CO_LKN501  → LKN501
   * CO_1LKN501 → 1LKN501
   */
  formatPlate(raw) {
    return (raw || '').replace(/^CO_/, '');
  }

  // ─── Actualizar dashboard ────────────────────────────────────────────────

  updateDashboard() {
    const today = this.getTodayAccumulated();
    const allTime = this.getAllTimeAccumulated();

    // Acumulado hoy
    document.getElementById('syrusTotal').textContent = today.syrus.toLocaleString('es-CO');
    document.getElementById('mixfmTotal').textContent = today.mixfm.toLocaleString('es-CO');
    document.getElementById('diferencia').textContent =
      (today.diferencia > 0 ? '+' : '') + today.diferencia.toLocaleString('es-CO');

    // Total histórico
    document.getElementById('syrusTotalAll').textContent = allTime.syrus.toLocaleString('es-CO');
    document.getElementById('mixfmTotalAll').textContent = allTime.mixfm.toLocaleString('es-CO');

    // Última actualización
    const ultimoRecord = this.data[this.data.length - 1];
    if (ultimoRecord) {
      const date = new Date(ultimoRecord.timestamp);
      document.getElementById('lastUpdate').textContent = date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'America/Bogota',
      });
    }

    this.renderVehiclesTable();
    this.renderDataTable();
    if (this.chart) this.updateChart();
  }

  // ─── Tabla comparativa por vehículo (acumulado hoy) ─────────────────────

  renderVehiclesTable() {
    const tbody = document.getElementById('vehiclesTableBody');
    tbody.innerHTML = '';

    const today = this.getTodayAccumulated();
    if (Object.keys(today.vehiculos).length === 0) return;

    for (const [label, vData] of Object.entries(today.vehiculos)) {
      const plate = this.formatPlate(vData.placaMixFM);   // "LKN501"
      const plateSyrus = this.formatPlate(vData.placaSyrus); // "1LKN501"
      const syrus = vData.syrus;
      const mixfm = vData.mixfm;
      const diff = syrus - mixfm;
      const diffSign = diff > 0 ? '+' : '';
      const diffClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : '';

      const status = vData.error
        ? '<span class="status-badge inactive">Error</span>'
        : '<span class="status-badge active">Activo</span>';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <strong>${plate}</strong>
          <small class="plate-sub">${plateSyrus} / ${plate}</small>
        </td>
        <td class="syrus-col">${syrus.toLocaleString('es-CO')}</td>
        <td class="mixfm-col">${mixfm.toLocaleString('es-CO')}</td>
        <td class="diff-col ${diffClass}">${diffSign}${diff.toLocaleString('es-CO')}</td>
        <td>${status}</td>
      `;
      tbody.appendChild(row);
    }
  }

  // ─── Tabla de registro de datos (desglose por placa) ────────────────────

  renderDataTable() {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';

    // Últimos 20 registros (cada 5 min × 20 = 100 min de historial en tabla)
    const recordsToShow = this.data.slice(-20).reverse();

    for (const record of recordsToShow) {
      if (!record.vehiculos) continue;

      const date = new Date(record.timestamp);
      const timeStr = date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Bogota',
      });
      const dateStr = date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'America/Bogota',
      });

      const vehicles = Object.entries(record.vehiculos);
      let isFirstRow = true;

      for (const [label, vData] of vehicles) {
        const plate = this.formatPlate(vData.placaMixFM);
        const syrus = vData.syrus?.newPositions || 0;
        const mixfm = vData.mixfm?.newPositions || 0;
        const diff = syrus - mixfm;
        const diffSign = diff > 0 ? '+' : '';
        const diffClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : '';

        const row = document.createElement('tr');

        if (isFirstRow) {
          row.innerHTML = `
            <td rowspan="${vehicles.length}" class="timestamp-cell">${dateStr}<br>${timeStr}</td>
            <td><strong>${plate}</strong></td>
            <td class="syrus-col">${syrus}</td>
            <td class="mixfm-col">${mixfm}</td>
            <td class="diff-col ${diffClass}">${diffSign}${diff}</td>
          `;
          isFirstRow = false;
        } else {
          row.innerHTML = `
            <td><strong>${plate}</strong></td>
            <td class="syrus-col">${syrus}</td>
            <td class="mixfm-col">${mixfm}</td>
            <td class="diff-col ${diffClass}">${diffSign}${diff}</td>
          `;
        }
        tbody.appendChild(row);
      }

      // Separador entre registros de tiempo
      const sep = document.createElement('tr');
      sep.className = 'row-separator';
      sep.innerHTML = `<td colspan="5"></td>`;
      tbody.appendChild(sep);
    }
  }

  // ─── Gráfica diaria ──────────────────────────────────────────────────────

  initChart() {
    const ctx = document.getElementById('comparisonChart');
    if (!ctx) return;

    this.chart = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Syrus4G',
            data: [],
            backgroundColor: 'rgba(46, 125, 50, 0.75)',
            borderColor: '#2E7D32',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Mix FM',
            data: [],
            backgroundColor: 'rgba(25, 118, 210, 0.75)',
            borderColor: '#1976D2',
            borderWidth: 1,
            borderRadius: 4,
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
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('es-CO')} posiciones`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Posiciones GPS del día',
              font: { family: "'Open Sans', Arial, sans-serif" },
            },
            ticks: {
              callback: (v) => v.toLocaleString('es-CO'),
            },
          },
          x: {
            grid: { display: false },
            title: {
              display: true,
              text: 'Fecha',
              font: { family: "'Open Sans', Arial, sans-serif" },
            },
          },
        },
      },
    });

    this.updateChart();
  }

  updateChart() {
    if (!this.chart) return;

    const dailyTotals = this.getDailyTotals();
    const days = Object.keys(dailyTotals).sort();

    const labels = days.map((d) => {
      const [, month, day] = d.split('-');
      return `${day}/${month}`;
    });

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = days.map((d) => dailyTotals[d].syrus);
    this.chart.data.datasets[1].data = days.map((d) => dailyTotals[d].mixfm);
    this.chart.update();
  }

  // ─── Exportar CSV ────────────────────────────────────────────────────────

  exportData() {
    if (this.data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    let csv = 'Fecha,Timestamp,Placa,Placa Syrus,Syrus4G,Mix FM,Diferencia\n';

    for (const record of this.data) {
      const date = new Date(record.timestamp);
      const dateStr = date.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
      const timeStr = date.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' });

      if (record.vehiculos) {
        for (const [label, vData] of Object.entries(record.vehiculos)) {
          const plate = this.formatPlate(vData.placaMixFM);
          const plateSyrus = this.formatPlate(vData.placaSyrus);
          const syrus = vData.syrus?.newPositions || 0;
          const mixfm = vData.mixfm?.newPositions || 0;
          csv += `"${dateStr}","${timeStr}","${plate}","${plateSyrus}",${syrus},${mixfm},${syrus - mixfm}\n`;
        }
      }
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tdm-s4-monitor-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  clearData() {
    if (confirm('¿Limpiar datos locales? (Los datos del servidor se mantendrán)')) {
      this.data = [];
      this.renderVehiclesTable();
      this.renderDataTable();
      if (this.chart) this.updateChart();
    }
  }

  destroy() {
    if (this.updateTimer) clearInterval(this.updateTimer);
  }
}

// ─── Arranque ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Eventos del login
  document.getElementById('login-btn').addEventListener('click', doLogin);
  document.getElementById('eye-btn').addEventListener('click', togglePwd);
  document.getElementById('lu').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('lp').focus();
  });
  document.getElementById('lp').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  // ¿Sesión activa? → ir directo al dashboard
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (s && (Date.now() - s.ts) < SESSION_TTL) {
      document.getElementById('login-screen').style.display = 'none';
      showDashboard();
      return;
    }
  } catch {}

  // Si no hay sesión, mostrar login
  document.getElementById('login-screen').style.display = 'flex';

  window.addEventListener('beforeunload', () => {
    if (window._monitor) window._monitor.destroy();
  });
});
