import { CredentialOffer } from '@/lib/domain';
import { CreateCredentialOffer } from '@/lib/ports/out/issuer';
import https from 'node:https';

export class CredentialIssuerClient {
  private readonly issuerBaseUrl: string;

  constructor(issuerBaseUrl: string) {
    this.issuerBaseUrl = issuerBaseUrl;
  }

  createCredentialOffer: CreateCredentialOffer = async (credentialConfigurationId) => {
    const url = new URL('/credential_offer2', this.issuerBaseUrl);
    url.searchParams.set('credential_configuration_id', credentialConfigurationId);

    const data =
      url.protocol === 'https:' ? await this.getJsonInsecure(url) : await this.getJson(url);
    return data as CredentialOffer;
  };

  private async getJson(url: URL): Promise<unknown> {
    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Credential issuer error: ${res.status}`);
    }
    return await res.json();
  }

  private async getJsonInsecure(url: URL): Promise<unknown> {
    const allowInsecureTls =
      process.env.CREDENTIAL_ISSUER_INSECURE_TLS === 'true' ||
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1';
    if (!allowInsecureTls) {
      return await this.getJson(url);
    }

    return await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: url.hostname,
          port: url.port ? Number(url.port) : 443,
          path: `${url.pathname}${url.search}`,
          method: 'GET',
          rejectUnauthorized: false,
        },
        (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            const statusCode = res.statusCode ?? 500;
            if (statusCode < 200 || statusCode >= 300) {
              reject(new Error(`Credential issuer error: ${statusCode}`));
              return;
            }
            try {
              resolve(JSON.parse(body));
            } catch {
              reject(new Error('Credential issuer returned invalid JSON'));
            }
          });
        }
      );

      req.on('error', reject);
      req.end();
    });
  }
}
