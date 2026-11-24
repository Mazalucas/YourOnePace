# Bitácora: One Pace en la tele

## Estado (2026-11-14, v0.5.0)

Reproductor propio a pantalla completa (AVPlay), probado en la tele con el control por red y la cámara de Ultron:

1. OK reproduce al toque y retoma donde quedó. Al terminar, "Siguiente capítulo" con 15 s y arranque solo (Martín lo probó: funciona).
2. **Audio:** inglés doblado por defecto cuando existe (26 de 36 arcos); si no, japonés con subtítulos en inglés grabados en el video.
3. **Subtítulos:** desactivados, inglés o español. Con ▼ se llega a la barra Audio · Subtítulos y con ◀ ▶ se elige. Probado en la tele: español sobre el doblaje.
4. One Pace está en el Inicio de tele-inicio (v0.6.2).

## Subtítulos (de dónde salen)

- Repositorio oficial público de One Pace: https://github.com/one-pace/one-pace-public-subtitles. Su README permite usarlos para cualquier cosa y pide crédito al proyecto One Pace.
- La app baja una vez por día la lista de archivos (API de GitHub) y cada .ass de raw.githubusercontent.com. Lee solo el diálogo: deja afuera karaoke y letras de canciones, créditos, carteles y avisos.
- Inglés con doblaje: `en dub` (sigue el guion doblado), si no `en`. Con japonés no se ofrece: ya viene grabado en el video.
- Español: `es-419` primero, si no `es`. Los `dub es` del repo solo traen las canciones, no sirven.
- Con audio japonés, el español se muestra arriba para no pisar el inglés grabado.
- Sincronía comprobada en Romance Dawn 1 contra el inglés grabado del video (1:18 y 1:24, exacto).
- Cobertura: 29 de 36 arcos tienen algún subtítulo. Sin nada: Buggy's Crew, Koby-Meppo, Long Ring Long Land, Post-Enies Lobby, Sabaody, Amazon Lily y Adventures of the Straw Hats (no están en el repo).

## Qué hace

1. Baja `data.js` de la página de Lucas (arcos, descripciones y listas de Pixeldrain); si no hay internet, usa la última copia. La cantidad de episodios sale de la lista de Pixeldrain elegida (guardada 12 h).
2. Inicio: un botón grande "Seguir viendo" con el próximo episodio sin ver y un carrusel de los 36 arcos con su avance.
3. Arco: "Ver episodio N", "Marcar arco completo" y la grilla de episodios de 6 por fila. OK en uno sin ver lo abre; en uno visto, ofrece volver a verlo o desmarcarlo.
4. El foco se mueve por filas y columnas fijas, con borde dorado grueso. Volver: cierra el cuadro, vuelve a los arcos o sale.
5. Siempre subtitulado en inglés en la mejor calidad: 1080p en 20 arcos, 720p o 480p en el resto.
6. El avance se guarda en la tele con el mismo formato que la página de Lucas (`onepace_episode_progress`).

## Decisiones

- **Reproductor nativo (13/11, v0.3.0):** AVPlay pide el archivo de Pixeldrain como descarga directa, igual que su botón Download; no enmarca su página ni falsea cabeceras. Si Pixeldrain lo rechaza, la app cae al navegador.
- **Antes, sin reproductor propio (13/11):** Pixeldrain responde `embed_not_allowed` a los pedidos de video que no vienen de su sitio y solo deja enmarcar su página desde onepace.net (`frame-ancestors https://onepace.net`). Es una decisión de quien sube los archivos. Esquivarla con un proxy o cambiando cabeceras queda descartado.
- **Pantalla propia en vez de la página de Lucas (v0.2.0):** la página está hecha para mouse y con el control no se llegaba a los botones (lo reportó Martín). Se usan solo sus datos en vivo; los cambios de diseño de Lucas no llegan, los de episodios y links sí.
- El avance se guarda dentro de la app de la tele, aparte del de la compu. 

## Pendiente

- Sincronía de subtítulos solo comprobada en Romance Dawn 1: si en algún arco se ven corridos, el repo puede tener una versión más nueva que el video de Pixeldrain.
- Los arcos sin doblaje (10 de 36) salen en japonés con subtítulos: es lo que hay en One Pace.
