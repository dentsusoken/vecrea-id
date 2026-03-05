import { CredentialOffer } from '@/lib/domain';
import { CreateCredentialOffer } from '@/lib/ports/out/issuer';
import https from 'node:https';

export class CredentialIssuerClient {
  private readonly issuerBaseUrl: string;

  constructor(issuerBaseUrl: string) {
    this.issuerBaseUrl = issuerBaseUrl;
  }

  createCredentialOffer: CreateCredentialOffer = async (credentialConfigurationId, extra) => {
    const url = new URL('/credential_offer2', this.issuerBaseUrl);
    const payload: Record<string, unknown> = {
      credential_configuration_id: credentialConfigurationId,
    };
    if (extra && Object.keys(extra).length > 0) {
      payload.extra = extra;
    }

    const data =
      url.protocol === 'https:'
        ? await this.postJsonInsecure(url, payload)
        : await this.postJson(url, payload);

    return data as CredentialOffer;
  };

  private async postJson(url: URL, payload: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Credential issuer error: ${res.status}`);
    }
    return await res.json();
  }

  private async postJsonInsecure(
    url: URL,
    payload: Record<string, unknown>
  ): Promise<unknown> {
    const allowInsecureTls =
      process.env.CREDENTIAL_ISSUER_INSECURE_TLS === 'true' ||
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1';
    if (!allowInsecureTls) {
      return await this.postJson(url, payload);
    }

    return await new Promise((resolve, reject) => {
      const body = JSON.stringify(payload);
      const req = https.request(
        {
          hostname: url.hostname,
          port: url.port ? Number(url.port) : 443,
          path: `${url.pathname}${url.search}`,
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(body),
          },
          rejectUnauthorized: false,
        },
        (res) => {
          let responseBody = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            responseBody += chunk;
          });
          res.on('end', () => {
            const statusCode = res.statusCode ?? 500;
            if (statusCode < 200 || statusCode >= 300) {
              reject(new Error(`Credential issuer error: ${statusCode}`));
              return;
            }
            try {
              resolve(JSON.parse(responseBody));
            } catch {
              reject(new Error('Credential issuer returned invalid JSON'));
            }
          });
        }
      );

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}
