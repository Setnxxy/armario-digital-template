# Validación por instalación

Los tests del repositorio usan datos sintéticos y transporte simulado; no contienen credenciales. Debes repetir las comprobaciones de servicio con tu propio registro y OneDrive. Ningún resultado de una cuenta anterior se transfiere a tu instalación.

## Código

```sh
npm ci
npm run check:template
npm run check
npm test
npm run build
```

`check:template` exige variables de ejemplo vacías y que no se empaqueten archivos de entorno o datos de ejecución. No equivale a una auditoría completa de secretos. Revisa los archivos y el historial antes de publicar tu copia.

E2E opcional: `npx playwright install chromium` y `npm run test:e2e`. Para el smoke de producción local: `npm run test:production`, con Chromium disponible. No marques una prueba como aprobada si no se ejecutó o falló por falta del navegador.

## Cuenta y archivos reales

1. Inicia sesión y ejecuta el diagnóstico de Ajustes: JSON (crear, leer, actualizar, releer), PNG (subir, leer), PATCH con ETag obsoleto rechazado con 412 y dos ramas simultáneas preservadas. Se conservan archivos sintéticos aislados en `diagnostico/`.
2. Crea una prenda con foto de prueba; recarga y comprueba el original. Añade un recorte manual sin sustituir el original.
3. Crea y edita outfits en ambos modos; recupera composición, fotos, capas y rotación tras recargar.
4. Exporta ZIP y verifica restauración en modo demo antes de restaurar datos de nube.
5. Usa dos navegadores/dispositivos independientes con la misma URL/cuenta. Abre un editor en B, guarda un cambio en A y luego guarda el de B. Comprueba aviso de conflicto y propuesta recuperable. Exporta versiones antes de elegir una.
6. Ensaya dos guardados simultáneos, refresca y comprueba las dos ramas y resolución explícita. Un diagnóstico de dos clientes lógicos no sustituye esta prueba física.
7. Comprueba pérdida de red, sesión caducada y recuperación sin anunciar un guardado falso.
8. Prueba instalación, cámara, controles táctiles y teclado en los dispositivos que usarás.

Registra fecha, versión/build y resultado sin correos, fotos privadas, tokens ni URLs firmadas. El diagnóstico no prueba CAS de `PUT /content`; el protocolo preserva revisiones independientes. El listado de Graph puede presentar latencia.

## Límites conocidos

- Online para editar OneDrive; demo local independiente.
- Recorte manual disponible; eliminación automática de fondo no integrada.
- Fotos JPG/PNG/WebP: hasta 20 MiB, 40 MP, 20 por registro; convierte HEIC antes.
- Respaldo integrado: 250 MiB de fotos. El historial completo y fotos huérfanas no están incluidos.
- Historial de revisiones crece; no hay compactación ni limpieza automática.
- Resolver conflicto elige una versión completa; no fusiona campos automáticamente.
- Las condiciones y cuotas de Microsoft y Netlify pueden cambiar; revisa tus planes.
