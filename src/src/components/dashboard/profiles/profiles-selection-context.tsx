'use client';

import * as React from 'react';

import { useSelection } from '@/hooks/use-selection';
import type { Selection } from '@/hooks/use-selection';
import type { Profile } from '@/lib/profiles/api-client';

function noop(): void {
  return undefined;
}

export interface ProfilesSelectionContextValue extends Selection {}

export const ProfilesSelectionContext = React.createContext<ProfilesSelectionContextValue>({
  deselectAll: noop,
  deselectOne: noop,
  selectAll: noop,
  selectOne: noop,
  selected: new Set(),
  selectedAny: false,
  selectedAll: false,
});

interface ProfilesSelectionProviderProps {
  children: React.ReactNode;
  profiles: Profile[];
}

export function ProfilesSelectionProvider({
  children,
  profiles = [],
}: ProfilesSelectionProviderProps): React.JSX.Element {
  const profileIds = React.useMemo(() => profiles.map((profile) => String(profile.id)), [profiles]);
  const selection = useSelection(profileIds);

  return <ProfilesSelectionContext.Provider value={{ ...selection }}>{children}</ProfilesSelectionContext.Provider>;
}

export function useProfilesSelection(): ProfilesSelectionContextValue {
  return React.useContext(ProfilesSelectionContext);
}
