import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatAmount(amount: bigint, decimals = 6): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.slice(0, 2);

  return `${integerPart.toLocaleString()}.${trimmedFractional}`;
}

export function parseAmount(amount: string, decimals = 6): bigint {
  const [integer, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(integer + paddedFraction);
}

/**
 * Convert Imgur page URLs to direct image URLs so <img src> works.
 * e.g. https://imgur.com/eoTXMlq -> https://i.imgur.com/eoTXMlq.png
 * Also fix Supabase Storage URLs missing /public/ (e.g. .../object/bucket/... -> .../object/public/bucket/...).
 */
export function toDirectImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (!trimmed) return '';
  const imgurMatch = trimmed.match(/^https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)(?:\.(?:png|jpg|jpeg|gif))?\/?(?:\?.*)?$/i);
  if (imgurMatch) return `https://i.imgur.com/${imgurMatch[1]}.png`;
  if (trimmed.includes('/storage/v1/object/') && !trimmed.includes('/object/public/')) {
    trimmed = trimmed.replace('/storage/v1/object/', '/storage/v1/object/public/');
  }
  return trimmed;
}

/** Turn wallet/transaction errors (e.g. user rejected) into a short, user-friendly message. */
export function getUserFriendlyErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const lower = msg.toLowerCase();
  if (
    lower.includes('user rejected') ||
    lower.includes('user denied') ||
    lower.includes('rejected the request') ||
    lower.includes('denied transaction') ||
    lower.includes('tx signature: user denied') ||
    lower.includes('request rejected')
  ) {
    return 'You cancelled the transaction. You can try again when you\'re ready.';
  }
  if (msg && msg.length < 120) return msg;
  if (msg) return msg.slice(0, 100) + '…';
  return fallback;
}

