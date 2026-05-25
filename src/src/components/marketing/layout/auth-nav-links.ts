import { config } from '@/config';
import { AuthStrategy } from '@/lib/auth/strategy';
import { paths } from '@/paths';

const authLinksByStrategy = {
  [AuthStrategy.CUSTOM]: { signIn: paths.auth.custom.signIn, signUp: paths.auth.custom.signUp },
  [AuthStrategy.AUTH0]: { signIn: paths.auth.auth0.signIn, signUp: paths.auth.auth0.signIn },
  [AuthStrategy.COGNITO]: { signIn: paths.auth.cognito.signIn, signUp: paths.auth.cognito.signUp },
  [AuthStrategy.FIREBASE]: { signIn: paths.auth.firebase.signIn, signUp: paths.auth.firebase.signUp },
  [AuthStrategy.SUPABASE]: { signIn: paths.auth.supabase.signIn, signUp: paths.auth.supabase.signUp },
} as const;

export function getAuthNavLinks(): { signIn: string; signUp: string } {
  return authLinksByStrategy[config.auth.strategy] ?? authLinksByStrategy[AuthStrategy.CUSTOM];
}
