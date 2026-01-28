# Guía de Despliegue - BEX HRIS

## Frontend (Netlify) ✅

**Estado**: Desplegado en producción
- **URL**: https://bex-hris.netlify.app
- **Repositorio**: `/frontend`
- **Build**: `npm run build`
- **Configuración**: `netlify.toml`

## Backend (Render)

### Pasos para Desplegar en Render:

1. **Crear cuenta en Render.com** (si no tienes una)
   - Ve a https://render.com
   - Regístrate con GitHub o email

2. **Conectar Repositorio GitHub**
   - Sube el código a un repositorio GitHub
   - En Render, conecta tu repositorio

3. **Crear nuevo Web Service**
   - Haz clic en "New +" → "Web Service"
   - Selecciona tu repositorio
   - Configura:
     - **Name**: `bex-hris-backend`
     - **Root Directory**: `backend`
     - **Runtime**: Node
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`

4. **Configurar Variables de Entorno**
   En Render, ve a "Environment" y agrega:
   ```
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=8ea4a8ce09c9775422df9ae4997dae0c
   RESEND_API_KEY=re_Vdd7JNhq_HBZe5gxqS4v6qzTg5cZ7actj
   EMAIL_FROM=onboarding@resend.dev
   DATABASE_PATH=./data/hris.db
   UPLOAD_DIR=./uploads
   MAX_FILE_SIZE=10485760
   ENABLE_EMAIL_NOTIFICATIONS=true
   ENABLE_APP_NOTIFICATIONS=true
   NOTIFICATION_CHECK_INTERVAL=3600000
   ```

5. **Desplegar**
   - Haz clic en "Deploy"
   - Espera a que se complete (5-10 minutos)
   - Copia la URL del backend (ej: `https://bex-hris-backend.onrender.com`)

### Actualizar Frontend con URL del Backend

Una vez que tengas la URL del backend:

1. En Netlify, ve a **Site Settings** → **Build & Deploy** → **Environment**
2. Agrega/Actualiza la variable:
   ```
   REACT_APP_API_URL=https://bex-hris-backend.onrender.com/api
   ```
3. Redeploy el frontend (en Netlify, ve a **Deploys** → **Trigger Deploy**)

## URLs Finales

- **Frontend**: https://bex-hris.netlify.app
- **Backend**: https://bex-hris-backend.onrender.com (después de desplegar)
- **API**: https://bex-hris-backend.onrender.com/api

## Notas Importantes

- La base de datos SQLite se almacena en `./data/hris.db` en el servidor
- Los archivos subidos se guardan en `./uploads`
- Los secretos (JWT_SECRET, RESEND_API_KEY) están en las variables de entorno
- El frontend se conectará automáticamente al backend una vez configurada la URL

## Troubleshooting

Si el backend no se conecta:
1. Verifica que `REACT_APP_API_URL` esté correcta en Netlify
2. Revisa los logs del backend en Render
3. Asegúrate de que el backend esté en estado "Live" en Render
4. Limpia el cache del navegador (Ctrl+Shift+Del)
