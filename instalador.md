# Instalador de TAUROBERO BOT en Termux

Guía para obtener el proyecto desde GitHub, instalar dependencias y enlazar WhatsApp en Termux (incluido Huawei P40 Lite con EMUI 12).

> Antes de empezar, publica el proyecto en tu cuenta de GitHub y sustituye `USUARIO` y `REPOSITORIO` en el comando de clonación por los datos reales. No publiques `.env`, `data/` ni credenciales de WhatsApp.

## 1. Instalar Termux

Instala Termux desde una fuente oficial y mantenlo actualizado. Evita mezclar Termux de distintas fuentes, porque sus complementos deben proceder de la misma fuente. Abre Termux y ejecuta:

```sh
pkg update
pkg upgrade
```

Si el gestor pregunta si debe continuar, confirma la actualización.

## 2. Clonar el bot desde GitHub

Después de publicar el repositorio, sustituye `USUARIO` y `REPOSITORIO` por los valores reales. Instala Git y clona el proyecto:

```sh
pkg install git
cd ~
git clone https://github.com/USUARIO/REPOSITORIO.git
cd REPOSITORIO
```

No incluyas contraseñas, tokens ni claves en la URL de GitHub.

## 3. Instalar, configurar y arrancar

Desde la carpeta clonada, ejecuta el instalador guiado:

```sh
sh instalar-termux.sh
```

El script instala Node.js LTS, Git, FFmpeg y nano; comprueba que Node sea 20 o superior; solicita el número del owner en el propio teléfono; genera `.env` con permisos privados; instala dependencias; ejecuta las pruebas y, si pasan, inicia el bot para mostrar el QR. Introduce el número con código de país. Puedes escribir `+`, espacios o guiones; se guardarán solo los dígitos.

En WhatsApp, abre **Ajustes > Dispositivos vinculados > Vincular un dispositivo** y escanea el QR. No cierres Termux hasta que el bot indique que conectó.

El número del owner y la sesión no se guardan en el repositorio. `.env` y `data/` están ignorados por Git; no los publiques. `data/auth` contiene credenciales de sesión sensibles.

## 4. Instalación manual (alternativa)

```sh
pkg update
pkg install git nodejs-lts ffmpeg nano
node --version
npm --version
npm install
cp .env.example .env
nano .env
npm test
npm start
```

En `.env`, `BOT_OWNERS` debe contener el número del owner con código de país, solo dígitos. Las claves de IA y las descargas son opcionales.

La sesión se guarda en `data/auth`. En siguientes inicios se reutiliza y no debería solicitar otro QR. No compartas esa carpeta ni copies su contenido en repositorios, capturas o chats. Si revocas el dispositivo desde WhatsApp, detén el bot y vuelve a vincularlo siguiendo este paso.

Para detener el bot, pulsa `Ctrl+C` en Termux. Para iniciarlo de nuevo, vuelve a la carpeta del proyecto y ejecuta `npm start`.

## 5. Mantenerlo activo en EMUI 12

La conexión requiere que Android no suspenda Termux. En el Huawei, permite a Termux ejecutarse en segundo plano y exclúyelo de la optimización/ahorro de batería desde los ajustes de batería de EMUI. Los nombres de los menús pueden variar según la versión.

Mantén el teléfono conectado a una red estable. Un reinicio, cierre forzado de Termux, pérdida de red o restricciones de EMUI pueden interrumpir el bot; no se garantiza ejecución continua tras cerrar la aplicación. Un bloqueo de suspensión de CPU puede gastar batería, así que úsalo solo mientras necesites mantener la sesión activa.

## 6. Comandos básicos

En el chat privado con el bot, prueba:

```text
!ayuda
!ping
!estado
```

Los comandos premium (`!premium`, `!estado`, `!antispam on|off`, `!mantenimiento on|off`, `!limpiarspam` y `!respaldo`) se restringen a los números configurados en `BOT_OWNERS`. Para stickers, responde a una imagen con `!sticker`; para un video/GIF con `!stickeranim`.

## 7. Actualizar el bot desde GitHub

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
- **El script dice que no está en Termux:** ejecútalo desde Termux, no desde PowerShell ni desde Windows.
- **El instalador pregunta el owner:** introduce el número con código de país; queda guardado localmente en `.env`, no en GitHub.
- **`git: command not found` durante `npm install`:** instala Git con `pkg install git` y repite `npm install`.
- **No aparece el QR:** comprueba que `.env` existe, que `BOT_OWNERS` no tiene errores y que el proceso no muestra un error previo.
- **El bot solicita QR cada vez:** no borres `data/auth`; comprueba que Termux puede escribir en la carpeta `data/`.
- **No funciona `!sticker` o `!stickeranim`:** instala FFmpeg con `pkg install ffmpeg` y reinicia el comando.
- **Se desconecta al apagar la pantalla:** revisa las restricciones de batería y actividad en segundo plano de EMUI.
- **No puede instalar dependencias:** verifica red, espacio libre, versión de Node y que Git esté instalado; conserva el texto completo del error para diagnosticarlo.

TAUROBERO BOT utiliza Baileys, un cliente no oficial de WhatsApp. Úsalo con autorización, de forma responsable y sin spam ni mensajería masiva.
