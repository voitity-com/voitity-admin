'use client';

import * as React from 'react';

export type NoPlanTutorialStatus = 'checking' | 'closed' | 'not-required' | 'open';

interface NoPlanTutorialContextValue {
  setStatus: React.Dispatch<React.SetStateAction<NoPlanTutorialStatus>>;
  status: NoPlanTutorialStatus;
}

const NoPlanTutorialContext = React.createContext<NoPlanTutorialContextValue | undefined>(undefined);

export function NoPlanTutorialProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [status, setStatus] = React.useState<NoPlanTutorialStatus>('checking');
  const value = React.useMemo(() => ({ setStatus, status }), [status]);

  return <NoPlanTutorialContext.Provider value={value}>{children}</NoPlanTutorialContext.Provider>;
}

export function useNoPlanTutorial(): NoPlanTutorialContextValue {
  const context = React.useContext(NoPlanTutorialContext);

  if (!context) {
    throw new Error('useNoPlanTutorial must be used inside NoPlanTutorialProvider.');
  }

  return context;
}
