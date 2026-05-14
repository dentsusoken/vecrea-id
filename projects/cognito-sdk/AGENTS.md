<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.

<!--VITE PLUS END-->

# Dependency Management

## minimumReleaseAge ポリシー

`pnpm-workspace.yaml` の `minimumReleaseAge: 10080`（7日）は供給チェーン攻撃対策のセキュリティポリシーです。

**絶対にやってはいけないこと:**

- `minimumReleaseAge` の値を下げる（`0` に設定するなど）
- `minimumReleaseAgeExclude` に無闇にパッケージを追加する

**パッケージが `minimumReleaseAge` でブロックされた場合の対処法:**

1. **直接依存パッケージがブロックされた場合** → `package.json` のバージョン制約をポリシーを通過する古いバージョンに下げる

   ```jsonc
   // NG: "^3.1046.0"（リリース3日後）
   // OK: "^3.1044.0"（リリース10日後）
   "@aws-sdk/client-cognito-identity-provider": "^3.1044.0"
   ```

2. **transitive 依存パッケージがブロックされた場合** → `pnpm-workspace.yaml` の `overrides` セクションでポリシーを通過する古いバージョンに固定する

   ```yaml
   overrides:
     some-package: "1.2.3" # ポリシーを通過する古いバージョンに固定
   ```

3. **どちらの場合も** → 再帰的にダウングレードする。問題のパッケージだけでなく、そのパッケージを直接要求している親パッケージも合わせてダウングレードを検討する。
