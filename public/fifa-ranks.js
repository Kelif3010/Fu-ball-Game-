(() => {
  const FIFA_RANKS = {
    "Argentina": 1,
    "Spain": 2,
    "France": 3,
    "England": 4,
    "Portugal": 5,
    "Brazil": 6,
    "Morocco": 7,
    "Netherlands": 8,
    "Belgium": 9,
    "Germany": 10,
    "Croatia": 11,
    "Mexico": 13,
    "Colombia": 14,
    "USA": 15,
    "Senegal": 16,
    "Uruguay": 17,
    "Japan": 18,
    "Switzerland": 19,
    "Iran": 20,
    "South Korea": 22,
    "Turkey": 23,
    "Ecuador": 24,
    "Austria": 25,
    "Australia": 27,
    "Algeria": 28,
    "Egypt": 29,
    "Norway": 30,
    "Canada": 31,
    "Ivory Coast": 33,
    "Panama": 34,
    "Sweden": 38,
    "Scotland": 40,
    "Paraguay": 42,
    "Czech Republic": 43,
    "Tunisia": 45,
    "DR Congo": 46,
    "Uzbekistan": 50,
    "Qatar": 56,
    "Iraq": 57,
    "Saudi Arabia": 60,
    "South Africa": 61,
    "Bosnia and Herzegovina": 63,
    "Jordan": 64,
    "Cape Verde": 67,
    "Ghana": 73,
    "Curaçao": 82,
    "Haiti": 83,
    "New Zealand": 85,
  };

  const ALIASES = {
    "argentinien": "Argentina",
    "spanien": "Spain",
    "frankreich": "France",
    "england": "England",
    "portugal": "Portugal",
    "brasilien": "Brazil",
    "marokko": "Morocco",
    "niederlande": "Netherlands",
    "belgien": "Belgium",
    "deutschland": "Germany",
    "kroatien": "Croatia",
    "mexiko": "Mexico",
    "kolumbien": "Colombia",
    "usa": "USA",
    "senegal": "Senegal",
    "uruguay": "Uruguay",
    "japan": "Japan",
    "schweiz": "Switzerland",
    "iran": "Iran",
    "ir iran": "Iran",
    "sudkorea": "South Korea",
    "republik korea": "South Korea",
    "turkei": "Turkey",
    "ecuador": "Ecuador",
    "osterreich": "Austria",
    "australien": "Australia",
    "algerien": "Algeria",
    "agypten": "Egypt",
    "norwegen": "Norway",
    "kanada": "Canada",
    "elfenbeinkuste": "Ivory Coast",
    "panama": "Panama",
    "schweden": "Sweden",
    "schottland": "Scotland",
    "paraguay": "Paraguay",
    "tschechien": "Czech Republic",
    "czech republic": "Czech Republic",
    "tunesien": "Tunisia",
    "dr kongo": "DR Congo",
    "dr congo": "DR Congo",
    "kongo dr": "DR Congo",
    "usbekistan": "Uzbekistan",
    "katar": "Qatar",
    "irak": "Iraq",
    "saudi arabien": "Saudi Arabia",
    "saudi arabia": "Saudi Arabia",
    "sudafrika": "South Africa",
    "south africa": "South Africa",
    "bosnien herzegowina": "Bosnia and Herzegovina",
    "bosnien und herzegowina": "Bosnia and Herzegovina",
    "bosnia herzegovina": "Bosnia and Herzegovina",
    "bosnia and herzegovina": "Bosnia and Herzegovina",
    "jordanien": "Jordan",
    "kap verde": "Cape Verde",
    "cape verde": "Cape Verde",
    "ghana": "Ghana",
    "curacao": "Curaçao",
    "curaçao": "Curaçao",
    "haiti": "Haiti",
    "neuseeland": "New Zealand",
    "new zealand": "New Zealand",
  };

  const normalize = value => String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/#[0-9]+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  const resolveTeam = text => {
    const normalized = normalize(text);
    if (ALIASES[normalized]) return ALIASES[normalized];
    return Object.keys(ALIASES).find(alias => normalized === alias || normalized.endsWith(` ${alias}`) || normalized.startsWith(`${alias} `)) ? ALIASES[Object.keys(ALIASES).find(alias => normalized === alias || normalized.endsWith(` ${alias}`) || normalized.startsWith(`${alias} `))] : null;
  };

  const ensureStyles = () => {
    if (document.getElementById("fifa-rank-badge-styles")) return;
    const style = document.createElement("style");
    style.id = "fifa-rank-badge-styles";
    style.textContent = `
      .fifa-ranked-team {
        display: inline-flex !important;
        align-items: center;
        gap: 6px;
        min-width: 0;
        max-width: 100%;
      }

      .fifa-rank-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        border: 1px solid rgba(148,163,184,.22);
        background: rgba(148,163,184,.12);
        color: #cbd5e1;
        border-radius: 999px;
        padding: 2px 6px;
        font-size: 10px;
        font-weight: 950;
        line-height: 1;
        letter-spacing: .1px;
      }

      .fifa-team-name {
        min-width: 0;
        max-width: 100%;
        overflow: visible;
        text-overflow: clip;
        white-space: normal;
        line-height: 1.15;
      }

      @media (max-width: 640px) {
        .fifa-ranked-team {
          flex-direction: column;
          gap: 2px;
          align-items: flex-start;
          justify-content: center;
        }

        .fifa-ranked-team[data-fifa-align="right"] {
          align-items: flex-end;
        }

        .fifa-rank-badge {
          padding: 2px 5px;
          font-size: 9px;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const makeBadge = rank => {
    const badge = document.createElement("span");
    badge.className = "fifa-rank-badge";
    badge.textContent = `#${rank}`;
    return badge;
  };

  const applyRanks = () => {
    document.querySelectorAll("strong").forEach(strong => {
      if (strong.dataset.fifaRankApplied === "true") return;
      if (strong.querySelector(".fifa-rank-badge")) return;

      const originalText = strong.textContent.trim();
      const team = resolveTeam(originalText);
      const rank = team ? FIFA_RANKS[team] : null;
      if (!rank) return;

      const parentAlign = window.getComputedStyle(strong.parentElement || strong).textAlign;
      const original = document.createElement("span");
      original.className = "fifa-team-name";
      original.textContent = originalText;

      strong.textContent = "";
      strong.dataset.fifaRankApplied = "true";
      strong.dataset.fifaAlign = parentAlign === "right" ? "right" : "left";
      strong.title = `${originalText} · FIFA-Weltrangliste #${rank}`;
      strong.classList.add("fifa-ranked-team");
      strong.style.justifyContent = parentAlign === "right" ? "flex-end" : "flex-start";
      strong.append(makeBadge(rank), original);
    });
  };

  const boot = () => {
    ensureStyles();
    applyRanks();
    const root = document.getElementById("root") || document.body;
    const observer = new MutationObserver(() => window.requestAnimationFrame(applyRanks));
    observer.observe(root, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
