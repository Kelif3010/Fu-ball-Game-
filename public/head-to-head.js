(() => {
  const PARTICIPANTS = {
    Berkant: ["Portugal", "Norway", "USA", "Scotland", "South Africa", "Jordan"],
    Bora: ["Brazil", "Senegal", "Switzerland", "Mexico", "Uzbekistan", "Saudi Arabia"],
    Can: ["Netherlands", "Turkey", "Uruguay", "Ghana", "South Korea", "Iran"],
    Dogan: ["France", "Morocco", "Ecuador", "Paraguay", "Tunisia", "Panama"],
    Fayit: ["Argentina", "Sweden", "Colombia", "Czech Republic", "Australia", "Qatar"],
    Hasret: ["Germany", "Belgium", "Algeria", "Canada", "Haiti", "Iraq"],
    Ken: ["Spain", "Croatia", "Austria", "DR Congo", "Egypt", "Curaçao"],
    Selcuk: ["England", "Ivory Coast", "Japan", "Bosnia and Herzegovina", "Cape Verde", "New Zealand"],
  };

  const FLAGS = {
    Portugal: "🇵🇹", Norway: "🇳🇴", USA: "🇺🇸", Scotland: "🏴", "South Africa": "🇿🇦", Jordan: "🇯🇴",
    Brazil: "🇧🇷", Senegal: "🇸🇳", Switzerland: "🇨🇭", Mexico: "🇲🇽", Uzbekistan: "🇺🇿", "Saudi Arabia": "🇸🇦",
    Netherlands: "🇳🇱", Turkey: "🇹🇷", Uruguay: "🇺🇾", Ghana: "🇬🇭", "South Korea": "🇰🇷", Iran: "🇮🇷",
    France: "🇫🇷", Morocco: "🇲🇦", Ecuador: "🇪🇨", Paraguay: "🇵🇾", Tunisia: "🇹🇳", Panama: "🇵🇦",
    Argentina: "🇦🇷", Sweden: "🇸🇪", Colombia: "🇨🇴", "Czech Republic": "🇨🇿", Australia: "🇦🇺", Qatar: "🇶🇦",
    Germany: "🇩🇪", Belgium: "🇧🇪", Algeria: "🇩🇿", Canada: "🇨🇦", Haiti: "🇭🇹", Iraq: "🇮🇶",
    Spain: "🇪🇸", Croatia: "🇭🇷", Austria: "🇦🇹", "DR Congo": "🇨🇩", Egypt: "🇪🇬", Curaçao: "🇨🇼",
    England: "🏴", "Ivory Coast": "🇨🇮", Japan: "🇯🇵", "Bosnia and Herzegovina": "🇧🇦", "Cape Verde": "🇨🇻", "New Zealand": "🇳🇿",
  };

  const DE = {
    Portugal: "Portugal", Norway: "Norwegen", USA: "USA", Scotland: "Schottland", "South Africa": "Südafrika", Jordan: "Jordanien",
    Brazil: "Brasilien", Senegal: "Senegal", Switzerland: "Schweiz", Mexico: "Mexiko", Uzbekistan: "Usbekistan", "Saudi Arabia": "Saudi-Arabien",
    Netherlands: "Niederlande", Turkey: "Türkei", Uruguay: "Uruguay", Ghana: "Ghana", "South Korea": "Südkorea", Iran: "Iran",
    France: "Frankreich", Morocco: "Marokko", Ecuador: "Ecuador", Paraguay: "Paraguay", Tunisia: "Tunesien", Panama: "Panama",
    Argentina: "Argentinien", Sweden: "Schweden", Colombia: "Kolumbien", "Czech Republic": "Tschechien", Australia: "Australien", Qatar: "Katar",
    Germany: "Deutschland", Belgium: "Belgien", Algeria: "Algerien", Canada: "Kanada", Haiti: "Haiti", Iraq: "Irak",
    Spain: "Spanien", Croatia: "Kroatien", Austria: "Österreich", "DR Congo": "DR Kongo", Egypt: "Ägypten", Curaçao: "Curaçao",
    England: "England", "Ivory Coast": "Elfenbeinküste", Japan: "Japan", "Bosnia and Herzegovina": "Bosnien-Herzegowina", "Cape Verde": "Kap Verde", "New Zealand": "Neuseeland",
  };

  const COLORS = {
    Berkant: "#f59e0b", Bora: "#10b981", Can: "#3b82f6", Dogan: "#8b5cf6",
    Fayit: "#ef4444", Hasret: "#f97316", Ken: "#06b6d4", Selcuk: "#84cc16",
  };

  const PERSON_ORDER = Object.keys(PARTICIPANTS);
  const TEAM_OWNER = Object.fromEntries(Object.entries(PARTICIPANTS).flatMap(([person, teams]) => teams.map(team => [team, person])));
  let scoreCache = { savedAt: 0, data: null };

  function ownerOf(team) {
    return TEAM_OWNER[team] || "";
  }

  function teamLabel(team) {
    return `${FLAGS[team] || ""} ${DE[team] || team || "Team"}`.trim();
  }

  function scoreNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function matchTimestamp(match) {
    const date = match?.date || "0000-00-00";
    const time = match?.time || "00:00";
    const parsed = new Date(`${date}T${time}:00`).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function pluralWins(value) {
    return value === 1 ? "Sieg" : "Siege";
  }

  function pairKey(a, b) {
    return [a, b].sort((x, y) => PERSON_ORDER.indexOf(x) - PERSON_ORDER.indexOf(y)).join("__");
  }

  function preferredDisplayOrder(record) {
    const [a, b] = record.people;
    const aScore = record.wins[a] - record.wins[b];
    const bScore = record.wins[b] - record.wins[a];
    if (bScore > aScore) return [b, a];
    if (aScore > bScore) return [a, b];
    if (record.goals[b] > record.goals[a]) return [b, a];
    return [a, b];
  }

  function buildHeadToHead(matches) {
    const records = new Map();

    (matches || []).forEach(match => {
      const homeGoals = scoreNumber(match?.homeGoals);
      const awayGoals = scoreNumber(match?.awayGoals);
      if (homeGoals === null || awayGoals === null) return;

      const homeOwner = ownerOf(match.homeTeam);
      const awayOwner = ownerOf(match.awayTeam);
      if (!homeOwner || !awayOwner || homeOwner === awayOwner) return;

      const key = pairKey(homeOwner, awayOwner);
      if (!records.has(key)) {
        const people = key.split("__");
        records.set(key, {
          key,
          people,
          games: 0,
          draws: 0,
          wins: Object.fromEntries(people.map(person => [person, 0])),
          goals: Object.fromEntries(people.map(person => [person, 0])),
          lastMatch: null,
        });
      }

      const record = records.get(key);
      record.games += 1;
      record.goals[homeOwner] += homeGoals;
      record.goals[awayOwner] += awayGoals;

      if (homeGoals > awayGoals) record.wins[homeOwner] += 1;
      else if (awayGoals > homeGoals) record.wins[awayOwner] += 1;
      else record.draws += 1;

      if (!record.lastMatch || matchTimestamp(match) > matchTimestamp(record.lastMatch)) {
        record.lastMatch = match;
      }
    });

    return Array.from(records.values()).sort((left, right) => {
      const [la, lb] = preferredDisplayOrder(left);
      const [ra, rb] = preferredDisplayOrder(right);
      const leftDiff = Math.abs(left.wins[la] - left.wins[lb]);
      const rightDiff = Math.abs(right.wins[ra] - right.wins[rb]);
      return right.games - left.games || rightDiff - leftDiff || (right.goals[ra] + right.goals[rb]) - (left.goals[la] + left.goals[lb]) || `${la}-${lb}`.localeCompare(`${ra}-${rb}`);
    });
  }

  async function getScores() {
    if (scoreCache.data && Date.now() - scoreCache.savedAt < 60000) return scoreCache.data;
    const response = await fetch("/api/scores", { cache: "no-store" });
    if (!response.ok) throw new Error("Scores konnten nicht geladen werden.");
    const data = await response.json();
    scoreCache = { savedAt: Date.now(), data };
    return data;
  }

  function getStatsSubTabs() {
    return Array.from(document.querySelectorAll(".sub-tabs")).find(nav => {
      const text = nav.textContent || "";
      return text.includes("Punkte-Verlauf") && text.includes("Karten");
    });
  }

  function getContent() {
    return document.querySelector(".phone-frame .content");
  }

  function exitHeadToHead() {
    const content = getContent();
    if (content) content.classList.remove("h2h-mode");
    const button = document.querySelector("[data-h2h-tab='true']");
    if (button) button.classList.remove("active");
  }

  function ensureRoot() {
    const content = getContent();
    if (!content) return null;
    let root = content.querySelector("#head-to-head-root");
    if (!root) {
      root = document.createElement("section");
      root.id = "head-to-head-root";
      root.className = "h2h-root";
      content.appendChild(root);
    }
    return root;
  }

  function renderLoading(root) {
    root.innerHTML = `<div class="h2h-empty"><strong>⏳ Head-to-Head wird geladen…</strong><p>Ich berechne die direkten Teilnehmer-Duelle aus den beendeten Spielen.</p></div>`;
  }

  function renderError(root, error) {
    root.innerHTML = `<div class="h2h-empty h2h-error"><strong>❌ Head-to-Head konnte nicht geladen werden</strong><p>${error?.message || "Unbekannter Fehler"}</p></div>`;
  }

  function renderRecords(root, records) {
    if (!records.length) {
      root.innerHTML = `<div class="h2h-empty"><strong>🔥 Noch kein Head-to-Head</strong><p>Sobald zwei unterschiedliche Teilnehmer gegeneinander gespielt haben, erscheint hier die Bilanz.</p></div>`;
      return;
    }

    root.innerHTML = `
      <div class="h2h-head">
        <div>
          <h2>🔥 Head-to-Head</h2>
          <p>Direkte Bilanz zwischen euren Teilnehmern — perfekt für WhatsApp-Banter.</p>
        </div>
        <span>${records.length} Duelle</span>
      </div>
      <div class="h2h-list">
        ${records.map(record => {
          const [a, b] = preferredDisplayOrder(record);
          const last = record.lastMatch;
          const colorA = COLORS[a] || "#fbbf24";
          const colorB = COLORS[b] || "#94a3b8";
          return `
            <article class="h2h-card" style="--h2h-a:${colorA};--h2h-b:${colorB}">
              <div class="h2h-title-row">
                <h3>🔥 <span style="color:${colorA}">${a}</span> vs <span style="color:${colorB}">${b}</span></h3>
                <strong>${record.games} direkte ${record.games === 1 ? "Spiel" : "Spiele"}</strong>
              </div>
              <div class="h2h-statlines">
                <div><span style="color:${colorA}">${a}:</span><strong>${record.wins[a]} ${pluralWins(record.wins[a])}</strong></div>
                <div><span style="color:${colorB}">${b}:</span><strong>${record.wins[b]} ${pluralWins(record.wins[b])}</strong></div>
                <div><span>Unentschieden:</span><strong>${record.draws}</strong></div>
              </div>
              <div class="h2h-goals">
                <span>Tore:</span>
                <strong><em style="color:${colorA}">${a}-Teams</em> ${record.goals[a]} : ${record.goals[b]} <em style="color:${colorB}">${b}-Teams</em></strong>
              </div>
              ${last ? `
                <div class="h2h-last">
                  <span>Letztes Duell:</span>
                  <strong>${teamLabel(last.homeTeam)} ${last.homeGoals}:${last.awayGoals} ${teamLabel(last.awayTeam)}</strong>
                </div>` : ""}
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  async function enterHeadToHead() {
    const nav = getStatsSubTabs();
    const root = ensureRoot();
    const content = getContent();
    if (!root || !content) return;

    if (nav) {
      nav.querySelectorAll("button").forEach(button => button.classList.remove("active"));
      nav.querySelector("[data-h2h-tab='true']")?.classList.add("active");
    }

    content.classList.add("h2h-mode");
    renderLoading(root);

    try {
      const data = await getScores();
      const records = buildHeadToHead(Array.isArray(data?.played) ? data.played : []);
      renderRecords(root, records);
    } catch (error) {
      renderError(root, error);
    }
  }

  function ensureHeadToHeadButton() {
    const nav = getStatsSubTabs();
    if (!nav) return;
    nav.style.gridTemplateColumns = "repeat(3,minmax(0,1fr))";
    if (nav.querySelector("[data-h2h-tab='true']")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Head-to-Head";
    button.dataset.h2hTab = "true";
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      enterHeadToHead();
    });
    nav.appendChild(button);
  }

  document.addEventListener("click", event => {
    const subButton = event.target.closest?.(".sub-tabs button");
    if (subButton && subButton.dataset.h2hTab !== "true") exitHeadToHead();

    const navButton = event.target.closest?.(".bottom-nav-item");
    if (navButton && !/Stats/i.test(navButton.textContent || "")) exitHeadToHead();
  }, true);

  const observer = new MutationObserver(ensureHeadToHeadButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", ensureHeadToHeadButton);
  setInterval(ensureHeadToHeadButton, 700);
})();
