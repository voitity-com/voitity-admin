'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { UploadSimple as UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z as zod } from 'zod';

import type {
  IntegrationDestination,
  IntegrationMedia,
  OtherMediaInput,
} from '@/lib/integrations/api-client';

const ACCEPTED_MEDIA = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm';
const translationKey = 'dashboard.profiles.detail.integrations.other';

interface FormValues {
  customDestinationLabel: string;
  description: string;
  destinationType: string;
  file?: File;
  link: string;
  rightsConfirmed: boolean;
  selected: boolean;
}

export interface OtherMediaFormProps {
  destinations: IntegrationDestination[];
  editingMedia?: IntegrationMedia | null;
  isSaving: boolean;
  onCancel?: () => void;
  onSave: (input: OtherMediaInput) => Promise<void>;
  selectionAvailable: boolean;
}

export function OtherMediaForm({
  destinations,
  editingMedia,
  isSaving,
  onCancel,
  onSave,
  selectionAvailable,
}: OtherMediaFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const isEditing = Boolean(editingMedia);
  const inputReference = React.useRef<HTMLInputElement | null>(null);
  const schema = React.useMemo(
    () =>
      zod
        .object({
          customDestinationLabel: zod.string().trim().max(60, t(`${translationKey}.validation.customMax`)),
          description: zod
            .string()
            .trim()
            .min(1, t(`${translationKey}.validation.descriptionRequired`))
            .max(2000, t(`${translationKey}.validation.descriptionMax`)),
          destinationType: zod.string().trim().min(1, t(`${translationKey}.validation.destinationRequired`)),
          file: zod.custom<File>().optional(),
          link: zod
            .string()
            .trim()
            .max(2048, t(`${translationKey}.validation.linkInvalid`))
            .url(t(`${translationKey}.validation.linkInvalid`))
            .refine((value) => /^https?:\/\//i.test(value), t(`${translationKey}.validation.linkInvalid`)),
          rightsConfirmed: zod.boolean(),
          selected: zod.boolean(),
        })
        .superRefine((values, context) => {
          if (!isEditing && !values.file) {
            context.addIssue({
              code: zod.ZodIssueCode.custom,
              message: t(`${translationKey}.validation.fileRequired`),
              path: ['file'],
            });
          }

          if (!isEditing && !values.rightsConfirmed) {
            context.addIssue({
              code: zod.ZodIssueCode.custom,
              message: t(`${translationKey}.validation.rightsRequired`),
              path: ['rightsConfirmed'],
            });
          }

          if (values.destinationType === 'other' && !values.customDestinationLabel.trim()) {
            context.addIssue({
              code: zod.ZodIssueCode.custom,
              message: t(`${translationKey}.validation.customRequired`),
              path: ['customDestinationLabel'],
            });
          }
        }),
    [isEditing, t]
  );
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setValue,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      customDestinationLabel:
        editingMedia?.destination_type === 'other' ? (editingMedia.destination_label ?? '') : '',
      description: editingMedia?.caption ?? '',
      destinationType: editingMedia?.destination_type ?? '',
      file: undefined,
      link: editingMedia?.permalink ?? '',
      rightsConfirmed: isEditing,
      selected: editingMedia?.selected ?? selectionAvailable,
    },
    resolver: zodResolver(schema),
  });
  const file = watch('file');
  const destinationType = watch('destinationType');
  const customDestinationLabel = watch('customDestinationLabel');
  const selectedDestination = destinations.find((destination) => destination.value === destinationType);
  const actionPreview = React.useMemo(() => {
    if (!selectedDestination) {
      return '';
    }

    if (selectedDestination.value !== 'other' || !customDestinationLabel.trim()) {
      return selectedDestination.action_label;
    }

    return selectedDestination.action_label.replace(selectedDestination.label, customDestinationLabel.trim());
  }, [customDestinationLabel, selectedDestination]);
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return undefined;
    }

    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl(nextObjectUrl);

    return () => {
      URL.revokeObjectURL(nextObjectUrl);
    };
  }, [file]);

  React.useEffect(() => {
    if (!selectionAvailable && !editingMedia?.selected) {
      setValue('selected', false);
    }
  }, [editingMedia?.selected, selectionAvailable, setValue]);

  const previewUrl = objectUrl ?? editingMedia?.media_url ?? null;
  const isVideo = file?.type.startsWith('video/') ?? editingMedia?.media_type?.toUpperCase().includes('VIDEO') ?? false;
  const busy = isSaving || isSubmitting;

  return (
    <Box
      component="form"
      data-testid="other-media-form"
      onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        handleSubmit(async (values) => {
          await onSave({
            customDestinationLabel: values.customDestinationLabel.trim() || undefined,
            description: values.description.trim(),
            destinationType: values.destinationType,
            file: values.file,
            link: values.link.trim(),
            rightsConfirmed: values.rightsConfirmed,
            selected: values.selected,
          });
        })(event).catch(() => undefined);
      }}
      sx={{ border: '1px solid var(--mui-palette-divider)', borderRadius: 1, p: 3 }}
    >
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h6">
            {t(`${translationKey}.${isEditing ? 'editTitle' : 'createTitle'}`)}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {t(`${translationKey}.formHelp`)}
          </Typography>
        </Stack>

        {!isEditing ? (
          <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
            <Button
              data-testid="other-file-button"
              onClick={() => inputReference.current?.click()}
              startIcon={<UploadSimpleIcon />}
              type="button"
              variant="outlined"
            >
              {t(`${translationKey}.fields.file`)}
            </Button>
            <Box
              accept={ACCEPTED_MEDIA}
              component="input"
              data-testid="other-file-input"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setValue('file', event.target.files?.[0], { shouldValidate: true });
              }}
              ref={inputReference}
              sx={{ display: 'none' }}
              type="file"
            />
            {file ? <Typography variant="body2">{file.name}</Typography> : null}
            <FormHelperText error={Boolean(errors.file)}>
              {errors.file?.message ?? t(`${translationKey}.fileHelp`)}
            </FormHelperText>
          </Stack>
        ) : null}

        {previewUrl ? (
          <Box
            {...(isVideo ? { controls: true } : { alt: editingMedia?.caption ?? file?.name ?? '' })}
            component={isVideo ? 'video' : 'img'}
            src={previewUrl}
            sx={{ borderRadius: 1, maxHeight: 320, objectFit: 'contain', width: '100%' }}
          />
        ) : null}

        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <TextField
              {...field}
              error={Boolean(errors.description)}
              fullWidth
              helperText={errors.description?.message}
              label={t(`${translationKey}.fields.description`)}
              multiline
              required
              rows={3}
            />
          )}
        />
        <Controller
          control={control}
          name="link"
          render={({ field }) => (
            <TextField
              {...field}
              error={Boolean(errors.link)}
              fullWidth
              helperText={errors.link?.message}
              label={t(`${translationKey}.fields.link`)}
              placeholder="https://"
              required
              type="url"
            />
          )}
        />
        <Controller
          control={control}
          name="destinationType"
          render={({ field }) => (
            <FormControl error={Boolean(errors.destinationType)} fullWidth required>
              <InputLabel id="other-destination-label">{t(`${translationKey}.fields.destination`)}</InputLabel>
              <Select
                {...field}
                label={t(`${translationKey}.fields.destination`)}
                labelId="other-destination-label"
              >
                {destinations.map((destination) => (
                  <MenuItem key={destination.value} value={destination.value}>
                    {destination.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{errors.destinationType?.message}</FormHelperText>
            </FormControl>
          )}
        />

        {destinationType === 'other' ? (
          <Controller
            control={control}
            name="customDestinationLabel"
            render={({ field }) => (
              <TextField
                {...field}
                error={Boolean(errors.customDestinationLabel)}
                fullWidth
                helperText={errors.customDestinationLabel?.message}
                label={t(`${translationKey}.fields.customDestination`)}
                required
              />
            )}
          />
        ) : null}

        {actionPreview ? (
          <Typography color="text.secondary" variant="body2">
            {t(`${translationKey}.actionPreview`, { action: actionPreview })}
          </Typography>
        ) : null}

        {!isEditing ? (
          <Controller
            control={control}
            name="rightsConfirmed"
            render={({ field }) => (
              <React.Fragment>
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                  label={t(`${translationKey}.fields.rights`)}
                />
                {errors.rightsConfirmed ? (
                  <FormHelperText error>{errors.rightsConfirmed.message}</FormHelperText>
                ) : null}
              </React.Fragment>
            )}
          />
        ) : null}

        <Controller
          control={control}
          name="selected"
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value}
                  disabled={!selectionAvailable && !editingMedia?.selected}
                  onChange={(_, checked) => field.onChange(checked)}
                />
              }
              label={t(`${translationKey}.fields.selected`)}
            />
          )}
        />

        <Stack direction="row" spacing={1}>
          <Button disabled={busy} startIcon={<UploadSimpleIcon />} type="submit" variant="contained">
            {t(`${translationKey}.${busy ? 'saving' : 'save'}`)}
          </Button>
          {onCancel ? (
            <Button disabled={busy} onClick={onCancel} type="button" variant="outlined">
              {t(`${translationKey}.cancel`)}
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}
