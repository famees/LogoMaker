// Everything the companion says. Gets firmer the more times in a row you snooze.

const WATER = 'water', STRETCH = 'stretch';

function prompt(kind, level, name, { afterCall = false, nextSnooze = 5 } = {}) {
  if (kind === WATER) {
    const lines = afterCall
      ? [`Call's over, ${name}!\nHave you had water?`, `Hope the call went well!\nNow… have you had water?`]
      : level === 0 ? [`Hey, ${name}\nHave you had water?`]
      : level === 1 ? [`${name}, it's me again.\nDid you drink water?`]
      : [`${name}. Water. Now.\nI'm waiting. 😤`];
    const text = lines[Math.floor(Math.random() * lines.length)];
    return {
      text,
      pose: level >= 2 && !afterCall ? 'insist' : 'water',
      buttons: [{ id: 'yes', label: 'YES 💧' }, { id: 'later', label: level >= 2 ? `Okay, ${nextSnooze} more minutes…` : 'Remind me later' }],
    };
  }
  const text = afterCall ? `Call's over, ${name}!\nTime to stretch your body.`
    : level === 0 ? `Hey, ${name}\nHave you stretched your body or not?`
    : level === 1 ? `${name}, your back is calling.\nStretch with me?`
    : `No more excuses, ${name}.\nStand up. Now. 💪`;
  return {
    text,
    pose: level >= 2 && !afterCall ? 'insist' : 'wave',
    buttons: [
      { id: 'routine', label: "Let's stretch (1 min)", primary: true },
      { id: 'yes', label: 'Already did' },
      { id: 'later', label: 'Remind me later' },
    ],
  };
}

function waterDone(name, glasses, goal, level) {
  if (glasses === goal) return { text: `🎉 Goal reached, ${name}!\n${goal} glasses today`, pose: 'celebrate' };
  if (level >= 2) return { text: `Finally! 😤❤️\nThat's ${glasses} of ${goal} today`, pose: 'thumbs' };
  return { text: `Great job, ${name}! 💧\n${glasses} of ${goal} glasses today`, pose: 'thumbs' };
}

function stretchDone(name, count) {
  return { text: `Awesome, ${name}! 💪\nStretch #${count} today`, pose: 'thumbs' };
}

function routineDone(name) {
  return { text: `Done! 🎉\nYou're a stretching champ, ${name}`, pose: 'celebrate' };
}

function snoozed(minutes, level) {
  return level >= 2
    ? { text: `Fine… ${minutes} minutes.\nBut I'm coming back. 👀`, pose: 'insist' }
    : { text: `Okay! I'll ask again\nin ${minutes} minutes ⏰`, pose: 'idle' };
}

function greeting(name, s) {
  return {
    text: `Hi, ${name}! 👋\nI'll keep an eye on you`,
    speak: `Hi ${name}! I'll check on your water every ${s.waterEveryMinutes} minutes, and stretching every ${s.stretchEveryMinutes} minutes.`,
    pose: 'wave',
  };
}

// The guided routine: about one minute, ends with an eye break.
const ROUTINE = [
  { pose: 'reach', title: 'Reach up high', tip: 'Stretch your arms to the sky', seconds: 10 },
  { pose: 'bendLeft', title: 'Lean left', tip: 'Slow side stretch, breathe out', seconds: 8 },
  { pose: 'bendRight', title: 'Lean right', tip: 'Feel it along your side', seconds: 8 },
  { pose: 'neckLeft', title: 'Neck tilt left', tip: 'Ear toward your shoulder', seconds: 7 },
  { pose: 'neckRight', title: 'Neck tilt right', tip: 'Slow and gentle', seconds: 7 },
  { pose: 'rolls', title: 'Shoulder rolls', tip: 'Big circles, backwards', seconds: 8 },
  { pose: 'open', title: 'Open your chest', tip: 'Arms wide, squeeze your shoulder blades', seconds: 8 },
  { pose: 'point', title: 'Eye break', tip: 'Look at something far away', seconds: 10 },
];

// Text for the voice: no emoji, no line breaks.
function spoken(text) {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

module.exports = { prompt, waterDone, stretchDone, routineDone, snoozed, greeting, ROUTINE, spoken };
