import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * A custom hook to persist state to localStorage.
 * 
 * @param key The key to store the value under in localStorage.
 * @param initialValue The initial value to use if no value is found in localStorage.
 * @returns A tuple containing the current state value and a function to update it.
 */
export function usePersistedState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from local storage after mount to prevent hydration mismatch
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setState(JSON.parse(item));
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
    setIsHydrated(true);
  }, [key]);

  // Update localStorage whenever the state changes, but only after hydration
  useEffect(() => {
    if (isHydrated) {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.error(`Error writing localStorage key "${key}":`, error);
      }
    }
  }, [key, state, isHydrated]);

  return [state, setState];
}
