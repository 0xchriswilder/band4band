import { useCallback, useEffect, useState } from 'react';
import { createPublicClient, http, formatUnits, maxUint256 } from 'viem';
import { sepolia } from 'viem/chains';
import { useAccount, useWriteContract } from 'wagmi';
import { CONTRACTS, ERC20_ABI, CONF_TOKEN_ABI, TOKEN_CONFIG } from '../lib/contracts';
import { parseAmount } from '../lib/utils';

const SEPOLIA_RPC =
  import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

const client = createPublicClient({
  chain: sepolia,
  transport: http(SEPOLIA_RPC, { retryCount: 3, timeout: 10_000 }),
});

export function useWrapToken() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [usdcBalance, setUsdcBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const [bal, allow] = await Promise.all([
        client.readContract({
          address: CONTRACTS.USDC,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
        client.readContract({
          address: CONTRACTS.USDC,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, CONTRACTS.CONF_TOKEN],
        }),
      ]);
      setUsdcBalance(bal);
      setAllowance(allow);
    } catch {
      setUsdcBalance(0n);
      setAllowance(0n);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      void fetchBalances();
    }
  }, [isConnected, address, fetchBalances]);

  /** Approve the ConfidentialToken contract to spend USDC */
  const approveUsdc = useCallback(async (amountHuman?: string) => {
    if (!address || !isConnected) return null;

    const spendAmount = amountHuman
      ? parseAmount(amountHuman, TOKEN_CONFIG.decimals)
      : maxUint256;

    const hash = await writeContractAsync({
      address: CONTRACTS.USDC,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.CONF_TOKEN, spendAmount],
    });

    await client.waitForTransactionReceipt({ hash });
    await fetchBalances();
    return hash;
  }, [address, isConnected, writeContractAsync, fetchBalances]);

  /** Wrap USDC → cUSDCP (shield) */
  const wrapUsdc = useCallback(async (amountHuman: string) => {
    if (!address || !isConnected) return null;

    const amount = parseAmount(amountHuman, TOKEN_CONFIG.decimals);

    // Auto-approve if needed
    if (allowance < amount) {
      await approveUsdc();
    }

    const hash = await writeContractAsync({
      address: CONTRACTS.CONF_TOKEN,
      abi: CONF_TOKEN_ABI,
      functionName: 'wrap',
      args: [address, amount],
    });

    await client.waitForTransactionReceipt({ hash });
    await fetchBalances();
    return hash;
  }, [address, isConnected, allowance, approveUsdc, writeContractAsync, fetchBalances]);

  return {
    usdcBalance,
    usdcBalanceFormatted: formatUnits(usdcBalance, TOKEN_CONFIG.decimals),
    allowance,
    needsApproval: (amount: string) => {
      try {
        return allowance < parseAmount(amount, TOKEN_CONFIG.decimals);
      } catch {
        return true;
      }
    },
    isLoading,
    isWriting: isPending,
    approveUsdc,
    wrapUsdc,
    refetch: fetchBalances,
  };
}
