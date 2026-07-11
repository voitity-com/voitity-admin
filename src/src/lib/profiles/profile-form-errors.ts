import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ProfileApiError } from '@/lib/profiles/api-client';

const profileFieldMap = {
  alias: 'alias',
  description: 'description',
  genre: 'genre',
  name: 'name',
  personality: 'personality',
  profession_key: 'professionKey',
} as const;

export function applyProfileFormApiErrors<TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>
): boolean {
  if (!(error instanceof ProfileApiError) || Object.keys(error.errors).length === 0) {
    return false;
  }

  let applied = false;

  for (const [apiField, messages] of Object.entries(error.errors)) {
    const formField = profileFieldMap[apiField as keyof typeof profileFieldMap];
    const message = messages[0];

    if (!formField || !message) {
      continue;
    }

    setError(formField as Path<TValues>, { message, type: 'server' });
    applied = true;
  }

  return applied;
}
