import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import { Password as PasswordIcon } from '@phosphor-icons/react/dist/ssr/Password';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z as zod } from 'zod';

import { authClient } from '@/lib/auth/custom/client';
import { toast } from '@/components/core/toaster';

interface Values {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}

const defaultValues = {
  currentPassword: '',
  password: '',
  passwordConfirmation: '',
} satisfies Values;

export function PasswordForm(): React.JSX.Element {
  const { t } = useTranslation();
  const schema = React.useMemo(
    () =>
      zod
        .object({
          currentPassword: zod
            .string()
            .min(1, t('dashboard.settings.security.changePassword.validation.currentRequired')),
          password: zod.string().min(8, t('dashboard.settings.security.changePassword.validation.passwordMin')),
          passwordConfirmation: zod
            .string()
            .min(1, t('dashboard.settings.security.changePassword.validation.passwordConfirmationRequired')),
        })
        .refine((value) => value.password === value.passwordConfirmation, {
          message: t('dashboard.settings.security.changePassword.validation.passwordMismatch'),
          path: ['passwordConfirmation'],
        }),
    [t]
  );
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setError,
  } = useForm<Values>({ defaultValues, resolver: zodResolver(schema) });

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      const { error } = await authClient.changePassword(values);

      if (error) {
        const localizedError = getLocalizedChangePasswordError(error, t);

        setError('root', { message: localizedError, type: 'server' });
        toast.error(localizedError);
        return;
      }

      reset(defaultValues);
      toast.success(t('dashboard.settings.security.changePassword.toasts.updated'));
    },
    [reset, setError, t]
  );

  return (
    <Card component="form" onSubmit={handleSubmit(onSubmit)}>
      <CardHeader
        avatar={
          <Avatar>
            <PasswordIcon fontSize="var(--Icon-fontSize)" />
          </Avatar>
        }
        subheader={t('dashboard.settings.security.changePassword.subheader')}
        title={t('dashboard.settings.security.changePassword.title')}
      />
      <CardContent>
        <Stack spacing={3}>
          {errors.root ? <Alert severity="error">{errors.root.message}</Alert> : null}
          <Stack spacing={3}>
            <Controller
              control={control}
              name="currentPassword"
              render={({ field }) => (
                <FormControl error={Boolean(errors.currentPassword)}>
                  <InputLabel>{t('dashboard.settings.security.changePassword.fields.currentPassword')}</InputLabel>
                  <OutlinedInput
                    {...field}
                    label={t('dashboard.settings.security.changePassword.fields.currentPassword')}
                    type="password"
                  />
                  {errors.currentPassword ? <FormHelperText>{errors.currentPassword.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <FormControl error={Boolean(errors.password)}>
                  <InputLabel>{t('dashboard.settings.security.changePassword.fields.password')}</InputLabel>
                  <OutlinedInput
                    {...field}
                    label={t('dashboard.settings.security.changePassword.fields.password')}
                    type="password"
                  />
                  {errors.password ? <FormHelperText>{errors.password.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="passwordConfirmation"
              render={({ field }) => (
                <FormControl error={Boolean(errors.passwordConfirmation)}>
                  <InputLabel>{t('dashboard.settings.security.changePassword.fields.passwordConfirmation')}</InputLabel>
                  <OutlinedInput
                    {...field}
                    label={t('dashboard.settings.security.changePassword.fields.passwordConfirmation')}
                    type="password"
                  />
                  {errors.passwordConfirmation ? (
                    <FormHelperText>{errors.passwordConfirmation.message}</FormHelperText>
                  ) : null}
                </FormControl>
              )}
            />
          </Stack>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button disabled={isSubmitting} type="submit" variant="contained">
              {isSubmitting
                ? t('dashboard.settings.security.changePassword.actions.updating')
                : t('dashboard.settings.security.changePassword.actions.update')}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function getLocalizedChangePasswordError(error: string, t: ReturnType<typeof useTranslation>['t']): string {
  const normalized = error.trim().toLowerCase();

  if (normalized === 'current password is incorrect.' || normalized === 'la contraseña actual es incorrecta.') {
    return t('dashboard.settings.security.changePassword.validation.currentIncorrect');
  }

  return error;
}
