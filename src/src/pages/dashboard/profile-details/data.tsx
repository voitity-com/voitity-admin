'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
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
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
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

const tabKeys = ['me', 'work', 'projects'] as const;

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
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
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
      setIsEditing(false);
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
      setIsEditing(false);
      toast.success(t('dashboard.profiles.detail.data.toasts.updated'));
    } catch (err) {
      const message = getErrorMessage(err, t('dashboard.profiles.detail.errors.generic'));
      setFieldError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [data, profileId, t]);

  const handleCancelEdit = React.useCallback((): void => {
    setFieldError('');
    setData(normalizeData(profile?.data));
    setIsEditing(false);
  }, [profile]);

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
            action={
              isLoading ? null : isEditing ? (
                <Button disabled={isSubmitting} onClick={handleCancelEdit}>
                  {t('dashboard.profiles.actions.cancel')}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setIsEditing(true);
                  }}
                  startIcon={<PencilSimpleIcon />}
                  sx={{
                    '& .MuiButton-startIcon': { color: 'inherit' },
                    '&:hover': {
                      backgroundColor: '#0f172a',
                      boxShadow: '0 10px 22px rgba(15,23,42,0.22)',
                    },
                    backgroundColor: '#111827',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                  variant="contained"
                >
                  {t('dashboard.profiles.actions.edit')}
                </Button>
              )
            }
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
                  {isEditing ? (
                    <React.Fragment>
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
                    </React.Fragment>
                  ) : (
                    <ReadOnlySection activeTab={activeTab} data={data} />
                  )}
                </Stack>
              </CardContent>
              {isEditing ? (
                <CardActions sx={{ justifyContent: 'flex-end', p: 3, pt: 0 }}>
                  <Button disabled={isSubmitting} onClick={handleCancelEdit}>
                    {t('dashboard.profiles.actions.cancel')}
                  </Button>
                  <Button disabled={isSubmitting} onClick={handleSubmit} variant="contained">
                    {t('dashboard.profiles.actions.saveData')}
                  </Button>
                </CardActions>
              ) : null}
            </React.Fragment>
          )}
        </Card>
      </Stack>
    </React.Fragment>
  );
}

function ReadOnlySection({ activeTab, data }: { activeTab: SectionKey; data: JsonObject }): React.JSX.Element {
  if (activeTab === 'me') {
    return <ReadOnlyMeSection data={getObjectValue(data.me)} />;
  }

  if (activeTab === 'work') {
    return <ReadOnlyArraySection items={getArrayValue(data.work)} section="work" />;
  }

  if (activeTab === 'projects') {
    return <ReadOnlyArraySection items={getArrayValue(data.projects)} section="projects" />;
  }

  return <ReadOnlyGenericSection section={activeTab} value={data[activeTab]} />;
}

function ReadOnlyMeSection({ data }: { data: JsonObject }): React.JSX.Element {
  const { t } = useTranslation();
  const description = getFirstTextValue(data, ['description', 'summary', 'bio', 'about']);
  const location = getFirstSimpleValue(data, ['place-living', 'placeLiving', 'location', 'city', 'country']);
  const headline = getFirstSimpleValue(data, ['headline', 'title', 'role', 'profession']);
  const skills = getProfileListSkills(data);
  const extraEntries = Object.entries(data).filter(([field, value]) => {
    if (isReadOnlyHiddenDataField(field) || isMePrimaryField(field)) {
      return false;
    }

    return Boolean(getCompactTextValue(value));
  });

  if (!description && !location && !headline && !skills && !extraEntries.length) {
    return (
      <Typography color="text.secondary" variant="body2">
        {t('dashboard.profiles.detail.data.emptySection')}
      </Typography>
    );
  }

  return (
    <Stack divider={<Divider />} spacing={0}>
      <Box sx={{ pb: extraEntries.length ? 2.25 : 0 }}>
        {headline ? (
          <Typography sx={{ color: 'text.primary', fontSize: '1rem', fontWeight: 700, lineHeight: 1.35 }}>
            {headline}
          </Typography>
        ) : null}
        {location ? (
          <Typography color="text.secondary" sx={{ lineHeight: 1.4 }} variant="body2">
            {location}
          </Typography>
        ) : null}
        {description ? (
          <Typography
            sx={{
              color: 'text.primary',
              mt: headline || location ? 1.5 : 0,
              overflowWrap: 'anywhere',
              whiteSpace: 'pre-wrap',
            }}
            variant="body2"
          >
            {description}
          </Typography>
        ) : null}
        {skills ? (
          <Typography sx={{ color: 'text.primary', fontWeight: 700, mt: 1.25 }} variant="body2">
            {skills}
          </Typography>
        ) : null}
      </Box>
      {extraEntries.length ? (
        <Stack spacing={1} sx={{ pt: 2.25 }}>
          {extraEntries.map(([field, value]) => (
            <ReadOnlyInlineField field={field} key={field} value={value} />
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}

function ReadOnlyObjectSection({ data }: { data: JsonObject }): React.JSX.Element {
  const { t } = useTranslation();
  const entries = Object.entries(data).filter(([field]) => !isReadOnlyHiddenDataField(field));

  if (!entries.length) {
    return (
      <Typography color="text.secondary" variant="body2">
        {t('dashboard.profiles.detail.data.emptySection')}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { md: 'repeat(2, minmax(0, 1fr))', xs: '1fr' },
      }}
    >
      {entries.map(([field, value]) => (
        <ReadOnlyDataField field={field} key={field} value={value} />
      ))}
    </Box>
  );
}

function ReadOnlyArraySection({ items, section }: { items: JsonValue[]; section: string }): React.JSX.Element {
  const { t } = useTranslation();

  if (!items.length) {
    return (
      <Typography color="text.secondary" variant="body2">
        {t('dashboard.profiles.detail.data.emptySection')}
      </Typography>
    );
  }

  return (
    <Stack
      divider={<Divider />}
      spacing={0}
      sx={{
        '& > *:first-of-type': { pt: 0 },
        '& > *:last-of-type': { pb: 0 },
      }}
    >
      {items.map((item, index) => (
        <Stack
          // eslint-disable-next-line react/no-array-index-key -- Profile data entries do not expose stable ids.
          key={`${section}-readonly-${index}`}
          spacing={1}
          sx={{
            py: 2.25,
          }}
        >
          {isRecord(item) ? (
            <ReadOnlyProfileListItem index={index} item={item} />
          ) : (
            <ReadOnlyDataField field={t('dashboard.profiles.detail.data.itemTitle', { index: index + 1 })} value={item} />
          )}
        </Stack>
      ))}
    </Stack>
  );
}

function ReadOnlyProfileListItem({ index, item }: { index: number; item: JsonObject }): React.JSX.Element {
  const { t } = useTranslation();
  const title = getProfileListTitle(item, index, t);
  const organizationLine = getJoinedLine([
    getFirstSimpleValue(item, ['company', 'organization', 'employer', 'institution', 'school']),
    getFirstSimpleValue(item, ['employment_type', 'employmentType', 'job_type', 'jobType', 'type']),
  ]);
  const periodLine = getJoinedLine([getProfileListPeriod(item), getFirstSimpleValue(item, ['duration'])]);
  const locationLine = getFirstSimpleValue(item, ['location', 'place', 'city', 'country']);
  const description = getFirstTextValue(item, ['description', 'summary', 'responsibilities', 'achievements']);
  const skills = getProfileListSkills(item);
  const url = getFirstSimpleValue(item, ['url', 'website', 'link']);
  const extraEntries = getProfileListExtraEntries(item);

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          color: 'text.primary',
          fontSize: '1rem',
          fontWeight: 700,
          lineHeight: 1.35,
        }}
      >
        {title}
      </Typography>
      {organizationLine ? (
        <Typography sx={{ color: 'text.primary', lineHeight: 1.4 }} variant="body2">
          {organizationLine}
        </Typography>
      ) : null}
      {periodLine ? (
        <Typography color="text.secondary" sx={{ lineHeight: 1.4 }} variant="body2">
          {periodLine}
        </Typography>
      ) : null}
      {locationLine ? (
        <Typography color="text.secondary" sx={{ lineHeight: 1.4 }} variant="body2">
          {locationLine}
        </Typography>
      ) : null}
      {description ? (
        <Typography
          sx={{
            color: 'text.primary',
            display: '-webkit-box',
            mt: 1.5,
            overflow: 'hidden',
            overflowWrap: 'anywhere',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 3,
            whiteSpace: 'pre-wrap',
          }}
          variant="body2"
        >
          {description}
        </Typography>
      ) : null}
      {skills ? (
        <Typography sx={{ color: 'text.primary', fontWeight: 700, mt: 1.25 }} variant="body2">
          {skills}
        </Typography>
      ) : null}
      {url ? (
        <Typography
          color="primary.main"
          component="a"
          href={url}
          rel="noreferrer"
          sx={{ display: 'inline-block', mt: 1, overflowWrap: 'anywhere', textDecoration: 'none' }}
          target="_blank"
          variant="body2"
        >
          {url}
        </Typography>
      ) : null}
      {extraEntries.length ? (
        <Stack spacing={0.5} sx={{ mt: 1.25 }}>
          {extraEntries.map(([field, value]) => (
            <Typography color="text.secondary" key={field} sx={{ overflowWrap: 'anywhere' }} variant="body2">
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                {getFieldLabel(field, t)}:{' '}
              </Box>
              {getCompactTextValue(value)}
            </Typography>
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}

function ReadOnlyGenericSection({
  section,
  value,
}: {
  section: string;
  value: JsonValue | undefined;
}): React.JSX.Element {
  if (Array.isArray(value)) {
    return <ReadOnlyArraySection items={value} section={section} />;
  }

  if (isRecord(value)) {
    return <ReadOnlyObjectSection data={value} />;
  }

  return <ReadOnlyDataField field={section} value={value ?? ''} />;
}

function ReadOnlyDataField({ field, value }: { field: string; value: JsonValue }): React.JSX.Element {
  const { t } = useTranslation();
  const textValue = getFieldTextValue(value);
  const isEmpty = !textValue.trim();
  const isUrl = !isEmpty && /^https?:\/\//i.test(textValue);
  const prominent = field === 'description' || textValue.length > 140 || Array.isArray(value) || isRecord(value);

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid var(--mui-palette-divider)',
        borderRadius: 1,
        gridColumn: { md: prominent ? '1 / -1' : undefined },
        p: 2,
      }}
    >
      <Stack spacing={0.75}>
        <Typography color="text.secondary" sx={{ fontWeight: 600 }} variant="caption">
          {getFieldLabel(field, t)}
        </Typography>
        {isUrl ? (
          <Typography
            color="primary.main"
            component="a"
            href={textValue}
            rel="noreferrer"
            sx={{ overflowWrap: 'anywhere', textDecoration: 'none' }}
            target="_blank"
            variant="body2"
          >
            {textValue}
          </Typography>
        ) : (
          <Typography
            color={isEmpty ? 'text.secondary' : 'text.primary'}
            sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}
            variant={prominent ? 'body1' : 'body2'}
          >
            {isEmpty ? t('dashboard.profiles.detail.profile.emptyValue') : textValue}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

function ReadOnlyInlineField({ field, value }: { field: string; value: JsonValue }): React.JSX.Element {
  const { t } = useTranslation();
  const textValue = getCompactTextValue(value);
  const isUrl = /^https?:\/\//i.test(textValue);

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography color="text.secondary" sx={{ fontWeight: 600, lineHeight: 1.35 }} variant="caption">
        {getFieldLabel(field, t)}
      </Typography>
      {isUrl ? (
        <Typography
          color="primary.main"
          component="a"
          href={textValue}
          rel="noreferrer"
          sx={{ display: 'block', overflowWrap: 'anywhere', textDecoration: 'none' }}
          target="_blank"
          variant="body2"
        >
          {textValue}
        </Typography>
      ) : (
        <Typography sx={{ color: 'text.primary', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }} variant="body2">
          {textValue || t('dashboard.profiles.detail.profile.emptyValue')}
        </Typography>
      )}
    </Box>
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
  const { t } = useTranslation();
  const entries = Object.entries(data).filter(([field]) => !isNonEditableDataField(field));

  return (
    <Stack spacing={2}>
      {entries.length ? (
        entries.map(([field, value]) => (
          <DataField
            field={field}
            key={field}
            onChange={(nextValue) => {
              onFieldChange(field, nextValue);
            }}
            value={value}
          />
        ))
      ) : (
        <Typography color="text.secondary" variant="body2">
          {t('dashboard.profiles.detail.data.emptySection')}
        </Typography>
      )}
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
  const extraTabs = Object.keys(data).filter((key) => !isKnownTab(key) && key !== 'networks' && !isNonEditableDataField(key));
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

function getSimpleFieldValue(value: JsonValue | undefined): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
}

function getProfileListTitle(
  item: JsonObject,
  index: number,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  return (
    getFirstSimpleValue(item, ['role', 'job_title', 'jobTitle', 'position', 'title', 'degree', 'name']) ||
    t('dashboard.profiles.detail.data.itemTitle', { index: index + 1 })
  );
}

function getProfileListPeriod(item: JsonObject): string {
  const period = getFirstSimpleValue(item, ['period', 'date_range', 'dateRange', 'dates']);

  if (period) {
    return period;
  }

  const start = getFirstSimpleValue(item, ['start_date', 'startDate', 'started_at', 'startedAt', 'start', 'from']);
  const end = getFirstSimpleValue(item, ['end_date', 'endDate', 'ended_at', 'endedAt', 'end', 'to']);

  if (start && end) {
    return `${start} - ${end}`;
  }

  return start || end;
}

function getProfileListSkills(item: JsonObject): string {
  const value = getFirstValue(item, ['skills', 'technologies', 'technology', 'tools', 'stack', 'aptitudes']);

  if (!value) {
    return '';
  }

  if (Array.isArray(value)) {
    const skills = value.map((skill) => getSimpleFieldValue(skill)).filter(Boolean);
    const visibleSkills = skills.slice(0, 4).join(', ');
    const remaining = skills.length - 4;

    return remaining > 0 ? `${visibleSkills}, +${remaining}` : visibleSkills;
  }

  return getSimpleFieldValue(value);
}

function getProfileListExtraEntries(item: JsonObject): [string, JsonValue][] {
  return Object.entries(item).filter(([field, value]) => {
    if (isReadOnlyHiddenDataField(field) || isProfileListPrimaryField(field)) {
      return false;
    }

    return Boolean(getCompactTextValue(value));
  });
}

function getFirstSimpleValue(item: JsonObject, fields: string[]): string {
  const value = getFirstValue(item, fields);

  return getSimpleFieldValue(value);
}

function getFirstTextValue(item: JsonObject, fields: string[]): string {
  const value = getFirstValue(item, fields);

  return value ? getCompactTextValue(value) : '';
}

function getFirstValue(item: JsonObject, fields: string[]): JsonValue | undefined {
  for (const field of fields) {
    if (Object.hasOwn(item, field)) {
      return item[field];
    }
  }

  return undefined;
}

function getJoinedLine(values: string[]): string {
  return values.filter(Boolean).join(' · ');
}

function getCompactTextValue(value: JsonValue): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => getCompactTextValue(item))
      .filter(Boolean)
      .join(', ');
  }

  if (isRecord(value)) {
    return JSON.stringify(value, null, 2);
  }

  return getSimpleFieldValue(value);
}

function isReadOnlyHiddenDataField(field: string): boolean {
  return isIdDataField(field);
}

function isNonEditableDataField(field: string): boolean {
  const normalized = normalizeDataFieldKey(field);

  return normalized === 'source' || isIdDataField(field);
}

function isIdDataField(field: string): boolean {
  const trimmed = field.trim();
  const lower = trimmed.toLowerCase();

  return lower === 'id' || lower.endsWith('_id') || lower.endsWith('-id') || /(?:Id|ID)$/.test(trimmed);
}

function normalizeDataFieldKey(field: string): string {
  return field.replace(/[-_]/g, '').toLowerCase();
}

function isProfileListPrimaryField(field: string): boolean {
  const normalized = normalizeDataFieldKey(field);
  const primaryFields = new Set([
    'achievements',
    'aptitudes',
    'avatar',
    'city',
    'company',
    'companylogo',
    'country',
    'daterange',
    'dates',
    'degree',
    'description',
    'duration',
    'employer',
    'employmenttype',
    'end',
    'enddate',
    'endedat',
    'from',
    'icon',
    'id',
    'image',
    'institution',
    'jobtitle',
    'jobtype',
    'link',
    'location',
    'logo',
    'metadata',
    'name',
    'organization',
    'period',
    'picture',
    'place',
    'position',
    'profileurl',
    'responsibilities',
    'role',
    'school',
    'skills',
    'stack',
    'start',
    'startdate',
    'startedat',
    'summary',
    'technology',
    'technologies',
    'title',
    'to',
    'tools',
    'type',
    'url',
    'website',
  ]);

  return primaryFields.has(normalized);
}

function isMePrimaryField(field: string): boolean {
  const normalized = normalizeDataFieldKey(field);
  const primaryFields = new Set([
    'about',
    'aptitudes',
    'bio',
    'city',
    'country',
    'description',
    'headline',
    'location',
    'place',
    'placeliving',
    'profession',
    'role',
    'skills',
    'stack',
    'summary',
    'technology',
    'technologies',
    'title',
    'tools',
  ]);

  return primaryFields.has(normalized);
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
