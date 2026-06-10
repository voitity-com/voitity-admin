'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { Profile } from '@/lib/profiles/api-client';
import { getProfile, updateProfileData } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Data | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

type JsonPrimitive = boolean | null | number | string;
type JsonValue = JsonObject | JsonPrimitive | JsonValue[];

// Recursive JSON object types require an index signature in TypeScript.
// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Recursive JSON object types require an index signature in TypeScript.
interface JsonObject {
  [key: string]: JsonValue;
}

const fallbackData = {
  me: {
    description: '',
    'place-living': '',
  },
} satisfies JsonObject;

const tabKeys = ['me', 'work', 'projects', 'networks'] as const;

type TabKey = (typeof tabKeys)[number];
type ArraySectionKey = Exclude<TabKey, 'me'>;
type SectionKey = string;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = React.useState<null | Profile>(null);
  const [data, setData] = React.useState<JsonObject>(fallbackData);
  const [activeTab, setActiveTab] = React.useState<SectionKey>('me');
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
      setData(normalizeData(nextProfile.data));
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, t]);
  const visibleTabs = React.useMemo(() => getVisibleTabs(data), [data]);

  React.useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] ?? 'me');
    }
  }, [activeTab, visibleTabs]);

  React.useEffect(() => {
    loadProfile().catch((err) => {
      logger.error(err);
    });
  }, [loadProfile]);

  const handleSubmit = React.useCallback(async (): Promise<void> => {
    setFieldError('');
    setIsSubmitting(true);

    try {
      const updatedProfile = await updateProfileData(profileId, data);
      setProfile(updatedProfile);
      setData(normalizeData(updatedProfile.data));
      toast.success(t('dashboard.profiles.detail.data.toasts.updated'));
    } catch (err) {
      const message = getErrorMessage(err, t('dashboard.profiles.detail.errors.generic'));
      setFieldError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [data, profileId, t]);

  const handleObjectFieldChange = React.useCallback((section: string, field: string, value: string): void => {
    setData((current) => {
      const sectionValue = getObjectValue(current[section]);

      return {
        ...current,
        [section]: {
          ...sectionValue,
          [field]: value,
        },
      };
    });
  }, []);

  const handleArrayItemFieldChange = React.useCallback(
    (section: string, index: number, field: string, value: string): void => {
      setData((current) => {
        const sectionValue = getArrayValue(current[section]);
        const nextSectionValue = [...sectionValue];
        const item = getObjectValue(nextSectionValue[index]);

        nextSectionValue[index] = {
          ...item,
          [field]: value,
        };

        return {
          ...current,
          [section]: nextSectionValue,
        };
      });
    },
    []
  );

  const handleAddArrayItem = React.useCallback((section: ArraySectionKey): void => {
    setData((current) => {
      const sectionValue = getArrayValue(current[section]);

      return {
        ...current,
        [section]: [...sectionValue, getDefaultArrayItem(section)],
      };
    });
  }, []);

  const handleRemoveArrayItem = React.useCallback((section: string, index: number): void => {
    setData((current) => {
      const sectionValue = getArrayValue(current[section]);

      return {
        ...current,
        [section]: sectionValue.filter((_, itemIndex: number) => itemIndex !== index),
      };
    });
  }, []);

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}
        <Card>
          <CardHeader
            subheader={profile ? profile.name : t('dashboard.profiles.detail.data.subheader')}
            title={t('dashboard.profiles.detail.data.title')}
          />
          {isLoading ? (
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <React.Fragment>
              <Tabs
                onChange={(_, value: SectionKey) => {
                  setActiveTab(value);
                }}
                sx={{ px: 3 }}
                value={activeTab}
                variant="scrollable"
              >
                {visibleTabs.map((key) => (
                  <Tab key={key} label={getTabLabel(key, t)} value={key} />
                ))}
              </Tabs>
              <Divider />
              <CardContent>
                <Stack spacing={3}>
                  {activeTab === 'me' ? (
                    <ObjectSection
                      data={getObjectValue(data.me)}
                      onFieldChange={(field, value) => {
                        handleObjectFieldChange('me', field, value);
                      }}
                    />
                  ) : null}
                  {activeTab === 'work' ? (
                    <ArraySection
                      items={getArrayValue(data.work)}
                      onAddItem={() => {
                        handleAddArrayItem('work');
                      }}
                      onFieldChange={(index, field, value) => {
                        handleArrayItemFieldChange('work', index, field, value);
                      }}
                      onRemoveItem={(index) => {
                        handleRemoveArrayItem('work', index);
                      }}
                      section="work"
                    />
                  ) : null}
                  {activeTab === 'projects' ? (
                    <ArraySection
                      items={getArrayValue(data.projects)}
                      onAddItem={() => {
                        handleAddArrayItem('projects');
                      }}
                      onFieldChange={(index, field, value) => {
                        handleArrayItemFieldChange('projects', index, field, value);
                      }}
                      onRemoveItem={(index) => {
                        handleRemoveArrayItem('projects', index);
                      }}
                      section="projects"
                    />
                  ) : null}
                  {activeTab === 'networks' ? (
                    <ArraySection
                      items={getArrayValue(data.networks)}
                      onAddItem={() => {
                        handleAddArrayItem('networks');
                      }}
                      onFieldChange={(index, field, value) => {
                        handleArrayItemFieldChange('networks', index, field, value);
                      }}
                      onRemoveItem={(index) => {
                        handleRemoveArrayItem('networks', index);
                      }}
                      section="networks"
                    />
                  ) : null}
                  {!isKnownTab(activeTab) ? (
                    <GenericSection
                      onArrayFieldChange={(index, field, value) => {
                        handleArrayItemFieldChange(activeTab, index, field, value);
                      }}
                      onFieldChange={(field, value) => {
                        handleObjectFieldChange(activeTab, field, value);
                      }}
                      section={activeTab}
                      value={data[activeTab]}
                    />
                  ) : null}
                  {fieldError ? <FormHelperText error>{fieldError}</FormHelperText> : null}
                </Stack>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', p: 3, pt: 0 }}>
                <Button disabled={isSubmitting} onClick={handleSubmit} variant="contained">
                  {t('dashboard.profiles.actions.saveData')}
                </Button>
              </CardActions>
            </React.Fragment>
          )}
        </Card>
      </Stack>
    </React.Fragment>
  );
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function ObjectSection({
  data,
  onFieldChange,
}: {
  data: JsonObject;
  onFieldChange: (field: string, value: string) => void;
}): React.JSX.Element {
  return (
    <Stack spacing={2}>
      {Object.entries(data).map(([field, value]) => (
        <DataField
          field={field}
          key={field}
          onChange={(nextValue) => {
            onFieldChange(field, nextValue);
          }}
          value={value}
        />
      ))}
    </Stack>
  );
}

function ArraySection({
  items,
  onAddItem,
  onFieldChange,
  onRemoveItem,
  section,
  showControls = true,
}: {
  items: JsonValue[];
  onAddItem: () => void;
  onFieldChange: (index: number, field: string, value: string) => void;
  onRemoveItem: (index: number) => void;
  section: string;
  showControls?: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Stack spacing={2}>
      {items.length ? (
        items.map((item, index) => (
          <Stack
            // eslint-disable-next-line react/no-array-index-key -- Items are edited in place and are not reordered; value-based keys remount inputs while typing.
            key={`${section}-${index}`}
            spacing={2}
            sx={{
              border: '1px solid var(--mui-palette-divider)',
              borderRadius: 1,
              p: 2,
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
              <Typography sx={{ flex: '1 1 auto' }} variant="subtitle2">
                {t('dashboard.profiles.detail.data.itemTitle', { index: index + 1 })}
              </Typography>
              {showControls ? (
                <Button
                  color="secondary"
                  onClick={() => {
                    onRemoveItem(index);
                  }}
                  size="small"
                  variant="outlined"
                >
                  {t('dashboard.profiles.detail.data.removeItem')}
                </Button>
              ) : null}
            </Stack>
            {isRecord(item) ? (
              <ObjectSection
                data={item}
                onFieldChange={(field, value) => {
                  onFieldChange(index, field, value);
                }}
              />
            ) : (
              <Typography color="text.secondary" variant="body2">
                {String(item ?? '')}
              </Typography>
            )}
          </Stack>
        ))
      ) : (
        <Typography color="text.secondary" variant="body2">
          {t('dashboard.profiles.detail.data.emptySection')}
        </Typography>
      )}
      {showControls ? (
        <Button onClick={onAddItem} sx={{ alignSelf: 'flex-start' }} variant="outlined">
          {t('dashboard.profiles.detail.data.addItem', {
            item: getTabLabel(section, t).toLowerCase(),
          })}
        </Button>
      ) : null}
    </Stack>
  );
}

function GenericSection({
  onArrayFieldChange,
  onFieldChange,
  section,
  value,
}: {
  onArrayFieldChange: (index: number, field: string, value: string) => void;
  onFieldChange: (field: string, value: string) => void;
  section: string;
  value: JsonValue | undefined;
}): React.JSX.Element {
  if (Array.isArray(value)) {
    return (
      <ArraySection
        items={value}
        onAddItem={() => {
          return undefined;
        }}
        onFieldChange={onArrayFieldChange}
        onRemoveItem={() => {
          return undefined;
        }}
        section={section}
        showControls={false}
      />
    );
  }

  if (isRecord(value)) {
    return <ObjectSection data={value} onFieldChange={onFieldChange} />;
  }

  return (
    <DataField
      field={section}
      onChange={(nextValue) => {
        onFieldChange(section, nextValue);
      }}
      value={value ?? ''}
    />
  );
}

function DataField({
  field,
  onChange,
  value,
}: {
  field: string;
  onChange: (value: string) => void;
  value: JsonValue;
}): React.JSX.Element {
  const { t } = useTranslation();
  const textValue = getFieldTextValue(value);
  const multiline = field === 'description' || textValue.length > 80;

  return (
    <FormControl fullWidth>
      <InputLabel>{getFieldLabel(field, t)}</InputLabel>
      <OutlinedInput
        label={getFieldLabel(field, t)}
        minRows={multiline ? 4 : undefined}
        multiline={multiline}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        value={textValue}
      />
    </FormControl>
  );
}

function normalizeData(value: unknown): JsonObject {
  if (!isRecord(value)) {
    return fallbackData;
  }

  return value;
}

function getVisibleTabs(data: JsonObject): SectionKey[] {
  const knownTabs = tabKeys.filter((key) => Object.hasOwn(data, key));
  const extraTabs = Object.keys(data).filter((key) => !isKnownTab(key));
  const visibleTabs = [...knownTabs, ...extraTabs];

  return visibleTabs.length ? visibleTabs : ['me'];
}

function getTabLabel(key: string, t: (key: string) => string): string {
  if (isKnownTab(key)) {
    return t(`dashboard.profiles.detail.data.tabs.${key}`);
  }

  return key ? `${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
}

function isKnownTab(key: string): key is TabKey {
  return (tabKeys as readonly string[]).includes(key);
}

function getObjectValue(value: JsonValue | undefined): JsonObject {
  return isRecord(value) ? value : {};
}

function getArrayValue(value: JsonValue | undefined): JsonValue[] {
  return Array.isArray(value) ? value : [];
}

function getDefaultArrayItem(section: ArraySectionKey): JsonObject {
  if (section === 'work') {
    return { company: '', description: '', role: '' };
  }

  if (section === 'networks') {
    return { name: '', url: '', username: '' };
  }

  return { description: '', name: '', url: '' };
}

function getFieldTextValue(value: JsonValue): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null) {
    return '';
  }

  return JSON.stringify(value, null, 2);
}

function getFieldLabel(field: string, t: (key: string) => string): string {
  const keyMap: Record<string, string> = {
    company: 'company',
    description: 'description',
    name: 'name',
    'place-living': 'placeLiving',
    role: 'role',
    url: 'url',
    username: 'username',
  };
  const translationKey = keyMap[field];

  if (translationKey) {
    return t(`dashboard.profiles.detail.data.fields.${translationKey}`);
  }

  return field;
}
