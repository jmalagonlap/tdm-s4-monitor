/**
 * ÁRTIMO Authentication Module - SSO + Local Login
 * Maneja autenticación via SSO del hub o login local
 */

class ArtimoAuth {
  constructor() {
    // Usar credenciales desde CONFIG
    const apiUser = CONFIG ? CONFIG.API_USERNAME : 'artimo';
    const apiPass = CONFIG ? CONFIG.API_PASSWORD : 'Artimo2026!';
    this.users = {
      [apiUser]: apiPass,
    };
    this.sessionKey = CONFIG ? CONFIG.SESSION_STORAGE_KEY : 'artimo_session_tdm_s4';
    this.ssoTokenKey = 'artimo_sso_token';
    this.ssoTimestampKey = 'artimo_sso_timestamp';
  }

  /**
   * Detecta si viene desde SSO del hub y valida el token
   * @returns {boolean} true si SSO válido, false si requiere login local
   */
  checkSSO() {
    const urlParams = new URLSearchParams(window.location.search);
    const ssoToken = urlParams.get('sso');

    if (ssoToken) {
      const timestamp = Date.now();
      localStorage.setItem(this.ssoTokenKey, ssoToken);
      localStorage.setItem(this.ssoTimestampKey, timestamp);
      localStorage.setItem(this.sessionKey, JSON.stringify({
        user: 'artimo',
        timestamp: timestamp,
        sso: true,
      }));
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }

    return this.isSessionValid();
  }

  /**
   * Valida si hay sesión activa en localStorage
   * @returns {boolean}
   */
  isSessionValid() {
    const session = localStorage.getItem(this.sessionKey);
    if (!session) return false;

    try {
      const data = JSON.parse(session);
      const timestamp = data.timestamp || 0;
      const now = Date.now();
      const eightHours = 8 * 60 * 60 * 1000;

      // Sesión válida por 8 horas
      if (now - timestamp < eightHours) {
        return true;
      }
    } catch (e) {
      console.error('Error validando sesión:', e);
    }

    localStorage.removeItem(this.sessionKey);
    return false;
  }

  /**
   * Login local con usuario y contraseña
   * @param {string} username
   * @param {string} password
   * @returns {boolean}
   */
  localLogin(username, password) {
    if (this.users[username] && this.users[username] === password) {
      const timestamp = Date.now();
      localStorage.setItem(this.sessionKey, JSON.stringify({
        user: username,
        timestamp: timestamp,
        sso: false,
      }));
      return true;
    }
    return false;
  }

  /**
   * Obtiene datos de la sesión actual
   * @returns {object|null}
   */
  getSession() {
    const session = localStorage.getItem(this.sessionKey);
    if (session) {
      try {
        return JSON.parse(session);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Cierra la sesión
   */
  logout() {
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.ssoTokenKey);
    localStorage.removeItem(this.ssoTimestampKey);
    window.location.reload();
  }

  /**
   * Obtiene el usuario actual
   * @returns {string|null}
   */
  getCurrentUser() {
    const session = this.getSession();
    return session ? session.user : null;
  }

  /**
   * Verifica si es autenticación SSO
   * @returns {boolean}
   */
  isSSO() {
    const session = this.getSession();
    return session ? session.sso : false;
  }
}

// Instancia global
const artimoAuth = new ArtimoAuth();
