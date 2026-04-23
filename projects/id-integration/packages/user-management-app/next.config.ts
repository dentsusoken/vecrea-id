import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lambda 上で next を解決するため自己完結ビルド（Amplify Hosting Compute 向け）
  // @see https://nextjs.org/docs/app/api-reference/config/next-config-js/output
  output: "standalone",
  // モノレポで standalone がネストされないよう、トレースの根を pnpm ワークスペース根に揃える
  // @see https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
};

export default nextConfig;
