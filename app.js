// ============================================================
// FIFA World Cup 2026 — Bracket Path Builder — DATA FILE
// Last live standings update: June 17, 2026
// ============================================================

// Each group: 4 teams in CURRENT live order (pos 1 = top of table right now)
// flag = ISO country code (lowercase) used by flagcdn.com
const GROUPS = {
  1: {
    name: "Group 1",
    teams: [
      { name: "Mexico", flag: "mx" },
      { name: "South Korea", flag: "kr" },
      { name: "Czechia", flag: "cz" },
      { name: "South Africa", flag: "za" },
    ],
  },
  2: {
    name: "Group 2",
    teams: [
      { name: "Qatar", flag: "qa" },
      { name: "Bosnia & Herzegovina", flag: "ba" },
      { name: "Switzerland", flag: "ch" },
      { name: "Canada", flag: "ca" },
    ],
  },
  3: {
    name: "Group 3",
    teams: [
      { name: "Scotland", flag: "gb-sct" },
      { name: "Morocco", flag: "ma" },
      { name: "Brazil", flag: "br" },
      { name: "Haiti", flag: "ht" },
    ],
  },
  4: {
    name: "Group 4",
    teams: [
      { name: "USA", flag: "us" },
      { name: "Australia", flag: "au" },
      { name: "Turkey", flag: "tr" },
      { name: "Paraguay", flag: "py" },
    ],
  },
  5: {
    name: "Group 5",
    teams: [
      { name: "Germany", flag: "de" },
      { name: "Ivory Coast", flag: "ci" },
      { name: "Ecuador", flag: "ec" },
      { name: "Curaçao", flag: "cw" },
    ],
  },
  6: {
    name: "Group 6",
    teams: [
      { name: "Sweden", flag: "se" },
      { name: "Japan", flag: "jp" },
      { name: "Netherlands", flag: "nl" },
      { name: "Tunisia", flag: "tn" },
    ],
  },
  7: {
    name: "Group 7",
    teams: [
      { name: "Egypt", flag: "eg" },
      { name: "Belgium", flag: "be" },
      { name: "Iran", flag: "ir" },
      { name: "New Zealand", flag: "nz" },
    ],
  },
  8: {
    name: "Group 8",
    teams: [
      { name: "Saudi Arabia", flag: "sa" },
      { name: "Uruguay", flag: "uy" },
      { name: "Cape Verde", flag: "cv" },
      { name: "Spain", flag: "es" },
    ],
  },
  9: {
    name: "Group 9",
    teams: [
      { name: "Norway", flag: "no" },
      { name: "France", flag: "fr" },
      { name: "Senegal", flag: "sn" },
      { name: "Iraq", flag: "iq" },
    ],
  },
  10: {
    name: "Group 10",
    teams: [
      { name: "Argentina", flag: "ar" },
      { name: "Austria", flag: "at" },
      { name: "Jordan", flag: "jo" },
      { name: "Algeria", flag: "dz" },
    ],
  },
  11: {
    name: "Group 11",
    teams: [
      { name: "DR Congo", flag: "cd" },
      { name: "Uzbekistan", flag: "uz" },
      { name: "Portugal", flag: "pt" },
      { name: "Colombia", flag: "co" },
    ],
  },
  12: {
    name: "Group 12",
    teams: [
      { name: "Ghana", flag: "gh" },
      { name: "England", flag: "gb-eng" },
      { name: "Panama", flag: "pa" },
      { name: "Croatia", flag: "hr" },
    ],
  },
};

// ============================================================
// THIRD-PLACE QUALIFICATION POOLS
// Each Round-of-32 slot that needs a "3rd place" team specifies
// WHICH group numbers are eligible to fill it (per official FIFA bracket).
// The user picks, for each 3rd-place team, whether it qualifies (best 8) or is eliminated.
// ============================================================
const THIRD_PLACE_POOLS = {
  74: [1, 2, 3, 4, 6],
  77: [3, 4, 6, 7, 8],
  79: [3, 5, 6, 8, 9],
  80: [5, 8, 9, 10, 11],
  81: [2, 5, 6, 9, 10],
  82: [1, 5, 8, 9, 10],
  85: [5, 6, 7, 9, 10],
  87: [4, 5, 9, 10, 12],
};

// ============================================================
// ROUND OF 32 — exact official bracket (from FIFA schedule)
// home/away use codes resolved at render time:
//   "1st-N"  = winner (1st place) of group N
//   "2nd-N"  = runner-up (2nd place) of group N
//   "3rd-{74}" etc = whichever team the user assigned to that 3rd-place slot
// ============================================================
const ROUND_OF_32 = [
  { id: 73, date: "Sun 28 Jun", venue: "Los Angeles", home: "2nd-1", away: "2nd-2" },
  { id: 74, date: "Mon 29 Jun", venue: "Boston", home: "1st-5", away: "3rd-74" },
  { id: 75, date: "Mon 29 Jun", venue: "Monterrey", home: "1st-6", away: "2nd-3" },
  { id: 76, date: "Mon 29 Jun", venue: "Houston", home: "1st-3", away: "2nd-6" },
  { id: 77, date: "Tue 30 Jun", venue: "New York/NJ", home: "1st-9", away: "3rd-77" },
  { id: 78, date: "Tue 30 Jun", venue: "Dallas", home: "2nd-5", away: "2nd-9" },
  { id: 79, date: "Tue 30 Jun", venue: "Mexico City", home: "1st-1", away: "3rd-79" },
  { id: 80, date: "Wed 1 Jul", venue: "Atlanta", home: "1st-12", away: "3rd-80" },
  { id: 81, date: "Wed 1 Jul", venue: "San Francisco Bay Area", home: "1st-4", away: "3rd-81" },
  { id: 82, date: "Wed 1 Jul", venue: "Seattle", home: "1st-7", away: "3rd-82" },
  { id: 83, date: "Thu 2 Jul", venue: "Toronto", home: "2nd-11", away: "2nd-12" },
  { id: 84, date: "Thu 2 Jul", venue: "Los Angeles", home: "1st-8", away: "2nd-10" },
  { id: 85, date: "Thu 2 Jul", venue: "Vancouver", home: "1st-2", away: "3rd-85" },
  { id: 86, date: "Fri 3 Jul", venue: "Miami", home: "1st-10", away: "2nd-8" },
  { id: 87, date: "Fri 3 Jul", venue: "Kansas City", home: "1st-11", away: "3rd-87" },
  { id: 88, date: "Fri 3 Jul", venue: "Dallas", home: "2nd-4", away: "2nd-7" },
];

// ============================================================
// ROUND OF 16 — winners of specific Round-of-32 match numbers
// ============================================================
const ROUND_OF_16 = [
  { id: 89, date: "Sat 4 Jul", venue: "Philadelphia", home: "W74", away: "W77" },
  { id: 90, date: "Sat 4 Jul", venue: "Houston", home: "W73", away: "W75" },
  { id: 91, date: "Sun 5 Jul", venue: "New York/NJ", home: "W76", away: "W78" },
  { id: 92, date: "Sun 5 Jul", venue: "Mexico City", home: "W79", away: "W80" },
  { id: 93, date: "Mon 6 Jul", venue: "Dallas", home: "W83", away: "W84" },
  { id: 94, date: "Mon 6 Jul", venue: "Seattle", home: "W81", away: "W82" },
  { id: 95, date: "Tue 7 Jul", venue: "Atlanta", home: "W86", away: "W88" },
  { id: 96, date: "Tue 7 Jul", venue: "Vancouver", home: "W85", away: "W87" },
];

// ============================================================
// QUARTER-FINALS
// ============================================================
const QUARTERFINALS = [
  { id: 97, date: "Thu 9 Jul", venue: "Boston", home: "W89", away: "W90" },
  { id: 98, date: "Fri 10 Jul", venue: "Los Angeles", home: "W93", away: "W94" },
  { id: 99, date: "Sat 11 Jul", venue: "Miami", home: "W91", away: "W92" },
  { id: 100, date: "Sat 11 Jul", venue: "Kansas City", home: "W95", away: "W96" },
];

// ============================================================
// SEMI-FINALS
// ============================================================
const SEMIFINALS = [
  { id: 101, date: "Tue 14 Jul", venue: "Dallas", home: "W97", away: "W98" },
  { id: 102, date: "Wed 15 Jul", venue: "Atlanta", home: "W99", away: "W100" },
];

// FINAL (id 104 — match 103 is the third place playoff, often skipped in bracket tools)
const THIRD_PLACE_PLAYOFF = { id: 103, date: "Sat 18 Jul", venue: "Miami", home: "L101", away: "L102" };
const FINAL = { id: 104, date: "Sun 19 Jul", venue: "New York/NJ", home: "W101", away: "W102" };

// Export everything as one object for use in app.js
window.WC26_DATA = {
  GROUPS,
  THIRD_PLACE_POOLS,
  ROUND_OF_32,
  ROUND_OF_16,
  QUARTERFINALS,
  SEMIFINALS,
  THIRD_PLACE_PLAYOFF,
  FINAL,
};
