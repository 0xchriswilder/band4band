/**
 * FHEVM Encryption Hook
 * Provides functions to encrypt amounts for confidential transactions
 */

import { useCallback, useState } from 'react';
import { useAccount } from 'wagmi';
import { toHex } from 'viem';
import { useFhevm } from '../providers/useFhevmContext';

export interface EncryptedAmount {
  handles: `0x${string}`[];
  inputProof: `0x${string}`;
}

function uint8ArrayToHex(arr: Uint8Array): `0x${string}` {
  return toHex(arr);
}

export function useFhevmEncrypt() {
  const { instance, isReady, error } = useFhevm();
  const { address, isConnected } = useAccount();
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptError, setEncryptError] = useState<Error | null>(null);

  const MAX_UINT64 = 18446744073709551615n;

  const encryptAmount = useCallback(
    async (
      amount: bigint,
      contractAddress: string
    ): Promise<EncryptedAmount | null> => {
      if (!instance || !address || !isReady || !isConnected) {
        setEncryptError(new Error('FHEVM not ready or wallet not connected'));
        return null;
      }

      if (amount < 0n || amount > MAX_UINT64) {
        setEncryptError(new Error('Amount out of range for uint64 encryption'));
        return null;
      }

      setIsEncrypting(true);
      setEncryptError(null);

      try {
        const encryptedInput = instance.createEncryptedInput(
          contractAddress,
          address
        );

        const result = await encryptedInput.add64(amount).encrypt();

        const { handles, inputProof } = result;

        const hexHandles = handles.map((h: unknown) => {
          if (typeof h === 'string' && h.startsWith('0x')) {
            return h as `0x${string}`;
          }
          return uint8ArrayToHex(h as Uint8Array);
        });

        const hexProof =
          typeof inputProof === 'string' && inputProof.startsWith('0x')
            ? (inputProof as `0x${string}`)
            : uint8ArrayToHex(inputProof as unknown as Uint8Array);

        return { handles: hexHandles, inputProof: hexProof };
      } catch (err) {
        setEncryptError(
          err instanceof Error ? err : new Error('Encryption failed')
        );
        return null;
      } finally {
        setIsEncrypting(false);
      }
    },
    [instance, address, isReady, isConnected, MAX_UINT64]
  );

  return {
    encryptAmount,
    isEncrypting,
    error: error || encryptError,
    isReady,
  };
}

export default useFhevmEncrypt;

