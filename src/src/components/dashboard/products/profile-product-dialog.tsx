'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { TelegramLogo as TelegramLogoIcon } from '@phosphor-icons/react/dist/ssr/TelegramLogo';
import { UploadSimple as UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { WhatsappLogo as WhatsappLogoIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';
import { Controller, useForm } from 'react-hook-form';
import { z as zod } from 'zod';

import type {
  ProfileProduct,
  ProfileProductDestinationType,
  ProfileProductInput,
  ProfileProductStatus,
} from '@/lib/products/api-client';

import type { ProductLanguage } from './profile-product-copy';
import { productCopy } from './profile-product-copy';

interface ProductValues {
  countryCode: string;
  description: string;
  destinationType: ProfileProductDestinationType;
  destinationUrl: string;
  name: string;
  phoneNumber: string;
  status: ProfileProductStatus;
}

interface ProfileProductDialogProps {
  language: ProductLanguage;
  onClose: () => void;
  onSave: (input: ProfileProductInput) => Promise<void>;
  open: boolean;
  product?: null | ProfileProduct;
}

const countryCodes = [
  ['CO', '+57'],
  ['US / CA', '+1'],
  ['MX', '+52'],
  ['AR', '+54'],
  ['BR', '+55'],
  ['CL', '+56'],
  ['PE', '+51'],
  ['VE', '+58'],
  ['EC', '+593'],
  ['PA', '+507'],
  ['CR', '+506'],
  ['DO', '+1'],
  ['PR', '+1'],
  ['ES', '+34'],
  ['GB', '+44'],
  ['DE', '+49'],
  ['FR', '+33'],
  ['IT', '+39'],
] as const;

function schema(copy: (typeof productCopy)[ProductLanguage]): zod.ZodType<ProductValues> {
  return zod
    .object({
      countryCode: zod.string(),
      description: zod.string().trim().min(1, copy.errors.description).max(2000, copy.errors.description),
      destinationType: zod.enum(['external_url', 'telegram', 'whatsapp']),
      destinationUrl: zod.string(),
      name: zod.string().trim().min(1, copy.errors.name).max(180, copy.errors.name),
      phoneNumber: zod.string(),
      status: zod.enum(['draft', 'published']),
    })
    .superRefine((value, context) => {
      if (value.destinationType === 'external_url') {
        try {
          const url = new URL(value.destinationUrl);

          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error();
          }
        } catch {
          context.addIssue({
            code: zod.ZodIssueCode.custom,
            message: copy.errors.destinationUrl,
            path: ['destinationUrl'],
          });
        }

        return;
      }

      const phone = `${value.countryCode}${value.phoneNumber}`.replace(/\D/g, '');

      if (phone.length < 7 || phone.length > 15) {
        context.addIssue({
          code: zod.ZodIssueCode.custom,
          message: copy.errors.phone,
          path: ['phoneNumber'],
        });
      }
    });
}

export function ProfileProductDialog({
  language,
  onClose,
  onSave,
  open,
  product,
}: ProfileProductDialogProps): React.JSX.Element {
  const copy = productCopy[language];
  const [image, setImage] = React.useState<File | null>(null);
  const [imageError, setImageError] = React.useState('');
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const validationSchema = React.useMemo(() => schema(copy), [copy]);
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductValues>({
    defaultValues: getDefaultValues(product),
    resolver: zodResolver(validationSchema),
  });
  const destinationType = watch('destinationType');

  React.useEffect(() => {
    if (!open) {
      return;
    }

    reset(getDefaultValues(product));
    setImage(null);
    setImageError('');
    setPreviewUrl(product?.image_url ?? null);
  }, [open, product, reset]);

  React.useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFile = React.useCallback(
    (file: File | null): void => {
      if (!file) {
        return;
      }

      if (!['image/gif', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
        setImageError(copy.errors.image);
        return;
      }

      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }

      setImage(file);
      setImageError('');
      setPreviewUrl(URL.createObjectURL(file));
    },
    [copy.errors.image, previewUrl]
  );

  const submit = React.useCallback(
    async (values: ProductValues): Promise<void> => {
      if (!product && !image) {
        setImageError(copy.errors.image);
        return;
      }

      await onSave({
        countryCode: values.countryCode,
        description: values.description,
        destinationType: values.destinationType,
        destinationUrl: values.destinationUrl,
        image: image ?? undefined,
        name: values.name,
        phoneNumber: values.phoneNumber,
        status: values.status,
      });
    },
    [copy.errors.image, image, onSave, product]
  );

  return (
    <Dialog
      PaperProps={{ sx: { maxHeight: { xs: 'calc(100dvh - 32px)', sm: 'calc(100% - 64px)' }, overflow: 'hidden' } }}
      fullWidth
      maxWidth="sm"
      onClose={isSubmitting ? undefined : onClose}
      open={open}
    >
      <Box
        component="form"
        onSubmit={handleSubmit(submit)}
        sx={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
      >
        <DialogTitle>{product ? copy.form.editTitle : copy.form.addTitle}</DialogTitle>
        <DialogContent dividers sx={{ flex: '1 1 auto', minHeight: 0 }}>
          <Stack spacing={2.5}>
            <Stack direction={{ sm: 'row', xs: 'column' }} spacing={2}>
              <Box
                sx={{
                  aspectRatio: '4 / 3',
                  bgcolor: 'background.level1',
                  border: '1px solid var(--mui-palette-divider)',
                  borderRadius: 1,
                  flex: '0 0 180px',
                  overflow: 'hidden',
                }}
              >
                {previewUrl ? (
                  <Box
                    alt=""
                    component="img"
                    src={previewUrl}
                    sx={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
                  />
                ) : null}
              </Box>
              <Stack spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'center' }}>
                <Button component="label" startIcon={<UploadSimpleIcon />} variant="outlined">
                  {copy.fields.image}
                  <input
                    accept="image/gif,image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(event) => {
                      handleFile(event.target.files?.[0] ?? null);
                      event.target.value = '';
                    }}
                    type="file"
                  />
                </Button>
                <Typography color={imageError ? 'error.main' : 'text.secondary'} variant="caption">
                  {imageError || copy.form.imageHelp}
                </Typography>
              </Stack>
            </Stack>

            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <FormControl error={Boolean(errors.name)}>
                  <InputLabel>{copy.fields.name}</InputLabel>
                  <OutlinedInput {...field} label={copy.fields.name} />
                  {errors.name ? <FormHelperText>{errors.name.message}</FormHelperText> : null}
                </FormControl>
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <FormControl error={Boolean(errors.description)}>
                  <InputLabel>{copy.fields.description}</InputLabel>
                  <OutlinedInput {...field} label={copy.fields.description} minRows={3} multiline />
                  {errors.description ? <FormHelperText>{errors.description.message}</FormHelperText> : null}
                </FormControl>
              )}
            />

            <Controller
              control={control}
              name="destinationType"
              render={({ field }) => (
                <ToggleButtonGroup
                  aria-label={copy.fields.destination}
                  color="primary"
                  exclusive
                  fullWidth
                  onChange={(_, value: null | ProfileProductDestinationType) => {
                    if (value) {
                      field.onChange(value);
                    }
                  }}
                  sx={{ flexDirection: { xs: 'column', sm: 'row' }, '& .MuiToggleButton-root': { width: '100%' } }}
                  value={field.value}
                >
                  <ToggleButton value="external_url">
                    <LinkSimpleIcon />
                    <Box component="span" sx={{ ml: 1 }}>
                      {copy.destination.external}
                    </Box>
                  </ToggleButton>
                  <ToggleButton value="whatsapp">
                    <WhatsappLogoIcon />
                    <Box component="span" sx={{ ml: 1 }}>
                      {copy.destination.whatsapp}
                    </Box>
                  </ToggleButton>
                  <ToggleButton value="telegram">
                    <TelegramLogoIcon />
                    <Box component="span" sx={{ ml: 1 }}>
                      {copy.destination.telegram}
                    </Box>
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            />

            {destinationType === 'external_url' ? (
              <Controller
                control={control}
                name="destinationUrl"
                render={({ field }) => (
                  <FormControl error={Boolean(errors.destinationUrl)}>
                    <InputLabel>{copy.destination.externalUrl}</InputLabel>
                    <OutlinedInput {...field} label={copy.destination.externalUrl} placeholder="https://" type="url" />
                    {errors.destinationUrl ? <FormHelperText>{errors.destinationUrl.message}</FormHelperText> : null}
                  </FormControl>
                )}
              />
            ) : (
              <Stack direction={{ sm: 'row', xs: 'column' }} spacing={2}>
                <Controller
                  control={control}
                  name="countryCode"
                  render={({ field }) => (
                    <FormControl sx={{ flex: '0 0 150px' }}>
                      <InputLabel>{copy.destination.countryCode}</InputLabel>
                      <Select {...field} label={copy.destination.countryCode}>
                        {countryCodes.map(([country, code]) => (
                          <MenuItem key={`${country}-${code}`} value={code}>
                            {country} {code}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
                <Controller
                  control={control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormControl error={Boolean(errors.phoneNumber)} fullWidth>
                      <InputLabel>{copy.destination.phone}</InputLabel>
                      <OutlinedInput {...field} inputMode="tel" label={copy.destination.phone} />
                      {errors.phoneNumber ? <FormHelperText>{errors.phoneNumber.message}</FormHelperText> : null}
                    </FormControl>
                  )}
                />
              </Stack>
            )}

            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <ToggleButtonGroup
                  aria-label={copy.fields.status}
                  color="primary"
                  exclusive
                  onChange={(_, value: null | ProfileProductStatus) => {
                    if (value) {
                      field.onChange(value);
                    }
                  }}
                  value={field.value}
                >
                  <ToggleButton value="draft">{copy.status.draft}</ToggleButton>
                  <ToggleButton value="published">{copy.status.published}</ToggleButton>
                </ToggleButtonGroup>
              )}
            />

            {product && destinationType !== 'external_url' ? (
              <Stack spacing={0.5}>
                <Typography color="text.secondary" variant="caption">
                  {copy.form.messagePreview}
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap' }} variant="body2">
                  {product.message_preview}
                </Typography>
              </Stack>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            bgcolor: 'background.paper',
            borderTop: '1px solid var(--mui-palette-divider)',
            flex: '0 0 auto',
            px: { sm: 3, xs: 2 },
            py: 2,
          }}
        >
          <Button disabled={isSubmitting} onClick={onClose}>
            {copy.actions.cancel}
          </Button>
          <Button disabled={isSubmitting} type="submit" variant="contained">
            {copy.actions.save}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function getDefaultValues(product?: null | ProfileProduct): ProductValues {
  return {
    countryCode: product?.country_code ? `+${product.country_code.replace(/\D/g, '')}` : '+57',
    description: product?.description ?? '',
    destinationType: product?.destination_type ?? 'external_url',
    destinationUrl: product?.destination_url ?? '',
    name: product?.name ?? '',
    phoneNumber: product?.phone_number ?? '',
    status: product?.status ?? 'draft',
  };
}
