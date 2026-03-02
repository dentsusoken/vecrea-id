import { CredentialOffer } from '@/lib/domain';

export interface CreateCredentialOffer {
  (credentialConfigurationId: string): Promise<CredentialOffer>;
}
