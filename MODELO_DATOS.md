# Modelo de datos v1
Validación ejecutable: src/domain.ts. JSON UTF-8, fechas ISO 8601 UTC, UI localizada es-MX.

| Entidad | Campos |
|---|---|
| Data | schemaVersion=1, categories[], classifications[], garments[], outfits[], preferences |
| Taxonomía | id estable, name no vacío |
| Garment | id, name obligatorio, categoryId válido, photos[1..20], color, brand, size, tags[], notes, favorite, createdAt, updatedAt |
| Photo | id, original (clave/ID archivo), processed opcional (archivo separado), name, mime, width, height |
| Outfit | id, name obligatorio, classificationId, pieces[], photos[] reales, notes, favorite, createdAt, updatedAt |
| Piece | garmentId, x/y centro 0..1, w/h fracción lienzo .05..1, rotation en grados, z orden de capa |
| Preferences | theme dark/light/auto; view grid/list; sort date/name/category |
| Revision | id UUID, parents[] UUID, createdAt, device seudónimo aleatorio de sesión, data instantánea completa |

Identidad de prenda/outfit no cambia al editar. Duplicar outfit crea ID y fechas nuevas; conserva composición y referencias de fotos (inmutables). Las fotos subidas originales nunca se sustituyen: se guarda una nueva clave. Cambiar/quitar derivada solo cambia referencia en nueva revisión. Quitar foto o eliminar registro no borra bytes históricos.
Eliminar prenda usada: confirmación informa outfits afectados, se retiran sus pieces y se actualiza updatedAt de esos outfits. Permite conservar outfit vacío para no perder nombre/notas/fotos. No permite guardar outfit nuevo vacío. Eliminar categoría/estilo: si tiene registros, confirmación indica destino concreto y todos se reasignan antes de eliminar. Debe quedar ≥1 categoría/estilo.

## Árbol dentro de /me/drive/special/approot
```
datos/revisiones/<UUID>.json
prendas/originales/<UUID>.jpg|png|webp
prendas/procesadas/<UUID>.png|webp
outfits/fotos/<UUID>.jpg|png|webp
respaldos/restauradas/<UUID>.jpg|png|webp
diagnostico/<UUID>/... (pruebas aisladas)
```
Se valida la estructura lógica propuesta: composición, categorías, referencias y preferencias están EN la instantánea, evitando archivos compartidos adicionales y escrituras parciales. ZIP de respaldo se descarga al equipo del propietario; no se sube automáticamente. Carpetas creadas bajo demanda, con recuperación de carrera de creación 409.
Claves Graph son driveItem IDs; claves demo son UUID en IndexedDB; claves draft:UUID son temporales en memoria. No intercambiar claves de modos. Restauración carga bytes nuevos al Store de destino y remapea todas las referencias; comprueba SHA-256 y referencias antes de publicar.
