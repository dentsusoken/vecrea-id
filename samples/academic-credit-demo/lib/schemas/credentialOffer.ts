import { z } from 'zod';

export const createCredentialOfferSchema = z.object({
  credential_configuration_id: z.string().min(1),
  credit_id: z.string().min(1),
});
