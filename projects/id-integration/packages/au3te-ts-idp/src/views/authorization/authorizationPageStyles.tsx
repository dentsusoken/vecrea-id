/** Authlete authorization.jsp 由来レイアウトの最小 CSS（外部ファイルなし） */

export function AuthorizationPageStyles() {
  return (
    <style>{`
      :root {
        --font: system-ui, -apple-system, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif;
        --text: #1a1a1a;
        --muted: #555;
        --border: #ccc;
        --accent: #e67300;
        --bg: #fafafa;
      }
      .au3te-authz { font-family: var(--font); color: var(--text); background: var(--bg); min-height: 100vh; margin: 0; padding: 0; }
      .au3te-authz__inner { max-width: 44rem; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
      #page_title { font-size: 1.35rem; font-weight: 600; margin: 0 0 1rem; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; }
      #content h3#client-name { font-size: 1.2rem; margin: 0 0 0.75rem; }
      .au3te-indent { margin-left: 0.5rem; padding-left: 0.75rem; border-left: 3px solid #ddd; }
      #logo { float: left; max-width: 120px; max-height: 120px; margin: 0 1rem 0.5rem 0; object-fit: contain; }
      .au3te-clear { clear: both; }
      #client-summary p { margin: 0.35rem 0; color: var(--muted); }
      #client-link-list { margin: 0.5rem 0 0; padding-left: 1.25rem; }
      #client-link-list li { margin: 0.25rem 0; }
      #client-link-list a { color: #0b57d0; }
      .au3te-authz h4 { font-size: 1rem; margin: 1.25rem 0 0.5rem; color: #333; }
      #scope-list { margin: 0.25rem 0; }
      #scope-list dt { font-weight: 600; margin-top: 0.5rem; }
      #scope-list dd { margin: 0.15rem 0 0 1rem; color: var(--muted); font-size: 0.92rem; }
      .au3te-table-wrap { overflow-x: auto; }
      table.verified-claims, .au3te-table { border-collapse: collapse; width: 100%; max-width: 100%; font-size: 0.9rem; margin: 0.5rem 0; }
      table.verified-claims th, table.verified-claims td,
      .au3te-table th, .au3te-table td { border: 1px solid var(--border); padding: 0.45rem 0.65rem; text-align: left; }
      table.verified-claims th, .au3te-table th { background: #ff9f43; color: #111; }
      pre.au3te-pre { background: #fff; border: 1px solid var(--border); padding: 0.75rem; overflow: auto; font-size: 0.82rem; margin: 0.5rem 0; }
      #login-fields { margin: 0.75rem 0; }
      #login-prompt, #federations-prompt { font-size: 0.95rem; margin-bottom: 0.5rem; font-weight: 500; }
      #federation-message { color: #b06000; font-size: 0.9rem; margin-bottom: 0.35rem; }
      #federations ul { margin: 0.25rem 0; padding-left: 1.25rem; }
      .au3te-authz input[type="text"], .au3te-authz input[type="password"] {
        display: block; width: 100%; max-width: 22rem; padding: 0.5rem 0.6rem; margin: 0.35rem 0 0.65rem;
        border: 1px solid var(--border); border-radius: 4px; font-family: inherit; font-size: 1rem; box-sizing: border-box;
      }
      #authorization-form-buttons { margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap; }
      #authorize-button, #deny-button {
        padding: 0.55rem 1.15rem; font-family: inherit; font-size: 1rem; cursor: pointer; border-radius: 4px; border: 1px solid #333;
        background: #fff; color: #111;
      }
      #authorize-button { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
      #authorize-button:hover { opacity: 0.92; }
      #deny-button:hover { background: #f0f0f0; }
      #login-user { font-size: 0.95rem; margin: 0.5rem 0; }
      #login-user code { font-size: 0.85rem; background: #eee; padding: 0.1rem 0.35rem; border-radius: 3px; }
    `}</style>
  );
}
