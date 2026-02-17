import { useContext } from 'react';
import { FhevmContext } from './FhevmContext';

export function useFhevm() {
  const ctx = useContext(FhevmContext);
  if (!ctx) {
    throw new Error('useFhevm must be used within a FhevmProvider');
  }
  return ctx;
}

