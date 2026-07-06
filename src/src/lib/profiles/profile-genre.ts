export const profileGenreValues = ['male', 'female', 'na'] as const;

export type ProfileGenre = (typeof profileGenreValues)[number];

export function isProfileGenre(value: unknown): value is ProfileGenre {
  return typeof value === 'string' && profileGenreValues.includes(value as ProfileGenre);
}

export function normalizeProfileGenre(value: null | string | undefined): ProfileGenre {
  return isProfileGenre(value) ? value : 'na';
}

export function toProfileGenre(value: string): ProfileGenre {
  if (isProfileGenre(value)) {
    return value;
  }

  throw new Error('Invalid profile genre');
}
