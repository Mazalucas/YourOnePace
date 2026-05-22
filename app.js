/**
 * One Pace Web App - Timeline Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    (function applyFooterVersion() {
        const meta = document.querySelector('meta[name="app-version"]');
        const line = document.getElementById('footer-app-version-line');
        const span = document.getElementById('footer-app-version-value');
        const raw = meta ? meta.getAttribute('content') : '';
        const cleaned = typeof raw === 'string' ? raw.trim() : '';
        if (!line || !span || !cleaned || cleaned.includes('%')) return;
        if (!/^\d+\.\d+\.\d+$/.test(cleaned)) return;
        span.textContent = cleaned;
        line.hidden = false;
    })();

    // UI Elements
    const upcomingContainer = document.getElementById('upcoming-arcs');
    const completedContainer = document.getElementById('completed-arcs');
    const searchInput = document.getElementById('arc-search');
    const progressBar = document.getElementById('journey-progress');
    const arcsCompletedText = document.getElementById('arcs-completed');
    const totalArcsText = document.getElementById('total-arcs');
    const totalSavingsText = document.getElementById('total-savings-val');
    const progressInfo = document.getElementById('progress-info');
    const progressExpandToggle = document.getElementById('progress-expand-toggle');
    const progressToolbarPanel = document.getElementById('progress-toolbar-panel');
    const progressToolbarInner = document.getElementById('progress-toolbar-inner');
    const template = document.getElementById('arc-card-template');
    let toolbarExpanded = false;

    // Modal Elements
    const modal = document.getElementById('arc-modal');
    const modalBody = document.getElementById('modal-body');
    const closeModal = document.querySelector('.close-modal');
    const playNextEpisodeBtn = document.getElementById('play-next-episode');
    const playNextLabel = document.getElementById('play-next-label');
    const playNextContext = document.getElementById('play-next-context');
    const nextEpisodeModal = document.getElementById('next-episode-modal');
    const nextEpisodeModalMessage = document.getElementById('next-episode-modal-message');
    const closeNextEpisodeModalBtn = document.getElementById('close-next-episode-modal');
    const playbackConfirmModal = document.getElementById('episode-playback-confirm-modal');
    const playbackConfirmMessage = document.getElementById('episode-playback-confirm-message');
    const closePlaybackConfirmModalBtn = document.getElementById('close-playback-confirm-modal');
    const playbackConfirmLaterBtn = document.getElementById('playback-confirm-later');
    const playbackConfirmWatchedBtn = document.getElementById('playback-confirm-watched');

    let allArcs = [];
    let watchedUpToIndex = parseInt(localStorage.getItem('onepace_watched_index') || '-1');
    let episodeProgress = JSON.parse(localStorage.getItem('onepace_episode_progress') || '{}');
    const PENDING_CONFIRM_KEY = 'onepace_pending_episode_confirmation';
    const MIN_RETURN_PROMPT_DELAY_MS = 10 * 1000;
    let pendingEpisodeConfirmation = null;

    // Data Portability
    const exportBtn = document.getElementById('export-progress');
    const importTrigger = document.getElementById('import-trigger');
    const importFile = document.getElementById('import-progress');

    function setProgressToolbarExpanded(expanded) {
        if (!progressExpandToggle) return;
        toolbarExpanded = expanded;
        progressInfo?.classList.toggle('is-toolbar-expanded', expanded);
        progressExpandToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        progressToolbarPanel?.setAttribute('aria-hidden', expanded ? 'false' : 'true');
        if (progressToolbarInner) {
            if (expanded) {
                progressToolbarInner.removeAttribute('inert');
            } else {
                progressToolbarInner.setAttribute('inert', '');
            }
        }
        progressExpandToggle.setAttribute(
            'aria-label',
            expanded ? 'Hide backup and reset options' : 'Show backup and reset options'
        );
    }

    function collapseProgressToolbar() {
        setProgressToolbarExpanded(false);
    }

    function toggleProgressToolbar() {
        setProgressToolbarExpanded(!toolbarExpanded);
    }

    if (progressExpandToggle) {
        progressExpandToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleProgressToolbar();
        });
    }
    document.addEventListener('click', (e) => {
        if (!toolbarExpanded || !progressInfo) return;
        if (!progressInfo.contains(e.target)) collapseProgressToolbar();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') collapseProgressToolbar();
    });

    exportBtn.onclick = () => {
        const data = {
            watchedUpToIndex,
            episodeProgress,
            timestamp: new Date().toISOString(),
            app: "OnePaceJourney"
        };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `your-one-pace-progress-${new Date().toLocaleDateString()}.json`;
        a.click();
        collapseProgressToolbar();
    };

    importTrigger.onclick = () => {
        importFile.click();
        collapseProgressToolbar();
    };
    importFile.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.app === "OnePaceJourney") {
                    watchedUpToIndex = data.watchedUpToIndex;
                    episodeProgress = data.episodeProgress || {};
                    localStorage.setItem('onepace_watched_index', watchedUpToIndex);
                    localStorage.setItem('onepace_episode_progress', JSON.stringify(episodeProgress));
                    renderJourney();
                    alert('Progress restored successfully!');
                } else {
                    alert('Invalid backup file.');
                }
            } catch (err) {
                alert('Error reading file.');
            }
        };
        reader.readAsText(file);
    };

    // Reset Journey
    const resetBtn = document.getElementById('reset-journey');
    resetBtn.onclick = () => {
        if (confirm('Are you sure you want to reset your entire journey?')) {
            watchedUpToIndex = -1;
            episodeProgress = {};
            localStorage.removeItem('onepace_watched_index');
            localStorage.removeItem('onepace_episode_progress');
            renderJourney();
            collapseProgressToolbar();
        }
    };

    async function init() {
        try {
            // Simulated CSV Data based on One Pace Episode Guide - Arc Overview.csv
            const csvData = `No.,Arcs,Manga Chapters,# of Ch.,Anime Episodes,Episodes Adapted,Filler Episodes,# of Pace Ep.,Piece Minutes,Pace Minutes,Saved Minutes,Saved %,Audio Languages,Sub Languages,Pixeldrain only,Resolution,Arc Watch Guide: Pace + Original
1,Romance Dawn (WIP),1 - 7,7,"1 - 4, 19",5,,4,105,76,29,27.62%,"Jpn,Eng,Es, De","Eng,Es,Fr,De,Ar,Pt,Pl,Eng CC",,1080p,Pace
2,Orange Town,8 - 21,14,4 - 8,5,,3,105,79,26,24.76%,"Jpn,Eng, Es, De ","Eng,Es,Fr,Ar,Pt,De",Pt,1080p,Pace
3,Syrup Village (WIP),23 - 41,19,9 - 17,9,,7,189,151,38,20.11%,"Jpn, Eng (1-6), Es (1-6)","Eng,Es,Fr,De","Es, Fr",1080p,Pace
4,Gaimon,"42,22",2,18,1,,1,21,18,3,14.29%,"Jpn,Eng,Es","Eng,Es,Fr, De",,1080p,Pace
5,Baratie,42 - 68,27,19 - 30,12,,9,252,181,71,28.17%,"Jpn,Eng","Eng,Es, Fr (3-9), De (1-6)",Fr  (1-2),1080p,Pace
6,Arlong Park (WIP),69 - 95,27,31 - 44,14,,10,294,239,55,18.71%,"Jpn,Eng","Eng,Es, Fr, De (1-5)",Fr ,"480p,1080p",Pace
7,Loguetown,96 - 100,5,"45, 48 - 53",6,51,3,126,89,37,29.37%,"Jpn,Eng","Eng,Es, Fr ",Fr,480p,Pace
8,Reverse Mountain,101 - 105,5,"55, 61 - 63",4,56 - 60,2,84,49,35,41.67%,"Jpn,Eng","Eng,Es , Fr ",De,1080p,Pace
10,Little Garden,115 - 129,15,70 - 78,9,,5,189,135,54,28.57%,"Jpn,Eng","Eng,Es,Fr,Ar,De,It ",,1080p,Pace
11,Drum Island,129 - 154,26,78 - 91,14,,8,294,231,63,21.43%,"Jpn,Eng","Eng,Es,Fr",,1080p,Pace
12,Arabasta,155 - 217,63,92 - 130,40,"99, 102",21,840,555,285,33.93%,"Jpn,Eng","Eng,Es, Fr ",Fr,1080p,Pace
13,Jaya,218 - 236,19,144 - 152,9,,8,189,161,28,14.81%,"Jpn,Eng","Eng, Es, Fr",,1080p,Pace
14,Skypiea (WIP),237 - 303,66,"153 - 195, 203",44,,25,924,644,280,30.30%,"Jpn,Eng","Eng,Es (1-4), Fr, Es (5), De (17-)","Es (5),De",1080p,Pace
15,Long Ring Long Land (TBR),304 - 321,19,"207 - 219, 226 - 228",14,213 - 215,6,294,154,140,47.62%,"Jpn,Eng",Eng,Eng,720p,Pace
16,Water Seven,322 - 374,53,229 - 263,37,,20,777,549,228,29.34%,"Jpn,Eng","Eng,Fr ",Fr,1080p,Pace
17,Enies Lobby,375 - 430,56,263 - 312,45,"291 - 292, 303",25,945,591,354,37.46%,"Jpn,Eng (23-25)","Eng, Es , Fr ",Fr,"720p,1080p",Pace
18,Post-Enies Lobby (TBR),431 - 441,11,313 - 325,11,317 - 318,5,236.5,133,103.5,43.76%,Jpn,Eng,Eng,720p,Pace
19,Thriller Bark  (TBR),442 - 489,48,337 - 381,45,,22,967.5,484,483.5,49.97%,Jpn,"Eng, Es","Eng, Es",720p,Pace
20,Sabaody Archipelago (TBR),490 - 513,24,385 - 405,21,,11,451.5,285,166.5,36.88%,Jpn,"Eng, Es ",Es,720p,Pace
21,Amazon Lily (TBR),514 - 524,11,408 - 421,14,,5,301,132,169,56.15%,Jpn,"Eng, Es , Fr ","Es, Fr",720p,Pace
22,Impel Down (TBR),525 - 548,24,422 - 452,27,426 - 429,10,580.5,317,263.5,45.39%,Jpn,"Eng,Es ",Es,720p,Pace
23,Marineford,549 - 580,32,457 - 489,33,,17,709.5,395,314.5,44.33%,Jpn,"Eng,Es,Fr ",Fr,720p,Pace
24,Post-War,581 - 597,17,490 - 516,26,"492, 499, 506",8,559,306,253,45.26%,"Jpn,Eng (1-6)","Eng,Es ,Fr ","Es,Fr",1080p,Pace
25,Return to Sabaody,598 - 602,5,517 - 522,6,,3,129,91,38,29.46%,"Jpn,Eng","Eng,Es,Fr,Ar",,1080p,Pace
26,Fishman Island (TBR),603 - 653,51,523 - 574,51,542,24,1096.5,710,386.5,35.25%,Jpn,"Eng,Es ",Es,720p,Pace
27,Punk Hazard (TBR),654 - 699,46,"579 - 626, 628",46,590,22,989,519,470,47.52%,Jpn,"Eng,Es",,720p,Pace
28,Dressrosa (TBR),700 - 800,101,629 - 746,118,,48,2537,1206,1331,52.46%,Jpn,"Eng,Es ",Es,720p,Pace
29,Zou (TBR),801 - 822,22,751 - 776,28,775,10,602,275,327,54.32%,Jpn,"Eng,Es, Fr ",Fr,720p,Pace
30,Whole Cake Island,823 - 902,80,777 - 877,95,780 - 782,39,2042.5,1213,829.5,40.61%,Jpn,"Eng,Es, Fr ",Fr,720p,Pace
31,Reverie,903 - 908,6,878 - 889,12,,3,258,94,164,63.57%,"Jpn,Eng","Eng,Es,Fr",,1080p,Pace
32,Wano (WIP),909 - 1057,149,890 - 1085,126,"1029 - 1030, 1084",56,2709,1620,1089,40.20%,"Jpn,Eng (1-3, 31-)","Eng,Es ,Fr,Ar, De (44-)","Es,Fr, Ar",1080p,Pace
33,Egghead (WIP),1058 - 1125,68,1086 —,38,,20,798,534,264,33.08%,"Jpn, Eng (1-12, 17-18)","Eng,Fr,De (3-)","De (1,2)",1080p,Pace`;

            allArcs = parseCSV(csvData);
            renderJourney();

            // Search functionality
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                renderJourney(term);
            });

            // Modal Close
            closeModal.onclick = () => modal.classList.add('hidden');
            window.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };

        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    function parseCSV(csv) {
        const lines = csv.split('\n');
        const results = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const row = [];
            let current = '';
            let inQuotes = false;
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    row.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            row.push(current);

            if (row.length < 10) continue;

            const nameFull = row[1];
            let status = 'Completed';
            if (nameFull.includes('(WIP)')) status = 'WIP';
            else if (nameFull.includes('(TBR)')) status = 'TBR';

            const nameClean = nameFull.replace(/\(WIP\)|\(TBR\)/g, '').trim();

            results.push({
                index: i - 1,
                no: row[0],
                name: nameClean,
                status: status,
                chapters: row[2].replace(/"/g, ''),
                animeEpisodes: row[4] ? row[4].replace(/"/g, '').trim() : '',
                episodesCount: parseInt(row[7]) || 0,
                saved: parseInt(row[10].replace(/,/g, '')) || 0,
                savedPct: row[11],
                resolution: row[15] ? row[15].replace(/"/g, '') : '',
                guide: row[16] ? row[16].replace(/"/g, '') : ''
            });
        }
        return results;
    }

    function renderJourney(filterTerm = '') {
        upcomingContainer.innerHTML = '';
        completedContainer.innerHTML = '';

        let completedTotalSavings = 0;
        let completedCount = 0;

        allArcs.forEach((arc) => {
            if (filterTerm && !arc.name.toLowerCase().includes(filterTerm)) return;

            const isWatched = arc.index <= watchedUpToIndex;
            const element = createArcElement(arc, isWatched);

            if (isWatched) {
                completedContainer.appendChild(element);
                completedTotalSavings += arc.saved;
                completedCount++;
            } else {
                upcomingContainer.appendChild(element);
            }
        });

        // Current arc highlight logic
        if (watchedUpToIndex < allArcs.length - 1) {
            const nextArcIndex = watchedUpToIndex + 1;
            const nextArc = allArcs[nextArcIndex];
            const items = upcomingContainer.querySelectorAll('.timeline-item');
            items.forEach(el => {
                if (el.querySelector('.arc-name').textContent === nextArc.name) {
                    el.classList.add('current-arc');
                }
            });
        }

        // Update progress card in hero
        totalArcsText.textContent = allArcs.length;
        arcsCompletedText.textContent = completedCount;
        totalSavingsText.textContent = completedTotalSavings.toLocaleString();

        const progressPct = (completedCount / allArcs.length) * 100;
        progressBar.style.width = `${progressPct}%`;
        updatePlayNextDock();
    }

    function getNextEpisodeTarget() {
        for (const arc of allArcs) {
            const isArcCompleted = arc.index <= watchedUpToIndex;
            const watchedEpisodes = new Set(
                episodeProgress[arc.name] || (isArcCompleted ? Array.from({ length: arc.episodesCount }, (_, i) => i + 1) : [])
            );

            for (let epNo = 1; epNo <= arc.episodesCount; epNo++) {
                if (!watchedEpisodes.has(epNo)) {
                    return { arc, episodeNumber: epNo };
                }
            }
        }
        return null;
    }

    function updatePlayNextDock() {
        if (!playNextEpisodeBtn || !playNextLabel || !playNextContext) return;
        const target = getNextEpisodeTarget();
        if (!target) {
            playNextLabel.textContent = 'All Episodes Completed';
            playNextContext.textContent = '';
            playNextEpisodeBtn.setAttribute('aria-label', 'All episodes completed');
            playNextEpisodeBtn.disabled = true;
            return;
        }

        playNextLabel.textContent = 'Play Next Episode';
        playNextContext.textContent = `${target.arc.name} · Ep ${target.episodeNumber}`;
        playNextEpisodeBtn.setAttribute('aria-label', `Play next episode: ${target.arc.name} episode ${target.episodeNumber}`);
        playNextEpisodeBtn.disabled = false;
    }

    function showNextEpisodeFallbackModal(target) {
        if (!nextEpisodeModal || !nextEpisodeModalMessage) return;
        if (target) {
            nextEpisodeModalMessage.textContent =
                `We could not find a direct link for ${target.arc.name} - Episode ${target.episodeNumber}. Please open that arc manually and continue from there.`;
        } else {
            nextEpisodeModalMessage.textContent =
                'We could not determine your next episode. Please open the arc manually and continue from there.';
        }
        nextEpisodeModal.classList.remove('hidden');
    }

    function loadPendingEpisodeConfirmation() {
        try {
            const raw = localStorage.getItem(PENDING_CONFIRM_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.arcName || !Number.isInteger(parsed.episodeNumber)) return null;
            return parsed;
        } catch (e) {
            return null;
        }
    }

    function savePendingEpisodeConfirmation(target) {
        if (!target || !target.arc) return;
        pendingEpisodeConfirmation = {
            arcName: target.arc.name,
            episodeNumber: target.episodeNumber,
            openedAt: Date.now()
        };
        localStorage.setItem(PENDING_CONFIRM_KEY, JSON.stringify(pendingEpisodeConfirmation));
    }

    function clearPendingEpisodeConfirmation() {
        pendingEpisodeConfirmation = null;
        localStorage.removeItem(PENDING_CONFIRM_KEY);
    }

    function closePlaybackConfirmModal() {
        playbackConfirmModal?.classList.add('hidden');
    }

    function markEpisodeAsWatched(arcName, episodeNumber) {
        if (!arcName || !Number.isInteger(episodeNumber)) return;
        if (!episodeProgress[arcName]) episodeProgress[arcName] = [];
        if (!episodeProgress[arcName].includes(episodeNumber)) {
            episodeProgress[arcName].push(episodeNumber);
            episodeProgress[arcName].sort((a, b) => a - b);
        }
        localStorage.setItem('onepace_episode_progress', JSON.stringify(episodeProgress));
        renderJourney();
    }

    function maybePromptPendingEpisodeConfirmation() {
        if (!pendingEpisodeConfirmation || !playbackConfirmModal || !playbackConfirmMessage) return;
        if (!playbackConfirmModal.classList.contains('hidden')) return;
        if (Date.now() - pendingEpisodeConfirmation.openedAt < MIN_RETURN_PROMPT_DELAY_MS) return;
        if (document.visibilityState === 'hidden') return;

        playbackConfirmMessage.textContent =
            `${pendingEpisodeConfirmation.arcName} - Episode ${pendingEpisodeConfirmation.episodeNumber}`;
        playbackConfirmModal.classList.remove('hidden');
    }

    async function resolveNextEpisodeUrl(target) {
        if (!target) return null;
        const details = (window.EPISODE_DATA || {})[target.arc.name];
        const curatedLinks = Array.isArray(details?.links) ? details.links : [];
        const pdListBaseUrl = getPixeldrainListUrlForChecklist(curatedLinks);
        if (!pdListBaseUrl) return null;

        const listId = pixeldrainListIdFromUrl(pdListBaseUrl);
        if (listId) {
            const meta = await fetchPixeldrainListMeta(listId);
            if (meta && meta.file_count != null && meta.file_count < target.episodeNumber) {
                return null;
            }
        }

        return buildPixeldrainListEpisodeUrl(pdListBaseUrl, target.episodeNumber);
    }

    function createArcElement(arc, isWatched) {
        const clone = template.content.cloneNode(true);
        const item = clone.querySelector('.timeline-item');

        item.querySelector('.arc-number').textContent = `Arc #${arc.no}`;
        item.querySelector('.arc-name').textContent = arc.name;
        item.querySelector('.episodes').textContent = `${arc.episodesCount} Pace Episodes`;
        item.querySelector('.savings').textContent = `${arc.saved}m saved`;

        const badge = item.querySelector('.arc-badge');
        badge.textContent = arc.status;
        badge.className = `arc-badge badge-${arc.status.toLowerCase()}`;

        // Local progress within arc
        const watchedCount = episodeProgress[arc.name]?.length || (isWatched ? arc.episodesCount : 0);
        const progressPct = arc.episodesCount > 0 ? (watchedCount / arc.episodesCount) * 100 : 0;

        item.querySelector('.arc-progress-fill').style.width = `${progressPct}%`;
        item.querySelector('.arc-count-text').textContent = `${watchedCount} / ${arc.episodesCount} Episodes Finished`;

        const toggleBtn = item.querySelector('.toggle-watched');
        if (isWatched) {
            toggleBtn.textContent = 'Unmark';
            toggleBtn.classList.replace('btn-primary', 'btn-outline');
        }

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isWatched) {
                watchedUpToIndex = arc.index - 1;
                // Clear episode progress for everything after this
                Object.keys(episodeProgress).forEach(key => {
                    const targetArc = allArcs.find(a => a.name === key);
                    if (targetArc && targetArc.index >= arc.index) {
                        delete episodeProgress[key];
                    }
                });
            } else {
                watchedUpToIndex = arc.index;
                // Mark all previous arcs' episodes as watched
                allArcs.forEach(a => {
                    if (a.index <= arc.index) {
                        episodeProgress[a.name] = Array.from({ length: a.episodesCount }, (_, i) => i + 1);
                    }
                });
            }
            localStorage.setItem('onepace_watched_index', watchedUpToIndex);
            localStorage.setItem('onepace_episode_progress', JSON.stringify(episodeProgress));
            renderJourney();
        });

        item.querySelector('.view-details').addEventListener('click', () => {
            void showDetails(arc).catch((err) => console.error('Arc details failed', err));
        });

        return item;
    }

    function normalizeArcSearchLabel(name) {
        return String(name).replace(/\s+/g, ' ').trim();
    }

    /**
     * Per-arc torrent/stream discovery (always real tracker / aggregator URLs, not a generic homepage).
     * Curated links from data.js are prepended when present.
     */
    function streamDiscoveryLinksForArc(arcName) {
        const label = normalizeArcSearchLabel(arcName);
        const qNyaa = encodeURIComponent(`One Pace ${label}`);
        const qTosho = encodeURIComponent(`one pace ${label}`);
        const qTokyo = encodeURIComponent(`One Pace ${label}`);
        return [
            { type: 'NYAA — torrents (this arc)', url: `https://nyaa.si/?f=0&c=0_0&q=${qNyaa}` },
            { type: 'AnimeTosho — mirrors & magnets', url: `https://animetosho.org/search?q=${qTosho}` },
            { type: 'Tokyo Toshokan — search', url: `https://www.tokyotosho.info/search.php?terms=${qTokyo}&cat=1` }
        ];
    }

    const pixeldrainListApiCache = new Map();

    /**
     * Prefer a 720p Pixeldrain list when the arc has multiple qualities; otherwise first list link.
     */
    function getPixeldrainListUrlForChecklist(links) {
        if (!Array.isArray(links) || links.length === 0) return null;
        const pd = links.filter(
            l => l && l.url && /pixeldrain\.net\/l\//i.test(l.url)
        );
        if (pd.length === 0) return null;
        const p720 = pd.find(l => /720p/i.test(l.type));
        return p720 ? p720.url : pd[0].url;
    }

    function pixeldrainListIdFromUrl(listUrl) {
        const m = String(listUrl).match(/pixeldrain\.net\/l\/([A-Za-z0-9]+)/i);
        return m ? m[1] : null;
    }

    /**
     * Pixeldrain’s list viewer uses 0-based indices in the hash (#item=) matching file order. Pace episode 1 → #item=0.
     */
    function buildPixeldrainListEpisodeUrl(listUrl, episodeNumber) {
        const base = String(listUrl).split('#')[0];
        const idx = Math.max(0, episodeNumber - 1);
        return `${base}#item=${idx}`;
    }

    function getAnimeEpisodeLabel(arcName, episodeNumber) {
        const map = (window.EPISODE_ANIME_MAP || {})[arcName];
        const raw = map && map[episodeNumber];
        if (!raw) return '';
        return `Ep ${raw} (anime)`;
    }

    async function fetchPixeldrainListMeta(listId) {
        if (pixeldrainListApiCache.has(listId)) {
            return pixeldrainListApiCache.get(listId);
        }
        try {
            const r = await fetch(`https://pixeldrain.net/api/list/${listId}`);
            if (!r.ok) {
                pixeldrainListApiCache.set(listId, null);
                return null;
            }
            const j = await r.json();
            if (!j.success) {
                pixeldrainListApiCache.set(listId, null);
                return null;
            }
            pixeldrainListApiCache.set(listId, j);
            return j;
        } catch (e) {
            pixeldrainListApiCache.set(listId, null);
            return null;
        }
    }

    async function showDetails(arc) {
        const episodeData = window.EPISODE_DATA || {};
        const details = episodeData[arc.name] || { links: [] };
        const watchedList = episodeProgress[arc.name] || [];

        const curated = Array.isArray(details.links) ? details.links : [];
        const discovery = streamDiscoveryLinksForArc(arc.name);
        const linksToRender = curated.length > 0 ? curated : discovery;

        const linksHtml = `
                <div class="links-section">
                    <h3>Downloads & Streams</h3>
                    <div class="links-flex">
                        ${linksToRender.map(link => `
                            <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="torrent-link">
                                ${link.type}
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;

        const pdListBaseUrl = getPixeldrainListUrlForChecklist(curated);
        let pdMismatchHtml = '';
        if (pdListBaseUrl) {
            const listId = pixeldrainListIdFromUrl(pdListBaseUrl);
            if (listId) {
                const meta = await fetchPixeldrainListMeta(listId);
                if (meta && meta.file_count != null && meta.file_count !== arc.episodesCount) {
                    pdMismatchHtml = `<p class="ep-pd-warning" role="status">This Pixeldrain list has <strong>${meta.file_count}</strong> file(s), but this arc has <strong>${arc.episodesCount}</strong> episodes. Per-episode links may not line up with each episode number.</p>`;
                }
            }
        }

        const episodesHtml = `
            <div class="links-section">
                <h3>Episode Checklist</h3>
                <p class="ep-pd-checklist-hint">“Open” goes to the episode in Pixeldrain, using the 720p list when this arc has one; otherwise the first Pixeldrain link above.</p>
                ${pdMismatchHtml}
                <div class="episode-grid">
                    ${Array.from({ length: arc.episodesCount }, (_, i) => {
            const epNo = i + 1;
            const isWatched = watchedList.includes(epNo);
            const animeLabel = getAnimeEpisodeLabel(arc.name, epNo);
            const pdUrl = pdListBaseUrl
                ? buildPixeldrainListEpisodeUrl(pdListBaseUrl, epNo)
                : '';
            const openRow = pdListBaseUrl
                ? `<a class="ep-pixeldrain-link" href="${pdUrl}" target="_blank" rel="noopener noreferrer">Open</a>`
                : '';
            return `
                            <div class="episode-item ${isWatched ? 'watched' : ''}" data-ep="${epNo}">
                                <button type="button" class="episode-item-toggle" aria-pressed="${isWatched ? 'true' : 'false'}" aria-label="Mark episode ${epNo} as watched or unwatched">
                                <div class="ep-checkbox">${isWatched ? '✓' : ''}</div>
                                <span class="ep-label">Episode ${epNo}</span>
                                ${animeLabel ? `<span class="ep-anime-label">${animeLabel}</span>` : ''}
                                </button>
                                ${openRow}
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;

        modalBody.innerHTML = `
            <h2 class="modal-title">${arc.name}</h2>
            <div class="modal-meta">
                <span><strong>Status:</strong> ${arc.status}</span>
                <span><strong>Manga:</strong> Chapters ${arc.chapters}</span>
                ${arc.animeEpisodes ? `<span><strong>Anime:</strong> Episodes ${arc.animeEpisodes}</span>` : ''}
                <span><strong>Quality:</strong> ${arc.resolution}</span>
            </div>
            <p style="margin-bottom: 1.5rem; opacity: 0.8;">${details.description || 'Continue the Straw Hat adventure.'}</p>
            <div class="glass-card" style="padding: 1.5rem; margin-bottom: 2rem; border-color: rgba(255,215,0,0.2);">
                <p><strong>Pacing Guide:</strong> ${arc.guide}</p>
                <p>Contains ${arc.episodesCount} Pace episodes, saving <strong>${arc.saved} minutes</strong> (${arc.savedPct}).</p>
            </div>
            ${linksHtml}
            ${episodesHtml}
        `;

        const hintEl = modalBody.querySelector('.ep-pd-checklist-hint');
        if (hintEl) {
            hintEl.hidden = !pdListBaseUrl;
        }

        modalBody.querySelectorAll('.episode-item-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.episode-item');
                const epNo = parseInt(item.dataset.ep, 10);
                if (!episodeProgress[arc.name]) episodeProgress[arc.name] = [];

                const idx = episodeProgress[arc.name].indexOf(epNo);
                if (idx > -1) {
                    episodeProgress[arc.name].splice(idx, 1);
                    item.classList.remove('watched');
                    item.querySelector('.ep-checkbox').textContent = '';
                    btn.setAttribute('aria-pressed', 'false');
                } else {
                    episodeProgress[arc.name].push(epNo);
                    item.classList.add('watched');
                    item.querySelector('.ep-checkbox').textContent = '✓';
                    btn.setAttribute('aria-pressed', 'true');
                }

                localStorage.setItem('onepace_episode_progress', JSON.stringify(episodeProgress));
                renderJourney();
            });
        });

        modal.classList.remove('hidden');
    }

    if (playNextEpisodeBtn) {
        playNextEpisodeBtn.addEventListener('click', async () => {
            const target = getNextEpisodeTarget();
            if (!target) {
                showNextEpisodeFallbackModal(null);
                return;
            }

            const nextUrl = await resolveNextEpisodeUrl(target);
            if (!nextUrl) {
                showNextEpisodeFallbackModal(target);
                return;
            }

            savePendingEpisodeConfirmation(target);
            window.open(nextUrl, '_blank', 'noopener,noreferrer');
        });
    }

    closeNextEpisodeModalBtn?.addEventListener('click', () => nextEpisodeModal?.classList.add('hidden'));
    nextEpisodeModal?.addEventListener('click', (e) => {
        if (e.target === nextEpisodeModal) nextEpisodeModal.classList.add('hidden');
    });

    closePlaybackConfirmModalBtn?.addEventListener('click', closePlaybackConfirmModal);
    playbackConfirmLaterBtn?.addEventListener('click', closePlaybackConfirmModal);
    playbackConfirmWatchedBtn?.addEventListener('click', () => {
        if (!pendingEpisodeConfirmation) return;
        markEpisodeAsWatched(pendingEpisodeConfirmation.arcName, pendingEpisodeConfirmation.episodeNumber);
        clearPendingEpisodeConfirmation();
        closePlaybackConfirmModal();
    });
    playbackConfirmModal?.addEventListener('click', (e) => {
        if (e.target === playbackConfirmModal) closePlaybackConfirmModal();
    });
    window.addEventListener('focus', maybePromptPendingEpisodeConfirmation);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') maybePromptPendingEpisodeConfirmation();
    });

    pendingEpisodeConfirmation = loadPendingEpisodeConfirmation();
    init();
});
