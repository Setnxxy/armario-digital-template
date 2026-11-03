# Privacidad de la plantilla y de cada instalación

## Contenido público

Esta distribución contiene código, configuración genérica, documentación, iconos propios y datos sintéticos de prueba. No incluye cuentas conectadas, identificadores de un registro Microsoft previo, dominios de una instalación previa, fotografías personales, respaldos, capturas ni historial del proyecto de origen. Se prepara con un historial nuevo.

La página del repositorio sí identifica a su propietario de GitHub. Los nombres, avatares y metadatos públicos de esa cuenta no pueden ocultarse desde el código. La plantilla no promete anonimato de su publicador. Antes de subir cambios propios, comprueba también el nombre y correo de autor de tus commits; puedes utilizar la dirección noreply de GitHub.

## Datos de quien instala

Cada persona crea sus recursos y concede acceso a su propia AppFolder de OneDrive. Copiar código no concede acceso al OneDrive de quien publicó la plantilla. El propietario de esta plantilla no recibe tus prendas mediante un servidor central.

Microsoft recibe las solicitudes de identidad y archivos. Netlify sirve los archivos públicos de tu aplicación y puede procesar información de acceso según sus políticas. Los proveedores aplican sus propias condiciones, registros y retención; esta app no los controla.

- Los registros y fotos del armario de nube se guardan en OneDrive. Quien tenga acceso a esa cuenta o a una carpeta compartida puede acceder a ellos. No compartas la carpeta de la app si quieres mantenerla privada.
- MSAL mantiene la sesión de la app en `sessionStorage`. No se guarda tu contraseña en el código. Scripts maliciosos dentro del mismo origen podrían comprometer una sesión: conserva dependencias y cabeceras seguras.
- Las preferencias de interfaz y el Client ID introducido manualmente se guardan localmente. El modo demo usa IndexedDB en ese navegador y está separado de la nube.
- El service worker guarda solo archivos estáticos de interfaz. No guarda fotos de OneDrive, tokens ni respuestas Graph en su caché.
- Las fotos originales se conservan intactas: pueden contener metadatos EXIF, ubicación u otra información. Si no quieres conservar esos metadatos, retíralos antes de subirlas. El recorte no elimina el original.
- Un ZIP de respaldo contiene datos y fotografías legibles. No está cifrado por esta app; guárdalo y compártelo con cuidado.
- Borrar una prenda o foto de la vista no purga el historial: las revisiones y bytes antiguos se conservan para recuperación y conflictos. Desinstalar la PWA no elimina OneDrive. Revisa manualmente tu carpeta y las opciones de recuperación/retención de Microsoft antes de una eliminación definitiva.

## Límites

No hay analítica, anuncios ni telemetría de aplicación añadidos en este código, ni cifrado de extremo a extremo implementado por la app. El alojamiento y OneDrive siguen siendo servicios de terceros. Un repositorio público no implica que todos puedan modificar tu despliegue; conserva el control de colaboradores, integraciones y sesiones en tus cuentas.

No subas a un repositorio público tu `.env`, respaldos, exportaciones, enlaces preautorizados, capturas con información de cuenta ni registros de errores que contengan tokens. `.gitignore` reduce errores accidentales; no elimina secretos de commits ya publicados.
