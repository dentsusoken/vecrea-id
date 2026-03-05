import { mockDi } from '@/lib/di/mockDi';
import { createCredentialOfferSchema, updateCreditSchema } from '@/lib/schemas';
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { validator } from 'hono/validator';

const app = new Hono().basePath('/api');
const { creditApi } = mockDi();

app.get('/get-credits', async (c) => {
  const credits = await creditApi.processGetCreditList();
  return c.json({
    credits,
  });
});

app.post(
  '/update-credit',
  validator('json', (value, c) => {
    const parsed = updateCreditSchema.safeParse(value);
    if (!parsed.success) {
      return c.json(
        {
          message: 'Invalid request body',
          errors: parsed.error.flatten(),
        },
        400
      );
    }
    return parsed.data;
  }),
  async (c) => {
    const input = c.req.valid('json');
    try {
      await creditApi.processUpdateCredit(input);
      return c.json({ success: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update credit';
      return c.json({ message }, 400);
    }
  }
);

app.post(
  '/credential-offer',
  validator('json', (value, c) => {
    const parsed = createCredentialOfferSchema.safeParse(value);
    if (!parsed.success) {
      return c.json(
        {
          message: 'Invalid request body',
          errors: parsed.error.flatten(),
        },
        400
      );
    }
    return parsed.data;
  }),
  async (c) => {
    const input = c.req.valid('json');
    try {
      const offer = await creditApi.processCreateCredentialOffer(
        input.credential_configuration_id,
        input.credit_id
      );
      return c.json(offer);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create credential offer';
      return c.json({ message }, 502);
    }
  }
);

export const GET = handle(app);
export const POST = handle(app);
