# Scripts Directory

## poll-gps.js

Script que ejecuta el **GitHub Actions workflow** automáticamente cada minuto.

### Propósito

- Obtiene datos del API ÁRTIMO de forma automática
- Guarda los registros en `data/gps-data.json`
- Mantiene histórico de 24 horas (1440 registros)
- No depende de que alguien tenga el dashboard abierto

### Ejecución

```bash
# Manual (local)
ARTIMO_USERNAME=usuario@example.com ARTIMO_PASSWORD=password node poll-gps.js

# Automático (GitHub Actions)
# Se ejecuta cada minuto según .github/workflows/poll-gps.yml
```

### Datos Guardados

Archivo: `data/gps-data.json`

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
          "syrus": 30,
          "mixfm": 29,
          "diferencia": 1
        }
      }
    }
  ]
}
```

### Flujo

```
1. GitHub Actions ejecuta workflow cada minuto
2. workflow corre poll-gps.js
3. Script obtiene token de /tokens
4. Script hace peticiones a /rtdata/gpsv2/latest para cada placa
5. Datos se guardan en data/gps-data.json
6. Commit automático al repo (si hay cambios)
7. Dashboard carga datos desde GitHub automáticamente
```

### Errores Comunes

**Error: ARTIMO_USERNAME o ARTIMO_PASSWORD no configurados**
- Verifica que los secrets estén en GitHub Actions settings
- Los secrets deben estar en: Settings → Secrets and variables → Actions

**Error: API Error 401**
- El usuario/password es incorrecto
- Verifica credenciales en GitHub secrets

**Error: git config no encontrado**
- El workflow necesita git configurado
- El workflow ya lo configura automáticamente

### Limitaciones

- **Rate limit**: El API ÁRTIMO tiene límites (consultar documentación)
- **Ventana**: Solo obtiene datos de últimas 48 horas
- **Almacenamiento**: GitHub tiene límites de tamaño de archivo (~100MB)
- **Paginación**: Si hay >1000 registros por minuto, se requiere ajustar
