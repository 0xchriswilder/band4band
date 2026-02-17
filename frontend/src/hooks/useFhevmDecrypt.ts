/**
 * FHEVM Decryption Hook
 * Provides functions to decrypt encrypted values using signature-based auth
 */

import { useCallback, useState } from 'react';
import { useAccount, useSignTypedData } from 'wagmi';
import { useFhevm } from '../providers/useFhevmContext';

export interface HandleContractPair {
  handle: string;
  contractAddress: string;
}

export function useFhevmDecrypt() {
  const { instance, isReady, error } = useFhevm();
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<Error | null>(null);

  const decryptHandle = useCallback(
    async (
      handle: string,
      contractAddress: string
    ): Promise<bigint | null> => {
      if (!instance || !address || !isReady || !isConnected) {
        setDecryptError(new Error('FHEVM not ready or wallet not connected'));
        return null;
      }

      if (!handle || handle === '0x' + '0'.repeat(64)) {
        return 0n;
      }

      setIsDecrypting(true);
      setDecryptError(null);

      try {
        const keypair = instance.generateKeypair();

        const handleContractPairs = [{ handle, contractAddress }];
        const startTimestamp = Math.floor(Date.now() / 1000).toString();
        const durationDays = '10';
        const contractAddresses = [contractAddress];

        const eip712 = instance.createEIP712(
          keypair.publicKey,
          contractAddresses,
          startTimestamp,
          durationDays
        );

        const signature = await signTypedDataAsync({
          domain: eip712.domain as Record<string, unknown>,
          types: {
            UserDecryptRequestVerification:
              eip712.types.UserDecryptRequestVerification,
          } as Record<string, unknown>,
          message: eip712.message as Record<string, unknown>,
          primaryType: 'UserDecryptRequestVerification',
        });

        const result = await instance.userDecrypt(
          handleContractPairs,
          keypair.privateKey,
          keypair.publicKey,
          signature.replace('0x', ''),
          contractAddresses,
          address,
          startTimestamp,
          durationDays
        );

        const value = result[handle];
        return typeof value === 'bigint' ? value : BigInt(value ?? 0);
      } catch (err) {
        setDecryptError(
          err instanceof Error ? err : new Error('Decryption failed')
        );
        return null;
      } finally {
        setIsDecrypting(false);
      }
    },
    [instance, address, isReady, isConnected, signTypedDataAsync]
  );

  return {
    decryptHandle,
    isDecrypting,
    error: error || decryptError,
    isReady,
  };
}

export default useFhevmDecrypt;

