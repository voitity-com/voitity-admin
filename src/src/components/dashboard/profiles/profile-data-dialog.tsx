'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';

import type { Profile } from '@/lib/profiles/api-client';

export interface ProfileDataDialogProps {
  onClose?: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  open?: boolean;
  profile?: null | Profile;
}

export function ProfileDataDialog({
  onClose,
  onSubmit,
  open = false,
  profile,
}: ProfileDataDialogProps): React.JSX.Element {
  const [value, setValue] = React.useState<string>(formatData(profile?.data));
  const [error, setError] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  React.useEffect(() => {
    setValue(formatData(profile?.data));
    setError('');
  }, [profile, open]);

  const handleSubmit = React.useCallback(async (): Promise<void> => {
    setError('');
    setIsSubmitting(true);

    try {
      const parsed = JSON.parse(value || '{}') as unknown;

      if (!isRecord(parsed)) {
        setError('Data must be a JSON object.');
        return;
      }

      await onSubmit(parsed);
    } catch (err) {
      setError(err instanceof SyntaxError ? 'Invalid JSON.' : 'Unable to update profile data.');
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, value]);

  return (
    <Dialog fullWidth maxWidth="md" onClose={onClose} open={open}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Profile data</Typography>
        {profile ? (
          <Typography color="text.secondary" variant="body2">
            {profile.name}
          </Typography>
        ) : null}
      </Box>
      <DialogContent>
        <FormControl error={Boolean(error)} fullWidth>
          <InputLabel>Data JSON</InputLabel>
          <OutlinedInput
            label="Data JSON"
            minRows={12}
            multiline
            onChange={(event) => {
              setValue(event.target.value);
            }}
            value={value}
          />
          {error ? <FormHelperText>{error}</FormHelperText> : null}
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button color="secondary" disabled={isSubmitting} onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={isSubmitting} onClick={handleSubmit} variant="contained">
          Save data
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function formatData(data?: null | Record<string, unknown>): string {
  return JSON.stringify(data ?? {}, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
