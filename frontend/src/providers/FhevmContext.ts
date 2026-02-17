import { createContext } from 'react';
import type { FhevmInstance } from './FhevmProvider';

export interface FhevmContextType {
  instance: FhevmInstance | null;
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  initialize: () => Promise<void>;
}

export const FhevmContext = createContext<FhevmContextType>({
  instance: null,
  isReady: false,
  isLoading: false,
  error: null,
  initialize: async () => {},
});

