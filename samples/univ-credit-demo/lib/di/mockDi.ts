import { CreditApi } from '@/lib/adapters/input';
import { CredentialIssuerClient } from '@/lib/adapters/out/issuer';
import { MockDB } from '@/lib/adapters/out/persists';
import { CreditService } from '@/lib/usecases';

export const mockDi = () => {
  const mockDB = new MockDB();
  const issuerBaseUrl = process.env.CREDENTIAL_ISSUER_BASE_URL ?? 'https://localhost:5001';
  const credentialIssuerClient = new CredentialIssuerClient(issuerBaseUrl);
  const creditService = new CreditService(
    mockDB.getCreditList,
    mockDB.getCreditById,
    mockDB.updateCredit,
    credentialIssuerClient.createCredentialOffer
  );
  const creditApi = new CreditApi(creditService);

  return {
    creditApi,
  };
};