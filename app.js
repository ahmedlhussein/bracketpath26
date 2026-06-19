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

// ---------- RESOLVE GROUP-STAGE SLOT CODES INTO TEAM OBJECTS ----------
// (only resolves "1st-N" / "2nd-N" / "3rd-{matchId}" — i.e. Round of 32 inputs)
function resolveGroupSlot(code, usedThirdPlaceTracker) {
  let m = code.match(/^1st-(\d+)$/);
  if (m) return state[m[1]].order[0];
  m = code.match(/^2nd-(\d+)$/);
  if (m) return state[m[1]].order[1];

  m = code.match(/^3rd-(\d+)$/);
  if (m) {
    const matchId = Number(m[1]);
    const pool = D.THIRD_PLACE_POOLS[matchId];
    const qualifiedInPool = pool.filter((g) => state[g].thirdStatus === "qualified");
    const available = qualifiedInPool.filter((g) => !usedThirdPlaceTracker.has(g));
    if (available.length === 0) return null;
    const chosenGroup = available[0];
    usedThirdPlaceTracker.add(chosenGroup);
    return { ...state[chosenGroup].order[2], fromGroup: chosenGroup };
  }
  return null;
}

// ---------- SPLIT BRACKET INTO LEFT / RIGHT HALVES ----------
// Traced from the Final backward: SF "home" feeds the LEFT half, SF "away" feeds the RIGHT half.
// Every match that is an ancestor of SF-home's lineage is LEFT; everything feeding SF-away is RIGHT.
function buildSideMap() {
  const sideMap = {}; // matchId -> "left" | "right"

  function idOf(code) {
    return Number(String(code).replace("W", "").replace("L", ""));
  }

  const finalHomeSF = idOf(D.FINAL.home); // e.g. 101
  const finalAwaySF = idOf(D.FINAL.away); // e.g. 102

  function markSide(matchId, side) {
    sideMap[matchId] = side;
    // find this match's definition across all rounds to trace its own inputs
    const all = [...D.SEMIFINALS, ...D.QUARTERFINALS, ...D.ROUND_OF_16, ...D.ROUND_OF_32];
    const def = all.find((m) => m.id === matchId);
    if (!def) return; // reached Round of 32, no further ancestors to trace
    if (typeof def.home === "string" && def.home.startsWith("W")) markSide(idOf(def.home), side);
    if (typeof def.away === "string" && def.away.startsWith("W")) markSide(idOf(def.away), side);
  }

  markSide(finalHomeSF, "left");
  markSide(finalAwaySF, "right");

  return sideMap;
}
const SIDE_MAP = buildSideMap();


// winners[matchId] = the team object the user picked as winner of that match (or undefined)
const winners = {};
let allMatchesFlat = []; // built once bracket is generated: [{id, round, home, away, isFinal}]
let bracketBuilt = false;

function buildAllMatches() {
  const usedThirdPlace = new Set();

  const r32 = D.ROUND_OF_32.map((m) => ({
    ...m,
    round: "r32",
    homeTeam: resolveGroupSlot(m.home, usedThirdPlace),
    awayTeam: resolveGroupSlot(m.away, usedThirdPlace),
  }));

  // helper: get the team that WON a given match id (from r32 onward), or null if not decided yet
  function winnerOf(matchId) {
    return winners[matchId] || null;
  }

  const r16 = D.ROUND_OF_16.map((m) => {
    const homeId = Number(m.home.replace("W", ""));
    const awayId = Number(m.away.replace("W", ""));
    return { ...m, round: "r16", homeTeam: winnerOf(homeId), awayTeam: winnerOf(awayId), homeFrom: homeId, awayFrom: awayId };
  });

  const qf = D.QUARTERFINALS.map((m) => {
    const homeId = Number(m.home.replace("W", ""));
    const awayId = Number(m.away.replace("W", ""));
    return { ...m, round: "qf", homeTeam: winnerOf(homeId), awayTeam: winnerOf(awayId), homeFrom: homeId, awayFrom: awayId };
  });

  const sf = D.SEMIFINALS.map((m) => {
    const homeId = Number(m.home.replace("W", ""));
    const awayId = Number(m.away.replace("W", ""));
    return { ...m, round: "sf", homeTeam: winnerOf(homeId), awayTeam: winnerOf(awayId), homeFrom: homeId, awayFrom: awayId };
  });

  const finalHomeId = Number(D.FINAL.home.replace("W", ""));
  const finalAwayId = Number(D.FINAL.away.replace("W", ""));
  const final = {
    ...D.FINAL,
    round: "final",
    homeTeam: winnerOf(finalHomeId),
    awayTeam: winnerOf(finalAwayId),
    homeFrom: finalHomeId,
    awayFrom: finalAwayId,
    isFinal: true,
  };

  allMatchesFlat = [...r32, ...r16, ...qf, ...sf, final];
  return { r32, r16, qf, sf, final };
}

function teamHtml(team, matchId, side) {
  if (!team) return `<button class="match-team tbd" disabled>TBD</button>`;
  if (team.tbd) return `<button class="match-team tbd" disabled>${team.label}</button>`;
  const isWinner = winners[matchId] && winners[matchId].name === team.name;
  return `<button class="match-team ${isWinner ? "is-winner" : ""}" data-match="${matchId}" data-side="${side}">
      <img src="${flagUrl(team.flag)}" alt="" onerror="this.style.display='none'">
      <span>${team.name}</span>
      ${isWinner ? '<span class="winner-check">✓</span>' : ""}
    </button>`;
}

function renderMatchCard(match) {
  const homeReady = match.homeTeam && !match.homeTeam.tbd;
  const awayReady = match.awayTeam && !match.awayTeam.tbd;
  const clickable = homeReady && awayReady;

  return `
    <div class="match-card ${match.isFinal ? "final-card" : ""}" data-match-id="${match.id}">
      <div class="match-meta"><span>M${match.id}</span><span>${match.venue}</span></div>
      ${teamHtml(match.homeTeam, match.id, "home")}
      <div class="match-divider"></div>
      ${teamHtml(match.awayTeam, match.id, "away")}
      ${!clickable ? '<div class="match-hint">Waiting for previous round</div>' : ""}
    </div>
  `;
}

function renderBracket() {
  const { r32, r16, qf, sf, final } = buildAllMatches();
  const container = document.getElementById("bracketContainer");

  function side(m) {
    return SIDE_MAP[m.id];
  }

  const leftR32 = r32.filter((m) => side(m) === "left");
  const rightR32 = r32.filter((m) => side(m) === "right");
  const leftR16 = r16.filter((m) => side(m) === "left");
  const rightR16 = r16.filter((m) => side(m) === "right");
  const leftQF = qf.filter((m) => side(m) === "left");
  const rightQF = qf.filter((m) => side(m) === "right");
  const leftSF = sf.filter((m) => side(m) === "left");
  const rightSF = sf.filter((m) => side(m) === "right");

  function renderColumn(label, matches) {
    let html = `<div class="bracket-round"><div class="round-label">${label}</div>`;
    matches.forEach((m) => (html += renderMatchCard(m)));
    html += `</div>`;
    return html;
  }

  // Left half goes outermost-to-innermost: R32 -> R16 -> QF -> SF
  // Right half mirrors it: SF -> QF -> R16 -> R32
  // Final sits in the very center.
  let html = `<div class="bracket-vs">`;
  html += `<div class="bracket-half bracket-half-left">`;
  html += renderColumn("Round of 32", leftR32);
  html += renderColumn("Round of 16", leftR16);
  html += renderColumn("Quarter-Finals", leftQF);
  html += renderColumn("Semi-Final", leftSF);
  html += `</div>`;

  html += `<div class="bracket-center">`;
  html += `<div class="round-label">Final</div>`;
  html += renderMatchCard(final);
  html += `</div>`;

  html += `<div class="bracket-half bracket-half-right">`;
  html += renderColumn("Semi-Final", rightSF);
  html += renderColumn("Quarter-Finals", rightQF);
  html += renderColumn("Round of 16", rightR16);
  html += renderColumn("Round of 32", rightR32);
  html += `</div>`;
  html += `</div>`;

  container.innerHTML = html;
  attachWinnerClickHandlers();
}

function attachWinnerClickHandlers() {
  const buttons = document.querySelectorAll(".match-team[data-match]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const matchId = Number(btn.dataset.match);
      const side = btn.dataset.side;
      const match = allMatchesFlat.find((m) => m.id === matchId);
      const chosenTeam = side === "home" ? match.homeTeam : match.awayTeam;

      winners[matchId] = chosenTeam;

      // Clear any winners that depended on this match being someone else
      // (cascade reset: if you change an earlier pick, later rounds referencing it reset automatically
      // because buildAllMatches() recomputes homeTeam/awayTeam from `winners` fresh every render)
      renderBracket();

      // If this was the FINAL match, trigger celebration
      if (match.isFinal) {
        triggerChampionCelebration(chosenTeam);
      }
    });
  });
}

// ---------- CHAMPION CELEBRATION ----------
function triggerChampionCelebration(team) {
  const overlay = document.createElement("div");
  overlay.className = "champion-overlay";
  overlay.innerHTML = `
    <div class="confetti-layer"></div>
    <div class="champion-modal">
      <div class="champion-trophy">🏆</div>
      <div class="champion-label">WORLD CHAMPION</div>
      <img class="champion-flag" src="${flagUrl(team.flag)}" alt="${team.name}">
      <div class="champion-name">${team.name}</div>
      <button class="champion-close" id="closeCelebration">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // Generate confetti pieces
  const confettiLayer = overlay.querySelector(".confetti-layer");
  const colors = ["#ffb627", "#2f8a55", "#f4f7f2", "#e8553f"];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "%";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 1.2 + "s";
    piece.style.animationDuration = 2.5 + Math.random() * 1.5 + "s";
    confettiLayer.appendChild(piece);
  }

  document.getElementById("closeCelebration").addEventListener("click", () => {
    overlay.remove();
  });
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
  // Reset any previously chosen winners since group order may have changed
  for (const k in winners) delete winners[k];
  bracketBuilt = true;
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
