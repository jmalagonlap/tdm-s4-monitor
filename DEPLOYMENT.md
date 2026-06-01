# Guía de Deployment — TDM S4 Monitor

## ✅ Estado Actual

El proyecto está completamente listo para production en Vercel:

- ✅ Código HTML, CSS, JavaScript configurado
- ✅ Autenticación SSO + login local implementada
- ✅ API monitor con polling cada minuto
- ✅ Dashboard con gráficos y tablas
- ✅ Identidad visual ÁRTIMO completa
- ✅ Logo corporativo incluido
- ✅ Repositorio GitHub inicializado y pusheado

## 🚀 Pasos para Deployment en Vercel

### 1. Conectar Repositorio en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión con tu cuenta (o crea una)
3. Click en "New Project"
4. Selecciona "Import Git Repository"
5. Busca: `jmalagonlap/tdm-s4-monitor`
6. Click "Import"

### 2. Configurar Environment Variables

En Vercel, ve a **Settings → Environment Variables** y agrega:

```
ARTIMO_USERNAME = usuario_tdm@artimo.com
ARTIMO_PASSWORD = contraseña_secreta
```

> **Nota**: La URL del API (`https://api.artimo.com.co`) está hardcodeada en el código y no requiere configuración. El token se obtiene automáticamente usando estas credenciales.

### 3. Deploy

1. Vercel detectará automáticamente que es proyecto estático
2. Click "Deploy"
3. Espera a que termine (2-3 minutos)
4. Tu URL será: `https://tdm-s4-monitor.vercel.app`

## 🔐 Actualizar Credenciales Después

Cuando tengas los secrets reales de ÁRTIMO:

1. En Vercel → Settings → Environment Variables
2. Actualiza `ARTIMO_PASSWORD` y `ARTIMO_API_TOKEN`
3. Vercel redeploy automáticamente
4. Los cambios se aplican sin reiniciar nada

## 📋 Checklist Pre-Deploy

- [ ] Tienes usuario y contraseña ÁRTIMO TDM válidos
- [ ] El repositorio está en GitHub
- [ ] Vercel puede acceder al repo
- [ ] Variables de entorno configuradas en Vercel
- [ ] API ÁRTIMO permite requests desde vercel.app

## 🧪 Testing Antes de Producción

### Local Development

```bash
# En la carpeta tdm-s4-monitor
python -m http.server 8000

# Luego abre: http://localhost:8000
```

Prueba:
- [ ] Login con `artimo` / `Artimo2026!`
- [ ] Dashboard carga correctamente
- [ ] Gráfico se inicializa
- [ ] No hay errores en Console (F12)

### Vercel Preview (Antes de Main)

1. Haz cambios en rama `develop`
2. Crea Pull Request a `main`
3. Vercel crea preview automático
4. Prueba en preview antes de merge
5. Merge cuando todo funcione

## 🔗 URLs Importantes

- **Production**: https://tdm-s4-monitor.vercel.app
- **GitHub**: https://github.com/jmalagonlap/tdm-s4-monitor
- **Vercel Dashboard**: https://vercel.com/dashboard

## 🛠️ Troubleshooting

### Error: "API not responding"
- Verifica que `ARTIMO_API_URL` es correcto
- Verifica que `ARTIMO_API_TOKEN` es válido
- Comprueba CORS del API ÁRTIMO

### Error: "Cannot load logo"
- Asegúrate que `logoartimogrande.jpg` está en la carpeta raíz
- Verifica que el archivo está en el commit de GitHub

### Login no funciona
- Actualiza credenciales en Vercel Environment Variables
- Espera a que redeploy termine (puede tomar 2-3 min)
- Limpia caché del navegador (Ctrl+F5)

## 📊 Monitoreo en Producción

Después de deploy:

1. Abre el dashboard en Vercel URL
2. Abre DevTools (F12)
3. Ve a Console
4. Verifica que no haya errores rojos
5. Checa Network para validar peticiones al API

## 🔄 Actualizaciones Futuras

Para hacer cambios:

```bash
# 1. Haz cambios localmente
# 2. Commit y push
git add .
git commit -m "Mensaje de cambios"
git push origin main

# 3. Vercel auto-redeploy desde main
# 4. Cambios en vivo en 2-3 minutos
```

## 📞 Soporte

Si algo no funciona:

1. Revisa la Console de Vercel (Logs tab)
2. Checa el DevTools del navegador (F12)
3. Verifica que todas las variables de entorno estén configuradas
4. Comprueba que el repositorio está actualizado en GitHub

---

**Última actualización**: Junio 2026
**Status**: ✅ Listo para Producción
