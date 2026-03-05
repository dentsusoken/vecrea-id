import { CredentialOffer } from '@/lib/domain';

export interface CreateCredentialOffer {
  (
    credentialConfigurationId: string,
    extra?: Record<string, unknown>
  ): Promise<CredentialOffer>;
}
