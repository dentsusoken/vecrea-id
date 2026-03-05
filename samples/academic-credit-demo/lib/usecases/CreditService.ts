import { CredentialOffer, CreditInfo, CreditInfoList } from '@/lib/domain';
import { CreateCredentialOffer } from '@/lib/ports/out/issuer';
import { GetCreditById, GetCreditList, UpdateCredit } from '@/lib/ports/out/persists';

export interface UpdateCreditInput {
  id: string;
  credit: CreditInfo;
}

export class CreditService {
  private readonly getCreditListPort: GetCreditList;
  private readonly getCreditByIdPort: GetCreditById;
  private readonly updateCreditPort: UpdateCredit;
  private readonly createCredentialOfferPort: CreateCredentialOffer;

  constructor(
    getCreditListPort: GetCreditList,
    getCreditByIdPort: GetCreditById,
    updateCreditPort: UpdateCredit,
    createCredentialOfferPort: CreateCredentialOffer
  ) {
    this.getCreditListPort = getCreditListPort;
    this.getCreditByIdPort = getCreditByIdPort;
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

  async getCreditById(id: string): Promise<CreditInfo | null> {
    return await this.getCreditByIdPort(id);
  }

  async createCredentialOffer(
    credentialConfigurationId: string,
    creditId: string
  ): Promise<CredentialOffer> {
    const credit = await this.getCreditByIdPort(creditId);
    if (!credit) {
      throw new Error(`Credit not found: ${creditId}`);
    }

    const extra: Record<string, unknown> = {
      credit_id: credit.credit_id,
      student_id: credit.student_id,
      course_code: credit.course_code,
      course_name: credit.course_name,
      academic_term: credit.academic_term,
      grade: credit.grade,
    };

    return await this.createCredentialOfferPort(credentialConfigurationId, extra);
  }
}
