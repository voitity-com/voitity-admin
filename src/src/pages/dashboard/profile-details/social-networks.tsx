'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
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
import { Helmet } from 'react-helmet-async';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { z as zod } from 'zod';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { Profile, ProfileNetworks, SocialNetworkDefinition } from '@/lib/profiles/api-client';
import { getProfile, listProfileSocialNetworks, updateProfileNetworks } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Social Networks | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

interface NetworkFormItem {
  network: string;
  url: string;
}

interface Values {
  networks: NetworkFormItem[];
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
    .superRefine((values, ctx) => {
      const seenNetworks = new Map<string, number>();

      values.networks.forEach((item, index) => {
        if (!item.network) {
          return;
        }

        const firstIndex = seenNetworks.get(item.network);

        if (firstIndex !== undefined) {
          ctx.addIssue({
            code: zod.ZodIssueCode.custom,
            message: t('dashboard.profiles.detail.socialNetworks.errors.duplicate'),
            path: ['networks', index, 'network'],
          });
          ctx.addIssue({
            code: zod.ZodIssueCode.custom,
            message: t('dashboard.profiles.detail.socialNetworks.errors.duplicate'),
            path: ['networks', firstIndex, 'network'],
          });
          return;
        }

        seenNetworks.set(item.network, index);
      });
    });
}

const defaultValues = {
  networks: [],
} satisfies Values;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const schema = React.useMemo(() => createSchema(t), [t]);
  const [profile, setProfile] = React.useState<null | Profile>(null);
  const [catalog, setCatalog] = React.useState<SocialNetworkDefinition[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>('');
  const [fieldError, setFieldError] = React.useState<string>('');

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues, resolver: zodResolver(schema) });
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

  const loadProfile = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    setFieldError('');

    try {
      const [nextProfile, nextCatalog] = await Promise.all([getProfile(profileId), listProfileSocialNetworks()]);

      setProfile(nextProfile);
      setCatalog(mergeDefinitionsWithProfileNetworks(nextCatalog, nextProfile.networks));
      reset(toValues(nextProfile.networks));
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.profiles.detail.socialNetworks.errors.catalog')));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, reset, t]);

  React.useEffect(() => {
    loadProfile().catch((err) => {
      logger.error(err);
    });
  }, [loadProfile]);

  const handleAddNetwork = React.useCallback((): void => {
    const definition = availableDefinitions[0];

    if (!definition) {
      return;
    }

    append({ network: definition.key, url: '' });
  }, [append, availableDefinitions]);

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      setFieldError('');

      try {
        const updatedProfile = await updateProfileNetworks(profileId, toPayload(values));
        setProfile(updatedProfile);
        setCatalog((current) => mergeDefinitionsWithProfileNetworks(current, updatedProfile.networks));
        reset(toValues(updatedProfile.networks));
        toast.success(t('dashboard.profiles.detail.socialNetworks.toasts.updated'));
      } catch (err) {
        const message = getErrorMessage(err, t('dashboard.profiles.detail.socialNetworks.errors.generic'));
        setFieldError(message);
        toast.error(message);
      }
    },
    [profileId, reset, t]
  );

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}
        <Card>
          <CardHeader
            subheader={profile ? profile.name : t('dashboard.profiles.detail.socialNetworks.subheader')}
            title={t('dashboard.profiles.detail.socialNetworks.title')}
          />
          {isLoading ? (
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent>
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
                              const labelId = `${item.id}-network-label`;

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
                      sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
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
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', p: 3, pt: 0 }}>
                <Button disabled={isSubmitting} type="submit" variant="contained">
                  {t('dashboard.profiles.actions.saveChanges')}
                </Button>
              </CardActions>
            </form>
          )}
        </Card>
      </Stack>
    </React.Fragment>
  );
}

function NetworkIcon({ definition }: { definition: SocialNetworkDefinition }): React.JSX.Element {
  return (
    <Avatar
      alt=""
      src={definition.icon || undefined}
      sx={{
        bgcolor: 'transparent',
        color: 'text.secondary',
        fontSize: '0.75rem',
        height: 28,
        width: 28,
        '& img': { objectFit: 'contain' },
      }}
      variant="rounded"
    >
      <Box component="span">{definition.name.charAt(0).toUpperCase()}</Box>
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
    selectedNetworks
      .map((item, index) => (index === currentIndex ? '' : item.network))
      .filter(Boolean)
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

    if (network && url) {
      payload[network] = url;
    }

    return payload;
  }, {});
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
