export { requiredScopesResponse } from './checkRequiredScopes';
export { USER_MANAGEMENT_SCOPES, type UserManagementScope } from './scopes';
export {
  createBearerAuthMiddleware,
  type IntrospectionConfigSource,
} from './middleware/bearerAuth';
