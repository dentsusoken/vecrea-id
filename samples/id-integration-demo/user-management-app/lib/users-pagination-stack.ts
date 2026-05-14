const STACK_KEY = 'um_users_p_stack';

type Stack = (string | null)[];

function readStack(): Stack {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(sessionStorage.getItem(STACK_KEY) || '[]') as Stack;
  } catch {
    return [];
  }
}

function writeStack(s: Stack) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STACK_KEY, JSON.stringify(s));
}

/**
 * Call before navigating to the next ListUsers page. Pushes the **current** page
 * `paginationToken` (null = first page) so the stack can be unwound.
 */
export function usersPaginationPushForNext(
  currentListToken: string | null | undefined
) {
  const s = readStack();
  s.push(currentListToken === undefined ? null : currentListToken);
  writeStack(s);
}

/**
 * Pops the `paginationToken` of the *previous* page in the list flow (LIFO
 * of tokens pushed in {@link usersPaginationPushForNext}).
 */
export function usersPaginationPopForBack(): {
  targetToken: string | null;
  empty: boolean;
} {
  const s = readStack();
  if (s.length === 0) return { targetToken: null, empty: true };
  const targetToken = s.pop()!;
  writeStack(s);
  return { targetToken, empty: false };
}

export function usersPaginationStackDepth(): number {
  return readStack().length;
}

export function clearUsersPaginationStack() {
  writeStack([]);
}
