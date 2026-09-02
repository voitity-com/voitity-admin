'use client';

import * as React from 'react';
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
import { TelegramLogo as TelegramLogoIcon } from '@phosphor-icons/react/dist/ssr/TelegramLogo';
import { WhatsappLogo as WhatsappLogoIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';

import type { ProfileProductDestinationType } from '@/lib/products/api-client';

import type { ProductLanguage } from './profile-product-copy';
import { interpolate, productCopy } from './profile-product-copy';

interface ProfileProductBulkDestinationDialogProps {
  count: number;
  language: ProductLanguage;
  onClose: () => void;
  onSave: (value: {
    countryCode: string;
    destinationType: Exclude<ProfileProductDestinationType, 'external_url'>;
    phoneNumber: string;
  }) => Promise<void>;
  open: boolean;
}

const countryCodes = ['+57', '+1', '+52', '+54', '+55', '+56', '+51', '+58', '+593', '+507', '+506', '+34', '+44'];

export function ProfileProductBulkDestinationDialog({
  count,
  language,
  onClose,
  onSave,
  open,
}: ProfileProductBulkDestinationDialogProps): React.JSX.Element {
  const copy = productCopy[language];
  const [countryCode, setCountryCode] = React.useState('+57');
  const [destinationType, setDestinationType] = React.useState<'telegram' | 'whatsapp'>('whatsapp');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [phoneNumber, setPhoneNumber] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setCountryCode('+57');
      setDestinationType('whatsapp');
      setError('');
      setPhoneNumber('');
    }
  }, [open]);

  const handleSave = React.useCallback(async (): Promise<void> => {
    const digits = `${countryCode}${phoneNumber}`.replace(/\D/g, '');

    if (digits.length < 7 || digits.length > 15) {
      setError(copy.errors.phone);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSave({ countryCode, destinationType, phoneNumber });
    } catch (err) {
      setError(getErrorMessage(err, copy.errors.generic));
    } finally {
      setIsSubmitting(false);
    }
  }, [copy.errors.generic, copy.errors.phone, countryCode, destinationType, onSave, phoneNumber]);

  return (
    <Dialog fullWidth maxWidth="xs" onClose={isSubmitting ? undefined : onClose} open={open}>
      <DialogTitle>{interpolate(copy.bulk.destinationTitle, { count })}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <ToggleButtonGroup
            color="primary"
            exclusive
            fullWidth
            onChange={(_, value: null | 'telegram' | 'whatsapp') => {
              if (value) {
                setDestinationType(value);
              }
            }}
            sx={{ flexDirection: { xs: 'column', sm: 'row' }, '& .MuiToggleButton-root': { width: '100%' } }}
            value={destinationType}
          >
            <ToggleButton value="whatsapp">
              <WhatsappLogoIcon style={{ marginRight: 8 }} />
              {copy.destination.whatsapp}
            </ToggleButton>
            <ToggleButton value="telegram">
              <TelegramLogoIcon style={{ marginRight: 8 }} />
              {copy.destination.telegram}
            </ToggleButton>
          </ToggleButtonGroup>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl sx={{ flex: '0 0 130px' }}>
              <InputLabel>{copy.destination.countryCode}</InputLabel>
              <Select
                label={copy.destination.countryCode}
                onChange={(event) => {
                  setCountryCode(event.target.value);
                }}
                value={countryCode}
              >
                {countryCodes.map((code) => (
                  <MenuItem key={code} value={code}>
                    {code}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl error={Boolean(error)} fullWidth>
              <InputLabel>{copy.destination.phone}</InputLabel>
              <OutlinedInput
                inputMode="tel"
                label={copy.destination.phone}
                onChange={(event) => {
                  setPhoneNumber(event.target.value);
                  setError('');
                }}
                value={phoneNumber}
              />
              {error ? <FormHelperText>{error}</FormHelperText> : null}
            </FormControl>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={isSubmitting} onClick={onClose}>
          {copy.actions.cancel}
        </Button>
        <Button disabled={isSubmitting} onClick={handleSave} variant="contained">
          {copy.actions.setDestination}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
