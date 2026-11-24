---
id: DOC-GUIDE-015
title: Instalar Your One Pace en Samsung TV
type: guide
status: canonical
owner: your-one-pace
created: 2026-11-24
updated: 2026-11-24
tags:
  - your-one-pace
  - tizen
  - samsung-tv
summary: Guía paso a paso para instalar la app de tele en Samsung Tizen.
related:
  - DOC-GUIDE-013
priority: high
source_of_truth: true
---

# Instalar Your One Pace en Samsung TV

## Antes de empezar

**Solo Samsung Smart TV con Tizen** (en la práctica, modelos ~2021 en adelante, Tizen 6.5+).  
No sirve en LG webOS, Android TV ni Amazon Fire TV.

**Necesitás**

- Una compu (Mac o Windows) y la tele en el **mismo Wi‑Fi**
- Cuenta Samsung (gratis)
- Unos **30 minutos la primera vez**; después, actualizar tarda ~1 minuto

**Elegí tu camino**

| Quiero… | Hacé esto |
|--------|-----------|
| Ver la interfaz sin instalar | Abrí en la compu: [Preview TV](https://mazalucas.github.io/YourOnePace/tv/) — flechas + Enter. El video completo **no** anda en el navegador. |
| Ver y reproducir en la tele | Seguí la lista de abajo hasta el paso 6. |

**Lista de pasos** (tildá cuando termines cada uno)

- [ ] Paso 1 — Tizen Studio instalado
- [ ] Paso 2 — Modo desarrollador en la tele
- [ ] Paso 3 — IP de la tele anotada
- [ ] Paso 4 — Certificado Samsung creado
- [ ] Paso 5 — Corriste `tv/instalar.sh`
- [ ] Paso 6 — Abrís **One Pace** en la tele

---

## Paso 1 — Instalar Tizen Studio

1. Descargá **Tizen Studio** desde:  
   https://developer.tizen.org/development/tizen-studio/download  
2. Instalá el programa con el instalador por defecto.
3. Abrí **Tizen Studio** → menú **Tools** → **Package Manager**.
4. En **Main SDK**, instalá **TV Extensions**.
5. En **Extension SDK**, instalá **Samsung Certificate Extension**.
6. Cerrá el Package Manager cuando termine.

**Listo si…** ves **TV Extensions** instalado en Package Manager y el ícono de **Certificate Manager** en Tizen Studio.

---

## Paso 2 — Activar modo desarrollador en la tele

1. En el **control remoto** de la tele, apretá el botón **Apps** (o **Home** → Apps).
2. Escribí en el control: **1 → 2 → 3 → 4 → 5** (rápido, en orden).
3. Aparece un menú de desarrollador. Poné **Developer mode** en **On**.
4. Donde pide **Host PC IP**, poné la IP de tu compu en la misma red Wi‑Fi.  
   - En Mac: **Ajustes del Sistema → Red → Wi‑Fi → Detalles → Dirección IP**  
   - En Windows: `ipconfig` en CMD y buscá **IPv4**
5. Apagá y volvé a encender la tele (o reiniciá desde ese menú).

**Listo si…** al repetir **1-2-3-4-5** en Apps, **Developer mode** sigue en **On**.

---

## Paso 3 — Anotar la IP de la tele

1. En la tele: **Ajustes** (engranaje).
2. **General y privacidad** → **Red** (o **Red** → **Estado de la red**).
3. Elegí la conexión Wi‑Fi activa.
4. Anotá la **dirección IP** (ejemplo: `192.168.1.35`).

**Listo si…** tenés un número de cuatro bloques tipo `192.168.x.x` en un papel o el celular.

---

## Paso 4 — Crear certificado Samsung

Es el paso más largo. Hacé cada sub-paso en orden.

### 4.1 Abrir Certificate Manager

En Tizen Studio: **Tools** → **Certificate Manager**.

### 4.2 Crear un perfil de autor

1. Clic en **+** (nuevo certificado).
2. Elegí **Samsung**.
3. Elegí **Create a new certificate profile**.
4. **Profile name:** un nombre corto que vas a repetir después, por ejemplo `YOP-TV`.
5. Siguiente.

### 4.3 Iniciar sesión Samsung

1. Te pide cuenta Samsung — usá la misma de la tele si podés.
2. Completá lo que pida el asistente hasta tener un **Author certificate**.

### 4.4 Agregar la tele (DUID)

1. En el mismo perfil, agregá **Distributor certificate** para TV.
2. Cuando pida el **DUID** de la tele: en la tele, en el menú desarrollador (paso 2), suele mostrarse el **DUID**; copialo tal cual.
3. Terminá el asistente.

**Listo si…** en Certificate Manager ves tu perfil (ej. `YOP-TV`) con estado válido y la tele listada.

> Guardá el **nombre del perfil** — lo vas a escribir en el paso 5 (`YOP-TV`, no un archivo .p12).

---

## Paso 5 — Correr el asistente de instalación

Desde la **raíz del repo** (donde está `package.json`):

```bash
./tv/instalar.sh
```

1. Si falta Tizen Studio, Node o `zip`, el script te dice qué falta y volvés al paso indicado.
2. Cuando pregunte **IP de la tele**, pegá la del paso 3 (o Enter si ya guardó la última).
3. Cuando pregunte **perfil de certificado**, escribí el nombre del paso 4 (ej. `YOP-TV`).

**Listo si…** ves `Listo` y `Instalado` o `Abierta en la tele` en la terminal.

**Atajo** si ya conocés los datos:

```bash
TIZEN_PROFILE=YOP-TV ./tv/instalar.sh 192.168.1.35
```

---

## Paso 6 — Usar la app

1. En la tele: **Apps** → **One Pace**.
2. La primera vez puede tardar unos segundos cargando arcos desde internet.
3. **OK** = elegir · **flechas** = moverse · **Volver** = atrás / salir.

**Actualizar** la app después de un cambio en el repo: repetí **solo el paso 5** (`./tv/instalar.sh`).

**Progreso:** se guarda en la tele con la misma clave que la web (`onepace_episode_progress`), pero **no** se sincroniza con la compu. Para llevar el avance entre dispositivos, usá **Backup** / **Restore** en la app web.

---

## Si ves esto → hacé esto

| Mensaje del asistente | Qué hacer |
|----------------------|-----------|
| No encontré Tizen Studio | Paso 1 — instalá TV Extensions y Samsung Certificate Extension |
| La tele no responde | Paso 2 y 3 — modo desarrollador On, misma Wi‑Fi, IP correcta |
| La firma falló | Paso 4 — perfil mal escrito o certificado sin la tele (DUID) |
| La instalación en la tele falló | Reiniciá la tele; repetí paso 5; revisá que Developer mode siga On |
| IP inválida | Paso 3 — solo números `192.168.x.x`, sin espacios |

---

## Por qué no hay un solo clic

Samsung no permite instalar apps de terceros en la tele sin **firmar** el paquete con un certificado ligado a **esa** tele. Por eso hace falta Tizen Studio y el modo desarrollador. No es una limitación de Your One Pace: es la política de Samsung para apps fuera de su tienda.