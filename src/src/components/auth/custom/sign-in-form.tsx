'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import Link from '@mui/material/Link';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlash as EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z as zod } from 'zod';

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

interface Values {
  email: string;
  password: string;
}

const defaultValues = { email: '', password: '' } satisfies Values;

export function SignInForm(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const { checkSession } = useUser();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const previousLanguageRef = React.useRef(currentLanguage);

  const [showPassword, setShowPassword] = React.useState<boolean>();

  const [isPending, setIsPending] = React.useState<boolean>(false);

  const schema = React.useMemo(
    () =>
      zod.object({
        email: zod
          .string()
          .min(1, { message: t('auth.signIn.validation.emailRequired') })
          .email({ message: t('auth.signIn.validation.emailInvalid') }),
        password: zod.string().min(1, { message: t('auth.signIn.validation.passwordRequired') }),
      }),
    [t]
  );

  const {
    control,
    handleSubmit,
    setError,
    trigger,
    formState: { errors },
  } = useForm<Values>({ defaultValues, resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (previousLanguageRef.current === currentLanguage) {
      return;
    }

    previousLanguageRef.current = currentLanguage;

    if (errors.email || errors.password) {
      trigger(['email', 'password']).catch(() => {
        // ignore
      });
    }
  }, [currentLanguage, errors.email, errors.password, trigger]);

  const handleGoogleAuth = React.useCallback(async (): Promise<void> => {
    setIsPending(true);

    try {
      const accessToken = await requestGoogleAccessToken();
      const profile = await fetchGoogleProfile(accessToken);
      const { error } = await authClient.signInWithGoogle({ accessToken, profile });

      if (error) {
        throw new Error(error);
      }

      await checkSession?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.signIn.errors.googleAuth');
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }, [checkSession, t]);

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      setIsPending(true);

      const { error } = await authClient.signInWithPassword(values);

      if (error) {
        setError('root', { type: 'server', message: error });
        setIsPending(false);
        return;
      }

      // Refresh the auth state
      await checkSession?.();
    },
    [checkSession, setError]
  );

  return (
    <Stack spacing={4}>
      <div>
        <Box component={RouterLink} href={paths.home} sx={{ display: 'inline-block', fontSize: 0 }}>
          <DynamicLogo colorDark="light" colorLight="dark" height={32} width={122} />
        </Box>
      </div>
      <Stack spacing={1}>
        <Typography variant="h5">{t('auth.signIn.title')}</Typography>
        <Typography color="text.secondary" variant="body2">
          {t('auth.signIn.noAccount')}{' '}
          <Link component={RouterLink} href={paths.auth.custom.signUp} variant="subtitle2">
            {t('auth.signIn.signUp')}
          </Link>
        </Typography>
      </Stack>
      <Stack spacing={3}>
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
                {t('auth.signIn.continueWith', { provider: provider.name })}
              </Button>
            )
          )}
        </Stack>
        <Divider>{t('auth.signIn.divider')}</Divider>
        <Stack spacing={2}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <FormControl error={Boolean(errors.email)}>
                    <InputLabel>{t('auth.signIn.fields.email')}</InputLabel>
                    <OutlinedInput {...field} type="email" />
                    {errors.email ? <FormHelperText>{errors.email.message}</FormHelperText> : null}
                  </FormControl>
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <FormControl error={Boolean(errors.password)}>
                    <InputLabel>{t('auth.signIn.fields.password')}</InputLabel>
                    <OutlinedInput
                      {...field}
                      endAdornment={
                        showPassword ? (
                          <EyeIcon
                            cursor="pointer"
                            fontSize="var(--icon-fontSize-md)"
                            onClick={(): void => {
                              setShowPassword(false);
                            }}
                          />
                        ) : (
                          <EyeSlashIcon
                            cursor="pointer"
                            fontSize="var(--icon-fontSize-md)"
                            onClick={(): void => {
                              setShowPassword(true);
                            }}
                          />
                        )
                      }
                      label={t('auth.signIn.fields.password')}
                      type={showPassword ? 'text' : 'password'}
                    />
                    {errors.password ? <FormHelperText>{errors.password.message}</FormHelperText> : null}
                  </FormControl>
                )}
              />
              {errors.root ? <Alert color="error">{errors.root.message}</Alert> : null}
              <Button disabled={isPending} type="submit" variant="contained">
                {t('auth.signIn.actions.submit')}
              </Button>
            </Stack>
          </form>
        </Stack>
      </Stack>
    </Stack>
  );
}
