import { CognitoOptions } from "better-auth";

export const cognito: CognitoOptions = {
  clientId: process.env.COGNITO_CLIENT_ID as string,
  clientSecret: process.env.COGNITO_CLIENT_SECRET as string,
  domain: process.env.COGNITO_DOMAIN as string,
  region: process.env.COGNITO_REGION as string,
  userPoolId: process.env.COGNITO_USER_POOL_ID as string,
};
