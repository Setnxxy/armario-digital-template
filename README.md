# Armario Digital · plantilla

Una PWA en español para organizar prendas, conservar sus fotografías y crear outfits. **Cada persona instala su propia copia, registra su propia aplicación Microsoft y utiliza su propio OneDrive personal.**

Esta plantilla viene sin Client ID, dominio de producción, cuenta conectada ni archivos personales. No contiene un servicio central de armarios ni necesita una cuenta del autor.

## Crear tu armario

1. Pulsa **Use this template → Create a new repository**. Crea una copia en tu cuenta; puede ser privada.
2. Crea un sitio en tu cuenta de Netlify desde ese repositorio. Build: `npm run build`; directorio: `dist`; Node: 24. La configuración ya está en `netlify.toml`.
3. Registra tu propia aplicación en Microsoft Entra/Azure, para cuentas personales, con plataforma **SPA**.
4. Añade `https://TU-SITIO.netlify.app/redirect.html` y `https://TU-SITIO.netlify.app/` como URI SPA y el permiso **delegado** `Files.ReadWrite.AppFolder`.
5. En Netlify configura `VITE_MICROSOFT_CLIENT_ID` con tu ID público y `VITE_REDIRECT_URI` con tu URI `/redirect.html`. Vuelve a desplegar.
6. Abre tu sitio, inicia sesión con tu cuenta personal Microsoft y ejecuta el diagnóstico de Ajustes.

**Guía detallada y soluciones de errores: [CONFIGURACION.md](CONFIGURACION.md).** No crees un `client_secret` para esta SPA.

## Probar sin conectar Microsoft

Necesitas Node 24 y npm. Descarga el ZIP de este repositorio o clona tu copia y, desde su carpeta, ejecuta:

```sh
npm ci
npm run dev
```

Abre la dirección que muestra Vite y pulsa **Explorar con ejemplos**. Los ejemplos son ilustraciones sintéticas y se guardan solo en este navegador. No se trasladan automáticamente a OneDrive.

Para conectar Microsoft en desarrollo, copia `.env.example` como `.env`, rellena tus variables y registra también la URI local exacta que estés usando. Reinicia Vite al cambiar variables.

## Funciones

- Prendas con múltiples fotos, categorías editables, búsqueda, filtros y favoritos.
- Original intacto y recorte transparente manual opcional; no incluye motor automático de quitar fondo.
- Outfits mediante distribución automática o lienzo libre con escala, rotación, capas y fotos del conjunto puesto.
- Preferencias de apariencia y vista; respaldo ZIP con fotos e integridad SHA-256.
- OneDrive AppFolder, revisiones independientes y resolución explícita de conflictos.
- Instalación PWA en navegadores compatibles. La edición de datos de nube requiere internet.

## Documentación

- [Configuración Microsoft y Netlify](CONFIGURACION.md)
- [Manual de uso](MANUAL_USUARIO.md) e [instalación PWA](INSTALACION.md)
- [Privacidad](PRIVACIDAD.md) y [seguridad](SECURITY.md)
- [Arquitectura](ARQUITECTURA.md) y [modelo de datos](MODELO_DATOS.md)
- [Validación y límites](docs/VALIDACION.md)
- [Licencias de terceros](docs/LICENCIAS.md)

## Verificar y construir

```sh
npm run check:template
npm run check
npm test
npm run build
```

Pruebas de interfaz opcionales: `npx playwright install chromium` y `npm run test:e2e`. El diagnóstico de OneDrive y las pruebas entre dispositivos debes repetirlos con **tu propia instalación**; un build correcto no los sustituye.

Licencia [MIT](LICENSE). Puedes copiar, modificar y redistribuir la plantilla conservando los avisos de licencia. No incluye alojamiento, almacenamiento ni soporte garantizado; revisa los límites y condiciones de tus proveedores antes de contratar o activar planes de pago.
