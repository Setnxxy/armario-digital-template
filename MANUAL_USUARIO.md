# Manual de usuario
## Empezar
«Explorar con ejemplos» abre un armario de prueba con ilustraciones: no conecta Microsoft ni sube datos. Su etiqueta siempre dice «Modo de prueba». Los guardados son locales a este navegador; no es una copia de tu nube. Conectar OneDrive abre el consentimiento Microsoft y recupera solo datos de tu cuenta/carpeta app. Los ejemplos nunca se migran sin que exportes/restaures un respaldo de forma explícita.
Ajustes permite introducir el Client ID público si falta configuración; sigue CONFIGURACION.md. No escribir contraseñas ni tokens ahí.

## Prendas
Mi armario → Añadir prenda. Nombre, categoría y al menos una foto son obligatorios. Puedes indicar color, marca, talla, etiquetas separadas por coma, notas y favorito. Subir varias JPG/PNG/WebP o Usar cámara si tu dispositivo/navegador lo permite. Convertir HEIC a JPG antes de cargar. Fotos de hasta 20 MiB, 40 MP; máximo 20 por registro. Espera a que aparezcan vistas previas y guarda.
Toca la fotografía/nombre para abrir detalle con todas las fotos y datos; Editar cambia el mismo registro y conserva ID. Eliminar pide confirmación. Si se usa en outfits, explica cuántos y retira esa pieza de las composiciones, conservando outfits y fotos reales.
Busca por nombre, color, marca, talla, etiquetas o notas; filtra categoría, color y etiqueta. Orden por fecha de creación (recientes), nombre o categoría. Alterna cuadrícula/lista. El corazón agrega/quita favorito; Favoritos incluye prendas y outfits.

## Categorías y estilos
Escritorio: Categorías del menú lateral. Móvil: Más → Categorías. Crear nombres desde el formulario, lápiz para renombrar. Al eliminar una categoría con prendas/estilo con outfits, la confirmación indica a cuál categoría/estilo existente se moverán. No se elimina la última categoría ni último estilo. Puedes crear el destino deseado primero.

## Recortes voluntarios
En una foto de prenda, «Añadir recorte» permite elegir un PNG/WebP que ya tenga transparencia. Se muestran **original** y **recorte** por separado. El original se guarda sin reemplazarlo ni recomprimirlo. El recorte se usa para galería y composición; puedes cambiarlo cuantas veces quieras o elegir «Usar original» para quitar la referencia al recorte, preservando original e historial.
No hay motor automático integrado en esta versión: falta validar licencia de modelos, rendimiento y calidad física. Esto no impide registrar prendas. Usa un editor de tu elección para exportar transparente; no es necesario entregar fotos a servicios externos para usar la app.

## Crear y editar outfits
Crear outfit (escritorio) o Mis outfits → Crear outfit (móvil). Escribe nombre, elige estilo y selecciona las prendas de la lista. Cada selección se acomoda automáticamente. Para remover, toca otra vez la prenda en selección.
En el mismo editor arrastra piezas con mouse o dedo. Selecciona una para ajustar Tamaño/Rotación y capas Al frente/Al fondo. El tamaño mantiene proporción de la caja. Las imágenes se ajustan dentro de esa caja, sin deformar original. Flechas mueven en pasos relativos; Shift + flecha mueve más; [ y ] giran; Supr quita pieza. Teclado puede acceder por Tab. Deshacer/Rehacer conserva hasta 60 estados de composición; Distribuir automáticamente vuelve al arreglo automático (también deshacible).
Las coordenadas son porcentajes del lienzo cuadrado: la composición se reproduce en pantallas distintas. No debe interpretarse como recomendaciones IA. Debe haber al menos una prenda al guardar un outfit nuevo/editado; si eliminación de una prenda deja un outfit vacío, puedes agregar otra o conservar sus notas/fotos.
Opcional: notas, favorito y múltiples fotos reales del conjunto puesto. Son distintas de las fotos de prendas y de la composición editable. Guarda. En detalle, Editar conserva ID, permite añadir/quitar prendas y volver a acomodar. Duplicar crea otro outfit editable, deja intacto el original y comparte referencias a fotos inmutables hasta que las cambies. Eliminar no borra las prendas.

## Sincronización y estados
Con OneDrive necesitas internet. «Guardando» no significa guardado; espera «Sincronizado con OneDrive». Sin red o error: formulario permanece abierto, no se anuncia éxito de nube. Reintenta al recuperar conexión. Actualizar (flecha circular) relee OneDrive; volver a pestaña también refresca si no hay formulario/detalle/conflicto abierto. No hay edición offline completa ni copia privada persistente del armario de nube en este navegador. Si no está conectado, no actives datos reales como si fueran demo.
Si alguien edita la carpeta directamente en OneDrive, puede romper datos; la app rechaza historial inválido/incompleto antes de guardar. Restaurar desde copia verificada.

### Conflicto
Un aviso conserva ambas revisiones; si tu propuesta no pudo publicarse se conserva en memoria y se ofrece aparte. Cierra el formulario para revisar el panel. Exporta cada versión antes de elegir si hay cambios que quieres combinar. «Conservar esta versión» publica el contenido COMPLETO de esa opción; otras versiones se conservan en archivos históricos, no se fusionan campo por campo. Después de resolver puedes recuperar los cambios necesarios desde sus respaldos de forma manual. No cierres pestaña con borrador sin respaldar. Si hay una tercera edición durante la decisión, debes volver a consultar opciones; no se fuerza sobrescritura.
Dos guardados exactamente simultáneos pueden parecer confirmados individualmente y mostrar conflicto al siguiente refresco por latencia del listado. Ambos archivos se conservan; no se usa «último guardado gana».

## Preferencias
Ajustes: tema Oscuro/Claro/Automático según sistema. También cuadrícula/lista y orden. Cambian inmediatamente y sobreviven recarga local. «Guardar preferencias» publica tu elección en OneDrive; en otro dispositivo, actualizar para recibirla (si tienes cambios locales pendientes, guárdalos o adopta la elección remota recargando después de haberlos confirmado). Guardar otro registro también publica las preferencias actuales. Si abres versión en conflicto, las preferencias pertenecen a la versión elegida.

## Respaldo/restauración
Ajustes → Exportar respaldo: ZIP con snapshot actual y TODAS sus fotos originales/recortadas/fotos reales, con hashes. Si alguna foto falla no se descarga un backup incompleto como exitoso. Guarda ZIP privado. No incluye historial completo ni fotos sin referencia; para archivo total copia Apps/Armario Digital desde OneDrive. Límite integrado 250 MiB de fotos.
Restaurar ZIP sustituye explícitamente el armario actual por el contenido del respaldo, tras confirmación. Exporta antes de restaurar. Valida formato/referencias/hashes; carga fotos a destino con IDs nuevos; solo después publica JSON. Se puede restaurar un respaldo de nube en modo prueba para verificarlo sin alterar nube. No hay fusión de dos ZIP automática.
Si falla durante subida, podrían quedar fotos sin referencia; no se eliminan datos históricos. Retoma y vuelve a restaurar al recuperar red. No cierres sesión mientras exportas/restauras.

## Instalar y cerrar sesión
Instala según INSTALACION.md; la PWA abre como app en pantalla propia. Actualizaciones pendientes aparecen en Ajustes y requieren aceptar recarga después de guardar formularios. Cerrar sesión Microsoft elimina sesión de la app mediante redirección MSAL; la cuenta puede continuar iniciada en otros servicios Microsoft según su sesión global. Nunca se guarda contraseña aquí.

Si el guardado falla porque expiró Microsoft, el formulario ofrece «Renovar sesión Microsoft». Se abre una ventana para autorizar LA MISMA cuenta y permite volver a guardar sin recargar ni perder lo escrito. Si el navegador bloquea la ventana, permítela para esta app. Cambiar de cuenta requiere cerrar el formulario de forma consciente y abrir otra sesión; nunca se mezclan automáticamente sus datos.
