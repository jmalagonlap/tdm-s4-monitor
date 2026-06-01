# TDM S4 Monitor — Dashboard Comparativo de Telemetrías

Monitor en tiempo real para comparar telemetrías **Syrus4G** vs **Anterior** en vehículos TDM.

## 📋 Descripción

Este dashboard monitorea la cantidad de GPS recibidos en ÁRTIMO para 5 vehículos en paralelo con dos tecnologías:

- **Syrus4G**: Tecnología nueva (placas con prefijo `1`)
- **Anterior**: Telemetría anterior (placas sin prefijo)

Realiza peticiones cada minuto al API ÁRTIMO GPS latest, guarda históricamente los datos, y muestra un dashboard comparativo en vivo.

### Vehículos Monitoreados

| Vehículo | Placa Syrus4G | Placa Anterior |
|----------|---------------|----------------|
| 1 | 1LKN501 | LKN501 |
| 2 | 1JYX434 | JYX434 |
| 3 | 1STE582 | STE582 |
| 4 | 1STE577 | STE577 |
| 5 | 1STE060 | STE060 |

## 🚀 Funcionalidades

- ✅ **Autenticación SSO** desde hub ÁRTIMO
- ✅ **Login local** con credenciales ÁRTIMO
- ✅ **Monitoreo periódico** cada 60 segundos
- ✅ **Almacenamiento histórico** en localStorage
- ✅ **Dashboard en vivo** con stats en tiempo real
- ✅ **Gráfico comparativo** (últimas 24 horas)
- ✅ **Tabla de vehículos** con detalle por unidad
- ✅ **Registro de datos** con exportación a CSV
- ✅ **Identidad visual ÁRTIMO** completa
- ✅ **Responsive** (mobile, tablet, desktop)

## 📦 Archivos del Proyecto

```
tdm-s4-monitor/
├── index.html           # HTML principal (login + dashboard)
├── styles.css          # Estilos corporativos ÁRTIMO
├── artimo-auth.js      # Módulo de autenticación
├── api-monitor.js      # Lógica de monitoreo y dashboard
├── vercel.json         # Configuración Vercel
├── .gitignore          # Ignorar archivos en git
└── README.md           # Este archivo
```

## 🔐 Autenticación

### SSO desde Hub ÁRTIMO

```
artimo-hub → Clickea dashboard → https://tdm-s4-monitor.vercel.app/?sso=TOKEN
```

El dashboard detecta el token y omite el login local.

### Login Local

**Usuario por defecto:**
- Usuario: `artimo`
- Contraseña: `Artimo2026!`

La contraseña se actualiza cuando subes los secrets a Vercel.

## 🌐 Variables de Entorno (Vercel)

Solo se requiere configurar la contraseña en Vercel Environment Variables:

```env
ARTIMO_PASSWORD=Artimo2026!
```

**Nota:** La URL del API (`https://api.artimo.com.co`) está hardcodeada en `config.js` y no requiere configuración.

## 📊 API Integration

El dashboard hace peticiones a:

```
GET /gps/latest?plate={placa}
```

**Headers esperados:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Respuesta esperada:**
```json
{
  "count": 150,
  "plate": "1LKN501",
  "timestamp": "2026-06-01T14:30:00Z",
  "data": [...]
}
```

## 🛠️ Desarrollo Local

No requiere build. Abre directamente en navegador:

```bash
# Con Python 3
python -m http.server 8000

# O con cualquier servidor local
# Luego: http://localhost:8000
```

## 📤 Deploy a Vercel

```bash
# Clone el repo
git clone https://github.com/jmalagonlap/tdm-s4-monitor.git
cd tdm-s4-monitor

# Deploy directo (si tienes CLI de Vercel)
vercel

# O: Conecta en vercel.com y deploy desde GitHub
```

## 💾 Almacenamiento de Datos

- **localStorage**: Guarda hasta 100 registros históricos
- **Límite**: ~5-10 MB (típicamente)
- **Formato**: JSON
- **Limpieza**: Botón "Limpiar Datos" en dashboard

## 📈 Gráfico Comparativo

Muestra las últimas **24 horas** (144 registros con polling cada minuto):

- **Línea Verde**: Syrus4G (total)
- **Línea Azul**: Anterior (total)
- **Línea Naranja Punteada**: Diferencia

## 🎨 Identidad Visual

Sigue el **Manual de Identidad ÁRTIMO 2018**:

- **Colores corporativos**: Rojo oscuro (#BC1818), Rojo vivo (#E10B17)
- **Tipografía**: Open Sans (300, 600, 700)
- **Logo**: `logoartimogrande.jpg`
- **Responsive**: 320px - 1920px

## ⚠️ Notas Importantes

1. **API Keys**: Cambia `ARTIMO_API_TOKEN` en Vercel con valor real
2. **CORS**: Asegúrate que el API ÁRTIMO permita requests desde vercel.app
3. **Throttling**: El API podría limitar requests frecuentes
4. **Histórico**: Se pierden datos si limpias localStorage

## 🔗 Referencias

- [Manual de Identidad ÁRTIMO](../ARTIMO_BRAND.md)
- [Guía de Integración](../INTEGRATION_GUIDE.md)
- [API ÁRTIMO](../documentacion_api_artimo.md)

## 📝 Licencia

Proyecto interno ÁRTIMO/Equitel - 2026

---

**Última actualización**: Junio 2026
**Estado**: ✅ Producción
**Autor**: ÁRTIMO Development Team
