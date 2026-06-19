// ============================================================
// BRACKET PATH 26 — App logic
// ============================================================

const D = window.WC26_DATA;

// state[groupNum] = { order: [team0, team1, team2, team3] (in current pos order), thirdStatus: "qualified"|"out"|null }
const state = {};
for (const g in D.GROUPS) {
  state[g] = {
    order: D.GROUPS[g].teams.map((t) => ({ ...t })),
    thirdStatus: null,
  };
}

let dragSrcGroup = null;
let dragSrcIndex = null;

// Touch-drag state (separate from HTML5 drag API, which doesn't fire on mobile)
let touchState = null; // { group, fromIndex, rowEl, startY, currentY, placeholder, rowHeight }

// ---------- RENDER GROUPS ----------
function flagUrl(code) {
  return `https://flagcdn.com/h40/${code}.png`;
}

function reorderGroup(gNum, fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  const arr = state[gNum].order;
  const [moved] = arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, moved);
  renderGroups();
}

function renderGroups() {
  const grid = document.getElementById("groupsGrid");
  grid.innerHTML = "";

  for (const gNum in D.GROUPS) {
    const card = document.createElement("div");
    card.className = "group-card";
    card.innerHTML = `<div class="group-card-head">${D.GROUPS[gNum].name}</div>`;

    const list = document.createElement("div");
    list.className = "team-list";
    list.dataset.group = gNum;

    state[gNum].order.forEach((team, idx) => {
      const row = document.createElement("div");
      row.className = "team-row";
      row.draggable = true; // desktop: native HTML5 drag
      row.dataset.pos = idx;
      row.dataset.group = gNum;
      row.dataset.index = idx;

      const posLabel = idx === 0 ? "1st" : idx === 1 ? "2nd" : idx === 2 ? "3rd" : "4th";

      row.innerHTML = `
        <span class="pos-badge">${posLabel}</span>
        <img class="team-flag" src="${flagUrl(team.flag)}" alt="${team.name} flag" onerror="this.style.display='none'">
        <span class="team-name">${team.name}</span>
        <span class="drag-handle">⠿</span>
      `;

      // ---- Desktop mouse drag (HTML5 native) ----
      row.addEventListener("dragstart", () => {
        dragSrcGroup = gNum;
        dragSrcIndex = idx;
        row.classList.add("dragging");
      });
      row.addEventListener("dragend", () => row.classList.remove("dragging"));
      row.addEventListener("dragover", (e) => e.preventDefault());
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        if (dragSrcGroup === gNum) {
          reorderGroup(gNum, dragSrcIndex, idx);
        }
      });

      // ---- Mobile touch drag (manual, via the drag-handle) ----
      const handle = row.querySelector(".drag-handle");
      handle.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          const touch = e.touches[0];
          touchState = {
            group: gNum,
            fromIndex: idx,
            currentIndex: idx,
            rowEl: row,
            startY: touch.clientY,
            rowHeight: row.offsetHeight + 6, // includes margin-bottom
            listEl: list,
          };
          row.classList.add("dragging");
          row.style.position = "relative";
          row.style.zIndex = "10";
        },
        { passive: false }
      );

      list.appendChild(row);
    });

    card.appendChild(list);

    // Third place toggle — only show if this group's 3rd place is in ANY eligible pool
    const isEligible = Object.values(D.THIRD_PLACE_POOLS).some((pool) => pool.includes(Number(gNum)));
    if (isEligible) {
      const toggle = document.createElement("div");
      toggle.className = "third-place-toggle";
      const qBtn = document.createElement("button");
      qBtn.className = "tp-btn" + (state[gNum].thirdStatus === "qualified" ? " active-q" : "");
      qBtn.textContent = "3rd Qualifies";
      qBtn.onclick = () => {
        state[gNum].thirdStatus = state[gNum].thirdStatus === "qualified" ? null : "qualified";
        renderGroups();
      };
      const outBtn = document.createElement("button");
      outBtn.className = "tp-btn" + (state[gNum].thirdStatus === "out" ? " active-out" : "");
      outBtn.textContent = "3rd Eliminated";
      outBtn.onclick = () => {
        state[gNum].thirdStatus = state[gNum].thirdStatus === "out" ? null : "out";
        renderGroups();
      };
      toggle.appendChild(qBtn);
      toggle.appendChild(outBtn);
      card.appendChild(toggle);
    }

    grid.appendChild(card);
  }

  updateThirdPlaceBanner();
}

function updateThirdPlaceBanner() {
  const qualifiedCount = Object.values(state).filter((s) => s.thirdStatus === "qualified").length;
  document.getElementById("tpbCount").textContent = `${qualifiedCount} of 8 marked as qualified`;

  const buildBtn = document.getElementById("buildBracketBtn");
  buildBtn.disabled = qualifiedCount !== 8;
}

// ---------- RESOLVE SLOT CODES INTO TEAM OBJECTS ----------
function resolveSlot(code, matchResults) {
  // "1st-N" / "2nd-N"
  let m = code.match(/^1st-(\d+)$/);
  if (m) return state[m[1]].order[0];
  m = code.match(/^2nd-(\d+)$/);
  if (m) return state[m[1]].order[1];

  // "3rd-{matchId}" -> find which group's 3rd place was assigned to this slot's pool
  m = code.match(/^3rd-(\d+)$/);
  if (m) {
    const matchId = Number(m[1]);
    const pool = D.THIRD_PLACE_POOLS[matchId];
    // Find qualified groups from this pool, assign deterministically by group order
    const qualifiedInPool = pool.filter((g) => state[g].thirdStatus === "qualified");
    if (qualifiedInPool.length === 0) return null;
    // Use a stable assignment: sort qualified-in-pool groups, pick first not yet used
    const used = matchResults.__usedThirdPlace || (matchResults.__usedThirdPlace = new Set());
    const available = qualifiedInPool.filter((g) => !used.has(g));
    if (available.length === 0) return null;
    const chosenGroup = available[0];
    used.add(chosenGroup);
    return { ...state[chosenGroup].order[2], fromGroup: chosenGroup };
  }

  // "W{id}" -> winner placeholder (TBD, since we don't simulate match outcomes)
  m = code.match(/^W(\d+)$/);
  if (m) return { tbd: true, label: `Winner of Match ${m[1]}` };

  // "L{id}" -> loser placeholder
  m = code.match(/^L(\d+)$/);
  if (m) return { tbd: true, label: `Loser of Match ${m[1]}` };

  return null;
}

// ---------- RENDER BRACKET ----------
function teamHtml(team) {
  if (!team) return `<div class="match-team tbd">TBD</div>`;
  if (team.tbd) return `<div class="match-team tbd">${team.label}</div>`;
  return `<div class="match-team"><img src="${flagUrl(team.flag)}" alt="" onerror="this.style.display='none'">${team.name}</div>`;
}

function renderMatchCard(match, isFinal) {
  const matchResults = window.__matchResultsCache;
  const home = resolveSlot(match.home, matchResults);
  const away = resolveSlot(match.away, matchResults);

  return `
    <div class="match-card ${isFinal ? "final-card" : ""}">
      <div class="match-meta"><span>M${match.id}</span><span>${match.venue}</span></div>
      ${teamHtml(home)}
      <div class="match-divider"></div>
      ${teamHtml(away)}
    </div>
  `;
}

function renderBracket() {
  window.__matchResultsCache = {}; // reset 3rd-place assignment tracking per render

  const container = document.getElementById("bracketContainer");

  const rounds = [
    { label: "Round of 32", matches: D.ROUND_OF_32 },
    { label: "Round of 16", matches: D.ROUND_OF_16 },
    { label: "Quarter-Finals", matches: D.QUARTERFINALS },
    { label: "Semi-Finals", matches: D.SEMIFINALS },
    { label: "Final", matches: [D.FINAL] },
  ];

  let html = `<div class="bracket-rounds">`;
  rounds.forEach((round) => {
    html += `<div class="bracket-round"><div class="round-label">${round.label}</div>`;
    round.matches.forEach((m) => {
      html += renderMatchCard(m, round.label === "Final");
    });
    html += `</div>`;
  });
  html += `</div>`;

  container.innerHTML = html;
}

// ---------- GLOBAL TOUCH MOVE / END (drives mobile drag-reorder) ----------
document.addEventListener(
  "touchmove",
  (e) => {
    if (!touchState) return;
    e.preventDefault();
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchState.startY;
    touchState.rowEl.style.transform = `translateY(${deltaY}px)`;

    // Figure out how many rows we've crossed
    const rowsMoved = Math.round(deltaY / touchState.rowHeight);
    const groupLen = state[touchState.group].order.length;
    let newIndex = touchState.fromIndex + rowsMoved;
    newIndex = Math.max(0, Math.min(groupLen - 1, newIndex));
    touchState.currentIndex = newIndex;
  },
  { passive: false }
);

document.addEventListener("touchend", () => {
  if (!touchState) return;
  const { group, fromIndex, currentIndex, rowEl } = touchState;
  rowEl.style.transform = "";
  rowEl.style.position = "";
  rowEl.style.zIndex = "";
  rowEl.classList.remove("dragging");
  touchState = null;
  reorderGroup(group, fromIndex, currentIndex);
});

// ---------- EVENTS ----------
document.getElementById("scrollToGroups").addEventListener("click", () => {
  document.getElementById("groups-section").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("buildBracketBtn").addEventListener("click", () => {
  renderBracket();
  const bracketSection = document.getElementById("bracket-section");
  bracketSection.classList.add("visible");
  bracketSection.scrollIntoView({ behavior: "smooth" });
});

document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("bracket-section").classList.remove("visible");
  document.getElementById("groups-section").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("shareBtn").addEventListener("click", () => {
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({ title: "My World Cup 2026 Bracket Path", url });
  } else {
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById("shareBtn");
      const original = btn.textContent;
      btn.textContent = "✓ Link copied!";
      setTimeout(() => (btn.textContent = original), 2000);
    });
  }
});

// ---------- INIT ----------
renderGroups();
