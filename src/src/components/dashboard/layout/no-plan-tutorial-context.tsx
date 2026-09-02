'use client';

import * as React from 'react';

export type NoPlanTutorialStatus = 'checking' | 'closed' | 'not-required' | 'open';

interface NoPlanTutorialContextValue {
  setSuppressed: React.Dispatch<React.SetStateAction<boolean>>;
  setStatus: React.Dispatch<React.SetStateAction<NoPlanTutorialStatus>>;
  suppressed: boolean;
  status: NoPlanTutorialStatus;
}

const NoPlanTutorialContext = React.createContext<NoPlanTutorialContextValue | undefined>(undefined);

export function NoPlanTutorialProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [status, setStatus] = React.useState<NoPlanTutorialStatus>('checking');
  const [suppressed, setSuppressed] = React.useState(false);
  const value = React.useMemo(() => ({ setStatus, setSuppressed, status, suppressed }), [status, suppressed]);

  return <NoPlanTutorialContext.Provider value={value}>{children}</NoPlanTutorialContext.Provider>;
}

export function useNoPlanTutorial(): NoPlanTutorialContextValue {
  const context = React.useContext(NoPlanTutorialContext);

  if (!context) {
    throw new Error('useNoPlanTutorial must be used inside NoPlanTutorialProvider.');
  }

  return context;
}
