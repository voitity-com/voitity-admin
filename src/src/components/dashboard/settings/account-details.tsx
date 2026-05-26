'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { useTranslation } from 'react-i18next';

import type { User } from '@/types/user';
import { useUser } from '@/hooks/use-user';

export function AccountDetails(): React.JSX.Element {
  const { t } = useTranslation();
  const { user } = useUser();
  const name = getUserName(user);
  const email = typeof user?.email === 'string' ? user.email : '';
  const avatar = typeof user?.avatar === 'string' ? user.avatar : undefined;
  const firstName = typeof user?.firstName === 'string' ? user.firstName : '';
  const lastName = typeof user?.lastName === 'string' ? user.lastName : '';

  return (
    <Card>
      <CardHeader
        avatar={
          <Avatar src={avatar}>
            <UserIcon fontSize="var(--Icon-fontSize)" />
          </Avatar>
        }
        title={t('dashboard.settings.account.basicDetails')}
      />
      <CardContent>
        <Stack spacing={3}>
          <Avatar src={avatar} sx={{ '--Avatar-size': '100px' }}>
            <UserIcon fontSize="var(--Icon-fontSize)" />
          </Avatar>
          <Stack spacing={2}>
            <FormControl>
              <InputLabel>{t('dashboard.settings.account.fields.fullName')}</InputLabel>
              <OutlinedInput name="fullName" readOnly value={name} />
            </FormControl>
            <FormControl>
              <InputLabel>{t('dashboard.settings.account.fields.firstName')}</InputLabel>
              <OutlinedInput name="firstName" readOnly value={firstName} />
            </FormControl>
            <FormControl>
              <InputLabel>{t('dashboard.settings.account.fields.lastName')}</InputLabel>
              <OutlinedInput name="lastName" readOnly value={lastName} />
            </FormControl>
            <FormControl>
              <InputLabel>{t('dashboard.settings.account.fields.email')}</InputLabel>
              <OutlinedInput name="email" readOnly type="email" value={email} />
            </FormControl>
          </Stack>
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button disabled variant="contained">
          {t('dashboard.settings.account.actions.saveChanges')}
        </Button>
      </CardActions>
    </Card>
  );
}

function getUserName(user: User | null): string {
  if (user?.name) {
    return user.name;
  }

  const firstName = typeof user?.firstName === 'string' ? user.firstName : '';
  const lastName = typeof user?.lastName === 'string' ? user.lastName : '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  return fullName || user?.email || '';
}
