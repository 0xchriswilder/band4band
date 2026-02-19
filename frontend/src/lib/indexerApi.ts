/** Base URL for the indexer API (DocuSign routes, etc.). */
export function getIndexerUrl(): string {
  return import.meta.env.VITE_INDEXER_URL || 'http://localhost:4000';
}
