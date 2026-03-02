export interface CreditInfo {
  credit_id: string;
  name: string;
  status: 'ready' | 'issued';
  expire_at: number;
}
