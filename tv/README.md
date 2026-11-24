# Your One Pace — Samsung TV

Interfaz para control remoto en **Samsung Smart TV (Tizen 6.5+)**. Lee arcos y enlaces en vivo desde la misma `data.js` que la app web.

**Autor original de esta variante:** [Martattack23/onepace-tele](https://github.com/Martattack23/onepace-tele) (Martín). Estado y decisiones técnicas: [BITACORA.md](BITACORA.md).

## Probar sin instalar

En el navegador de la compu (no en la tele):

- Con el repo clonado: desde la **raíz del proyecto**, `python3 -m http.server` y abrí `http://localhost:8000/tv/`
- En el sitio publicado: [your-one-pace tv preview](https://mazalucas.github.io/YourOnePace/tv/) (misma ruta cuando Pages esté actualizado)

Navegá con flechas y Enter. El reproductor nativo (AVPlay) **solo** funciona en la app instalada en la Samsung.

## Instalar en la tele

Guía paso a paso (primera vez ~30 min, actualizaciones ~1 min):

**[docs/TV_INSTALL.md](../docs/TV_INSTALL.md)**

Resumen: Tizen Studio + modo desarrollador en la tele + certificado Samsung, luego:

```bash
./tv/instalar.sh
```

## Archivos

| Archivo | Rol |
|---------|-----|
| `app/index.html`, `tv.js`, `tv.css` | UI y lógica Tizen |
| `app/config.xml` | Manifiesto del widget |
| `instalar.sh` | Asistente de empaquetado, firma e instalación |

Tu IP y perfil de certificado se guardan en `.tv-config` (local, no va a Git).