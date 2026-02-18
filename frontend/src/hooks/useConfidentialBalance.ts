import { useCallback, useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { useAccount } from 'wagmi';
import { CONTRACTS, CONF_TOKEN_ABI } from '../lib/contracts';
import { useFhevmDecrypt } from './useFhevmDecrypt';

const SEPOLIA_RPC =
  import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

const client = createPublicClient({
  chain: sepolia,
  transport: http(SEPOLIA_RPC, { retryCount: 3, timeout: 10_000 }),
});

const ZERO_HANDLE = '0x' + '0'.repeat(64);

export function useConfidentialBalance() {
  const { address, isConnected } = useAccount();
  const { decryptHandle, isDecrypting, isReady: fheReady } = useFhevmDecrypt();

  const [handle, setHandle] = useState<string | null>(null);
  const [decryptedBalance, setDecryptedBalance] = useState<bigint | null>(null);
  const [isLoadingHandle, setIsLoadingHandle] = useState(false);

  /** Fetch the encrypted balance handle from the contract */
  const fetchHandle = useCallback(async () => {
    if (!address) {
      setHandle(null);
      return;
    }
    setIsLoadingHandle(true);
    try {
      const result = await client.readContract({
        address: CONTRACTS.CONF_TOKEN,
        abi: CONF_TOKEN_ABI,
        functionName: 'confidentialBalanceOf',
        args: [address],
      });
      const h = result as string;
      setHandle(h && h !== ZERO_HANDLE ? h : null);
    } catch {
      setHandle(null);
    } finally {
      setIsLoadingHandle(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      void fetchHandle();
    } else {
      setHandle(null);
      setDecryptedBalance(null);
    }
  }, [isConnected, address, fetchHandle]);

  /** Decrypt the handle to get the cleartext balance */
  const decrypt = useCallback(async () => {
    if (!handle || !fheReady) return null;
    const value = await decryptHandle(handle, CONTRACTS.CONF_TOKEN);
    if (value !== null) {
      setDecryptedBalance(value);
    }
    return value;
  }, [handle, fheReady, decryptHandle]);

  return {
    handle,
    hasBalance: !!handle,
    decryptedBalance,
    isDecrypted: decryptedBalance !== null,
    isLoadingHandle,
    isDecrypting,
    fheReady,
    decrypt,
    refetch: fetchHandle,
  };
}
