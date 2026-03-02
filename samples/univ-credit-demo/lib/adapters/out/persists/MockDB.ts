import json from '@/resource/credits.json';
import { GetCreditList, UpdateCredit } from '@/lib/ports/out/persists';
import { CreditInfo } from '@/lib/domain';

const map = new Map(
  json.map((item) => {
    const credit = item as CreditInfo;
    return [credit.credit_id, credit] as const;
  })
);

export class MockDB {
  getCreditList: GetCreditList = async () =>
    Promise.resolve(Object.fromEntries(map.entries()));

  updateCredit: UpdateCredit = async (id, credit) => {
    map.set(id, credit);
    return Promise.resolve();
  };
}
