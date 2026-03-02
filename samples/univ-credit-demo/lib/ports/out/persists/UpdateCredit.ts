import { CreditInfo } from '@/lib/domain';

export interface UpdateCredit {
  (id:string,credit: CreditInfo): Promise<void>;
}
