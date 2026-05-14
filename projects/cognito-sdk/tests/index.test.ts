import { expect, test } from "vite-plus/test";
import { createSrpSession, srpAHex } from "../src/shared/srp.ts";
import { CognitoError, CognitoErrorCode, wrapError } from "../src/shared/errors.ts";

test("createSrpSession generates valid A value", () => {
  const session = createSrpSession();
  expect(session.a).toBeTypeOf("bigint");
  expect(session.A).toBeTypeOf("bigint");
  expect(session.A > 0n).toBe(true);
  const aHex = srpAHex(session);
  expect(aHex.length).toBeGreaterThan(0);
  // A should be a valid hex string
  expect(/^[0-9a-f]+$/i.test(aHex)).toBe(true);
});

test("CognitoError stores code and message", () => {
  const err = new CognitoError(CognitoErrorCode.UserNotFound, "User not found");
  expect(err.code).toBe(CognitoErrorCode.UserNotFound);
  expect(err.message).toBe("User not found");
  expect(err.name).toBe("CognitoError");
  expect(err instanceof Error).toBe(true);
});

test("wrapError converts AWS SDK error", () => {
  const awsError = Object.assign(new Error("User does not exist"), {
    name: "UserNotFoundException",
  });
  expect(() => wrapError(awsError)).toThrow(CognitoError);
  try {
    wrapError(awsError);
  } catch (e) {
    expect(e instanceof CognitoError).toBe(true);
    if (e instanceof CognitoError) {
      expect(e.code).toBe("UserNotFoundException");
    }
  }
});

test("createCognitoClient exports correctly", async () => {
  const { createCognitoClient } = await import("../src/client/index.ts");
  const client = createCognitoClient({
    region: "ap-northeast-1",
    userPoolId: "ap-northeast-1_XXXXXXXXX",
    clientId: "testclientid",
  });
  expect(typeof client.signIn).toBe("function");
  expect(typeof client.signUp).toBe("function");
  expect(typeof client.changePassword).toBe("function");
  expect(typeof client.getUser).toBe("function");
});

test("createCognitoAdmin exports correctly", async () => {
  const { createCognitoAdmin } = await import("../src/admin/index.ts");
  const admin = createCognitoAdmin({
    region: "ap-northeast-1",
    userPoolId: "ap-northeast-1_XXXXXXXXX",
    credentials: {
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    },
  });
  expect(typeof admin.users.create).toBe("function");
  expect(typeof admin.users.list).toBe("function");
  expect(typeof admin.groups.create).toBe("function");
  expect(typeof admin.auth.signIn).toBe("function");
});
