import { CreditService, UpdateCreditInput } from '@/lib/usecases';

export class CreditApi {
  private readonly creditService: CreditService;

  constructor(creditService: CreditService) {
    this.creditService = creditService;
  }

  async processGetCreditList() {
    return await this.creditService.getCreditList();
  }

  async processUpdateCredit(input: UpdateCreditInput) {
    return await this.creditService.updateCredit(input);
  }

  async processCreateCredentialOffer(
    credentialConfigurationId: string,
    creditId: string
  ) {
    return await this.creditService.createCredentialOffer(credentialConfigurationId, creditId);
  }
}
