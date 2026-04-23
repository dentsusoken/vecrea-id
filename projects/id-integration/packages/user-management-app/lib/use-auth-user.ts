'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

function userLabel(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
): string {
  return user.signInDetails?.loginId ?? user.username ?? user.userId;
}

export function useAuthUser() {
  const [label, setLabel] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const syncUser = useCallback(() => {
    return getCurrentUser()
      .then((user) => setLabel(userLabel(user)))
      .catch(() => setLabel(null))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    void syncUser();
    const remove = Hub.listen('auth', (capsule) => {
      const event = capsule.payload.event;
      if (event === 'signedOut') {
        setLabel(null);
        setReady(true);
        return;
      }
      if (event === 'signedIn' || event === 'tokenRefresh') {
        void syncUser();
      }
    });
    return remove;
  }, [syncUser]);

  const doSignOut = useCallback(async () => {
    await signOut();
    window.location.assign('/login');
  }, []);

  const signedIn = ready && label !== null;

  return { label, ready, signedIn, signOut: doSignOut };
}
