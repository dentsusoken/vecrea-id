/**
 * Landing page aligned with Authlete java-oauth-server
 * {@link https://github.com/authlete/java-oauth-server/blob/master/src/main/webapp/index.html}
 * Endpoints reflect routes registered on this IdP ({@link registerAu3teRoutes} + management API mount).
 */

import { AUTHORIZATION_PATH } from '@vecrea/au3te-ts-server/handler.authorization';
import { AUTHORIZATION_DECISION_PATH } from '@vecrea/au3te-ts-server/handler.authorization-decision';
import { FEDERATION_CALLBACK_PATH } from '@vecrea/au3te-ts-server/handler.federation-callback';
import { FEDERATION_INITIATION_PATH } from '@vecrea/au3te-ts-server/handler.federation-initiation';
import { PAR_PATH } from '@vecrea/au3te-ts-server/handler.par';
import {
  AUTHORIZATION_SERVER_METADATA_PATH,
  OPENID_CONFIGURATION_PATH,
} from '@vecrea/au3te-ts-server/handler.service-configuration';
import { SERVICE_JWKS_PATH } from '@vecrea/au3te-ts-server/handler.service-jwks';
import { TOKEN_PATH } from '@vecrea/au3te-ts-server/handler.token';
import { AuthorizationServerIndexStyles } from './authorizationServerIndexStyles';

/** Mounted in {@link ../index.tsx} via `createManagementApis(..., { basePath })`. */
export const USER_MANAGEMENT_BASE_PATH = '/api/manage';

export function AuthorizationServerIndexPage() {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, minimum-scale=1.0, initial-scale=1.0, user-scalable=yes"
        />
        <title>Authorization Server</title>
        <AuthorizationServerIndexStyles />
      </head>
      <body class="font-default au3te-srv-index" style={{ margin: 0, textShadow: 'none' }}>
        <div id="page_title">Authorization Server</div>

        <div id="content">
          <p>
            Authorization server supporting OAuth 2.0 &amp; OpenID Connect, powered by{' '}
            <b>
              <a href="https://www.authlete.com/" target="_blank" rel="noreferrer noopener">
                Authlete
              </a>
            </b>{' '}
            (au3te-ts-server / TypeScript).
          </p>

          <table border={1} style={{ margin: '40px 20px' }}>
            <thead>
              <tr class="label">
                <th>Endpoint</th>
                <th>Path</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td valign="top">Authorization Endpoint</td>
                <td>{AUTHORIZATION_PATH}</td>
              </tr>
              <tr>
                <td valign="top">Authorization Decision Endpoint</td>
                <td>
                  <code>POST</code> {AUTHORIZATION_DECISION_PATH}
                </td>
              </tr>
              <tr>
                <td valign="top">Token Endpoint</td>
                <td>
                  <code>POST</code> {TOKEN_PATH}
                </td>
              </tr>
              <tr>
                <td valign="top">JWK Set Endpoint</td>
                <td>
                  <a href={SERVICE_JWKS_PATH}>{SERVICE_JWKS_PATH}</a>
                </td>
              </tr>
              <tr>
                <td valign="top">Discovery Endpoint</td>
                <td>
                  <a href={OPENID_CONFIGURATION_PATH}>{OPENID_CONFIGURATION_PATH}</a>
                </td>
              </tr>
              <tr>
                <td valign="top">Authorization Server Metadata Endpoint</td>
                <td>
                  <a href={AUTHORIZATION_SERVER_METADATA_PATH}>
                    {AUTHORIZATION_SERVER_METADATA_PATH}
                  </a>
                </td>
              </tr>
              <tr>
                <td valign="top">Pushed Authorization Request Endpoint</td>
                <td>
                  <code>POST</code> {PAR_PATH}
                </td>
              </tr>
              <tr>
                <td valign="top">Federation Initiation Endpoint</td>
                <td>
                  <code>GET</code> / <code>POST</code> {FEDERATION_INITIATION_PATH}
                </td>
              </tr>
              <tr>
                <td valign="top">Federation Callback Endpoint</td>
                <td>
                  <code>GET</code> / <code>POST</code> {FEDERATION_CALLBACK_PATH}
                </td>
              </tr>
              <tr>
                <td valign="top">User Management API (OpenAPI)</td>
                <td>
                  <a href={`${USER_MANAGEMENT_BASE_PATH}/docs`}>
                    {USER_MANAGEMENT_BASE_PATH}/docs
                  </a>{' '}
                  (Scalar)
                </td>
              </tr>
            </tbody>
          </table>

          <table border={1} style={{ margin: '40px 20px' }}>
            <tbody>
              <tr>
                <td valign="top" class="label">
                  Management Console
                </td>
                <td>
                  <a href="https://so.authlete.com/" target="_blank" rel="noreferrer noopener">
                    https://so.authlete.com
                  </a>
                </td>
              </tr>
              <tr>
                <td valign="top" class="label">
                  Authlete (overview)
                </td>
                <td>
                  <a
                    href="https://www.authlete.com/developers/overview/"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    https://www.authlete.com/developers/overview/
                  </a>
                </td>
              </tr>
              <tr>
                <td valign="top" class="label">
                  Reference implementation
                </td>
                <td>
                  <a
                    href="https://github.com/authlete/java-oauth-server"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    https://github.com/authlete/java-oauth-server
                  </a>
                </td>
              </tr>
              <tr>
                <td valign="top" class="label">
                  au3te-ts-server
                </td>
                <td>
                  <a
                    href="https://github.com/dentsusoken/au3te-ts-server"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    https://github.com/dentsusoken/au3te-ts-server
                  </a>
                </td>
              </tr>
            </tbody>
          </table>

          <ol>
            <li>
              <a href="https://www.authlete.com/" target="_blank" rel="noreferrer noopener">
                Authlete
              </a>{' '}
              is an OAuth 2.0 &amp; OpenID Connect implementation on cloud (
              <a
                href="https://www.authlete.com/developers/overview/"
                target="_blank"
                rel="noreferrer noopener"
              >
                overview
              </a>
              ).
            </li>
            <li>This authorization server uses the au3te TypeScript handler stack on AWS Lambda or Node.</li>
            <li>
              Configure services and clients in the{' '}
              <a href="https://so.authlete.com/" target="_blank" rel="noreferrer noopener">
                Service Owner Console
              </a>{' '}
              (
              <a
                href="https://www.authlete.com/developers/so_console/"
                target="_blank"
                rel="noreferrer noopener"
              >
                document
              </a>
              ).
            </li>
          </ol>
        </div>
      </body>
    </html>
  );
}
