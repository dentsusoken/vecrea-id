import { CreditInfoList } from '@/lib/domain';

export interface GetCreditList {
  (): Promise<CreditInfoList>;
}
