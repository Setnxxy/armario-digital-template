# Seguridad

Esta SPA es un cliente público: utiliza MSAL, PKCE y acceso delegado `Files.ReadWrite.AppFolder`. No requiere secretos de servidor. El Client ID y las URI de retorno son identificadores públicos; tokens de acceso, cookies, códigos de autorización y URLs preautorizadas de descarga sí son sensibles.

Mantén el alcance de carpeta. No añadas `Files.ReadWrite`, `.All`, permisos de aplicación o un `client_secret` para resolver un fallo sin comprender el cambio de acceso. La autoridad `consumers` está elegida para OneDrive personal.

Conserva las cabeceras de `netlify.toml`; el puente `redirect.html` debe seguir siendo del mismo origen y no recibir COOP que impida el flujo MSAL. No añadas scripts remotos o analítica sin revisar sus implicaciones. Solo añade hosts Microsoft de descarga observados y validados a `connect-src`.

## Informar de un problema

No publiques tokens, contraseñas, archivos personales o enlaces de descarga en Issues. Si el repositorio ofrece **Security → Report a vulnerability**, utiliza ese canal privado. Si no está habilitado, evita divulgar detalles explotables o datos sensibles en público y utiliza los canales oficiales del proveedor afectado cuando corresponda.

Si publicaste un secreto, revócalo en el proveedor antes de limpiar el historial; quitarlo del último archivo no lo invalida. Cierra/revoca sesiones si se filtró un token. Cambiar el Client ID no reemplaza esa revocación.

## Mantenimiento

Ejecuta `npm audit`, actualiza dependencias con revisión y repite pruebas. Verifica de nuevo el diagnóstico y dos dispositivos tras cambiar autenticación, Graph, almacenamiento o service worker. No hay garantía de auditoría exhaustiva ni soporte de seguridad permanente. Véase [PRIVACIDAD.md](PRIVACIDAD.md).
