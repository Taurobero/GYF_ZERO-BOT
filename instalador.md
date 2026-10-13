# Instalador de TAUROBERO BOT en Termux

Guía para obtener el proyecto desde GitHub, instalar dependencias y enlazar WhatsApp en Termux (incluido Huawei P40 Lite con EMUI 12).

## 1. Instalar Termux

Instala Termux desde una fuente oficial y mantenlo actualizado. Evita mezclar Termux de distintas fuentes, porque sus complementos deben proceder de la misma fuente. Abre Termux y ejecuta:

```sh
pkg update
pkg upgrade
```

Si el gestor pregunta si debe continuar, confirma la actualización.

## 2. Instalar las herramientas necesarias

El proyecto requiere Node.js 20 o superior. Git permite clonar el repositorio y es necesario para resolver una dependencia de Baileys; FFmpeg se utiliza para crear stickers.

```sh
pkg install git nodejs-lts ffmpeg nano
```

Comprueba las versiones y que FFmpeg esté disponible:

```sh
node --version
npm --version
git --version
ffmpeg -version
```

`node --version` debe indicar `v20` o superior. Si Termux no ofrece `nodejs-lts` en tu dispositivo, consulta los paquetes disponibles con `pkg search nodejs` e instala una versión compatible, nunca una anterior a Node 20.

## 3. Descargar el bot desde GitHub

Cambia `USUARIO` por la cuenta u organización propietaria y `REPOSITORIO` por el nombre exacto del repositorio. El siguiente ejemplo supone que la carpeta clonada se llamará `TAUROBERO-BOT`; si tu repositorio tiene otro nombre, entra en la carpeta que `git clone` haya creado.

```sh
cd ~
git clone https://github.com/Taurobero/GYF_ZERO-BOT
cd GYF_ZERO-BOT
```

Para un repositorio privado, configura el acceso a GitHub de forma segura en Termux antes de clonar. No pongas contraseñas, tokens o claves dentro de la URL ni los compartas en el chat.

Comprueba que descargaste el proyecto correcto:

```sh
ls -la
```

Deben aparecer `package.json`, `.env.example`, `src/`, `test/` e `instalador.md`.

## 4. Instalar paquetes de Node.js

Desde la carpeta del proyecto:

```sh
npm install
```

npm leerá `package.json` e instalará Baileys y las demás dependencias. No uses `sudo` en Termux. Si la instalación falla, revisa primero `node --version`, `git --version` y tu conexión a internet.

## 5. Crear la configuración privada

Crea tu archivo local de configuración a partir de la plantilla:

```sh
cp .env.example .env
nano .env
```

En `.env`, define al menos lo siguiente:

```dotenv
BOT_PREFIX=!
BOT_OWNERS=CODIGO_PAIS_Y_NUMERO
AUTH_DIR=./data/auth
DATA_FILE=./data/state.json
LOG_LEVEL=info
ANTISPAM_ENABLED=true
```

En `BOT_OWNERS`, escribe el número autorizado del propietario con código de país, solo dígitos, sin `+`, espacios ni guiones. Para autorizar varios propietarios, sepáralos con comas. Ejemplo de formato ficticio: `BOT_OWNERS=5215550000000`.

Guarda en nano con `Ctrl+O`, confirma con `Enter` y sal con `Ctrl+X`. Las claves de IA y los proveedores de descarga son opcionales; déjalos vacíos si no los tienes. Solo configura servicios de confianza y endpoints HTTPS.

`.env` y `data/` están ignorados por Git. No los subas a GitHub: `data/auth` contiene credenciales de sesión que permiten acceder a la cuenta vinculada.

## 6. Ejecutar las pruebas

Antes de iniciar el bot:

```sh
npm test
```

Las pruebas son locales y no enlazan WhatsApp. Si alguna falla, no continúes como si la instalación hubiese terminado correctamente; revisa el error y las versiones instaladas.

## 7. Iniciar y vincular WhatsApp

Inicia el bot desde la raíz del proyecto:

```sh
npm start
```

En la primera ejecución aparecerá un QR en la terminal. En WhatsApp del teléfono, abre **Ajustes > Dispositivos vinculados > Vincular un dispositivo** y escanea ese QR. Mantén Termux abierto hasta que el bot indique que se conectó.

La sesión se guarda en `data/auth`. En siguientes inicios se reutiliza y no debería solicitar otro QR. No compartas esa carpeta ni copies su contenido en repositorios, capturas o chats. Si revocas el dispositivo desde WhatsApp, detén el bot y vuelve a vincularlo siguiendo este paso.

Para detener el bot, pulsa `Ctrl+C` en Termux. Para iniciarlo de nuevo, vuelve a la carpeta del proyecto y ejecuta `npm start`.

## 8. Mantenerlo activo en EMUI 12

La conexión requiere que Android no suspenda Termux. En el Huawei, permite a Termux ejecutarse en segundo plano y exclúyelo de la optimización/ahorro de batería desde los ajustes de batería de EMUI. Los nombres de los menús pueden variar según la versión.

Mantén el teléfono conectado a una red estable. Un reinicio, cierre forzado de Termux, pérdida de red o restricciones de EMUI pueden interrumpir el bot; no se garantiza ejecución continua tras cerrar la aplicación. Un bloqueo de suspensión de CPU puede gastar batería, así que úsalo solo mientras necesites mantener la sesión activa.

## 9. Comandos básicos

En el chat privado con el bot, prueba:

```text
!ayuda
!ping
!estado
```

Los comandos premium (`!premium`, `!estado`, `!antispam on|off`, `!mantenimiento on|off`, `!limpiarspam` y `!respaldo`) se restringen a los números configurados en `BOT_OWNERS`. Para stickers, responde a una imagen con `!sticker`; para un video/GIF con `!stickeranim`.

## 10. Actualizar el bot desde GitHub

Detén primero el proceso con `Ctrl+C`. Luego, desde la carpeta clonada:

```sh
cd ~/REPOSITORIO
git pull
npm install
npm test
npm start
```

Cambia `REPOSITORIO` por el nombre real de tu carpeta. `git pull` actualiza el código, mientras `.env` y `data/` permanecen locales porque están excluidos de Git. No borres `data/auth` si quieres conservar el vínculo.

## Solución de problemas

- **`node: command not found`:** instala Node con `pkg install nodejs-lts` y reinicia Termux.
- **Node anterior a 20:** actualiza el paquete de Node; Baileys requiere Node 20 o posterior.
- **`git: command not found` durante `npm install`:** instala Git con `pkg install git` y repite `npm install`.
- **No aparece el QR:** comprueba que `.env` existe, que `BOT_OWNERS` no tiene errores y que el proceso no muestra un error previo.
- **El bot solicita QR cada vez:** no borres `data/auth`; comprueba que Termux puede escribir en la carpeta `data/`.
- **No funciona `!sticker` o `!stickeranim`:** instala FFmpeg con `pkg install ffmpeg` y reinicia el comando.
- **Se desconecta al apagar la pantalla:** revisa las restricciones de batería y actividad en segundo plano de EMUI.
- **No puede instalar dependencias:** verifica red, espacio libre, versión de Node y que Git esté instalado; conserva el texto completo del error para diagnosticarlo.

TAUROBERO BOT utiliza Baileys, un cliente no oficial de WhatsApp. Úsalo con autorización, de forma responsable y sin spam ni mensajería masiva.
