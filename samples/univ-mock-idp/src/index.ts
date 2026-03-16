import 'dotenv/config';
import express from 'express';
import { randomBytes } from 'crypto';
import { inflateRawSync } from 'zlib';
import { DOMParser } from '@xmldom/xmldom';
import { IdentityProvider, ServiceProvider, SamlLib, setSchemaValidator } from 'samlify';
import usersConfig from '../config/users.json';

const app = express();
app.use(express.urlencoded({ extended: true }));

const ENTITY_ID = process.env.ENTITY_ID || 'http://localhost:4000';
const PORT = Number(process.env.PORT || 4000);

const PRIVATE_KEY = Buffer.from(process.env.PRIVATE_KEY || '', 'base64').toString('utf-8');
const PUBLIC_CERT_PEM = Buffer.from(process.env.PUBLIC_KEY || '', 'base64').toString('utf-8');

setSchemaValidator({ validate: (response: string) => Promise.resolve(response) });

// Pass only `context` (no `attributes` array) so samlify's IdP constructor does NOT
// pre-replace {AttributeStatement} with an empty element before our customTagReplacement runs.
const loginResponseTemplate = { context: SamlLib.defaultLoginResponseTemplate.context };

const idp = IdentityProvider({
  entityID: ENTITY_ID,
  privateKey: PRIVATE_KEY,
  signingCert: PUBLIC_CERT_PEM,
  isAssertionEncrypted: false,
  nameIDFormat: ['urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'],
  loginResponseTemplate,
  singleSignOnService: [{
    Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
    Location: `${ENTITY_ID}/sso`,
  }],
});

interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  enrollment_year: string;
  university: string;
}

const users: User[] = usersConfig;

function parseSAMLRequest(samlRequestB64: string) {
  const decoded = Buffer.from(samlRequestB64, 'base64');
  const xml = inflateRawSync(decoded).toString('utf-8');
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const root = doc.documentElement!;
  const issuerEl = doc.getElementsByTagNameNS(
    'urn:oasis:names:tc:SAML:2.0:assertion',
    'Issuer'
  )[0];
  return {
    requestId: root.getAttribute('ID') || '',
    acsUrl: root.getAttribute('AssertionConsumerServiceURL') || '',
    spEntityId: issuerEl?.textContent?.trim() || '',
  };
}

// GET /sso - SAMLRequest を受け取りユーザー選択画面を表示
app.get('/sso', (req, res) => {
  const samlRequestB64 = req.query.SAMLRequest as string;
  if (!samlRequestB64) {
    res.status(400).send('Missing SAMLRequest');
    return;
  }

  const relayState = (req.query.RelayState as string) || '';

  let requestId = '', acsUrl = '', spEntityId = '';
  try {
    ({ requestId, acsUrl, spEntityId } = parseSAMLRequest(samlRequestB64));
  } catch (e) {
    res.status(400).send(`Invalid SAMLRequest: ${e}`);
    return;
  }

  const errorHtml = req.query.error === '1'
    ? `<p style="color:red;">Invalid email or password.</p>`
    : '';

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>Mock SAML IdP</title>
  <style>
    body { font-family: sans-serif; max-width: 480px; margin: 60px auto; padding: 0 20px; }
    input[type="email"], input[type="password"], button { width: 100%; padding: 10px; font-size: 17px; margin-top: 6px; box-sizing: border-box; }
    button { background: #0070f3; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 16px; }
    label { display: block; margin-top: 12px; font-size: 14px; }
  </style>
</head>
<body>
  <h2>Mock SAML IdP</h2>
  <p>Enter your credentials to sign in.</p>
  ${errorHtml}
  <form method="POST" action="/login">
    <input type="hidden" name="requestId" value="${requestId}" />
    <input type="hidden" name="acsUrl" value="${acsUrl}" />
    <input type="hidden" name="spEntityId" value="${spEntityId}" />
    <input type="hidden" name="relayState" value="${relayState}" />
    <label>Email
      <input type="email" name="email" required autofocus />
    </label>
    <label>Password
      <input type="password" name="password" required />
    </label>
    <button type="submit">Sign In</button>
  </form>
</body>
</html>`);
});

// POST /login - SAMLResponse を生成して SP の ACS URL に POST
app.post('/login', async (req, res) => {
  const { requestId, acsUrl, spEntityId, relayState, email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>Mock SAML IdP</title>
  <style>
    body { font-family: sans-serif; max-width: 480px; margin: 60px auto; padding: 0 20px; }
    input[type="email"], input[type="password"], button { width: 100%; padding: 10px; font-size: 17px; margin-top: 6px; box-sizing: border-box; }
    button { background: #0070f3; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 16px; }
    label { display: block; margin-top: 12px; font-size: 14px; }
  </style>
</head>
<body>
  <h2>Mock SAML IdP</h2>
  <p>Enter your credentials to sign in.</p>
  <p style="color:red;">Invalid email or password.</p>
  <form method="POST" action="/login">
    <input type="hidden" name="requestId" value="${requestId}" />
    <input type="hidden" name="acsUrl" value="${acsUrl}" />
    <input type="hidden" name="spEntityId" value="${spEntityId}" />
    <input type="hidden" name="relayState" value="${relayState}" />
    <label>Email
      <input type="email" name="email" required autofocus />
    </label>
    <label>Password
      <input type="password" name="password" required />
    </label>
    <button type="submit">Sign In</button>
  </form>
</body>
</html>`);
    return;
  }

  const sp = ServiceProvider({
    entityID: spEntityId,
    assertionConsumerService: [{
      Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
      Location: acsUrl,
    }],
    authnRequestsSigned: false,
  });

  try {
    const { context: samlResponse } = await idp.createLoginResponse(
      sp,
      { extract: { request: { id: requestId } } },
      'post',
      { nameID: user.email },
      (template: string) => {
        const now = new Date();
        const fiveMin = new Date(now.getTime() + 5 * 60 * 1000);
        const responseId = '_' + randomBytes(16).toString('hex');
        const assertionId = '_' + randomBytes(16).toString('hex');

        const authnStatement =
          `<saml:AuthnStatement AuthnInstant="${now.toISOString()}">` +
          `<saml:AuthnContext>` +
          `<saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:Password</saml:AuthnContextClassRef>` +
          `</saml:AuthnContext>` +
          `</saml:AuthnStatement>`;

        const esc = (v: string) => v
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

        const mkAttr = (name: string, value: string) =>
          `<saml:Attribute Name="${name}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">` +
          `<saml:AttributeValue xsi:type="xs:string">${esc(value)}</saml:AttributeValue>` +
          `</saml:Attribute>`;

        // Explicit namespace declarations prevent xml-crypto/xmldom from dropping child elements
        const attributeStatement =
          `<saml:AttributeStatement xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
          mkAttr('email', user.email) +
          mkAttr('firstName', user.firstName) +
          mkAttr('lastName', user.lastName) +
          mkAttr('enrollment_year', user.enrollment_year) +
          mkAttr('university', user.university) +
          `</saml:AttributeStatement>`;

        const context = SamlLib.replaceTagsByValue(template, {
          ID: responseId,
          AssertionID: assertionId,
          Destination: acsUrl,
          Audience: spEntityId,
          EntityID: spEntityId,
          SubjectRecipient: acsUrl,
          AssertionConsumerServiceURL: acsUrl,
          Issuer: ENTITY_ID,
          IssueInstant: now.toISOString(),
          StatusCode: 'urn:oasis:names:tc:SAML:2.0:status:Success',
          ConditionsNotBefore: now.toISOString(),
          ConditionsNotOnOrAfter: fiveMin.toISOString(),
          SubjectConfirmationDataNotOnOrAfter: fiveMin.toISOString(),
          NameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          NameID: user.email,
          InResponseTo: requestId,
          AuthnStatement: authnStatement,
          AttributeStatement: attributeStatement,
        });

        return { id: assertionId, context };
      },
    );

    res.send(`<!DOCTYPE html>
<html><body>
<form id="f" method="POST" action="${acsUrl}">
  <input type="hidden" name="SAMLResponse" value="${samlResponse}" />
  ${relayState ? `<input type="hidden" name="RelayState" value="${relayState}" />` : ''}
</form>
<script>document.getElementById('f').submit();</script>
</body></html>`);
  } catch (e) {
    res.status(500).send(`Failed to build SAMLResponse: ${e}`);
  }
});

app.listen(PORT, () => {
  console.log(`Mock SAML IdP: http://localhost:${PORT}`);
  console.log(`  SSO URL:   http://localhost:${PORT}/sso`);
  console.log(`  Entity ID: ${ENTITY_ID}`);
});
