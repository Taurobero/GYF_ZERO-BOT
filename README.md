# TAUROBERO BOT

Bot modular de WhatsApp para Node.js ESM, pensado para ejecutarse en Termux. Usa Baileys como cliente multidispositivo no oficial. No está afiliado a WhatsApp; úsalo solo con autorización y de acuerdo con sus condiciones. No envía campañas, mensajes masivos ni mensajes a chats no solicitados.

## Compatibilidad comprobada

- Node.js `>=20.0.0`, requisito declarado por Baileys. Se recomienda instalar la versión LTS disponible para Termux (`nodejs-lts`).
- Baileys fijado a `6.7.24`, release estable publicado en npm al preparar este proyecto. npm también ofrece `7.0.0-rc14`, pero es una candidata con cambios incompatibles; no se usa como versión de producción.
- API usada: export ESM por defecto `makeWASocket`, `DisconnectReason`, `useMultiFileAuthState`, eventos `connection.update`, `creds.update`, `messages.upsert`, `group-participants.update`, métodos `groupMetadata`, `groupParticipantsUpdate` y `sendMessage`.
- Para stickers se requiere FFmpeg de Termux. No se instalan módulos nativos de conversión en npm.
- Huawei P40 Lite/EMUI 12 no se puede certificar físicamente desde este entorno. Termux y WhatsApp deben poder usar la red en segundo plano; EMUI puede detener procesos por ahorro de batería. La conexión depende también de cambios que WhatsApp puede hacer en su protocolo no oficial.

Fuentes verificadas: [repositorio Baileys](https://github.com/WhiskeySockets/Baileys), [instalación](https://baileys.wiki/installation), [inicio rápido](https://baileys.wiki/quickstart), [eventos](https://baileys.wiki/concepts/events), [configuración del socket](https://baileys.wiki/concepts/socket-config) y [grupos](https://baileys.wiki/features/groups).

## Instalación en Termux

```sh
pkg update
pkg upgrade
pkg install nodejs-lts ffmpeg git
node --version
npm --version
```

Confirma que `node --version` muestre Node 20 o superior. En la carpeta del proyecto:

```sh
npm install
cp .env.example .env
nano .env
npm test
npm start
```

Abre WhatsApp en el teléfono, entra en **Dispositivos vinculados** y escanea el QR del terminal. Después de enlazarlo, las credenciales se guardan en `data/auth`; no compartas, subas ni borres esa carpeta mientras quieras conservar la sesión. Para protegerla, mantén el almacenamiento privado de Termux y no concedas acceso innecesario a otras aplicaciones. Si WhatsApp revoca la sesión, elimina `data/auth` y enlaza de nuevo.

En EMUI, permite actividad en segundo plano y excluye Termux del ahorro de batería si el sistema suspende la conexión. `termux-wake-lock` puede ayudar mientras la sesión esté activa, a costa de batería. No hay garantía de mantener una conexión WebSocket tras forzar el cierre de Termux o reiniciar el dispositivo.

## Configuración

Edita `.env`. `BOT_OWNERS` recibe números con código de país separados por coma, sin `+`. Las claves de IA/descargas son opcionales. El archivo `.env` y `data/` están excluidos de Git.

La IA espera un endpoint HTTPS compatible con OpenAI Chat Completions, por ejemplo la URL completa terminada en `/v1/chat/completions`; define URL, token y modelo.

El adaptador de descargas no incorpora ni recomienda un servicio específico. Configura un endpoint HTTPS de confianza que acepte `GET` con el parámetro `q` y devuelva JSON `{"url":"https://host-permitido/archivo","title":"Nombre"}`. Declara el host final en `DOWNLOAD_ALLOWED_HOSTS` (se permiten subdominios). Las redirecciones se rechazan y el archivo está limitado a 20 MiB. Este control de allowlist no sustituye la evaluación de seguridad/privacidad del proveedor.

## Comandos

El prefijo predeterminado es `!` y se cambia con `BOT_PREFIX`.

| Comando | Función |
| --- | --- |
| `!ayuda` | Lista de comandos |
| `!ping`, `!hora`, `!calc 2*(3+4)` | Utilidades |
| `!rps piedra\|papel\|tijera` | Juego individual |
| `!ia pregunta` | IA opcional configurada |
| `!descargar búsqueda` | Proveedor opcional configurado |
| Responder a una imagen con `!sticker` | Sticker WebP estático |
| Responder a video/GIF con `!stickeranim` | Sticker WebP animado, máximo 10 s |
| `!bienvenida on\|off` | Bienvenida de grupo; requiere admin |
| `!expulsar @persona`, `!promover @persona`, `!degradar @persona` | Moderación; requiere que emisor y bot sean admins |

Las operaciones administrativas se rechazan en privado y si falta cualquiera de los permisos. El antispam limita mensajes por remitente y chat; no expulsa ni silencia automáticamente. No mantiene historial de conversaciones en memoria.

### Panel premium del propietario

Añade el JID/número autorizado a `BOT_OWNERS` en `.env`. Solo esos remitentes pueden ejecutar estos comandos; no basta con que sean administradores de un grupo:

| Comando | Función |
| --- | --- |
| `!premium` | Panel privado de herramientas del propietario |
| `!estado` | Node.js, RAM/heap, tiempo activo, integraciones y preferencias guardadas |
| `!antispam on\|off` | Cambia y persiste el antispam |
| `!mantenimiento on\|off` | Pausa comandos de usuarios; el propietario conserva acceso para desactivarlo |
| `!limpiarspam` | Limpia contadores antispam temporales |
| `!respaldo` | Envía por privado preferencias JSON, con máximo de 256 KiB y sin credenciales/sesión |

El estado de mantenimiento y antispam persiste en `data/state.json`. El respaldo no incluye la carpeta `data/auth`, claves API ni variables de entorno. No existe un comando de difusión masiva.

## Desarrollo

```sh
npm test
npm start
```

Las pruebas cubren parser, permisos, router, antispam, calculadora y persistencia local; no inician sesión en WhatsApp ni verifican proveedores remotos. Revisa cambios de versión de Baileys antes de actualizar: la v7 contiene breaking changes. Para producción con uso intensivo, sustituye `useMultiFileAuthState` por un almacén cifrado/transaccional propio, como recomienda la documentación de Baileys.