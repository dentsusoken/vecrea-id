/**
 * Ported from Authlete java-oauth-server {@link https://github.com/authlete/java-oauth-server/blob/master/src/main/webapp/css/authorization.css}
 * (scoped under `.au3te-authz` so we do not leak global `body` rules).
 */

export function AuthorizationPageStyles() {
  return (
    <style>{`
      .au3te-authz.font-default {
        font-family: 'Source Sans Pro', 'Helvetica Neue', 'Segoe UI', 'Arial', sans-serif;
        -webkit-font-smoothing: antialiased;
        color: #666;
        margin: 0;
        text-shadow: none;
        min-height: 100vh;
      }

      .au3te-authz p {
        margin-top: 0;
      }

      .au3te-authz h3,
      .au3te-authz h4 {
        color: steelblue;
      }

      .au3te-authz h5 {
        color: steelblue;
        margin: 0.75rem 0 0.35rem;
        font-size: 0.95rem;
      }

      .au3te-authz .indent {
        margin-left: 15px;
      }

      .au3te-authz #page_title {
        background: #f5f5f5;
        color: steelblue;
        padding: 0.5em;
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .au3te-authz #content {
        padding: 0 20px 20px;
      }

      .au3te-authz #logo {
        width: 150px;
        height: 150px;
        background: lightgray;
        margin: 0 20px 10px 5px;
        float: left;
        object-fit: contain;
      }

      .au3te-authz #client-summary {
        float: left;
      }

      .au3te-authz #client-link-list {
        margin: 0;
        padding: 0;
      }

      .au3te-authz #client-link-list li {
        list-style-type: none;
      }

      .au3te-authz #client-link-list a {
        position: relative;
        padding-left: 25px;
        text-decoration: none;
        color: cadetblue;
      }

      .au3te-authz #client-link-list a:hover {
        text-decoration: underline;
      }

      .au3te-authz #client-link-list a::before {
        display: block;
        content: "";
        position: absolute;
        top: 50%;
        left: 0;
        width: 0;
        margin: -5px 0 0 0;
        border-top: 12px solid cadetblue;
        border-left: 12px solid transparent;
        transform: rotate(45deg);
      }

      .au3te-authz #scope-list {
        margin-left: 20px;
      }

      .au3te-authz #scope-list dt {
        font-weight: bold;
      }

      .au3te-authz #scope-list dd {
        margin-bottom: 10px;
      }

      .au3te-authz input[type="text"],
      .au3te-authz input[type="password"] {
        color: black;
      }

      .au3te-authz #login-fields {
        margin-bottom: 20px;
      }

      .au3te-authz #login-prompt {
        font-size: 85%;
        margin-bottom: 5px;
      }

      .au3te-authz #loginId {
        display: block;
        border: 1px solid #666;
        border-bottom: none;
        padding: 0.3em 0.5em;
        width: 300px;
        max-width: 100%;
        box-sizing: border-box;
        font: inherit;
      }

      .au3te-authz #password {
        display: block;
        border: 1px solid #666;
        padding: 0.3em 0.5em;
        width: 300px;
        max-width: 100%;
        box-sizing: border-box;
        font: inherit;
      }

      .au3te-authz #login-user {
        font-style: italic;
      }

      .au3te-authz #login-user .au3te-reauth-hint {
        font-size: 85%;
        color: #666;
        margin: 0.5rem 0 0;
        font-style: normal;
      }

      .au3te-authz #login-user code {
        font-size: 0.9em;
      }

      .au3te-authz #federations-prompt {
        font-size: 85%;
        margin-bottom: 5px;
      }

      .au3te-authz #federation-message {
        font-size: 85%;
        margin-bottom: 5px;
        color: darkred;
      }

      .au3te-authz #authorization-form-buttons {
        margin: 20px auto;
      }

      .au3te-authz #authorize-button,
      .au3te-authz #deny-button {
        display: inline-block;
        width: 150px;
        padding: 12px 0;
        margin: 13px;
        min-height: 26px;
        text-align: center;
        text-decoration: none;
        outline: 0;
        border: none;
        cursor: pointer;
        font: inherit;
        transition: none;
        box-sizing: border-box;
      }

      .au3te-authz #authorize-button {
        background-color: #4285f4;
        color: white;
      }

      .au3te-authz #authorize-button:hover {
        background-color: #1255f4;
      }

      .au3te-authz #authorize-button:active {
        background-color: blue;
      }

      .au3te-authz #deny-button {
        background-color: #f08080;
        color: white;
      }

      .au3te-authz #deny-button:hover {
        background-color: #f05050;
      }

      .au3te-authz #deny-button:active {
        background-color: red;
      }

      .au3te-authz table.verified-claims {
        border-collapse: collapse;
        margin: 0.5rem 0;
      }

      .au3te-authz table.verified-claims th,
      .au3te-authz table.verified-claims td {
        border: 1px solid #666;
        padding: 5px;
      }

      .au3te-authz table.verified-claims thead tr {
        background: orange;
      }

      .au3te-authz #content pre,
      .au3te-authz pre.au3te-authz-details {
        background: #f4f4f4;
        border: 1px solid #ddd;
        border-left: 3px solid #33b0f3;
        color: #666;
        page-break-inside: avoid;
        font-family: monospace, monospace;
        margin-bottom: 1.6em;
        max-width: 60%;
        overflow: auto;
        padding: 1em 1.5em;
        display: block;
        word-wrap: break-word;
      }

      .au3te-authz .au3te-clear {
        clear: both;
      }
    `}</style>
  );
}
