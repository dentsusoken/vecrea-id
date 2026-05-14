/** Aligns with `GET /staging/users` response from user-management-apis (sanitized `data`). */

export type StagingUserItem = {
  id: string;
  imported: boolean;
  verified: boolean;
  importBatchId?: string;
  error?: string;
  errorMessage?: string;
  data: Record<string, unknown>;
};

export type ListStagingUsersResponse = {
  items: StagingUserItem[];
  paginationToken?: string;
};

export type BatchDeleteStagingUsersResponse = {
  requestedCount: number;
  successCount: number;
  failureCount: number;
  errors?: Array<{ id: string; message: string }>;
};
