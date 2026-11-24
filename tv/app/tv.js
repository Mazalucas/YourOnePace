/*
 * One Pace en la tele.
 * Pantalla propia para el control remoto, armada con los datos que publica Lucas en
 * https://mazalucas.github.io/YourOnePace/ (data.js: arcos, descripciones y listas de Pixeldrain).
 * Cada episodio se abre en el navegador de la tele, directo en Pixeldrain, subtitulado en
 * inglés y en la mejor calidad disponible.
 *
 * Por qué no se reproduce adentro: Pixeldrain rechaza los videos de One Pace fuera de
 * onepace.net ("embed_not_allowed" y frame-ancestors https://onepace.net). Es una decisión
 * de quien sube los archivos y no se esquiva.
 */
(function () {
  'use strict';

  var SITE = 'https://mazalucas.github.io/YourOnePace/';
  var PD = 'https://pixeldrain.net';
  var SUBS = 'English Subtitles — Pixeldrain';
  var DUB = 'English Dub — Pixeldrain';
  var BROWSER_APP = 'org.tizen.browser';
  var LIST_TTL = 12 * 3600 * 1000;
  var PROGRESS_KEY = 'onepace_episode_progress'; // mismo formato que la página de Lucas
  var K = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, ESC: 27, BACK: 10009 };

  var $ = function (id) { return document.getElementById(id); };

  // ---------- guardado ----------

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
    } catch (e) { return null; }
  }
  function loadJSON(key, def) {
    try { var v = JSON.parse(store(key) || 'null'); return v == null ? def : v; } catch (e) { return def; }
  }

  var progress = loadJSON(PROGRESS_KEY, {});
  function saveProgress() { store(PROGRESS_KEY, JSON.stringify(progress)); }
  function isWatched(arc, ep) { return (progress[arc.name] || []).indexOf(ep) !== -1; }
  function setWatched(arc, ep, yes) {
    var list = (progress[arc.name] || []).filter(function (n) { return n !== ep; });
    if (yes) list.push(ep);
    list.sort(function (a, b) { return a - b; });
    progress[arc.name] = list;
    saveProgress();
  }
  function watchedCount(arc) {
    if (!arc.count) return (progress[arc.name] || []).length;
    return (progress[arc.name] || []).filter(function (n) { return n >= 1 && n <= arc.count; }).length;
  }
  function arcDone(arc) { return arc.count > 0 && watchedCount(arc) >= arc.count; }

  // ---------- avisos ----------

  var toastTimer;
  function toast(msg, ms) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 4000);
  }

  // ---------- datos de Lucas ----------

  var arcs = [];

  function qualityOf(type) { var m = /\((\d{3,4})p\)/.exec(type || ''); return m ? parseInt(m[1], 10) : 0; }
  function familyOf(type) { return String(type || '').replace(/\s*\(\d{3,4}p\)\s*$/, '').trim(); }
  function listIdOf(url) { var m = /pixeldrain\.net\/l\/([A-Za-z0-9]+)/i.exec(url || ''); return m ? m[1] : null; }

  function bestOf(pd, family) {
    return pd.filter(function (l) { return familyOf(l.type) === family; })
      .sort(function (a, b) { return qualityOf(b.type) - qualityOf(a.type); })[0] || null;
  }
  function bestLink(links) {
    var pd = (links || []).filter(function (l) { return listIdOf(l.url); });
    return bestOf(pd, SUBS) || pd.sort(function (a, b) { return qualityOf(b.type) - qualityOf(a.type); })[0] || null;
  }
  function bestDub(links) {
    return bestOf((links || []).filter(function (l) { return listIdOf(l.url); }), DUB);
  }

  async function loadData() {
    var txt = null;
    try {
      var r = await fetch(SITE + 'data.js?tv=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      txt = await r.text();
      store('tv_data_js', txt);
    } catch (e) {
      txt = store('tv_data_js');
    }
    if (!txt) throw new Error('sin datos');
    var data = new Function('window', txt + '\n;return window.EPISODE_DATA;')({});
    arcs = Object.keys(data).map(function (name, i) {
      var link = bestLink(data[name].links), dub = bestDub(data[name].links);
      return {
        dubId: dub ? listIdOf(dub.url) : null,
        dubQuality: dub ? qualityOf(dub.type) : 0,
        no: i + 1, name: name, description: data[name].description || '',
        listId: link ? listIdOf(link.url) : null,
        quality: link ? qualityOf(link.type) : 0,
        subs: link ? familyOf(link.type) === SUBS : false,
        count: 0, files: null
      };
    });
  }

  // Cantidad y nombres de episodios: de la lista de Pixeldrain elegida (guardada 12 h).
  var listCache = loadJSON('tv_lists2', {});
  function applyList(arc, entry) { arc.files = entry.f; arc.count = entry.f.length; }
  async function getEntry(listId) {
    var c = listCache[listId];
    if (c && Date.now() - c.t < LIST_TTL) return c;
    try {
      var r = await fetch(PD + '/api/list/' + encodeURIComponent(listId));
      var j = await r.json();
      if (!r.ok || !j.success) throw new Error('lista');
      var entry = { t: Date.now(), f: j.files.map(function (f) { return { n: f.name, id: f.id }; }) };
      listCache[listId] = entry;
      store('tv_lists2', JSON.stringify(listCache));
      return entry;
    } catch (e) {
      return c || null; // vieja, pero sirve
    }
  }
  async function fetchList(arc) {
    if (!arc.listId) return;
    var e = await getEntry(arc.listId);
    if (e) applyList(arc, e);
  }

  // Idioma: 'dub' = doblaje en inglés, 'sub' = japonés con subtítulos en inglés.
  // Preferencia de Martín: doblaje cuando hay; si no, subtitulado.
  function langPref() { return store('tv_lang') === 'sub' ? 'sub' : 'dub'; }
  var LANG_NAME = { dub: 'Inglés (doblaje)', sub: 'Japonés · subtítulos en inglés' };
  function episodeKey(name) {
    // "[One Pace][1] Romance Dawn 01 [480p][En Sub][HASH].mp4" -> "[one pace][1] romance dawn 01"
    return String(name || '').replace(/\s*\[\d{3,4}p\][\s\S]*$/i, '').trim().toLowerCase();
  }
  // Archivo del episodio en el idioma pedido; si ese idioma no lo tiene, el subtitulado.
  async function resolveFile(arc, ep, lang) {
    var sub = arc.files[ep - 1];
    var out = { file: sub, lang: 'sub', quality: arc.quality, dub: false };
    if (arc.dubId) {
      var d = await getEntry(arc.dubId), key = episodeKey(sub.n);
      var match = d && d.f.filter(function (f) { return episodeKey(f.n) === key; })[0];
      if (match) {
        out.dub = true;
        if (lang === 'dub') { out.file = match; out.lang = 'dub'; out.quality = arc.dubQuality; }
      }
    }
    return out;
  }
  async function fetchAllLists(onEach) {
    var queue = arcs.slice();
    async function worker() {
      while (queue.length) { var a = queue.shift(); await fetchList(a); onEach(a); }
    }
    await Promise.all([worker(), worker(), worker(), worker(), worker()]);
  }

  function chaptersOf(fileName) {
    var m = /^\[One Pace\]\[([^\]]+)\]/i.exec(fileName || '');
    return m ? m[1] : '';
  }

  function nextTarget() {
    for (var i = 0; i < arcs.length; i++) {
      var a = arcs[i];
      if (!a.listId) continue;
      if (!a.files) return { loading: true };
      for (var ep = 1; ep <= a.count; ep++) if (!isWatched(a, ep)) return { arc: a, ep: ep };
    }
    return null;
  }

  function qualityText(arc) {
    if (langPref() === 'dub' && arc.dubId) return LANG_NAME.dub + ' · ' + arc.dubQuality + 'p';
    return LANG_NAME.sub + (arc.quality ? ' · ' + arc.quality + 'p' : '');
  }

  // ---------- abrir un episodio ----------

  function launchBrowser(url) {
    return new Promise(function (resolve, reject) {
      if (typeof tizen === 'undefined' || !tizen.application) {
        window.open(url, '_blank'); // en la compu, para probar
        resolve();
        return;
      }
      var ctl = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/view', url, null, null, null);
      try {
        tizen.application.launchAppControl(ctl, BROWSER_APP, resolve, function () {
          try { tizen.application.launchAppControl(ctl, null, resolve, reject, null); } catch (e) { reject(e); }
        }, null);
      } catch (e) { reject(e); }
    });
  }

  // Ver un episodio: reproductor propio a pantalla completa; si falla, el navegador.
  function playEpisode(arc, ep) {
    if (!arc.files || !arc.files[ep - 1]) { toast('Todavía cargando, un segundo…'); return; }
    Player.start(arc, ep);
  }

  async function openInBrowser(arc, ep) {
    var url = PD + '/l/' + arc.listId + '#item=' + (ep - 1);
    store('tv_pending', JSON.stringify({ arc: arc.name, ep: ep, at: Date.now() }));
    toast('Abriendo el episodio ' + ep + '. En el navegador: OK para darle play. Para volver: Volver hasta salir y abrí One Pace.', 9000);
    try {
      await launchBrowser(url);
    } catch (e) {
      store('tv_pending', null);
      toast('No pude abrir el navegador de la tele: ' + (e && e.message ? e.message : e), 8000);
    }
  }

  // Al volver del navegador: "¿Lo terminaste?"
  function checkPending() {
    if (document.visibilityState === 'hidden') return;
    var p = loadJSON('tv_pending', null);
    if (!p || Date.now() - p.at < 20000) return;
    var arc = arcs.filter(function (a) { return a.name === p.arc; })[0];
    if (!arc) { store('tv_pending', null); return; }
    store('tv_pending', null);
    if (isWatched(arc, p.ep)) return;
    showDialog('¿Terminaste ' + arc.name + ' · Episodio ' + p.ep + '?', '', [
      { text: '✓  Sí, marcarlo como visto', primary: true, run: function () {
        setWatched(arc, p.ep, true); refresh(); toast('Listo: episodio ' + p.ep + ' visto.', 3000);
      } },
      { text: 'Todavía no', run: function () {} }
    ]);
  }

  // ---------- reproductor a pantalla completa ----------
  // En la tele usa AVPlay, el reproductor nativo de Samsung: pide el archivo de Pixeldrain
  // como una descarga directa (lo mismo que su botón Download). En la compu, <video>.

  var DEMO = /[?&]demo\b/.test(location.search);
  var DEMO_URL = 'demo.mp4'; // video de prueba local (no va en la app instalada)
  var KP = { PLAYPAUSE: 10252, PLAY: 415, PAUSE: 19, FF: 417, RW: 412, STOP: 413 };

  function fmt(ms) {
    var s = Math.max(0, Math.floor((ms || 0) / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
  }
  function posKey(arc, ep) { return 'tv_pos:' + arc.name + ':' + ep; }
  function savedPos(arc, ep) { return parseFloat(store(posKey(arc, ep)) || '0') || 0; }

  function nextAfter(arc, ep) {
    if (ep < arc.count) return { arc: arc, ep: ep + 1 };
    for (var i = arc.no; i < arcs.length; i++) if (arcs[i].files && arcs[i].count) return { arc: arcs[i], ep: 1 };
    return null;
  }

  // ---------- subtítulos ----------
  // Vienen del repositorio público oficial de One Pace (one-pace/one-pace-public-subtitles),
  // que permite usarlos con crédito. Inglés: con el doblaje, la versión "en dub" (sigue el guion
  // doblado). Español: latinoamericano (es-419) primero, si no el de España.

  var SUBS_TREE = 'https://api.github.com/repos/one-pace/one-pace-public-subtitles/git/trees/main?recursive=1';
  var SUBS_RAW = 'https://raw.githubusercontent.com/one-pace/one-pace-public-subtitles/main/';
  function subsPref() { var v = store('tv_subs'); return v === 'en' || v === 'es' ? v : 'off'; }

  var Subs = (function () {
    var WANT = ['en', 'en dub', 'es-419', 'es'];
    var ALIAS = { arabasta: 'alabasta' };
    var index = loadJSON('tv_subs_index', null), loading = null, cache = {};

    function norm(name) {
      var n = String(name || '').toLowerCase().replace(/^\d+\s+/, '').replace(/[^a-z]/g, '');
      return ALIAS[n] || n;
    }
    // Número de episodio del archivo: "[One Pace][1] Romance Dawn 01 [1080p]…" -> 1
    function epNum(arc, ep) {
      var f = arc.files && arc.files[ep - 1];
      var m = f && /\]\s*[^\[\]]*?\s(\d+)\s*\[/.exec(f.n);
      return m ? parseInt(m[1], 10) : ep;
    }

    function getIndex() {
      if (index && Date.now() - index.t < 24 * 3600 * 1000) return Promise.resolve(index);
      if (loading) return loading;
      loading = (async function () {
        try {
          var r = await fetch(SUBS_TREE);
          var j = await r.json();
          if (!j.tree) throw new Error('sin árbol');
          var arcsIdx = {};
          j.tree.forEach(function (x) {
            if (x.type !== 'blob') return;
            var m = /^main\/([^/]+)\/(\d+)\/.+? \d+ (.+)\.ass$/.exec(x.path);
            if (!m || WANT.indexOf(m[3]) < 0) return;
            var a = norm(m[1]), e = parseInt(m[2], 10);
            arcsIdx[a] = arcsIdx[a] || {};
            (arcsIdx[a][e] = arcsIdx[a][e] || {})[m[3]] = x.path;
          });
          index = { t: Date.now(), arcs: arcsIdx };
          store('tv_subs_index', JSON.stringify(index));
        } catch (e) { /* queda el índice viejo, si hay */ }
        loading = null;
        return index;
      })();
      return loading;
    }

    function pickPath(arc, ep, audio, choice) {
      if (!index) return null;
      var e = (index.arcs[norm(arc.name)] || {})[epNum(arc, ep)];
      if (!e) return null;
      if (choice === 'en') return audio === 'dub' ? (e['en dub'] || e.en || null) : null; // con japonés ya vienen en el video
      // Los "dub es" del repo solo traen las canciones: el diálogo en español está en es-419 / es.
      if (choice === 'es') return e['es-419'] || e.es || null;
      return null;
    }

    function available(arc, ep, audio) {
      if (!index) return { en: audio === 'dub', es: true }; // todavía cargando: se intenta igual
      return { en: !!pickPath(arc, ep, audio, 'en'), es: !!pickPath(arc, ep, audio, 'es') };
    }

    function parseTime(t) {
      var m = /(\d+):(\d+):(\d+)[.,](\d+)/.exec(t || '');
      return m ? ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * 1000 + Math.round(parseFloat('0.' + m[4]) * 1000) : 0;
    }

    // Lee los diálogos de un .ass. Deja afuera carteles con posición fija y dibujos.
    function parse(text) {
      var lines = text.split(/\r?\n/), inEvents = false, fmt = null, cues = [];
      lines.forEach(function (line) {
        if (/^\[events\]/i.test(line)) { inEvents = true; return; }
        if (/^\[/.test(line)) { inEvents = false; return; }
        if (!inEvents) return;
        if (/^Format:/i.test(line)) { fmt = line.slice(7).split(',').map(function (x) { return x.trim().toLowerCase(); }); return; }
        if (!fmt || !/^Dialogue:/i.test(line)) return;
        var parts = line.slice(9).split(','), n = fmt.length;
        var raw = parts.slice(n - 1).join(',');
        var style = String(parts[fmt.indexOf('style')] || '');
        // Fuera: karaoke y letras de canciones, créditos, títulos, carteles y avisos ocultos.
        if (/kara|trad|lyric|credit|title|warning|sign|letrero|cartel|ndt/i.test(style)) return;
        if (/\\(pos|move)\(|\\p[1-9]|\\fscx0|\\clip\(0,0,0,0\)/.test(raw)) return;
        var txt = raw.replace(/\{[^}]*\}/g, '').replace(/\\N/gi, '\n').replace(/\\h/g, ' ').trim();
        if (!txt) return;
        cues.push({ s: parseTime(parts[fmt.indexOf('start')]), e: parseTime(parts[fmt.indexOf('end')]), t: txt });
      });
      return cues.sort(function (a, b) { return a.s - b.s; });
    }

    async function load(arc, ep, audio, choice) {
      await getIndex();
      var path = pickPath(arc, ep, audio, choice);
      if (!path) return null;
      if (cache[path]) return cache[path];
      try {
        var r = await fetch(SUBS_RAW + path.split('/').map(encodeURIComponent).join('/'));
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var cues = parse(await r.text());
        cache[path] = cues.length ? cues : null;
        return cache[path];
      } catch (e) { return null; }
    }

    function at(cues, ms) {
      var out = [];
      for (var i = 0; i < cues.length && cues[i].s <= ms; i++) {
        if (ms < cues[i].e && out.indexOf(cues[i].t) < 0) out.push(cues[i].t);
      }
      return out.join('\n');
    }

    var shown = null;
    function show(text) {
      if (text === shown) return;
      shown = text;
      var box = $('subs');
      if (!box) return;
      box.textContent = text;
      box.classList.toggle('hidden', !text);
    }

    return { prefetch: getIndex, available: available, load: load, at: at, show: show, _parse: parse, _pick: pickPath };
  })();

  var Player = (function () {
    var S = null, uiTimer = null, seekTimer = null, unTimer = null, lastSeekKey = 0, seekPresses = 0;
    var root = function () { return $('player'); };
    var hasAV = function () { return typeof webapis !== 'undefined' && webapis && webapis.avplay; };

    function avAdapter(url, ev) {
      var av = webapis.avplay;
      try { av.close(); } catch (e) {}
      av.open(url);
      av.setDisplayRect(0, 0, 1920, 1080);
      try { av.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX'); } catch (e) {}
      av.setListener({
        onbufferingstart: function () { ev.buffering(true); },
        onbufferingcomplete: function () { ev.buffering(false); },
        oncurrentplaytime: function (ms) { ev.time(ms); },
        onstreamcompleted: function () { ev.ended(); },
        onerror: function (e) { ev.error(String(e)); },
        onevent: function () {}, onsubtitlechange: function () {}, ondrmevent: function () {}
      });
      return {
        prepare: function (ok, fail) { av.prepareAsync(ok, function (e) { fail(e && e.name ? e.name : String(e)); }); },
        play: function () { av.play(); },
        pause: function () { av.pause(); },
        seek: function (ms, done) { var d = done || function () {}; av.seekTo(Math.max(0, Math.floor(ms)), d, d); },
        duration: function () { return av.getDuration(); },
        paused: function () { return av.getState() === 'PAUSED'; },
        close: function () { try { av.stop(); } catch (e) {} try { av.close(); } catch (e) {} }
      };
    }

    function htmlAdapter(url, ev) {
      var v = $('html-video');
      v.classList.remove('hidden');
      v.onwaiting = function () { ev.buffering(true); };
      v.onplaying = function () { ev.buffering(false); };
      v.ontimeupdate = function () { ev.time(v.currentTime * 1000); };
      v.onended = function () { ev.ended(); };
      v.onerror = function () { ev.error('video ' + (v.error ? v.error.code : '?')); };
      v.src = url;
      return {
        prepare: function (ok) { if (v.readyState >= 1) ok(); else v.onloadedmetadata = function () { ok(); }; },
        play: function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); },
        pause: function () { v.pause(); },
        seek: function (ms, done) { v.currentTime = ms / 1000; if (done) done(); },
        duration: function () { return (v.duration || 0) * 1000; },
        paused: function () { return v.paused; },
        close: function () { v.pause(); v.removeAttribute('src'); v.load(); v.classList.add('hidden'); }
      };
    }

    function isOpen() { return !!S; }

    // opts.at: arrancar en ese milisegundo (cambio de idioma). opts.lang: idioma pedido.
    async function start(arc, ep, opts) {
      opts = opts || {};
      if (S) close(false, true);
      var me = S = { arc: arc, ep: ep, started: false, cur: 0, dur: 0, max: 0, target: null, marked: isWatched(arc, ep), lastSave: 0, focus: null, barSel: 0 };
      // Subtítulos: cada 150 ms, con el tiempo estimado desde el último aviso del reproductor.
      me.subTimer = setInterval(function () {
        if (S !== me || !me.cues || !me.started) return;
        var playing = me.curAt && me.target == null && !me.ad.paused();
        Subs.show(Subs.at(me.cues, me.cur + (playing ? Math.min(Date.now() - me.curAt, 1000) : 0)));
      }, 150);
      var r = root();
      r.className = 'player loading ui';
      $('up-next').classList.add('hidden');
      $('lang-menu').classList.add('hidden');
      document.documentElement.classList.add('playing');
      $('p-kicker').textContent = 'Arco ' + arc.no + ' · ' + arc.name;
      $('p-title').textContent = 'Episodio ' + ep;
      $('p-lang').textContent = '';
      $('p-subs').textContent = '';
      $('p-lang').classList.remove('is-focus');
      $('p-subs').classList.remove('is-focus');
      $('lm-title').textContent = '';
      Subs.show('');
      updateBar();
      var pick = await resolveFile(arc, ep, opts.lang || langPref());
      if (S !== me) return;
      me.lang = pick.lang; me.hasDub = pick.dub;
      var file = pick.file;
      var url = DEMO ? DEMO_URL : PD + '/api/file/' + encodeURIComponent(file.id);
      var ch = chaptersOf(file.n);
      $('p-title').textContent = 'Episodio ' + ep + (ch ? '  ·  Capítulos ' + ch : '');
      $('p-lang').textContent = '🔊  ' + LANG_NAME[pick.lang] + (pick.quality ? ' · ' + pick.quality + 'p' : '');
      setSubs(subsPref());
      var ev = {
        buffering: function (b) { if (S === me) r.classList.toggle('loading', b); },
        time: function (ms) { if (S === me) onTime(ms); },
        ended: function () { if (S === me) onEnded(); },
        error: function (msg) { if (S === me) onError(msg); }
      };
      try {
        me.ad = hasAV() && !DEMO ? avAdapter(url, ev) : htmlAdapter(url, ev);
      } catch (e) { onError(e && e.message ? e.message : String(e)); return; }
      me.ad.prepare(function () {
        if (S !== me) return;
        me.dur = me.ad.duration() || 0;
        var resume = opts.at != null ? opts.at : savedPos(arc, ep);
        var go = function () {
          if (S !== me) return;
          me.started = true;
          me.ad.play();
          r.classList.remove('loading');
          showUi();
        };
        if (opts.at != null && resume > 0) {
          me.cur = resume;
          me.ad.seek(resume, go);
        } else if (resume > 30000 && (!me.dur || resume < me.dur - 60000)) {
          me.cur = resume;
          toast('Sigue desde ' + fmt(resume), 3000);
          me.ad.seek(resume, go);
        } else go();
      }, function (msg) { if (S === me) onError(msg); });
    }

    function onTime(ms) {
      S.cur = ms;
      S.curAt = Date.now();
      if (ms > S.max) S.max = ms;
      if (!S.dur) S.dur = S.ad.duration() || 0;
      if (Date.now() - S.lastSave > 5000 && ms > 5000) { S.lastSave = Date.now(); store(posKey(S.arc, S.ep), String(ms)); }
      if (!S.marked && S.dur && ms >= S.dur * 0.9) { S.marked = true; setWatched(S.arc, S.ep, true); }
      if (S.target == null) updateBar();
    }

    function updateBar() {
      if (!S) return;
      var at = S.target != null ? S.target : S.cur, d = S.dur || 0;
      var pct = d ? Math.max(0, Math.min(100, (at / d) * 100)) : 0;
      $('p-fill').style.width = pct + '%';
      $('p-knob').style.left = pct + '%';
      $('p-cur').textContent = fmt(at);
      $('p-left').textContent = d ? '-' + fmt(d - at) : '';
      $('p-seek').textContent = S.target != null ? (S.target >= S.cur ? '+' : '-') + fmt(Math.abs(S.target - S.cur)) : '';
    }

    function showUi(sticky) {
      var r = root();
      r.classList.add('ui');
      clearTimeout(uiTimer);
      if (!sticky && !r.classList.contains('paused')) uiTimer = setTimeout(function () { if (S && S.target == null && !S.focus) r.classList.remove('ui'); }, 4000);
    }

    function togglePause() {
      if (!S || !S.started) return;
      var r = root();
      if (S.ad.paused()) { S.ad.play(); r.classList.remove('paused'); showUi(); }
      else { S.ad.pause(); r.classList.add('paused'); showUi(true); }
    }

    // Adelantar/atrasar al estilo de las apps de streaming: se mueve una marca y salta al soltar.
    function seekBy(dir) {
      if (!S || !S.started || !S.dur) return;
      var now = Date.now();
      seekPresses = now - lastSeekKey < 600 ? seekPresses + 1 : 0;
      lastSeekKey = now;
      var step = seekPresses < 4 ? 10000 : seekPresses < 10 ? 30000 : 60000;
      var base = S.target != null ? S.target : S.cur;
      S.target = Math.max(0, Math.min(S.dur - 3000, base + dir * step));
      updateBar();
      showUi(true);
      clearTimeout(seekTimer);
      var me = S;
      seekTimer = setTimeout(function () {
        if (S !== me) return;
        var t = me.target;
        me.ad.seek(t, function () { if (S !== me) return; me.cur = t; me.target = null; updateBar(); showUi(); });
      }, 800);
    }

    function onEnded() {
      store(posKey(S.arc, S.ep), null);
      if (!S.marked) { S.marked = true; setWatched(S.arc, S.ep, true); }
      var n = nextAfter(S.arc, S.ep);
      if (!n) { toast('¡Terminaste el último episodio disponible!', 6000); close(false); return; }
      showUpNext(n);
    }

    function showUpNext(n) {
      var r = root();
      r.classList.remove('ui', 'paused', 'loading');
      var box = $('up-next');
      $('un-title').textContent = (n.arc === S.arc ? '' : n.arc.name + ' · ') + 'Episodio ' + n.ep;
      var btns = $('un-buttons');
      btns.textContent = '';
      var AUTO = 15;
      var play = el('button', 'action primary un-next is-focus');
      var fill = el('i', 'fill');
      var label = el('span', null, '▶  Siguiente capítulo  ' + AUTO);
      play.appendChild(fill); play.appendChild(label);
      var stay = el('button', 'action', 'Volver');
      btns.appendChild(play); btns.appendChild(stay);
      S.upNext = { next: n, sel: 0 };
      box.classList.remove('hidden');
      // La barra se llena en 15 s, como en Netflix; al llenarse arranca solo.
      fill.style.transition = 'none'; fill.style.width = '0';
      void fill.offsetWidth;
      fill.style.transition = 'width ' + AUTO + 's linear'; fill.style.width = '100%';
      var left = AUTO;
      clearInterval(unTimer);
      unTimer = setInterval(function () {
        left--;
        label.textContent = '▶  Siguiente capítulo  ' + Math.max(left, 0);
        if (left <= 0) { clearInterval(unTimer); start(n.arc, n.ep); }
      }, 1000);
    }

    function upNextKey(c) {
      var u = S.upNext, btns = $('un-buttons').children;
      if (c === K.LEFT || c === K.RIGHT) {
        u.sel = c === K.LEFT ? 0 : 1;
        btns[0].classList.toggle('is-focus', u.sel === 0);
        btns[1].classList.toggle('is-focus', u.sel === 1);
      } else if (c === K.ENTER) {
        clearInterval(unTimer);
        if (u.sel === 0) start(u.next.arc, u.next.ep); else close(false);
      } else if (c === K.BACK || c === K.ESC || c === KP.STOP) {
        clearInterval(unTimer);
        close(false);
      }
    }

    function onError(msg) {
      var s = S;
      if (s && !s.started) {
        close(false, true);
        toast('La tele no pudo reproducirlo directo (' + msg + '). Lo abro en el navegador.', 7000);
        openInBrowser(s.arc, s.ep);
      } else {
        root().classList.remove('loading');
        toast('Se cortó la reproducción (' + msg + '). Volver para salir y probá de nuevo.', 8000);
      }
    }

    function close(save, silent) {
      if (!S) return;
      var s = S;
      S = null;
      clearTimeout(uiTimer); clearTimeout(seekTimer); clearInterval(unTimer); clearInterval(s.subTimer);
      if (save !== false && s.started && s.cur > 5000 && (!s.dur || s.cur < s.dur - 60000)) store(posKey(s.arc, s.ep), String(s.cur));
      try { if (s.ad) s.ad.close(); } catch (e) {}
      Subs.show('');
      root().className = 'player hidden';
      document.documentElement.classList.remove('playing');
      if (!silent) {
        if (screen === 'arc' && currentArc !== s.arc && !dialogOpen()) currentArc = s.arc;
        refresh();
      }
    }

    // ----- Barra de botones: Audio y Subtítulos (▼ para llegar, ◀ ▶ para elegir) -----
    function barButtons() { return [$('p-lang'), $('p-subs')]; }
    function paintBar() {
      barButtons().forEach(function (b, i) { b.classList.toggle('is-focus', S.focus === 'bar' && i === S.barSel); });
    }
    function openMenu(kind) {
      var box = $('lm-options');
      box.textContent = '';
      var opts;
      if (kind === 'audio') {
        $('lm-title').textContent = 'Audio';
        opts = [
          { v: 'dub', text: LANG_NAME.dub, ok: S.hasDub, note: S.hasDub ? '' : 'no disponible en este capítulo', on: S.lang === 'dub' },
          { v: 'sub', text: LANG_NAME.sub, ok: true, note: '', on: S.lang === 'sub' }
        ];
      } else {
        $('lm-title').textContent = 'Subtítulos';
        var av = Subs.available(S.arc, S.ep, S.lang);
        var burned = S.lang === 'sub';
        opts = [
          { v: 'off', text: burned ? 'Solo los del video (inglés)' : 'Desactivados', ok: true, note: '', on: S.subsLang === 'off' },
          { v: 'en', text: 'Inglés', ok: !burned && av.en, note: burned ? 'ya vienen en el video' : av.en ? '' : 'no disponibles en este capítulo', on: S.subsLang === 'en' },
          { v: 'es', text: 'Español', ok: av.es, note: av.es ? (burned ? 'se ven arriba' : '') : 'no disponibles en este capítulo', on: S.subsLang === 'es' }
        ];
      }
      opts.forEach(function (o, i) {
        var b = el('button', 'lm-opt' + (o.ok ? '' : ' off'));
        b.appendChild(el('span', 'tick', o.on ? '✓' : ''));
        b.appendChild(el('span', null, o.text));
        if (o.note) b.appendChild(el('span', 'note', o.note));
        b._v = o.v; b._ok = o.ok;
        if (o.on) S.menuSel = i;
        box.appendChild(b);
      });
      S.menuKind = kind;
      paintMenu();
      $('lang-menu').classList.remove('hidden');
      S.focus = 'menu';
      showUi(true);
    }
    function paintMenu() {
      Array.prototype.forEach.call($('lm-options').children, function (b, i) { b.classList.toggle('is-focus', i === S.menuSel); });
    }
    function closeMenu() {
      $('lang-menu').classList.add('hidden');
      S.focus = 'bar';
      paintBar();
      showUi(true);
    }
    function chooseOption() {
      var b = $('lm-options').children[S.menuSel];
      if (!b._ok) { toast('Esa opción no está disponible en este capítulo.', 3000); return; }
      if (S.menuKind === 'audio') {
        store('tv_lang', b._v); // queda como preferencia para los próximos
        if (b._v === S.lang) { closeMenu(); return; }
        var at = S.target != null ? S.target : S.cur;
        toast('Cambiando a ' + LANG_NAME[b._v] + '…', 3000);
        start(S.arc, S.ep, { lang: b._v, at: at });
        return;
      }
      store('tv_subs', b._v); // preferencia de subtítulos
      setSubs(b._v);
      closeMenu();
    }
    function setSubs(choice) {
      var me = S;
      me.subsLang = choice;
      $('p-subs').textContent = '💬  ' + ({ off: me.lang === 'sub' ? 'Subtítulos: en el video' : 'Subtítulos: no', en: 'Subtítulos: inglés', es: 'Subtítulos: español' })[choice];
      me.cues = null;
      Subs.show('');
      $('subs').classList.toggle('top', me.lang === 'sub');
      if (choice === 'off') return;
      Subs.load(me.arc, me.ep, me.lang, choice).then(function (cues) {
        if (S !== me || me.subsLang !== choice) return;
        if (!cues) { toast('No encontré subtítulos en ' + (choice === 'es' ? 'español' : 'inglés') + ' para este capítulo.', 4000); return; }
        me.cues = cues;
      });
    }
    function barKey(c) {
      if (S.focus === 'menu') {
        var n = $('lm-options').children.length;
        if (c === K.UP) { S.menuSel = Math.max(0, S.menuSel - 1); paintMenu(); }
        else if (c === K.DOWN) { S.menuSel = Math.min(n - 1, S.menuSel + 1); paintMenu(); }
        else if (c === K.ENTER) chooseOption();
        else if (c === K.BACK || c === K.ESC) closeMenu();
        return true;
      }
      if (c === K.LEFT || c === K.RIGHT) { S.barSel = c === K.LEFT ? 0 : 1; paintBar(); showUi(true); return true; }
      if (c === K.ENTER) { openMenu(S.barSel === 0 ? 'audio' : 'subs'); return true; }
      if (c === K.UP || c === K.BACK || c === K.ESC) { S.focus = null; paintBar(); showUi(); return true; }
      if (c === K.DOWN) return true;
      return false; // teclas de reproducción siguen andando
    }

    function key(c) {
      if (S.upNext) { upNextKey(c); return true; }
      if (S.focus && barKey(c)) return true;
      if (c === K.DOWN && S.started && !S.focus) {
        S.focus = 'bar'; S.barSel = S.barSel || 0; paintBar(); showUi(true); return true;
      }
      if (c === K.ENTER || c === KP.PLAYPAUSE) togglePause();
      else if (c === KP.PLAY) { if (S.started && S.ad.paused()) togglePause(); }
      else if (c === KP.PAUSE) { if (S.started && !S.ad.paused()) togglePause(); }
      else if (c === K.LEFT || c === KP.RW) seekBy(-1);
      else if (c === K.RIGHT || c === KP.FF) seekBy(1);
      else if (c === K.UP || c === K.DOWN) showUi();
      else if (c === K.BACK || c === K.ESC || c === KP.STOP) close(true);
      else return false;
      return true;
    }

    return { start: start, key: key, isOpen: isOpen, close: close };
  })();

  function registerMediaKeys() {
    try {
      ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaFastForward', 'MediaRewind', 'MediaStop'].forEach(function (k) {
        try { tizen.tvinputdevice.registerKey(k); } catch (e) {}
      });
    } catch (e) {}
  }

  // ---------- pantallas ----------

  var screen = 'home';   // 'home' | 'arc'
  var currentArc = null;
  var focus = { r: 0, c: 0 };
  var homeCol = 0;       // último arco elegido en el carrusel

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderStats() {
    var done = arcs.filter(arcDone).length;
    var eps = arcs.reduce(function (s, a) { return s + watchedCount(a); }, 0);
    $('stats').innerHTML = '<b>' + done + '</b> de ' + arcs.length + ' arcos · <b>' + eps + '</b> episodios vistos';
  }

  function renderHome() {
    var t = nextTarget();
    var hero = $('hero');
    if (!t) {
      $('hero-kicker').textContent = 'Terminaste One Pace';
      $('hero-title').textContent = '¡Completaste todos los arcos!';
      $('hero-sub').textContent = 'Elegí un arco de abajo para volver a ver.';
      hero.dataset.state = 'done';
    } else if (t.loading) {
      $('hero-kicker').textContent = 'Seguir viendo';
      $('hero-title').textContent = 'Cargando episodios…';
      $('hero-sub').textContent = '';
      hero.dataset.state = 'loading';
    } else {
      var started = watchedCount(t.arc) > 0 || t.arc.no > 1;
      var pos = savedPos(t.arc, t.ep);
      $('hero-kicker').textContent = pos > 30000 ? 'Seguir viendo' : started ? 'Próximo episodio' : 'Empezar';
      $('hero-title').textContent = t.arc.name + ' · Episodio ' + t.ep;
      $('hero-sub').textContent = (pos > 30000 ? 'Sigue desde ' + fmt(pos) + ' · ' : '') + 'Arco ' + t.arc.no + ' · ' + qualityText(t.arc);
      hero.dataset.state = 'ready';
    }

    var track = $('arcs');
    track.textContent = '';
    arcs.forEach(function (a) {
      var card = el('button', 'arc-card focusable');
      card.type = 'button';
      var done = arcDone(a);
      if (done) card.classList.add('done');
      if (t && !t.loading && t.arc === a) card.classList.add('current');
      card.appendChild(el('span', 'n', 'Arco ' + a.no));
      card.appendChild(el('span', 't', a.name));
      var w = watchedCount(a);
      card.appendChild(el('span', 'p', a.files ? (w + ' de ' + a.count + ' vistos') : (a.listId ? 'Cargando…' : 'Sin episodios')));
      var bar = el('span', 'bar'); var fill = el('i');
      fill.style.width = (a.count ? Math.round((w / a.count) * 100) : 0) + '%';
      bar.appendChild(fill); card.appendChild(bar);
      if (done) card.appendChild(el('span', 'check', '✓'));
      track.appendChild(card);
    });
    renderStats();
  }

  function renderArc() {
    var a = currentArc;
    $('arc-no').textContent = 'Arco ' + a.no + ' de ' + arcs.length;
    $('arc-name').textContent = a.name;
    $('arc-meta').textContent = (a.files ? watchedCount(a) + ' de ' + a.count + ' episodios vistos · ' : '') + qualityText(a);
    $('arc-desc').textContent = a.description;
    $('arc').querySelector('.episodes-wrap').classList.toggle('tall', !a.description);

    var next = 0;
    for (var i = 1; i <= a.count; i++) if (!isWatched(a, i)) { next = i; break; }

    var actions = $('arc-actions');
    actions.textContent = '';
    if (next) {
      var b1 = el('button', 'action primary focusable', '▶  Ver episodio ' + next);
      b1.dataset.act = 'next';
      actions.appendChild(b1);
    }
    var b2 = el('button', 'action focusable', arcDone(a) ? '↺  Marcar arco como no visto' : '✓  Marcar arco completo');
    b2.dataset.act = 'toggle-arc';
    actions.appendChild(b2);

    var grid = $('episodes');
    grid.textContent = '';
    for (var ep = 1; ep <= a.count; ep++) {
      var tile = el('button', 'ep focusable');
      tile.type = 'button';
      tile.dataset.ep = ep;
      var seen = isWatched(a, ep);
      if (seen) tile.classList.add('watched');
      if (ep === next) tile.classList.add('next');
      tile.appendChild(el('span', 'num', String(ep)));
      var ch = chaptersOf(a.files[ep - 1].n);
      tile.appendChild(el('span', 'lbl', ch ? 'Capítulos ' + ch : ''));
      if (seen) tile.appendChild(el('span', 'tag', '✓ Visto'));
      else if (ep === next) tile.appendChild(el('span', 'tag', 'Siguiente'));
      grid.appendChild(tile);
    }
    renderStats();
  }

  function setHint(items) {
    var h = $('hint');
    h.textContent = '';
    items.forEach(function (it) {
      var s = el('span');
      s.appendChild(el('span', 'k', it[0]));
      s.appendChild(document.createTextNode(it[1]));
      h.appendChild(s);
    });
  }

  // ---------- foco en grilla (determinista: filas y columnas) ----------

  function dialogOpen() { return !$('dialog').classList.contains('hidden'); }

  function rows() {
    if (dialogOpen()) return [Array.prototype.slice.call($('dialog-buttons').children)];
    if (screen === 'home') return [[$('hero')], Array.prototype.slice.call($('arcs').children)];
    var r = [Array.prototype.slice.call($('arc-actions').children)];
    var tiles = Array.prototype.slice.call($('episodes').children);
    for (var i = 0; i < tiles.length; i += 6) r.push(tiles.slice(i, i + 6));
    return r;
  }

  function applyFocus() {
    var R = rows();
    if (!R.length) return;
    focus.r = Math.max(0, Math.min(focus.r, R.length - 1));
    focus.c = Math.max(0, Math.min(focus.c, R[focus.r].length - 1));
    Array.prototype.forEach.call(document.querySelectorAll('.is-focus'), function (n) { n.classList.remove('is-focus'); });
    var target = R[focus.r][focus.c];
    if (!target) return;
    target.classList.add('is-focus');

    if (!dialogOpen() && screen === 'home' && focus.r === 1) {
      homeCol = focus.c;
      var step = 352, visible = 1696;
      var max = Math.max(0, $('arcs').scrollWidth - visible);
      var x = Math.max(0, Math.min(max, focus.c * step - step));
      $('arcs').style.transform = 'translateX(' + (-x) + 'px)';
    }
    if (!dialogOpen() && screen === 'arc') {
      var row = Math.max(0, focus.r - 1);
      $('episodes').style.transform = 'translateY(' + (-Math.max(0, row - 1) * 196) + 'px)';
    }
  }

  function moveFocus(dr, dc) {
    var R = rows();
    if (dc) {
      focus.c = Math.max(0, Math.min(R[focus.r].length - 1, focus.c + dc));
    } else if (dr) {
      var nr = focus.r + dr;
      if (nr < 0 || nr >= R.length) return;
      // Misma columna visual: el elemento de la nueva fila más cercano en horizontal.
      var cur = R[focus.r][focus.c].getBoundingClientRect();
      var cx = cur.left + cur.width / 2, best = 0, bestD = Infinity;
      R[nr].forEach(function (n, i) {
        var q = n.getBoundingClientRect(), d = Math.abs(q.left + q.width / 2 - cx);
        if (d < bestD) { bestD = d; best = i; }
      });
      // Del héroe al carrusel: volver al último arco elegido.
      if (screen === 'home' && !dialogOpen() && nr === 1) best = homeCol;
      // Entre filas de episodios: misma columna exacta.
      if (screen === 'arc' && !dialogOpen() && focus.r >= 1 && nr >= 1) best = Math.min(focus.c, R[nr].length - 1);
      focus.r = nr; focus.c = best;
    }
    applyFocus();
  }

  function focused() { var R = rows(); return R[focus.r] && R[focus.r][focus.c]; }

  // ---------- acciones ----------

  function openArc(a) {
    currentArc = a;
    screen = 'arc';
    $('home').classList.add('hidden');
    $('arc').classList.remove('hidden');
    if (!a.files) { toast('Cargando episodios…', 2000); fetchList(a).then(function () { if (currentArc === a) { renderArc(); applyFocus(); } }); }
    renderArc();
    focus = { r: 0, c: 0 };
    setHint([['OK', 'Ver episodio'], ['◀ ▶ ▲ ▼', 'Moverse'], ['Volver', 'Arcos']]);
    applyFocus();
  }

  function goHome() {
    screen = 'home';
    $('arc').classList.add('hidden');
    $('home').classList.remove('hidden');
    renderHome();
    focus = { r: 1, c: currentArc ? currentArc.no - 1 : homeCol };
    setHint([['OK', 'Elegir'], ['◀ ▶ ▲ ▼', 'Moverse'], ['Volver', 'Salir']]);
    applyFocus();
  }

  function refresh() {
    if (screen === 'home') renderHome(); else renderArc();
    applyFocus();
  }

  var dialogReturn = null;
  function showDialog(title, text, buttons) {
    dialogReturn = { r: focus.r, c: focus.c };
    $('dialog-title').textContent = title;
    $('dialog-text').textContent = text || '';
    var box = $('dialog-buttons');
    box.textContent = '';
    buttons.forEach(function (b) {
      var n = el('button', 'action focusable' + (b.primary ? ' primary' : ''), b.text);
      n._run = b.run;
      box.appendChild(n);
    });
    $('dialog').classList.remove('hidden');
    focus = { r: 0, c: 0 };
    applyFocus();
  }
  function closeDialog(run) {
    $('dialog').classList.add('hidden');
    if (dialogReturn) focus = dialogReturn;
    if (run) run();
    applyFocus();
  }

  function activate() {
    var n = focused();
    if (!n) return;
    if (dialogOpen()) {
      var buttons = Array.prototype.slice.call($('dialog-buttons').children);
      closeDialog(buttons[focus.c] && buttons[focus.c]._run);
      return;
    }
    if (screen === 'home') {
      if (n.id === 'hero') {
        var t = nextTarget();
        if (!t) { toast('Elegí un arco de abajo para volver a ver.'); return; }
        if (t.loading) { toast('Todavía cargando, un segundo…'); return; }
        playEpisode(t.arc, t.ep);
      } else {
        openArc(arcs[focus.c]);
      }
      return;
    }
    var a = currentArc;
    if (n.dataset.act === 'next') {
      for (var i = 1; i <= a.count; i++) if (!isWatched(a, i)) { playEpisode(a, i); return; }
    } else if (n.dataset.act === 'toggle-arc') {
      var done = arcDone(a);
      showDialog(done ? '¿Marcar ' + a.name + ' como no visto?' : '¿Marcar todo ' + a.name + ' como visto?',
        done ? 'Se desmarcan sus ' + a.count + ' episodios.' : 'Sirve si ya lo viste en otro lado.', [
          { text: done ? 'Sí, desmarcar' : '✓  Sí, marcar completo', primary: true, run: function () {
            for (var e = 1; e <= a.count; e++) setWatched(a, e, !done);
            renderArc();
          } },
          { text: 'Cancelar', run: function () {} }
        ]);
    } else if (n.dataset.ep) {
      var ep = parseInt(n.dataset.ep, 10);
      if (!isWatched(a, ep)) { playEpisode(a, ep); return; }
      showDialog(a.name + ' · Episodio ' + ep, 'Ya lo marcaste como visto.', [
        { text: '▶  Volver a verlo', primary: true, run: function () { playEpisode(a, ep); } },
        { text: 'Marcar como no visto', run: function () { setWatched(a, ep, false); renderArc(); } },
        { text: 'Cancelar', run: function () {} }
      ]);
    }
  }

  function back() {
    if (dialogOpen()) { closeDialog(null); return; }
    if (screen === 'arc') { goHome(); return; }
    try { tizen.application.getCurrentApplication().hide(); } catch (e) { toast('Volver: sale de la app en la tele.'); }
  }

  function onKey(e) {
    var c = e.keyCode;
    if (Player.isOpen()) { if (Player.key(c)) e.preventDefault(); return; }
    if (c === K.LEFT) moveFocus(0, -1);
    else if (c === K.RIGHT) moveFocus(0, 1);
    else if (c === K.UP) moveFocus(-1, 0);
    else if (c === K.DOWN) moveFocus(1, 0);
    else if (c === K.ENTER) activate();
    else if (c === K.BACK || c === K.ESC) back();
    else return;
    e.preventDefault();
  }

  // ---------- arranque ----------

  async function boot() {
    document.addEventListener('keydown', onKey, true);
    registerMediaKeys();
    // Si la app pasa a segundo plano mientras reproduce, se corta guardando dónde iba.
    document.addEventListener('visibilitychange', function () { if (document.hidden && Player.isOpen()) Player.close(true); });
    setHint([['OK', 'Elegir'], ['◀ ▶ ▲ ▼', 'Moverse'], ['Volver', 'Salir']]);
    try {
      await loadData();
    } catch (e) {
      $('hero-kicker').textContent = 'Sin conexión';
      $('hero-title').textContent = 'No pude cargar One Pace';
      $('hero-sub').textContent = 'Revisá que la tele tenga internet y volvé a abrir la app.';
      return;
    }
    // Lo guardado aparece al toque; después se actualiza con lo que conteste Pixeldrain.
    arcs.forEach(function (a) { var c = a.listId && listCache[a.listId]; if (c) applyList(a, c); });
    Subs.prefetch();
    var t0 = nextTarget();
    homeCol = t0 && t0.arc ? t0.arc.no - 1 : 0;
    focus = { r: 0, c: 0 };
    renderHome();
    applyFocus();
    var pendingRender = null;
    await fetchAllLists(function () {
      if (pendingRender) return;
      pendingRender = setTimeout(function () { pendingRender = null; if (!dialogOpen()) refresh(); }, 250);
    });
    refresh();
    checkPending();
    document.addEventListener('visibilitychange', checkPending);
  }

  window.__tv = { arcs: function () { return arcs; }, progress: function () { return progress; }, subs: Subs };
  boot();
})();
