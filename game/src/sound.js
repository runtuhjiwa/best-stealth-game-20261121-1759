// Tiny WebAudio bleeps, no files: a pickup chirp, an alarm sting, a clear chime and a
// caught thud. Everything is best-effort — if audio is unavailable the game plays silent.

export function createSound() {
  let context = null;

  function ensure() {
    if (context === null) {
      try {
        const AudioContext = window.AudioContext ?? window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = false;
      }
    }
    if (context && context.state === 'suspended') context.resume().catch(() => {});
    return context || null;
  }

  function blip(frequency, duration, type, gain) {
    const audio = ensure();
    if (audio === null) return;
    try {
      const oscillator = audio.createOscillator();
      const volume = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      volume.gain.setValueAtTime(gain, audio.currentTime);
      volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      oscillator.connect(volume);
      volume.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    } catch {
      // Audio is decoration; a failure never stops the game.
    }
  }

  return {
    /** Call from a user gesture so the browser allows audio. */
    unlock() {
      ensure();
    },
    loot() {
      blip(880, 0.12, 'sine', 0.12);
      setTimeout(() => blip(1320, 0.14, 'sine', 0.1), 70);
    },
    alarm() {
      blip(220, 0.28, 'sawtooth', 0.14);
      setTimeout(() => blip(165, 0.32, 'sawtooth', 0.14), 140);
    },
    clear() {
      blip(523, 0.14, 'sine', 0.12);
      setTimeout(() => blip(659, 0.14, 'sine', 0.12), 110);
      setTimeout(() => blip(784, 0.22, 'sine', 0.12), 220);
    },
    caught() {
      blip(110, 0.35, 'square', 0.12);
    },
  };
}
