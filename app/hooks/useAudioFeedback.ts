'use client';

import useSound from 'use-sound';
import { useSoundContext } from '../context/SoundContext';

// Define sound paths here for easy management
const SOUNDS = {
  roll: '/sounds/roll_loop.mp3',
  reveal: '/sounds/reveal.mp3',
  revealLegendary: '/sounds/reveal_legendary.mp3', // For Elite/3-speed operators
  kill: '/sounds/kill_confirm.mp3',
  death: '/sounds/death_flatline.mp3',
  goal: '/sounds/objective_complete.mp3',
};

export function useAudioFeedback() {
  const { isMuted, volume } = useSoundContext();

  // Common options
  const soundOptions = {
    volume: isMuted ? 0 : volume,
    interrupt: true, // Allow overlapping sounds of same type to cut earlier ones? or false?
    // actually interrupt: true means if play() is called again, it restarts.
    // often better to be false for "spammy" sounds like kills if we want them to stack,
    // but true for UI sounds. Let's stick to true for cleaner audioscape generally.
  };

  const [playRoll, { stop: stopRoll }] = useSound(SOUNDS.roll, { 
    ...soundOptions, 
    loop: true,
    interrupt: false // Don't interrupt loop if called again, but we manage it manually
  });

  const [playReveal] = useSound(SOUNDS.reveal, soundOptions);
  const [playRevealLegendary] = useSound(SOUNDS.revealLegendary, soundOptions);
  
  const [playKill] = useSound(SOUNDS.kill, { ...soundOptions, volume: isMuted ? 0 : Math.min(volume + 0.2, 1) }); // Slightly louder
  const [playDeath] = useSound(SOUNDS.death, soundOptions);
  const [playGoal] = useSound(SOUNDS.goal, { ...soundOptions, volume: isMuted ? 0 : 1.0 }); // Max volume for goal

  return {
    playRoll: () => {
      if (!isMuted) playRoll();
    },
    stopRoll: () => {
      stopRoll();
    },
    playReveal: (isLegendary: boolean = false) => {
      if (isMuted) return;
      if (isLegendary) {
        playRevealLegendary();
      } else {
        playReveal();
      }
    },
    playKill: () => !isMuted && playKill(),
    playDeath: () => !isMuted && playDeath(),
    playGoal: () => !isMuted && playGoal(),
  };
}
