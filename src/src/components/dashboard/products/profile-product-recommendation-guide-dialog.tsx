'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z as zod } from 'zod';

const maxGuidanceLength = 1500;

interface Values {
  guidance: string;
}

function createSchema(t: (key: string, options?: Record<string, unknown>) => string): zod.ZodType<Values> {
  return zod.object({
    guidance: zod
      .string()
      .trim()
      .max(maxGuidanceLength, t('dashboard.products.recommendationGuide.validation.max', { max: maxGuidanceLength })),
  });
}

export interface ProfileProductRecommendationGuideDialogProps {
  guidance?: null | string;
  onClose: () => void;
  onSave: (guidance: null | string) => Promise<void>;
  open: boolean;
}

export function ProfileProductRecommendationGuideDialog({
  guidance,
  onClose,
  onSave,
  open,
}: ProfileProductRecommendationGuideDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const schema = React.useMemo(() => createSchema(t), [t]);
  const [submitError, setSubmitError] = React.useState('');
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: { guidance: guidance ?? '' },
    resolver: zodResolver(schema),
  });
  const currentGuidance = watch('guidance');

  React.useEffect(() => {
    if (!open) {
      return;
    }

    reset({ guidance: guidance ?? '' });
    setSubmitError('');
  }, [guidance, open, reset]);

  const submit = React.useCallback(
    async (values: Values): Promise<void> => {
      setSubmitError('');

      try {
        const normalized = values.guidance.trim();
        await onSave(normalized === '' ? null : normalized);
      } catch {
        setSubmitError(t('dashboard.products.recommendationGuide.errors.save'));
      }
    },
    [onSave, t]
  );

  return (
    <Dialog fullWidth maxWidth="sm" onClose={isSubmitting ? undefined : onClose} open={open}>
      <Box
        component="form"
        onSubmit={handleSubmit(submit)}
        sx={{ display: 'flex', flexDirection: 'column', maxHeight: 'inherit', minHeight: 0, overflow: 'hidden' }}
      >
        <DialogTitle>{t('dashboard.products.recommendationGuide.title')}</DialogTitle>
        <DialogContent sx={{ minHeight: 0 }}>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography color="text.secondary" variant="body2">
              {t('dashboard.products.recommendationGuide.description')}
            </Typography>
            <Controller
              control={control}
              name="guidance"
              render={({ field }) => (
                <TextField
                  {...field}
                  error={Boolean(errors.guidance)}
                  fullWidth
                  inputProps={{ maxLength: maxGuidanceLength }}
                  label={t('dashboard.products.recommendationGuide.fieldLabel')}
                  minRows={5}
                  multiline
                  placeholder={t('dashboard.products.recommendationGuide.placeholder')}
                />
              )}
            />
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Typography color={errors.guidance ? 'error.main' : 'text.secondary'} variant="caption">
                {errors.guidance?.message ?? t('dashboard.products.recommendationGuide.helper')}
              </Typography>
              <Typography color="text.secondary" sx={{ flexShrink: 0 }} variant="caption">
                {currentGuidance.length}/{maxGuidanceLength}
              </Typography>
            </Stack>
            <Alert severity="info">{t('dashboard.products.recommendationGuide.notice')}</Alert>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={isSubmitting} onClick={onClose}>
            {t('dashboard.products.recommendationGuide.actions.cancel')}
          </Button>
          <Button disabled={isSubmitting} type="submit" variant="contained">
            {isSubmitting
              ? t('dashboard.products.recommendationGuide.actions.saving')
              : t('dashboard.products.recommendationGuide.actions.save')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
