'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { supportedLanguages } from '@/lib/i18n';
import type { SupportedLanguage } from '@/lib/i18n';
import { toast } from '@/components/core/toaster';

export type Language = SupportedLanguage;

export const languageFlags = {
  en: '/assets/flag-uk.svg',
  de: '/assets/flag-de.svg',
  es: '/assets/flag-es.svg',
} as const;

const languageOptions = {
  en: { icon: '/assets/flag-uk.svg', labelKey: 'languages.en' },
  de: { icon: '/assets/flag-de.svg', labelKey: 'languages.de' },
  es: { icon: '/assets/flag-es.svg', labelKey: 'languages.es' },
} as const;

export interface LanguagePopoverProps {
  anchorEl: null | Element;
  onClose?: () => void;
  open?: boolean;
}

export function LanguagePopover({ anchorEl, onClose, open = false }: LanguagePopoverProps): React.JSX.Element {
  const { i18n, t } = useTranslation();

  const handleChange = React.useCallback(
    async (language: Language): Promise<void> => {
      onClose?.();
      await i18n.changeLanguage(language);
      toast.success(i18n.t('languageChanged'));
    },
    [onClose, i18n]
  );

  return (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      onClose={onClose}
      open={open}
      slotProps={{ paper: { sx: { width: '220px' } } }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
    >
      {supportedLanguages.map((language) => {
        const option = languageOptions[language];
        const label = t(option.labelKey);

        return (
          <MenuItem
            key={language}
            onClick={(): void => {
              handleChange(language).catch(() => {
                // ignore
              });
            }}
          >
            <ListItemIcon>
              <Box sx={{ height: '28px', width: '28px' }}>
                <Box alt={label} component="img" src={option.icon} sx={{ height: 'auto', width: '100%' }} />
              </Box>
            </ListItemIcon>
            <Typography variant="subtitle2">{label}</Typography>
          </MenuItem>
        );
      })}
    </Menu>
  );
}
