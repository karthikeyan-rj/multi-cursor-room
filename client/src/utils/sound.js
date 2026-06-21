let audioContext = null;
let audioUnlocked = false;

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    console.warn("CHAT SOUND: AudioContext not available in this browser");
    return null;
  }
  if (!audioContext) {
    try {
      audioContext = new AudioContextClass();
      console.log("CHAT SOUND: AudioContext created, initial state:", audioContext.state);
    } catch (err) {
      console.warn("CHAT SOUND: Failed to create AudioContext:", err);
      return null;
    }
  }
  return audioContext;
}

export async function unlockMessageSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    console.log("CHAT SOUND: Resuming suspended AudioContext");
    try {
      await ctx.resume();
      console.log("CHAT SOUND: AudioContext resumed, state:", ctx.state);
    } catch (err) {
      console.warn('Failed to unlock AudioContext:', err);
    }
  }
  if (ctx.state === 'running') {
    audioUnlocked = true;
  }
}

export async function unlockAudio() {
  console.log("CHAT SOUND: unlockAudio called");
  await unlockMessageSound();
}

// Global one-time interaction listeners to unlock AudioContext
if (typeof window !== 'undefined') {
  const unlock = async () => {
    await unlockMessageSound();
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'running') {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('touchstart', unlock);
      console.log("CHAT SOUND: Audio unlocked via user interaction");
    }
  };
  window.addEventListener('click', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('mousedown', unlock);
  window.addEventListener('touchstart', unlock);
  console.log("CHAT SOUND: Auto-unlock listeners registered");
}

export async function playMessageSound() {
  console.log("CHAT SOUND: playMessageSound called");
  const ctx = getAudioContext();
  if (!ctx) {
    console.warn("CHAT SOUND: No AudioContext available");
    return;
  }
  if (ctx.state === 'suspended') {
    console.log("CHAT SOUND: Resuming suspended context before play");
    try {
      await ctx.resume();
    } catch (err) {
      console.warn("CHAT SOUND: Failed to resume context:", err);
    }
  }
  const now = ctx.currentTime;
  try {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.28);
    console.log("CHAT SOUND: Sound played successfully");
  } catch (err) {
    console.warn("CHAT SOUND: Failed to play sound:", err);
  }
}
