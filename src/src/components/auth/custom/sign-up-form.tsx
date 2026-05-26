'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { paths } from '@/paths';
import { authClient } from '@/lib/auth/custom/client';
import { fetchGoogleProfile } from '@/lib/google/profile';
import { requestGoogleAccessToken } from '@/lib/google/oauth';
import { useUser } from '@/hooks/use-user';
import { RouterLink } from '@/components/core/link';
import { DynamicLogo } from '@/components/core/logo';
import { toast } from '@/components/core/toaster';

interface OAuthProvider {
  id: 'google';
  name: string;
  logo: string;
}

const oAuthProviders = [{ id: 'google', name: 'Google', logo: '/assets/logo-google.svg' }] satisfies OAuthProvider[];

export function SignUpForm(): React.JSX.Element {
  const { checkSession } = useUser();

  const [isPending, setIsPending] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);

  const handleGoogleAuth = React.useCallback(async (): Promise<void> => {
    setIsPending(true);
    setErrorMessage(null);

    try {
      const accessToken = await requestGoogleAccessToken();
      const profile = await fetchGoogleProfile(accessToken);
      const { error } = await authClient.signUpWithGoogle({ accessToken, profile });

      if (error) {
        throw new Error(error);
      }

      await checkSession?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to authenticate with Google';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }, [checkSession]);

  return (
    <Stack spacing={4}>
      <div>
        <Box component={RouterLink} href={paths.home} sx={{ display: 'inline-block', fontSize: 0 }}>
          <DynamicLogo colorDark="light" colorLight="dark" height={32} width={122} />
        </Box>
      </div>
      <Stack spacing={1}>
        <Typography variant="h5">Sign up</Typography>
        <Typography color="text.secondary" variant="body2">
          Already have an account?{' '}
          <Link component={RouterLink} href={paths.auth.custom.signIn} variant="subtitle2">
            Sign in
          </Link>
        </Typography>
      </Stack>
      <Stack spacing={3}>
        {errorMessage ? (
          <Typography color="error.main" variant="body2">
            {errorMessage}
          </Typography>
        ) : null}
        <Stack spacing={2}>
          {oAuthProviders.map(
            (provider): React.JSX.Element => (
              <Button
                color="secondary"
                disabled={isPending}
                endIcon={<Box alt="" component="img" height={24} src={provider.logo} width={24} />}
                key={provider.id}
                onClick={handleGoogleAuth}
                variant="outlined"
              >
                Continue with {provider.name}
              </Button>
            )
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}
