/**
 * FHEVM Provider - manages Fully Homomorphic Encryption instance
 * using Zama RelayerSDK v0.3.0-8 
 */

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useAccount, useChainId } from 'wagmi';
import { FhevmContext } from './FhevmContext';

declare global {
  interface Window {
    RelayerSDK?: RelayerSDKType;
    relayerSDK?: RelayerSDKType;
    ethereum?: unknown;
  }
}

interface RelayerSDKType {
  initSDK: () => Promise<void>;
  createInstance: (config: FhevmInstanceConfig) => Promise<FhevmInstance>;
  generateKeypair: () => { publicKey: string; privateKey: string };
  SepoliaConfig: FhevmConfig;
}

interface FhevmConfig {
  aclContractAddress: string;
  kmsContractAddress: string;
  inputVerifierContractAddress: string;
  verifyingContractAddressDecryption: string;
  verifyingContractAddressInputVerification: string;
  chainId: number;
  gatewayChainId: number;
  network: string | unknown;
  relayerUrl: string;
}

type FhevmInstanceConfig = Pick<
  FhevmConfig,
  | 'verifyingContractAddressDecryption'
  | 'verifyingContractAddressInputVerification'
  | 'kmsContractAddress'
  | 'aclContractAddress'
  | 'gatewayChainId'
> & {
  network: unknown;
  publicKey?: Uint8Array;
  auth?: unknown;
};

export interface FhevmInstance {
  createEncryptedInput: (contractAddress: string, userAddress: string) => any;
  generateKeypair: () => { publicKey: string; privateKey: string };
  createEIP712: (
    publicKey: string,
    contractAddresses: string[],
    startTimestamp: string,
    durationDays: string
  ) => any;
  userDecrypt: (...args: any[]) => Promise<Record<string, bigint | string>>;
}

const RELAYER_SDK_CDN =
  'https://cdn.zama.org/relayer-sdk-js/0.3.0-8/relayer-sdk-js.umd.cjs';

const SEPOLIA_CHAIN_ID = 11155111;

interface FhevmProviderProps {
  children: React.ReactNode;
}

export function FhevmProvider({ children }: FhevmProviderProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [instance, setInstance] = useState<FhevmInstance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getSDK = useCallback((): RelayerSDKType | null => {
    return window.relayerSDK || window.RelayerSDK || null;
  }, []);

  const loadSDK = useCallback(async (): Promise<void> => {
    if (getSDK()) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = RELAYER_SDK_CDN;
      script.async = true;
      script.type = 'text/javascript';

      script.onload = () => {
        resolve();
      };

      script.onerror = () => {
        reject(
          new Error(
            'Failed to load FHEVM SDK from CDN. Please check your network.'
          )
        );
      };

      document.head.appendChild(script);
    });
  }, [getSDK]);

  const initialize = useCallback(async () => {
    if (!isConnected || !address || !window.ethereum) {
      return;
    }

    if (chainId !== SEPOLIA_CHAIN_ID) {
      setError(new Error('Please connect to Sepolia network'));
      return;
    }

    if (instance) return;

    setIsLoading(true);
    setError(null);

    try {
      await loadSDK();
      const sdk = getSDK();
      if (!sdk) {
        throw new Error('FHEVM SDK not available after loading.');
      }

      await sdk.initSDK();

      const fhevmInstance = await sdk.createInstance({
        ...sdk.SepoliaConfig,
        network: window.ethereum,
      });

      setInstance(fhevmInstance);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to initialize FHEVM')
      );
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, chainId, instance, loadSDK, getSDK]);

  useEffect(() => {
    if (
      isConnected &&
      address &&
      chainId === SEPOLIA_CHAIN_ID &&
      !instance &&
      !isLoading
    ) {
      void initialize();
    }
  }, [isConnected, address, chainId, instance, isLoading, initialize]);

  useEffect(() => {
    if (!isConnected || chainId !== SEPOLIA_CHAIN_ID) {
      setInstance(null);
      setError(null);
    }
  }, [isConnected, chainId]);

  const value = useMemo(
    () => ({
      instance,
      isReady: !!instance && isConnected,
      isLoading,
      error,
      initialize,
    }),
    [instance, isConnected, isLoading, error, initialize]
  );

  return (
    <FhevmContext.Provider value={value}>
      {children}
    </FhevmContext.Provider>
  );
}

export default FhevmProvider;

