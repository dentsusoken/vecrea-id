/**
 * `importVerifiedUsers` returns this as `jobId` when there are no verified staging rows to import.
 * `checkImportStatus` must treat it as success without calling `DescribeUserImportJob`.
 */
export const SKIP_USER_IMPORT_JOB_CHECK_JOB_ID =
  '__SKIP_USER_IMPORT_JOB_CHECK__' as const;
