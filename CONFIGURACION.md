# Configurar tu propia instalación

El resultado será una copia de la app en tu cuenta de Netlify, un registro Microsoft bajo tu control y datos en tu OneDrive. Ninguna variable de esta plantilla apunta a una instalación anterior.

## 1. Requisitos

- Cuenta GitHub para guardar tu copia; puede ser un repositorio privado.
- Cuenta Netlify para publicar los archivos estáticos.
- Cuenta Microsoft **personal** con OneDrive inicializado. Abre OneDrive una vez y comprueba que puedes crear un archivo.
- Acceso a un directorio Microsoft Entra donde puedas registrar aplicaciones. Tener OneDrive no garantiza ese permiso. Si Azure pide un directorio o un rol, resuelve ese acceso en tu cuenta; no cambies la audiencia a solo organizacional para evitar el error.
- Para compilar localmente: Node 24 y npm.

Registrar una aplicación para tu instalación es diferente de iniciar sesión para usarla. Una vez configurada tu copia, en los demás dispositivos solo abres esa misma dirección e inicias sesión; no vuelves a registrar otra app.

## 2. Crear tu copia y obtener su dominio

1. En este repositorio pulsa **Use this template → Create a new repository**. Elige tu cuenta y un nombre. Puedes mantener tu copia privada aunque la plantilla sea pública. No copies el historial de otro proyecto.
2. En Netlify selecciona **Add new project / Import an existing project**, conecta GitHub y elige tu copia.
3. Configuración: comando `npm run build`, publicación `dist`, Node 24. `netlify.toml` contiene estos valores, las cabeceras y las rutas.
4. Publica y anota el dominio exacto, por ejemplo `https://TU-SITIO.netlify.app`. Hasta configurar Microsoft puedes explorar los ejemplos locales.
5. Si el proveedor protege todo el sitio mediante contraseña/SSO, decide su audiencia en tu propia cuenta. Que el HTML sea público no concede acceso a los archivos OneDrive de otra cuenta.

## 3. Registrar tu aplicación Microsoft

1. Abre [Microsoft Entra](https://entra.microsoft.com/) o [Azure](https://portal.azure.com/). Busca **Registros de aplicaciones → Nuevo registro**.
2. Nombre sugerido: **Armario Digital**. Tipos de cuenta: **Solo cuentas personales Microsoft**, cuando esté disponible. También es compatible un registro que incluya **cuentas de cualquier directorio y cuentas personales**. La app usa `consumers` e inicia sesión con cuentas personales; no ofrece soporte de cuenta laboral/escolar.
3. En URI de redirección elige **Aplicación de página única (SPA)** y escribe `https://TU-SITIO.netlify.app/redirect.html`, sustituyendo TU-SITIO por tu dominio real. No elijas plataforma Web.
4. Registra la app. Copia solo el **Application (client) ID**: es un UUID público. No uses Directory ID ni Object ID.
5. En **Autenticación**, dentro de la plataforma SPA, añade además `https://TU-SITIO.netlify.app/` para el cierre de sesión. Guarda. Deben coincidir protocolo, dominio y ruta exactamente.
6. En **Permisos de API → Agregar permiso → Microsoft Graph → Permisos delegados**, selecciona **Files.ReadWrite.AppFolder**. Permite leer, crear, actualizar y borrar dentro de la carpeta de la aplicación. No selecciones permisos de aplicación, `Files.ReadWrite` ni `.All`.
7. Si el registro nuevo incluye `User.Read`, no es necesario para este código; puedes quitarlo de tu propio registro. El código solicita AppFolder y los permisos de sesión OIDC gestionados por MSAL (`openid`, `profile`, `offline_access`). No necesita consentimiento de administrador para AppFolder delegado personal.
8. **No crees client_secret, certificado ni claves privadas. No actives el flujo implícito.** La SPA utiliza Authorization Code con PKCE y el puente `redirect.html` de MSAL.

El registro puede requerir permisos del administrador de tu directorio. No contrates una suscripción ni aceptes un plan de pago solo para superar un mensaje sin revisar sus condiciones y tu configuración.

## 4. Configurar variables en Netlify

En **Project configuration → Environment variables** añade, para el contexto Production:

| Variable | Valor que debes introducir |
|---|---|
| `VITE_MICROSOFT_CLIENT_ID` | Application (client) ID de TU registro |
| `VITE_REDIRECT_URI` | `https://TU-SITIO.netlify.app/redirect.html` |

Estas variables son públicas y se incorporan al JavaScript. Usa alcance de Builds si tu plan permite seleccionarlo; el alcance predeterminado también permite construir. Nunca pongas una contraseña, token o `client_secret` en una variable `VITE_`.

Inicia un **nuevo build y deploy** después de cambiarlas. No basta con editar las variables. Una Deploy Preview tiene otro dominio: no le suministres configuración de producción sin registrar primero sus URI exactas. Para empezar, prueba solo el dominio estable de producción.

### Alternativa: deploy manual

En tu equipo, copia `.env.example` como `.env`, rellena las variables de TU dominio y ejecuta `npm ci` y `npm run build`. Sube la carpeta `dist` a tu proyecto Netlify. Si usas ZIP, `index.html`, `redirect.html`, `_headers` y `_redirects` deben quedar en la raíz del ZIP, sin una carpeta `dist` contenedora. Cambiar variables en Netlify no modifica un ZIP que ya compilaste en tu equipo.

### Desarrollo local

En `.env` usa tu Client ID y, por ejemplo, `VITE_REDIRECT_URI=http://localhost:5173/redirect.html`. Registra esa URI en la plataforma SPA y la raíz `http://localhost:5173/`. Si Vite usa `127.0.0.1` u otro puerto, registra exactamente ese origen. Reinicia Vite. Nunca subas `.env` a GitHub.

## 5. Primer inicio y comprobación

1. Abre tu dominio de producción. En Ajustes conecta Microsoft y elige tu cuenta personal.
2. Lee el consentimiento: debe corresponder a TU app y su carpeta. Si solicita acceso general a archivos, detente y revisa configuración/código antes de aceptar.
3. Al retornar, la app debe indicar **Conectado a OneDrive**. Tu armario empieza vacío; los ejemplos no se migran.
4. En Ajustes ejecuta **Probar lectura, escritura y conflictos**. Crea archivos sintéticos separados en `diagnostico/`; no crea prendas.
5. Exige resultados de JSON creado/leído/actualizado, PNG subido/leído, PATCH obsoleto con HTTP 412 y revisiones simultáneas preservadas. El PATCH no demuestra control de concurrencia de PUT de contenido.
6. Crea una prenda de prueba, recarga y comprueba foto y datos. Exporta un respaldo. Verifica la restauración primero en modo de prueba.
7. En otro navegador/dispositivo abre **tu misma URL** y cuenta: comprueba recuperación y conflictos. Solo después usa fotografías que quieras conservar. Véase [VALIDACION](docs/VALIDACION.md).

La app guarda datos bajo AppFolder (`Apps/nombre de la aplicación`) en el OneDrive del usuario conectado. Conserva el mismo Client ID para esa instalación: otro registro tiene otra identidad/carpeta y puede parecer un armario vacío. No se recuperan datos de una instalación ajena al copiar esta plantilla.

## 6. Errores frecuentes

| Mensaje o síntoma | Qué comprobar |
|---|---|
| Falta Application (client) ID | Variable vacía, contexto de Netlify o build antiguo. Configura y recompila. |
| AADSTS50020 / cuenta no existe en directorio | Audiencia del registro y cuenta elegida. Debe admitir cuentas personales; la autoridad del código es `consumers`. |
| Redirect URI mismatch | Plataforma SPA, `/redirect.html`, protocolo, dominio y puerto exactos. |
| Error 403 / acceso denegado en Graph | Consentimiento AppFolder delegado, cuenta personal, OneDrive inicializado y pertenencia del archivo a tu AppFolder. No amplíes permisos automáticamente. |
| Descarga bloqueada | Revisa CSP y conexión. Se permiten Graph y destinos de descarga Microsoft, incluido el host exacto `my.microsoftpersonalcontent.com`. Si aparece otro destino, valida su origen antes de añadirlo solo a `connect-src`; no desactives CSP ni añadas `*`. No publiques la URL completa preautorizada. |
| Sigue apareciendo versión anterior | Cierra y abre la app, revisa la actualización disponible en Ajustes y confirma que el deploy terminó. Guarda borradores antes de recargar. |
| No aparecen datos de otro equipo | Misma URL, cuenta Microsoft y Client ID; refresca almacenamiento y revisa conflictos. No importes ejemplos como si fueran nube. |

## Referencias oficiales

- [Registrar aplicaciones Microsoft](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- [AppFolder y aislamiento de permisos](https://learn.microsoft.com/en-us/graph/onedrive-sharepoint-appfolder)
- [Permisos Microsoft Graph](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Vite en Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/)
- [Variables de compilación en Netlify](https://docs.netlify.com/build/configure-builds/environment-variables/)
- [Crear repositorios desde plantillas](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template)
