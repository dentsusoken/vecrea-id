/**
 * From Authlete java-oauth-server {@link https://github.com/authlete/java-oauth-server/blob/master/src/main/webapp/css/index.css}
 * (selectors scoped under `body.au3te-srv-index`.)
 */

export function AuthorizationServerIndexStyles() {
  return (
    <style>{`
      body.au3te-srv-index {
        margin: 0;
        text-shadow: none;
      }

      body.au3te-srv-index #page_title {
        background: #333;
        color: white;
        padding: 0.5em;
        margin: 0;
        font-size: 200%;
      }

      body.au3te-srv-index #content {
        padding: 20px;
      }

      body.au3te-srv-index table {
        border-collapse: collapse;
      }

      body.au3te-srv-index td {
        padding: 10px;
      }

      body.au3te-srv-index tr.label,
      body.au3te-srv-index td.label {
        background-color: #e0e0e0;
      }

      body.au3te-srv-index a {
        text-decoration: none;
        color: blue;
      }

      body.au3te-srv-index a:visited {
        color: blue;
      }

      body.au3te-srv-index a:hover {
        text-decoration: underline;
      }

      body.au3te-srv-index.font-default {
        font-family: 'Source Sans Pro', 'Helvetica Neue', 'Segoe UI', 'Arial', sans-serif;
        -webkit-font-smoothing: antialiased;
        color: #333;
      }

      body.au3te-srv-index #content > p {
        color: #333;
      }
    `}</style>
  );
}
