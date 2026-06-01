# Sistema de Resumen Diario

## 📊 Descripción

Sistema automático que:

1. **Detecta posiciones GPS duplicadas** (misma lat/lon/timestamp)
2. **Cuenta solo posiciones nuevas** cada minuto
3. **Al finalizar el día** (00:00 UTC), compacta los datos
4. **Mantiene histórico indefinido** de posiciones nuevas por día

## 🔄 Flujo de Datos

```
Cada minuto (1:00 → 23:59 UTC):
├─ GitHub Actions ejecuta poll-gps.js
├─ Obtiene datos del API ÁRTIMO
├─ Detecta duplicados (lat, lon, fecha)
├─ Cuenta solo posiciones NUEVAS
└─ Guarda en data/gps-data.json

A las 00:00 UTC (medianoche):
├─ GitHub Actions ejecuta daily-summary.js
├─ Procesa todos los registros del día anterior
├─ Calcula estadísticas diarias
├─ Guarda en data/daily-summary.json
└─ Guarda histórico en data/daily-history/YYYY-MM-DD.json
```

## 📁 Estructura de Datos

### gps-data.json (Datos actuales)
```json
{
  "records": [
    {
      "timestamp": "2026-06-01T12:00:00.000Z",
      "syrusTotal": 150,
      "mixfmTotal": 145,
      "diferencia": 5,
      "vehiculos": {
        "Vehículo 1": {
          "placaSyrus": "CO_1LKN501",
          "placaMixFM": "CO_LKN501",
          "syrus": {
            "newPositions": 30,      // Posiciones NUEVAS
            "totalPositions": 150,   // Total incluyendo duplicadas
            "positions": [
              {
                "date": "2026-06-01T11:59:30Z",
                "latitude": 4.7110,
                "longitude": -74.0721,
                "speed": 45,
                "timestamp": "2026-06-01T12:00:00Z"
              }
            ]
          },
          "mixfm": {
            "newPositions": 29,
            "totalPositions": 145,
            "positions": [...]
          },
          "diferencia": 1
        }
      }
    }
  ]
}
```

### daily-summary.json (Resumen histórico)
```json
{
  "days": [
    {
      "date": "2026-05-31",
      "totalRecords": 1440,
      "syrus": {
        "totalNewPositions": 42150,
        "totalPositions": 216000,
        "vehicles": {
          "Vehículo 1": {
            "newPositions": 8430,
            "totalPositions": 43200
          }
        }
      },
      "mixfm": {
        "totalNewPositions": 41900,
        "totalPositions": 215200,
        "vehicles": {
          "Vehículo 1": {
            "newPositions": 8380,
            "totalPositions": 43040
          }
        }
      },
      "diferencia": 250
    },
    {
      "date": "2026-06-01",
      "totalRecords": 720,
      "syrus": {
        "totalNewPositions": 21080,
        "totalPositions": 108000,
        "vehicles": {
          "Vehículo 1": {
            "newPositions": 4216,
            "totalPositions": 21600
          }
        }
      },
      "mixfm": {
        "totalNewPositions": 20950,
        "totalPositions": 107600,
        "vehicles": {
          "Vehículo 1": {
            "newPositions": 4190,
            "totalPositions": 21520
          }
        }
      },
      "diferencia": 130
    }
  ]
}
```

### daily-history/YYYY-MM-DD.json (Histórico completo del día)
```json
{
  "date": "2026-05-31",
  "statistics": { ... },  // Stats del día
  "records": [
    { ... }  // Todos los registros del día
  ]
}
```

## 📈 Métricas Clave

### newPositions (Posiciones Nuevas)
- Se cuentan solo si: **latitud ≠ anterior O longitud ≠ anterior O fecha/hora ≠ anterior**
- Esencialmente: posiciones con coordenadas o timestamp diferentes
- Indica cobertura de red y actividad real del vehículo

### totalPositions (Posiciones Totales)
- Todas las posiciones recibidas por el API, incluyendo duplicadas
- Indicador de tráfico de datos y redundancia

### Diferencia (Syrus4G - Mix FM)
- Compara posiciones nuevas entre ambas tecnologías
- Positivo: Syrus4G recibe más datos
- Negativo: Mix FM recibe más datos

## 🎯 Casos de Uso

### Monitoreo Diario
```
Dashboard muestra:
- Gráfico de posiciones nuevas por día
- Tabla de estadísticas diarias
- Comparativa Syrus4G vs Mix FM
```

### Análisis Histórico
```
Analizar tendencias:
- ¿Syrus4G mejora cobertura día a día?
- ¿Hay caídas de conectividad?
- ¿Qué día tuvo mejor rendimiento?
```

### Alertas
```
Posibles alertas:
- Si Mix FM cae en nuevas posiciones
- Si Syrus4G no supera a Mix FM
- Si la cobertura baja un día completo
```

## 🔧 Configuración

### Horario de Resumen
- Ejecuta a las **00:00 UTC** diariamente
- Procesa datos del **día anterior completo** (24 horas)
- Toma ~10-30 segundos

### Retención de Datos
- **gps-data.json**: Solo datos del día actual (se reemplaza diariamente)
- **daily-summary.json**: Histórico indefinido (crece 1 KB/día aproximadamente)
- **daily-history/**: Opcional, para auditoría detallada

## 📊 Ejemplo de Análisis

```
Día 2026-05-31:
├─ Syrus4G: 42,150 nuevas posiciones / 216,000 totales (19.5% nuevas)
├─ Mix FM:  41,900 nuevas posiciones / 215,200 totales (19.5% nuevas)
└─ Diferencia: +250 a favor de Syrus4G

Análisis:
- Ambas tecnologías tienen tasa de duplicación similar (~80%)
- Syrus4G ligeramente más eficiente
- Ambas reciben datos continuamente (cobertura buena)
```

## 🐛 Debugging

### Ver últimas posiciones nuevas
```bash
# En data/gps-data.json
# Ver el "positions" array de cada vehículo
```

### Ver tendencia semanal
```bash
# En daily-summary.json
# Graficar "totalNewPositions" para los últimos 7 días
```

### Ver qué cambió un día específico
```bash
# En daily-history/2026-06-01.json
# Analizar "statistics" para ese día
```

## ⚠️ Limitaciones

- Las posiciones duplicadas se detectan solo por **lat/lon/timestamp exactos**
- Si el GPS salta de coordenada pero regresa al mismo lugar, se cuenta como nuevo
- Los timestamps son los de **llegada a plataforma** (puede haber delay por cobertura)
- Histórico depende de ejecución correcta del workflow

## 📋 Próximas Mejoras

- [ ] Dashboard con gráficos históricos
- [ ] Alertas si cobertura baja
- [ ] Análisis de patrones horarios
- [ ] Exportación de reportes
