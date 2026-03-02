import { CredentialOffer, CreditInfo, CreditInfoList } from '@/lib/domain';
import { CreateCredentialOffer } from '@/lib/ports/out/issuer';
import { GetCreditList, UpdateCredit } from '@/lib/ports/out/persists';

export interface UpdateCreditInput {
  id: string;
  credit: CreditInfo;
}

export class CreditService {
  private readonly getCreditListPort: GetCreditList;
  private readonly updateCreditPort: UpdateCredit;
  private readonly createCredentialOfferPort: CreateCredentialOffer;

  constructor(
    getCreditListPort: GetCreditList,
    updateCreditPort: UpdateCredit,
    createCredentialOfferPort: CreateCredentialOffer
  ) {
    this.getCreditListPort = getCreditListPort;
    this.updateCreditPort = updateCreditPort;
    this.createCredentialOfferPort = createCredentialOfferPort;
  }

  async getCreditList(): Promise<CreditInfoList> {
    return await this.getCreditListPort();
  }

  async updateCredit(input: UpdateCreditInput): Promise<void> {
    const { id, credit } = input;
    if (id !== credit.credit_id) {
      throw new Error('id and credit.credit_id must match');
    }
    await this.updateCreditPort(id, credit);
  }

  async createCredentialOffer(credentialConfigurationId: string): Promise<CredentialOffer> {
    return await this.createCredentialOfferPort(credentialConfigurationId);
  }
}
