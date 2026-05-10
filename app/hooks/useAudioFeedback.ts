'use client';

import useSound from 'use-sound';
import { useSoundContext } from '../context/SoundContext';

export function useAudioFeedback() {
  const { isMuted, volume } = useSoundContext();

  const soundOptions = {
    volume: isMuted ? 0 : volume,
    interrupt: true,
  };

  const [playRoll, { stop: stopRoll }] = useSound('/sounds/roll_loop.mp3', { 
    ...soundOptions, 
    loop: true,
    interrupt: false
  });

  const [playReveal] = useSound('/sounds/reveal.mp3', soundOptions);

  return {
    playRoll: () => {
      if (!isMuted) playRoll();
    },
    stopRoll: () => {
      stopRoll();
    },
    playReveal: () => {
      if (!isMuted) playReveal();
    },
  };
}