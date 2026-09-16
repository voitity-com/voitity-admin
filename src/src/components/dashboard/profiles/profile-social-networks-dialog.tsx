'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z as zod } from 'zod';

import { logger } from '@/lib/default-logger';
import type { Profile, ProfileNetworks, SocialNetworkDefinition } from '@/lib/profiles/api-client';
import { getProfile, listProfileSocialNetworks, updateProfileNetworks } from '@/lib/profiles/api-client';
import { toast } from '@/components/core/toaster';

interface NetworkFormItem {
  network: string;
  url: string;
}

interface Values {
  networks: NetworkFormItem[];
}

export interface ProfileSocialNetworksDialogProps {
  onClose: () => void;
  onSaved: (profile: Profile) => void;
  open: boolean;
  profileId: number | string;
}

export function ProfileSocialNetworksDialog({
  onClose,
  onSaved,
  open,
  profileId,
}: ProfileSocialNetworksDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const schema = React.useMemo(() => createSchema(t), [t]);
  const [catalog, setCatalog] = React.useState<SocialNetworkDefinition[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState('');
  const [fieldError, setFieldError] = React.useState('');
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues: { networks: [] }, resolver: zodResolver(schema) });
  const { append, fields, remove } = useFieldArray({ control, name: 'networks' });
  const watchedNetworks = watch('networks');
  const selectedNetworkKeys = React.useMemo(
    () => new Set(watchedNetworks.map((item) => item.network).filter(Boolean)),
    [watchedNetworks]
  );
  const availableDefinitions = React.useMemo(
    () => catalog.filter((definition) => !selectedNetworkKeys.has(definition.key)),
    [catalog, selectedNetworkKeys]
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError('');
    setFieldError('');

    Promise.all([getProfile(profileId), listProfileSocialNetworks()])
      .then(([profile, definitions]) => {
        if (isMounted) {
          setCatalog(mergeDefinitionsWithProfileNetworks(definitions, profile.networks));
          reset(toValues(profile.networks));
        }
      })
      .catch((error) => {
        logger.error(error);

        if (isMounted) {
          setLoadError(getErrorMessage(error, t('dashboard.profiles.detail.socialNetworks.errors.catalog')));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, profileId, reset, t]);

  const handleAddNetwork = React.useCallback((): void => {
    const definition = availableDefinitions[0];

    if (definition) {
      append({ network: definition.key, url: '' });
    }
  }, [append, availableDefinitions]);

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      setFieldError('');

      try {
        const updatedProfile = await updateProfileNetworks(profileId, toPayload(values));
        toast.success(t('dashboard.profiles.detail.socialNetworks.toasts.updated'));
        onSaved(updatedProfile);
        onClose();
      } catch (error) {
        const message = getErrorMessage(error, t('dashboard.profiles.detail.socialNetworks.errors.generic'));
        setFieldError(message);
        toast.error(message);
      }
    },
    [onClose, onSaved, profileId, t]
  );

  return (
    <Dialog fullWidth maxWidth="md" onClose={isSubmitting ? undefined : onClose} open={open}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{t('dashboard.profiles.detail.socialNetworks.title')}</DialogTitle>
        <DialogContent dividers>
          {isLoading ? (
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : loadError ? (
            <Alert color="error">{loadError}</Alert>
          ) : (
            <Stack spacing={2}>
              {fields.length ? (
                fields.map((item, index) => {
                  const networkError = errors.networks?.[index]?.network;
                  const urlError = errors.networks?.[index]?.url;
                  const rowDefinitions = getSelectableDefinitions(catalog, watchedNetworks, index);

                  return (
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      key={item.id}
                      spacing={2}
                      sx={{ alignItems: { md: 'flex-start' } }}
                    >
                      <Controller
                        control={control}
                        name={`networks.${index}.network`}
                        render={({ field }) => {
                          const labelId = `${item.id}-dialog-network-label`;

                          return (
                            <FormControl error={Boolean(networkError)} sx={{ minWidth: { md: 240 } }}>
                              <InputLabel id={labelId}>
                                {t('dashboard.profiles.detail.socialNetworks.fields.network')}
                              </InputLabel>
                              <Select
                                {...field}
                                label={t('dashboard.profiles.detail.socialNetworks.fields.network')}
                                labelId={labelId}
                              >
                                {rowDefinitions.map((definition) => (
                                  <MenuItem key={definition.key} value={definition.key}>
                                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                      <NetworkIcon definition={definition} />
                                      <ListItemText primary={definition.name} />
                                    </Stack>
                                  </MenuItem>
                                ))}
                              </Select>
                              {networkError ? <FormHelperText>{networkError.message}</FormHelperText> : null}
                            </FormControl>
                          );
                        }}
                      />
                      <Controller
                        control={control}
                        name={`networks.${index}.url`}
                        render={({ field }) => (
                          <FormControl error={Boolean(urlError)} sx={{ flex: '1 1 auto' }}>
                            <InputLabel>{t('dashboard.profiles.detail.socialNetworks.fields.url')}</InputLabel>
                            <OutlinedInput
                              {...field}
                              label={t('dashboard.profiles.detail.socialNetworks.fields.url')}
                              type="url"
                            />
                            {urlError ? <FormHelperText>{urlError.message}</FormHelperText> : null}
                          </FormControl>
                        )}
                      />
                      <Tooltip title={t('dashboard.profiles.detail.socialNetworks.remove')}>
                        <span>
                          <IconButton
                            aria-label={t('dashboard.profiles.detail.socialNetworks.remove')}
                            disabled={isSubmitting}
                            onClick={() => {
                              remove(index);
                            }}
                            sx={{ mt: { md: '8px' } }}
                          >
                            <TrashIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  );
                })
              ) : (
                <Typography color="text.secondary" variant="body2">
                  {t('dashboard.profiles.detail.socialNetworks.empty')}
                </Typography>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
                <Button
                  disabled={isSubmitting || availableDefinitions.length === 0}
                  onClick={handleAddNetwork}
                  startIcon={<PlusIcon />}
                  variant="outlined"
                >
                  {t('dashboard.profiles.detail.socialNetworks.addNetwork')}
                </Button>
                {availableDefinitions.length === 0 && catalog.length > 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    {t('dashboard.profiles.detail.socialNetworks.unavailable')}
                  </Typography>
                ) : null}
              </Stack>
              {fieldError ? <FormHelperText error>{fieldError}</FormHelperText> : null}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button color="secondary" disabled={isSubmitting} onClick={onClose} type="button">
            {t('dashboard.profiles.actions.cancel')}
          </Button>
          <Button disabled={isLoading || Boolean(loadError) || isSubmitting} type="submit" variant="contained">
            {t('dashboard.profiles.actions.saveChanges')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function createSchema(t: (key: string) => string): zod.ZodType<Values> {
  return zod
    .object({
      networks: zod.array(
        zod.object({
          network: zod.string().min(1, t('dashboard.profiles.detail.socialNetworks.errors.networkRequired')),
          url: zod
            .string()
            .min(1, t('dashboard.profiles.detail.socialNetworks.errors.urlRequired'))
            .url(t('dashboard.profiles.detail.socialNetworks.errors.urlInvalid'))
            .max(2048, t('dashboard.profiles.detail.socialNetworks.errors.urlInvalid')),
        })
      ),
    })
    .superRefine((values, context) => {
      const seenNetworks = new Map<string, number>();

      values.networks.forEach((item, index) => {
        if (!item.network) return;
        const firstIndex = seenNetworks.get(item.network);

        if (firstIndex !== undefined) {
          const message = t('dashboard.profiles.detail.socialNetworks.errors.duplicate');
          context.addIssue({ code: zod.ZodIssueCode.custom, message, path: ['networks', index, 'network'] });
          context.addIssue({ code: zod.ZodIssueCode.custom, message, path: ['networks', firstIndex, 'network'] });
        } else {
          seenNetworks.set(item.network, index);
        }
      });
    });
}

function NetworkIcon({ definition }: { definition: SocialNetworkDefinition }): React.JSX.Element {
  return (
    <Avatar
      alt=""
      src={definition.icon || undefined}
      sx={{ bgcolor: 'transparent', color: 'text.secondary', fontSize: '0.75rem', height: 28, width: 28 }}
      variant="rounded"
    >
      {definition.name.charAt(0).toUpperCase()}
    </Avatar>
  );
}

function getSelectableDefinitions(
  catalog: SocialNetworkDefinition[],
  selectedNetworks: NetworkFormItem[],
  currentIndex: number
): SocialNetworkDefinition[] {
  const currentKey = selectedNetworks[currentIndex]?.network;
  const selectedKeys = new Set(
    selectedNetworks.map((item, index) => (index === currentIndex ? '' : item.network)).filter(Boolean)
  );

  return catalog.filter((definition) => definition.key === currentKey || !selectedKeys.has(definition.key));
}

function mergeDefinitionsWithProfileNetworks(
  catalog: SocialNetworkDefinition[],
  networks: null | ProfileNetworks | undefined
): SocialNetworkDefinition[] {
  const definitionsByKey = new Map(catalog.map((definition) => [definition.key, definition]));
  const extraDefinitions = Object.keys(networks ?? {})
    .filter((key) => !definitionsByKey.has(key))
    .map((key) => ({ icon: '', key, name: key }));

  return [...catalog, ...extraDefinitions];
}

function toValues(networks: null | ProfileNetworks | undefined): Values {
  return {
    networks: Object.entries(networks ?? {})
      .filter(([, url]) => typeof url === 'string')
      .map(([network, url]) => ({ network, url })),
  };
}

function toPayload(values: Values): ProfileNetworks {
  return values.networks.reduce<ProfileNetworks>((payload, item) => {
    const network = item.network.trim();
    const url = item.url.trim();

    if (network && url) payload[network] = url;
    return payload;
  }, {});
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
