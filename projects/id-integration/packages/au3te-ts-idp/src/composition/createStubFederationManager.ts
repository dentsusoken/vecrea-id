import type { FederationManager } from '@vecrea/au3te-ts-server/federation';

/** 連携 IdP 未設定時のプレースホルダ。本番では実装に差し替える */
export function createStubFederationManager(): FederationManager {
  return {
    isConfigurationValid: () => false,
    buildFederations: () => new Map(),
    getConfigurations: () => ({ federations: [] }),
    getFederation: () => {
      throw new Error('FederationManager is not configured');
    },
  };
}
