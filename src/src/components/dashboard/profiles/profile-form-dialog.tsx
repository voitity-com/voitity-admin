'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { z as zod } from 'zod';

import type { Profile, ProfilePayload } from '@/lib/profiles/api-client';

const schema = zod.object({
  active: zod.boolean(),
  alias: zod.string().max(100, 'Alias must be at most 100 characters'),
  description: zod.string().min(1, 'Description is required').max(500),
  genre: zod.string().min(1, 'Genre is required').max(10),
  name: zod.string().min(1, 'Name is required').max(100),
  personality: zod.string().min(1, 'Personality is required').max(200),
});

type Values = zod.infer<typeof schema>;

function getDefaultValues(profile?: null | Profile): Values {
  return {
    active: profile?.active ?? true,
    alias: profile?.alias ?? '',
    description: profile?.description ?? '',
    genre: profile?.genre ?? '',
    name: profile?.name ?? '',
    personality: profile?.personality ?? '',
  };
}

export interface ProfileFormDialogProps {
  onClose?: () => void;
  onSubmit: (payload: ProfilePayload) => Promise<void>;
  open?: boolean;
  profile?: null | Profile;
}

export function ProfileFormDialog({
  onClose,
  onSubmit,
  open = false,
  profile,
}: ProfileFormDialogProps): React.JSX.Element {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues: getDefaultValues(profile), resolver: zodResolver(schema) });

  React.useEffect(() => {
    reset(getDefaultValues(profile));
  }, [profile, reset, open]);

  const handleFormSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      await onSubmit(toPayload(values));
    },
    [onSubmit]
  );

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5">{profile ? 'Edit profile' : 'Create profile'}</Typography>
        </Box>
        <DialogContent>
          <Stack spacing={2}>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <FormControl error={Boolean(errors.name)}>
                  <InputLabel>Name</InputLabel>
                  <OutlinedInput {...field} />
                  {errors.name ? <FormHelperText>{errors.name.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="alias"
              render={({ field }) => (
                <FormControl error={Boolean(errors.alias)}>
                  <InputLabel>Alias</InputLabel>
                  <OutlinedInput {...field} label="Alias" />
                  {errors.alias ? <FormHelperText>{errors.alias.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <FormControl error={Boolean(errors.description)}>
                  <InputLabel>Description</InputLabel>
                  <OutlinedInput {...field} multiline rows={3} />
                  {errors.description ? <FormHelperText>{errors.description.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="genre"
              render={({ field }) => (
                <FormControl error={Boolean(errors.genre)}>
                  <InputLabel>Genre</InputLabel>
                  <OutlinedInput {...field} />
                  {errors.genre ? <FormHelperText>{errors.genre.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="personality"
              render={({ field }) => (
                <FormControl error={Boolean(errors.personality)}>
                  <InputLabel>Personality</InputLabel>
                  <OutlinedInput {...field} />
                  {errors.personality ? <FormHelperText>{errors.personality.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={(event) => {
                        field.onChange(event.target.checked);
                      }}
                    />
                  }
                  label="Active"
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button color="secondary" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit" variant="contained">
            {profile ? 'Save changes' : 'Create profile'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function toPayload(values: Values): ProfilePayload {
  return {
    ...values,
    alias: values.alias.trim() || null,
  };
}
