'use client';

import * as React from 'react';

import type { User } from '@/types/user';
import { authClient } from '@/lib/auth/custom/client';
import { clearApiAccessToken, hasExceededInactivityLimit, updateApiLastActivity } from '@/lib/auth/custom/api-token';
import { logger } from '@/lib/default-logger';

import type { UserContextValue } from '../types';

export const UserContext = React.createContext<UserContextValue | undefined>(undefined);

export interface UserProviderProps {
  children: React.ReactNode;
}

export function UserProvider({ children }: UserProviderProps): React.JSX.Element {
  const [state, setState] = React.useState<{ user: User | null; error: string | null; isLoading: boolean }>({
    user: null,
    error: null,
    isLoading: true,
  });

  const checkSession = React.useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await authClient.getUser();

      if (error) {
        logger.error(error);
        setState((prev) => ({ ...prev, user: null, error: 'Something went wrong', isLoading: false }));
        return;
      }

      setState((prev) => ({ ...prev, user: data ?? null, error: null, isLoading: false }));
    } catch (err) {
      logger.error(err);
      setState((prev) => ({ ...prev, user: null, error: 'Something went wrong', isLoading: false }));
    }
  }, []);

  React.useEffect(() => {
    checkSession().catch((err) => {
      logger.error(err);
      // noop
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let unsubscribed = false;

    const activityEvents = ['click', 'keydown', 'mousemove', 'touchstart'];

    const handleActivity = (): void => {
      updateApiLastActivity();
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, true);
    });

    const handleInactivitySignOut = async (): Promise<void> => {
      try {
        const { error } = await authClient.signOut();

        if (error) {
          logger.error(error);
        }

        if (!unsubscribed) {
          setState((prev) => ({ ...prev, user: null, error: null, isLoading: false }));
        }
      } catch (err) {
        logger.error(err);
      }
    };

    const intervalId = window.setInterval(() => {
      if (hasExceededInactivityLimit()) {
        clearApiAccessToken();
        handleInactivitySignOut().catch((err) => {
          logger.error(err);
        });
      }
    }, 60 * 1000);

    return () => {
      unsubscribed = true;
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity, true);
      });
      window.clearInterval(intervalId);
    };
  }, []);

  return <UserContext.Provider value={{ ...state, checkSession }}>{children}</UserContext.Provider>;
}

export const UserConsumer = UserContext.Consumer;
