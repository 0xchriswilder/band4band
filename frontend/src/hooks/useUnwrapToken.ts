/**
 * ERC-7984 two-step unwrap: unwrap() then finalizeUnwrap() after tx is confirmed.
 * 1. unwrap() burns cUSDC and emits UnwrapRequested(receiver, burntAmountHandle).
 * 2. We parse the receipt for that handle, get a decryption proof from the gateway.
 * 3. finalizeUnwrap(burntAmountHandle, cleartext, decryptionProof) sends USDC to the receiver.
 */

import { useCallback, useState } from 'react';
import { createPublicClient, http, decodeEventLog, type TransactionReceipt } from 'viem';
import { sepolia } from 'viem/chains';
import { useAccount, useWriteContract } from 'wagmi';
import { CONTRACTS, CONF_TOKEN_ABI, TOKEN_CONFIG } from '../lib/contracts';
import { parseAmount } from '../lib/utils';
import { useFhevm } from '../providers/useFhevmContext';
import { useFhevmEncrypt } from './useFhevmEncrypt';

const SEPOLIA_RPC =
  import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(SEPOLIA_RPC, { retryCount: 3, timeout: 10_000 }),
});

type PublicDecryptInstance = {
  publicDecrypt: (handles: string[]) => Promise<{ decryptionProof?: string; clearValues?: Record<string, bigint | number> }>;
};

/** Parse UnwrapRequested event from unwrap() receipt to get the on-chain burnt amount handle (used for finalizeUnwrap). */
function parseBurntHandleFromReceipt(
  receipt: TransactionReceipt,
  tokenAddress: `0x${string}`
): `0x${string}` | null {
  const tokenLower = tokenAddress.toLowerCase();
  for (const log of receipt.logs) {
    if (log.address?.toLowerCase() !== tokenLower) continue;
    try {
      const decoded = decodeEventLog({
        abi: CONF_TOKEN_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === 'UnwrapRequested' && decoded.args && 'amount' in decoded.args) {
        const amount = decoded.args.amount;
        if (typeof amount === 'string' && amount.startsWith('0x') && amount.length === 66) {
          return amount as `0x${string}`;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** Poll publicDecrypt until we get a proof (gateway may need a few seconds after unwrap). */
async function getDecryptionProof(
  instance: PublicDecryptInstance,
  handle: string,
  maxAttempts = 8,
  delayMs = 2000
): Promise<{ cleartext: bigint; decryptionProof: `0x${string}` } | null> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await instance.publicDecrypt([handle]);
      const proof = result?.decryptionProof ?? (result as any)?.decryptionProof;
      const clearValues = result?.clearValues ?? (result as any)?.clearValues;
      if (proof && clearValues != null && handle in clearValues) {
        const val = clearValues[handle];
        const cleartext = typeof val === 'bigint' ? val : BigInt(Number(val));
        return {
          cleartext,
          decryptionProof: proof.startsWith('0x') ? proof as `0x${string}` : (`0x${proof}` as `0x${string}`),
        };
      }
    } catch {
      // Gateway not ready yet
    }
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
}

export type UnwrapStep = 'idle' | 'encrypting' | 'confirming' | 'getting_proof' | 'finalizing';

const UNWRAP_STEP_LABELS: Record<UnwrapStep, string> = {
  idle: 'Unwrap',
  encrypting: 'Preparing…',
  confirming: 'Confirming unwrap…',
  getting_proof: 'Getting decryption proof…',
  finalizing: 'Finalizing (receiving USDC)…',
};

export function useUnwrapToken() {
  const { address, isConnected } = useAccount();
  const { instance, isReady: fheReady } = useFhevm();
  const { encryptAmount } = useFhevmEncrypt();
  const { writeContractAsync, isPending } = useWriteContract();
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const [unwrapStep, setUnwrapStep] = useState<UnwrapStep>('idle');

  const unwrap = useCallback(
    async (amountHuman: string) => {
      if (!address || !isConnected || !fheReady || !instance) return null;
      const amount = parseAmount(amountHuman, TOKEN_CONFIG.decimals);
      if (amount <= 0n) return null;

      setIsUnwrapping(true);
      setUnwrapStep('encrypting');
      try {
        const encrypted = await encryptAmount(amount, CONTRACTS.CONF_TOKEN);
        if (!encrypted?.handles?.[0]) throw new Error('Encryption failed');
        const handle = encrypted.handles[0];

        setUnwrapStep('confirming');
        const hash = await writeContractAsync({
          address: CONTRACTS.CONF_TOKEN,
          abi: CONF_TOKEN_ABI,
          functionName: 'unwrap',
          args: [address, address, handle, encrypted.inputProof as `0x${string}`],
        });
        if (!hash) throw new Error('Unwrap tx failed');

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') throw new Error('Unwrap transaction reverted');

        const burntHandle = parseBurntHandleFromReceipt(receipt, CONTRACTS.CONF_TOKEN) ?? handle;

        setUnwrapStep('getting_proof');
        const proofResult = await getDecryptionProof(instance as unknown as PublicDecryptInstance, burntHandle);
        if (!proofResult) throw new Error('Decryption proof not ready. Try "Unwrap" again in a few seconds.');

        setUnwrapStep('finalizing');
        const cleartextU64 = proofResult.cleartext <= 0xffff_ffff_ffff_ffffn ? proofResult.cleartext : 0n;
        await writeContractAsync({
          address: CONTRACTS.CONF_TOKEN,
          abi: CONF_TOKEN_ABI,
          functionName: 'finalizeUnwrap',
          args: [burntHandle, cleartextU64, proofResult.decryptionProof],
        });

        return hash;
      } finally {
        setIsUnwrapping(false);
        setUnwrapStep('idle');
      }
    },
    [address, isConnected, fheReady, instance, encryptAmount, writeContractAsync]
  );

  return {
    unwrap,
    isUnwrapping: isUnwrapping || isPending,
    unwrapStep,
    unwrapStepLabel: UNWRAP_STEP_LABELS[unwrapStep],
    fheReady: !!instance && fheReady,
  };
}
