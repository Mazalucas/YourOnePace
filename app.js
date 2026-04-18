/**
 * One Pace Web App - Timeline Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const upcomingContainer = document.getElementById('upcoming-arcs');
    const completedContainer = document.getElementById('completed-arcs');
    const searchInput = document.getElementById('arc-search');
    const progressBar = document.getElementById('journey-progress');
    const arcsCompletedText = document.getElementById('arcs-completed');
    const totalArcsText = document.getElementById('total-arcs');
    const totalSavingsText = document.getElementById('total-savings-val');
    const template = document.getElementById('arc-card-template');
    const progressHeaderPanel = document.getElementById('progress-header-panel');
    const progressHeaderSlot = document.getElementById('progress-header-slot');

    let lastScrollY = window.scrollY;
    let progressScrollHidden = false;

    function progressSlotHeight() {
        const styles = getComputedStyle(progressHeaderPanel);
        const mt = parseFloat(styles.marginTop) || 0;
        const mb = parseFloat(styles.marginBottom) || 0;
        return progressHeaderPanel.offsetHeight + mt + mb;
    }

    function updateProgressChrome() {
        const headerEl = document.querySelector('header');
        if (headerEl) {
            const bottom = headerEl.getBoundingClientRect().bottom;
            document.documentElement.style.setProperty(
                '--progress-header-top',
                `${Math.round(bottom + 12)}px`
            );
        }
        if (!progressScrollHidden) {
            progressHeaderSlot.style.height = `${progressSlotHeight()}px`;
        }
    }

    function setProgressScrollHidden(hidden) {
        if (progressScrollHidden === hidden) return;
        progressScrollHidden = hidden;
        progressHeaderPanel.classList.toggle('is-scroll-hidden', hidden);
        progressHeaderSlot.style.height = hidden ? '0px' : `${progressSlotHeight()}px`;
    }

    let scrollRaf = 0;
    function onWindowScroll() {
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(() => {
            scrollRaf = 0;
            const y = window.scrollY;
            if (y < 32) {
                setProgressScrollHidden(false);
            } else if (y > lastScrollY + 8) {
                setProgressScrollHidden(true);
            } else if (y < lastScrollY - 8) {
                setProgressScrollHidden(false);
            }
            lastScrollY = y;
        });
    }

    window.addEventListener('scroll', onWindowScroll, { passive: true });
    window.addEventListener('resize', updateProgressChrome);
    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(updateProgressChrome);
        ro.observe(progressHeaderPanel);
        const headerForRo = document.querySelector('header');
        if (headerForRo) ro.observe(headerForRo);
    }
    updateProgressChrome();

    // Modal Elements
    const modal = document.getElementById('arc-modal');
    const modalBody = document.getElementById('modal-body');
    const closeModal = document.querySelector('.close-modal');

    let allArcs = [];
    let watchedUpToIndex = parseInt(localStorage.getItem('onepace_watched_index') || '-1');
    let episodeProgress = JSON.parse(localStorage.getItem('onepace_episode_progress') || '{}');

    // Data Portability
    const exportBtn = document.getElementById('export-progress');
    const importTrigger = document.getElementById('import-trigger');
    const importFile = document.getElementById('import-progress');

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
    };

    importTrigger.onclick = () => importFile.click();
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

        // Update Progress Header
        const totalPossibleSavings = allArcs.reduce((acc, curr) => acc + curr.saved, 0);
        totalArcsText.textContent = allArcs.length;
        arcsCompletedText.textContent = completedCount;
        totalSavingsText.textContent = completedTotalSavings.toLocaleString();

        const progressPct = (completedCount / allArcs.length) * 100;
        progressBar.style.width = `${progressPct}%`;

        requestAnimationFrame(() => updateProgressChrome());
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
            showDetails(arc);
        });

        return item;
    }

    const DEFAULT_STREAM_LINKS = [
        { type: 'One Pace — official site', url: 'https://onepace.net/watch' },
        { type: 'NYAA — search One Pace', url: 'https://nyaa.si/?f=0&c=0_0&q=One+Pace' }
    ];

    function showDetails(arc) {
        const details = window.EPISODE_DATA[arc.name] || { links: [] };
        const watchedList = episodeProgress[arc.name] || [];

        const curated = Array.isArray(details.links) ? details.links : [];
        const linksToRender = curated.length > 0 ? curated : DEFAULT_STREAM_LINKS;

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

        let episodesHtml = `
            <div class="links-section">
                <h3>Episode Checklist</h3>
                <div class="episode-grid">
                    ${Array.from({ length: arc.episodesCount }, (_, i) => {
            const epNo = i + 1;
            const isWatched = watchedList.includes(epNo);
            return `
                            <div class="episode-item ${isWatched ? 'watched' : ''}" data-ep="${epNo}">
                                <div class="ep-checkbox">${isWatched ? '✓' : ''}</div>
                                <span class="ep-label">Episode ${epNo}</span>
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

        // Add click listeners to episodes
        modalBody.querySelectorAll('.episode-item').forEach(item => {
            item.onclick = () => {
                const epNo = parseInt(item.dataset.ep);
                if (!episodeProgress[arc.name]) episodeProgress[arc.name] = [];

                const idx = episodeProgress[arc.name].indexOf(epNo);
                if (idx > -1) {
                    episodeProgress[arc.name].splice(idx, 1);
                    item.classList.remove('watched');
                    item.querySelector('.ep-checkbox').textContent = '';
                } else {
                    episodeProgress[arc.name].push(epNo);
                    item.classList.add('watched');
                    item.querySelector('.ep-checkbox').textContent = '✓';
                }

                // If all episodes watched, maybe auto-mark arc? (Decided for manual control per user request for "clarity")
                localStorage.setItem('onepace_episode_progress', JSON.stringify(episodeProgress));
                renderJourney();
            };
        });

        modal.classList.remove('hidden');
    }

    init();
});
