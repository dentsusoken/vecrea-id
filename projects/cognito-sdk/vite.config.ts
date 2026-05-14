import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: {
      client: "src/client/index.ts",
      admin: "src/admin/index.ts",
    },
    dts: {
      tsgo: true,
    },
    deps: {
      neverBundle: ["@aws-sdk/client-cognito-identity-provider"],
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
