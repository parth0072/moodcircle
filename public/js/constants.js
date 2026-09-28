// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const MOOD_LABEL  = ['','Rough','Low','Okay','Good','Great'];
const MOOD_COLOR  = ['','#D9848B','#F0A85E','#E3C765','#8FB86A','#6FB8A8'];
const MOOD_BG     = ['','#FBEBEC','#FCF1E0','#FAF6DE','#EEF5E6','#E7F5F0'];
const MOOD_TEXT   = ['','#A24851','#B06B1E','#8A752A','#4A6B2E','#2A7A64'];
const AV_COLORS   = ['#5C6FA8','#4A9B95','#7A9E5C','#C98A4A','#B85C7A','#5C8FB0','#B0574A','#8A6FB0'];

// Hand-drawn line-art mood faces (inner features only — always drawn
// inside the same navy-stroked circle outline via moodIconSVG()).
const MOOD_FACE = ['',
  '<path d="M33 42 q7 6 14 0 M53 42 q7 6 14 0" fill="none" stroke="#1E2A5A" stroke-width="3.5" stroke-linecap="round"/><path d="M36 68 q14 -12 28 0" fill="none" stroke="#1E2A5A" stroke-width="3.5" stroke-linecap="round"/><path d="M25 44 q-4 7 1 12" fill="none" stroke="#6BB5E8" stroke-width="2.3" stroke-linecap="round"/>',
  '<path d="M35 44 h11 M54 44 h11" fill="none" stroke="#1E2A5A" stroke-width="3.5" stroke-linecap="round"/><path d="M37 65 q13 -8 26 0" fill="none" stroke="#1E2A5A" stroke-width="3.5" stroke-linecap="round"/>',
  '<circle cx="40" cy="46" r="3" fill="#1E2A5A"/><circle cx="60" cy="46" r="3" fill="#1E2A5A"/><path d="M38 63 h24" fill="none" stroke="#1E2A5A" stroke-width="3.5" stroke-linecap="round"/>',
  '<path d="M34 45 q6 -7 12 0 M54 45 q6 -7 12 0" fill="none" stroke="#1E2A5A" stroke-width="3.5" stroke-linecap="round"/><path d="M36 58 q14 13 28 0" fill="none" stroke="#1E2A5A" stroke-width="3.5" stroke-linecap="round"/>',
  '<path d="M33 44 q7 -9 14 0 M53 44 q7 -9 14 0" fill="none" stroke="#1E2A5A" stroke-width="3.5" stroke-linecap="round"/><path d="M33 56 q17 16 34 0" fill="none" stroke="#1E2A5A" stroke-width="3.5" stroke-linecap="round"/><path d="M81 22 v6 M78 25 h6" stroke="#F0A85E" stroke-width="2.2" stroke-linecap="round"/><path d="M17 28 v5 M14.5 30.5 h5" stroke="#F0A85E" stroke-width="2" stroke-linecap="round"/>',
];
function moodIconSVG(level, size) {
  size = size || 24;
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" aria-hidden="true"><circle cx="50" cy="50" r="34" fill="none" stroke="#1E2A5A" stroke-width="3.5"/>${MOOD_FACE[level]}</svg>`;
}

const RXN_MAP = [
  { key: 'sending_love',    emoji: '❤️'  },
  { key: 'same',            emoji: '🤝'  },
  { key: 'rooting_for_you', emoji: '🙌'  },
];

