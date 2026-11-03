# Arquitectura
SPA personal React + TypeScript + Vite, archivos estáticos en Netlify y PWA. Sin servidor propio, BD externa, Airtable, Sites o proveedor de login alternativo.

## Componentes
- App: navegación, filtros, estados, transacciones, detalle y ajustes.
- domain: esquemas Zod, referencias, identidad, revisiones y distribución.
- GarmentForm/OutfitEditor/components: formularios, editor y fotos compartidas.
- auth: MSAL Browser, authority consumers, Authorization Code + PKCE gestionado por MSAL; caché de sesión, sin client_secret.
- graph: adaptador Microsoft Graph v1.0 y AppFolder. Acceso OAuth solo al host Graph; descarga preautorizada sin Bearer.
- storage: contrato Store, DemoStore IndexedDB separado y protocolo publish.
- photos: validación, originales, derivadas transparentes y borradores en memoria.
- backup: ZIP completo de la instantánea y fotos referenciadas, hashes SHA-256, restauración validada.

## Flujo de guardado
Formulario en memoria → validar → subir fotos con nombres UUID → publicar nueva revisión inmutable → enumerar cabezas → confirmar o mostrar conflicto. Si falla la red, no se muestra guardado en nube. Formularios siguen abiertos; hay aviso beforeunload mientras un editor/borrador está abierto.
Un fallo posterior a subir fotos puede dejar objetos huérfanos: se conservan para evitar borrar archivos de otra revisión. No hay recolector automático V1.

## Concurrencia
Cada revisión contiene padres y una instantánea completa. Nunca se usa PUT sobre un JSON índice compartido ni ETag como garantía de contenido. Dos hijos simultáneos del mismo padre permanecen como dos cabezas. Antes de guardar se exige que las cabezas observadas correspondan a la base del editor; después se vuelve a leer. Para resolver se publica una nueva revisión con todas las cabezas como padres y el contenido elegido explícitamente. Las ramas históricas no se borran.
La elección es de una versión completa: la V1 actual no fusiona campo por campo. Exportar todas las versiones antes de elegir si se necesita combinar manualmente. La enumeración Graph puede ser eventualmente consistente: dos clientes podrían ver su propia revisión confirmada y descubrir el conflicto en el siguiente refresco. Se garantiza conservación de archivos independientes bajo UUID, no exclusión mutua ni consistencia linealizable. Cada instalación debe verificar el servicio real con su propia cuenta.
No se considera una transacción distribuida entre archivo foto y JSON. Se suben las fotos primero. Lectura incompleta, inválida o con padres ausentes detiene la actualización. Nunca recuperar «vacío» de un error.

## Límites y privacidad
Aplicación online V1; service worker cachea solo shell propio (JS/CSS/HTML/iconos). No cachea Graph, tokens ni fotos. Las fotos de nube y borradores viven en memoria del proceso; demo usa BD IndexedDB distinta. Cerrar sesión Microsoft redirige y desmonta componentes. Las URLs de fotos se revocan al desmontar; los enlaces temporales Graph no se persisten ni se imprimen. Cambiar a OneDrive no migra demo automáticamente.
Carpeta privada significa alcance de permisos de la app: propietario y quienes tengan acceso por OneDrive pueden modificarla. No es cifrado de extremo a extremo. CSP, sin scripts/analítica externos; no se publica contenido privado con Netlify.
Fotos: hasta 20 MiB cada una, JPG/PNG/WebP, 40 MP; hasta 20 por registro. HEIC necesita conversión. Backup integrado 250 MiB de fotos, ZIP de entrada hasta 260 MiB. Historial completo se lee en cada sincronización; coste crece con número de revisiones. Mejoras futuras: índices inmutables/compactación verificada, streaming backup, miniaturas locales, fusión granular, benchmark físico. No incluir mejoras fuera V1 como implementadas.

## PWA y retorno Microsoft
El proyecto usa manifiesto propio y scripts/build-sw.mjs; no depende de vite-plugin-pwa ni Workbox. El script enumera SOLO archivos estáticos compilados, versiona caché por SHA-256 y verifica sintaxis del SW. Excluye redirect.html. Precache JS/CSS/iconos públicos no es edición offline de datos. Actualización queda esperando hasta que el propietario acepta en Ajustes.
MSAL Browser5 se carga dinámicamente y tiene entrada Vite independiente redirect.html, necesaria también para loginRedirect. Inicialización singleton espera completar initialize y handleRedirectPromise aun ante llamadas paralelas. Renovar sesión en formularios con error usa popup sobre la misma cuenta y no pierde el formulario; no acepta cambiar de cuenta a mitad de una edición. Sin privilegios nuevos.
