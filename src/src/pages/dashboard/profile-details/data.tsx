'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { Profile } from '@/lib/profiles/api-client';
import { getProfile, updateProfileData } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Data | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const [profile, setProfile] = React.useState<null | Profile>(null);
  const [value, setValue] = React.useState<string>('{}');
  const [error, setError] = React.useState<string>('');
  const [fieldError, setFieldError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const loadProfile = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    setFieldError('');

    try {
      const nextProfile = await getProfile(profileId);
      setProfile(nextProfile);
      setValue(JSON.stringify(nextProfile.data ?? {}, null, 2));
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  React.useEffect(() => {
    loadProfile().catch((err) => {
      logger.error(err);
    });
  }, [loadProfile]);

  const handleSubmit = React.useCallback(async (): Promise<void> => {
    setFieldError('');
    setIsSubmitting(true);

    try {
      const parsed = JSON.parse(value || '{}') as unknown;

      if (!isRecord(parsed)) {
        setFieldError('Data must be a JSON object.');
        return;
      }

      const updatedProfile = await updateProfileData(profileId, parsed);
      setProfile(updatedProfile);
      setValue(JSON.stringify(updatedProfile.data ?? {}, null, 2));
      toast.success('Profile data updated');
    } catch (err) {
      const message = err instanceof SyntaxError ? 'Invalid JSON.' : getErrorMessage(err);
      setFieldError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [profileId, value]);

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}
        <Card>
          <CardHeader subheader={profile ? profile.name : 'Update Profile Data'} title="Data" />
          {isLoading ? (
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <React.Fragment>
              <CardContent>
                <FormControl error={Boolean(fieldError)} fullWidth>
                  <InputLabel>Data JSON</InputLabel>
                  <OutlinedInput
                    label="Data JSON"
                    minRows={16}
                    multiline
                    onChange={(event) => {
                      setValue(event.target.value);
                    }}
                    value={value}
                  />
                  {fieldError ? <FormHelperText>{fieldError}</FormHelperText> : null}
                </FormControl>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', p: 3, pt: 0 }}>
                <Button disabled={isSubmitting} onClick={handleSubmit} variant="contained">
                  Save data
                </Button>
              </CardActions>
            </React.Fragment>
          )}
        </Card>
      </Stack>
    </React.Fragment>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}
