"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const crypto_1 = require("crypto");
const zlib_1 = require("zlib");
const xmldom_1 = require("@xmldom/xmldom");
const samlify_1 = require("samlify");
const users_json_1 = __importDefault(require("../config/users.json"));
const app = (0, express_1.default)();
app.use(express_1.default.urlencoded({ extended: true }));
const ENTITY_ID = process.env.ENTITY_ID || 'http://localhost:4000';
const PORT = Number(process.env.PORT || 4000);
const PRIVATE_KEY = Buffer.from(process.env.PRIVATE_KEY || '', 'base64').toString('utf-8');
const PUBLIC_CERT_PEM = Buffer.from(process.env.PUBLIC_KEY || '', 'base64').toString('utf-8');
(0, samlify_1.setSchemaValidator)({ validate: (response) => Promise.resolve(response) });
// Default template with {AuthnStatement} intact (samlify replaces it with '' by default,
// so we use loginResponseTemplate + customTagReplacement to fill it ourselves)
const loginResponseTemplate = samlify_1.SamlLib.defaultLoginResponseTemplate;
const idp = (0, samlify_1.IdentityProvider)({
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
const users = users_json_1.default;
function parseSAMLRequest(samlRequestB64) {
    const decoded = Buffer.from(samlRequestB64, 'base64');
    const xml = (0, zlib_1.inflateRawSync)(decoded).toString('utf-8');
    const doc = new xmldom_1.DOMParser().parseFromString(xml, 'text/xml');
    const root = doc.documentElement;
    const issuerEl = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Issuer')[0];
    return {
        requestId: root.getAttribute('ID') || '',
        acsUrl: root.getAttribute('AssertionConsumerServiceURL') || '',
        spEntityId: issuerEl?.textContent?.trim() || '',
    };
}
// GET /sso - SAMLRequest を受け取りユーザー選択画面を表示
app.get('/sso', (req, res) => {
    const samlRequestB64 = req.query.SAMLRequest;
    if (!samlRequestB64) {
        res.status(400).send('Missing SAMLRequest');
        return;
    }
    const relayState = req.query.RelayState || '';
    let requestId = '', acsUrl = '', spEntityId = '';
    try {
        ({ requestId, acsUrl, spEntityId } = parseSAMLRequest(samlRequestB64));
    }
    catch (e) {
        res.status(400).send(`Invalid SAMLRequest: ${e}`);
        return;
    }
    const userOptions = users.map(u => `<option value="${u.id}">${u.firstName} ${u.lastName} (${u.university.toUpperCase()} University / enrolled ${u.enrollment_year})</option>`).join('\n');
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Mock SAML IdP</title>
  <style>
    body { font-family: sans-serif; max-width: 480px; margin: 60px auto; padding: 0 20px; }
    select, button { width: 100%; padding: 10px; font-size: 15px; margin-top: 6px; box-sizing: border-box; }
    button { background: #0070f3; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 16px; }
  </style>
</head>
<body>
  <h2>Mock SAML IdP</h2>
  <p>Select a user to sign in.</p>
  <form method="POST" action="/login">
    <input type="hidden" name="requestId" value="${requestId}" />
    <input type="hidden" name="acsUrl" value="${acsUrl}" />
    <input type="hidden" name="spEntityId" value="${spEntityId}" />
    <input type="hidden" name="relayState" value="${relayState}" />
    <label>User
      <select name="userId">
        ${userOptions}
      </select>
    </label>
    <button type="submit">Sign In</button>
  </form>
</body>
</html>`);
});
// POST /login - SAMLResponse を生成して SP の ACS URL に POST
app.post('/login', async (req, res) => {
    const { requestId, acsUrl, spEntityId, relayState, userId } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) {
        res.status(400).send('User not found');
        return;
    }
    const sp = (0, samlify_1.ServiceProvider)({
        entityID: spEntityId,
        assertionConsumerService: [{
                Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
                Location: acsUrl,
            }],
        authnRequestsSigned: false,
    });
    try {
        const { context: samlResponse } = await idp.createLoginResponse(sp, { extract: { request: { id: requestId } } }, 'post', { nameID: user.email }, (template) => {
            const now = new Date();
            const fiveMin = new Date(now.getTime() + 5 * 60 * 1000);
            const responseId = '_' + (0, crypto_1.randomBytes)(16).toString('hex');
            const assertionId = '_' + (0, crypto_1.randomBytes)(16).toString('hex');
            const authnStatement = `<saml:AuthnStatement AuthnInstant="${now.toISOString()}">` +
                `<saml:AuthnContext>` +
                `<saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:Password</saml:AuthnContextClassRef>` +
                `</saml:AuthnContext>` +
                `</saml:AuthnStatement>`;
            const esc = (v) => v
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            const mkAttr = (name, value) => `<saml:Attribute Name="${name}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">` +
                `<saml:AttributeValue xsi:type="xs:string">${esc(value)}</saml:AttributeValue>` +
                `</saml:Attribute>`;
            // Explicit namespace declarations prevent xml-crypto/xmldom from dropping child elements
            const attributeStatement = `<saml:AttributeStatement xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
                mkAttr('email', user.email) +
                mkAttr('firstName', user.firstName) +
                mkAttr('lastName', user.lastName) +
                mkAttr('enrollment_year', user.enrollment_year) +
                mkAttr('university', user.university) +
                `</saml:AttributeStatement>`;
            const context = samlify_1.SamlLib.replaceTagsByValue(template, {
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
        });
        res.send(`<!DOCTYPE html>
<html><body>
<form id="f" method="POST" action="${acsUrl}">
  <input type="hidden" name="SAMLResponse" value="${samlResponse}" />
  ${relayState ? `<input type="hidden" name="RelayState" value="${relayState}" />` : ''}
</form>
<script>document.getElementById('f').submit();</script>
</body></html>`);
    }
    catch (e) {
        res.status(500).send(`Failed to build SAMLResponse: ${e}`);
    }
});
app.listen(PORT, () => {
    console.log(`Mock SAML IdP: http://localhost:${PORT}`);
    console.log(`  SSO URL:   http://localhost:${PORT}/sso`);
    console.log(`  Entity ID: ${ENTITY_ID}`);
});
