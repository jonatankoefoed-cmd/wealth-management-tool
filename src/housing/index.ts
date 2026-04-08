/**
 * Housing Module Index
 */

export * from './types';
export * from './math';
export * from './audit';
export * from './defaults';
// Rules loader moved to rules.server.ts for server-side only use
export { simulateHomePurchase } from './engine';
