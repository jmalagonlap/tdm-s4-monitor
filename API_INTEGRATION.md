# API Integration Guide — TDM S4 Monitor

## 📡 API ÁRTIMO GPS Latest

El dashboard hace peticiones periódicas al endpoint GPS Latest del API ÁRTIMO.

### Endpoint Actual (Basado en Documentación)

```
GET /rtdata/gpsv2/latest?Plates={placa}
```

**Base URL**: `https://api.artimo.com.co` (hardcodeada en config.js)

### Headers Requeridos

```http
Authorization: Bearer {API_TOKEN}
Content-Type: application/json
```

### Parámetros Query

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `plate` | string | Sí | Placa del vehículo (ej: `1LKN501`) |

### Respuesta Esperada

```json
{
  "success": true,
  "data": {
    "plate": "1LKN501",
    "count": 150,
    "lastUpdate": "2026-06-01T14:30:00Z",
    "records": [
      {
        "timestamp": "2026-06-01T14:30:00Z",
        "latitude": 4.7110,
        "longitude": -74.0721,
        "speed": 45,
        "accuracy": 5.2
      }
    ]
  }
}
```

**O formato simplificado:**

```json
{
  "plate": "1LKN501",
  "total": 150,
  "timestamp": "2026-06-01T14:30:00Z"
}
```

## 🔧 Integración en el Código

### Archivo: `api-monitor.js`

La clase `TDMMonitor` maneja la integración:

```javascript
async getGPSCount(placa) {
  const response = await fetch(
    `${this.apiBaseUrl}${this.apiEndpoint}?plate=${placa}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  // Ajustar según estructura real del API
  return data.count || data.total || data.data?.count || 0;
}
```

### Ajustes Necesarios

Si la respuesta del API tiene estructura diferente:

1. **Si el endpoint es diferente**:
   - Actualiza `API_ENDPOINT` en `config.js`
   - Ej: `/v1/gps/latest` o `/api/vehicle/gps`

2. **Si la respuesta es diferente**:
   - Modifica `getGPSCount()` en `api-monitor.js`
   - Extrae el valor correcto: `data.data.count`, `data.records.length`, etc.

3. **Si requiere autenticación diferente**:
   - Actualiza `getAuthToken()` en `api-monitor.js`
   - Podría ser: JWT, API Key header, etc.

## 📝 Ejemplo de Integración

### Caso 1: API devuelve array de registros

```javascript
async getGPSCount(placa) {
  const response = await fetch(`${this.apiBaseUrl}${this.apiEndpoint}?plate=${placa}`);
  const data = await response.json();
  return Array.isArray(data) ? data.length : 0;
}
```

### Caso 2: API devuelve objeto con "total"

```javascript
async getGPSCount(placa) {
  const response = await fetch(`${this.apiBaseUrl}${this.apiEndpoint}?plate=${placa}`);
  const data = await response.json();
  return data.data?.total || data.total || 0;
}
```

### Caso 3: API devuelve "success" flag

```javascript
async getGPSCount(placa) {
  const response = await fetch(`${this.apiBaseUrl}${this.apiEndpoint}?plate=${placa}`);
  const data = await response.json();
  if (!data.success) throw new Error('API Error');
  return data.data?.records?.length || 0;
}
```

## 🔐 Autenticación

### Token del API ÁRTIMO

1. **Obtener token en Vercel**:
   - Env var: `ARTIMO_API_TOKEN`
   - Se pasa en header: `Authorization: Bearer {token}`

2. **Token SSO desde Hub**:
   - Si viene vía SSO, el token está en localStorage
   - `localStorage.getItem('artimo_sso_token')`

3. **Refrescar token expirado**:
   - Si API retorna 401: Token expirado
   - Requiere implementar refresh logic

### Implementar Refresh de Token

Si el API devuelve 401, necesitas:

```javascript
async getGPSCount(placa) {
  try {
    const response = await fetch(...);
    
    if (response.status === 401) {
      // Token expirado - refrescar
      await this.refreshToken();
      // Reintentar
      return this.getGPSCount(placa);
    }
    
    return processResponse(response);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

async refreshToken() {
  // Implementar según API ÁRTIMO
  // POST /auth/refresh con refresh_token
}
```

## ⚙️ Configuración por Ambiente

### Desarrollo (localhost)

```javascript
// config.js detecta automáticamente
CONFIG.IS_DEVELOPMENT = true

// En desarrollo, usa datos simulados si API falla
async getGPSCount(placa) {
  if (this.isDevelopment()) {
    return Math.floor(Math.random() * 100) + 50;
  }
  // ... llamada real al API
}
```

### Producción (Vercel)

```javascript
CONFIG.IS_DEVELOPMENT = false

// En producción, requiere API real
// Si falla, muestra error en dashboard
```

## 📊 Peticiones Periódicas

El dashboard hace peticiones cada **60 segundos**:

```javascript
this.pollInterval = 60000; // 1 minuto

// Cada minuto, para 5 vehículos:
// = 5 peticiones al API por minuto
// = 300 peticiones por hora
// = 7,200 peticiones por día
```

**Considera**:
- Rate limiting del API ÁRTIMO
- Costo de peticiones (si es pago)
- Carga sobre el servidor

## 🚨 Manejo de Errores

El dashboard maneja automáticamente:

- **Error 401**: Muestra "Activo" con icono de error
- **Timeout**: Retorna 0 y continúa
- **CORS**: Verifica que API permita vercel.app
- **Red**: Usa datos en caché del último minuto

## 🔄 CORS Configuration

El API ÁRTIMO debe permitir requests desde:

```
https://tdm-s4-monitor.vercel.app
https://*.vercel.app
```

**Header requerido en API**:

```http
Access-Control-Allow-Origin: https://tdm-s4-monitor.vercel.app
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

## 📈 Monitoreo de Peticiones

Abre DevTools (F12) → Network tab:

1. Filtra por "gps/latest" o similar
2. Verifica que las peticiones sean exitosas (200)
3. Revisa el tiempo de respuesta
4. Checa los headers enviados

## 🐛 Debugging

### Ver qué se envía al API

```javascript
// En api-monitor.js, en getGPSCount:
console.log('Fetching:', url);
console.log('Headers:', headers);
console.log('Response:', data);
```

### Ver errores en Console

```
F12 → Console tab → filtra por "error" o "Error"
```

### Verificar configuración

```javascript
// En console:
console.log(CONFIG);
console.log('API URL:', CONFIG.API_BASE_URL);
console.log('Token:', CONFIG.API_TOKEN);
```

## 📞 Próximos Pasos

1. **Confirma estructura del API** con equipo ÁRTIMO
2. **Obtén token válido** y credenciales
3. **Configura en Vercel** Environment Variables
4. **Prueba en localhost** con datos reales
5. **Deploy a Vercel** cuando todo funcione
6. **Monitorea** primeras 24 horas en producción

---

**Última actualización**: Junio 2026
**Basado en**: Documentación API ÁRTIMO
