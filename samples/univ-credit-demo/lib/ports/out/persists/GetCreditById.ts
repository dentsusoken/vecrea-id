import { CreditInfo } from '@/lib/domain';

export interface GetCreditById {
  (id: string): Promise<CreditInfo | null>;
}
