'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { TFunction } from 'i18next';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { paths } from '@/paths';
import type {
  ProfileChatInsights,
  ProfileInsights,
  ProfileInsightsCategory,
  ProfileInsightsProductAvailability,
  ProfileInsightsProvider,
  ProfileInsightsSummary,
  ProfileProductInsight,
  ProfileProductInsights,
} from '@/lib/profiles/api-client';
import { getProfileChatInsights, getProfileInsights, getProfileProductInsights } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import { RouterLink } from '@/components/core/link';

const metadata = { title: `Insights | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
const chartColors = ['#635bff', '#14b8a6', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7', '#ec4899', '#84cc16'];

type Section = 'chats' | 'dashboard' | 'products';
type SectionRequestState =
  | { error: string; section: Section; status: 'error' }
  | { section: Section; status: 'loading' }
  | { data: ProfileChatInsights; section: 'chats'; status: 'success' }
  | { data: ProfileInsights; section: 'dashboard'; status: 'success' }
  | { data: ProfileProductInsights; section: 'products'; status: 'success' };
type SuccessfulSectionState = Extract<SectionRequestState, { status: 'success' }>;
type MetricKey = keyof Pick<
  ProfileInsightsSummary,
  | 'instagram_external_clicks'
  | 'instagram_shown'
  | 'new_chats'
  | 'onlyfans_external_clicks'
  | 'onlyfans_images_shown'
  | 'product_clicks'
  | 'tiktok_external_clicks'
  | 'tiktok_shown'
  | 'total_messages'
  | 'unique_visitors'
  | 'youtube_channel_clicks'
  | 'youtube_external_clicks'
  | 'youtube_opened'
  | 'youtube_shown'
  | 'youtube_video_clicks'
>;

const metricKeys: MetricKey[] = [
  'new_chats',
  'total_messages',
  'unique_visitors',
  'product_clicks',
  'instagram_shown',
  'instagram_external_clicks',
  'tiktok_shown',
  'tiktok_external_clicks',
  'onlyfans_images_shown',
  'onlyfans_external_clicks',
  'youtube_shown',
  'youtube_opened',
  'youtube_external_clicks',
  'youtube_video_clicks',
  'youtube_channel_clicks',
];

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRange = React.useMemo(getInitialRange, []);
  const from = searchParams.get('from') ?? initialRange.from;
  const to = searchParams.get('to') ?? initialRange.to;
  const [draftFrom, setDraftFrom] = React.useState(from);
  const [draftTo, setDraftTo] = React.useState(to);
  const section = getSection(location.pathname);
  const [reportState, setReportState] = React.useState<SectionRequestState>(() => ({ section, status: 'loading' }));
  const [productsAvailability, setProductsAvailability] = React.useState<null | {
    profileId: string;
    value: ProfileInsightsProductAvailability;
  }>(null);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const language = i18n.resolvedLanguage ?? i18n.language;

  React.useEffect(() => {
    setDraftFrom(from);
    setDraftTo(to);
  }, [from, to]);

  React.useEffect(() => {
    let active = true;
    setReportState({ section, status: 'loading' });
    const params = { from, profileId, timezone, to };

    loadSectionReport(section, params)
      .then((result) => {
        if (!active) return;
        setReportState(result);
        setProductsAvailability({ profileId, value: result.data.tabs.products });
      })
      .catch((err) => {
        logger.error(err);
        if (active) {
          setReportState({
            error: err instanceof Error ? err.message : t('dashboard.profiles.detail.errors.generic'),
            section,
            status: 'error',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [from, profileId, section, t, timezone, to]);

  const applyRange = (): void => {
    if (!draftFrom || !draftTo || draftFrom > draftTo) return;
    setSearchParams({ from: draftFrom, to: draftTo });
  };
  const activeReportState = reportState.section === section ? reportState : null;
  const data = activeReportState?.status === 'success' ? activeReportState.data : null;
  const error = activeReportState?.status === 'error' ? activeReportState.error : '';
  const isLoading = !activeReportState || activeReportState.status === 'loading';
  const query = new URLSearchParams({ from, to }).toString();
  const productsAvailable = productsAvailability?.profileId === profileId
    ? productsAvailability.value.available
    : false;
  const showProductsTab = productsAvailable || (section === 'products' && isLoading);
  const selectedTab = section === 'products' && !showProductsTab ? false : section;
  const tabHref = (target: Section): string => `${paths.dashboard.profileDetails.insights[target](profileId)}?${query}`;

  return (
    <React.Fragment>
      <Helmet><title>{metadata.title}</title></Helmet>
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <Typography variant="h4">{t('dashboard.profiles.detail.insights.title')}</Typography>
          <Typography color="text.secondary" variant="body2">
            {t('dashboard.profiles.detail.insights.description')}
          </Typography>
        </Stack>

        <Card>
          <Tabs aria-label={t('dashboard.profiles.detail.insights.tabs.label')} value={selectedTab} variant="scrollable">
            <Tab component={RouterLink} href={tabHref('dashboard')} label={t('dashboard.profiles.detail.insights.tabs.dashboard')} value="dashboard" />
            <Tab component={RouterLink} href={tabHref('chats')} label={t('dashboard.profiles.detail.insights.tabs.chats')} value="chats" />
            {showProductsTab ? (
              <Tab component={RouterLink} href={tabHref('products')} label={t('dashboard.profiles.detail.insights.tabs.products')} value="products" />
            ) : null}
          </Tabs>
          <Divider />
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'end' } }}>
              <TextField InputLabelProps={{ shrink: true }} fullWidth label={t('dashboard.profiles.detail.insights.filters.from')} onChange={(event) => { setDraftFrom(event.target.value); }} type="date" value={draftFrom} />
              <TextField InputLabelProps={{ shrink: true }} fullWidth label={t('dashboard.profiles.detail.insights.filters.to')} onChange={(event) => { setDraftTo(event.target.value); }} type="date" value={draftTo} />
              <Button disabled={!draftFrom || !draftTo || draftFrom > draftTo} onClick={applyRange} variant="contained">
                {t('dashboard.profiles.detail.insights.filters.apply')}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {error ? <Alert color="error">{error}</Alert> : null}
        {data?.tracking_started_at ? (
          <Alert color="info">
            {t('dashboard.profiles.detail.insights.trackingSince', {
              date: new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(data.tracking_started_at)),
            })}
          </Alert>
        ) : null}

        {isLoading ? (
          <Stack sx={{ alignItems: 'center', p: 6 }}><CircularProgress /></Stack>
        ) : activeReportState?.status === 'success' ? (
          <SectionReport language={language} report={activeReportState} t={t} />
        ) : null}
      </Stack>
    </React.Fragment>
  );
}

async function loadSectionReport(
  section: Section,
  params: Parameters<typeof getProfileInsights>[0]
): Promise<SuccessfulSectionState> {
  if (section === 'chats') {
    return { data: await getProfileChatInsights(params), section, status: 'success' };
  }

  if (section === 'products') {
    return { data: await getProfileProductInsights(params), section, status: 'success' };
  }

  return { data: await getProfileInsights(params), section, status: 'success' };
}

function SectionReport({ language, report, t }: { language: string; report: SuccessfulSectionState; t: TFunction }): React.JSX.Element {
  if (report.section === 'chats') return <ChatsReport data={report.data} t={t} />;
  if (report.section === 'products') return <ProductsReport data={report.data} language={language} t={t} />;
  return <DashboardReport data={report.data} t={t} />;
}

function DashboardReport({ data, t }: { data: ProfileInsights; t: TFunction }): React.JSX.Element {
  return (
    <Stack spacing={3}>
      <MetricGrid summary={data.summary} t={t} />
      <LineTrend data={data} t={t} />
      <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3}>
        <ProviderFunnel providers={data.provider_funnel} t={t} />
        <CategoryList categories={data.categories} t={t} />
      </Stack>
    </Stack>
  );
}

function MetricGrid({ summary, t }: { summary: ProfileInsightsSummary; t: TFunction }): React.JSX.Element {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(5, 1fr)' } }}>
      {metricKeys.map((key) => (
        <MetricCard key={key} label={t(`dashboard.profiles.detail.insights.metrics.${key}`)} value={summary[key]} />
      ))}
    </Box>
  );
}

function MetricCard({ helper, label, value }: { helper?: string; label: string; value: number | string }): React.JSX.Element {
  return (
    <Card>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography color="text.secondary" variant="body2">{label}</Typography>
        <Typography sx={{ mt: 0.5 }} variant="h4">{value}</Typography>
        {helper ? <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="caption">{helper}</Typography> : null}
      </CardContent>
    </Card>
  );
}

function LineTrend({ data, t }: { data: ProfileInsights; t: TFunction }): React.JSX.Element {
  return (
    <Card>
      <CardHeader subheader={t('dashboard.profiles.detail.insights.charts.trendHelp')} title={t('dashboard.profiles.detail.insights.charts.activity')} />
      <CardContent>
        <ResponsiveContainer height={320} width="100%">
          <LineChart data={data.series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
            <Line dataKey="new_chats" name={t('dashboard.profiles.detail.insights.metrics.new_chats')} stroke={chartColors[0]} strokeWidth={2} />
            <Line dataKey="total_messages" name={t('dashboard.profiles.detail.insights.metrics.total_messages')} stroke={chartColors[1]} strokeWidth={2} />
            <Line dataKey="unique_visitors" name={t('dashboard.profiles.detail.insights.metrics.unique_visitors')} stroke={chartColors[2]} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ProviderFunnel({ providers, t }: { providers: ProfileInsightsProvider[]; t: TFunction }): React.JSX.Element {
  return (
    <Card sx={{ flex: '1 1 0' }}>
      <CardHeader subheader={t('dashboard.profiles.detail.insights.providers.help')} title={t('dashboard.profiles.detail.insights.providers.title')} />
      <CardContent>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>{t('dashboard.profiles.detail.insights.providers.provider')}</TableCell>
              <TableCell align="right">{t('dashboard.profiles.detail.insights.providers.shown')}</TableCell>
              <TableCell align="right">{t('dashboard.profiles.detail.insights.providers.opened')}</TableCell>
              <TableCell align="right">{t('dashboard.profiles.detail.insights.providers.clicks')}</TableCell>
              <TableCell align="right">{t('dashboard.profiles.detail.insights.providers.videoClicks')}</TableCell>
              <TableCell align="right">{t('dashboard.profiles.detail.insights.providers.channelClicks')}</TableCell>
              <TableCell align="right">{t('dashboard.profiles.detail.insights.products.ctr')}</TableCell>
            </TableRow></TableHead>
            <TableBody>{providers.map((provider) => (
              <TableRow key={provider.provider}>
                <TableCell sx={{ textTransform: 'capitalize' }}>{provider.provider}</TableCell>
                <TableCell align="right">{provider.shown}</TableCell><TableCell align="right">{provider.opened}</TableCell>
                <TableCell align="right">{provider.external_clicks}</TableCell>
                <TableCell align="right">{provider.video_clicks}</TableCell>
                <TableCell align="right">{provider.channel_clicks}</TableCell>
                <TableCell align="right">{provider.ctr.toFixed(1)}%</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Box>
      </CardContent>
    </Card>
  );
}

function CategoryList({ categories, t }: { categories: ProfileInsightsCategory[]; t: TFunction }): React.JSX.Element {
  const visible = categories.filter((category) => category.count > 0);

  return (
    <Card sx={{ flex: '1 1 0' }}>
      <CardHeader title={t('dashboard.profiles.detail.insights.categories.title')} />
      <CardContent>
        {visible.length ? <Stack divider={<Divider />} spacing={1.5}>{visible.map((category) => (
          <Stack key={category.key} spacing={0.75}>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2">{goalLabel(t, category.key)}</Typography>
              <Typography variant="body2">{category.count} · {category.percent.toFixed(1)}%</Typography>
            </Stack>
            <LinearProgress value={category.percent} variant="determinate" />
          </Stack>
        ))}</Stack> : <Typography color="text.secondary" variant="body2">{t('dashboard.profiles.detail.insights.categories.empty')}</Typography>}
      </CardContent>
    </Card>
  );
}

function ChatsReport({ data, t }: { data: ProfileChatInsights; t: TFunction }): React.JSX.Element {
  const summary = data.summary;
  const trendKeys = data.goals.filter((goal) => goal.count > 0).map((goal) => goal.key);
  const trendData = data.goal_trend.map((row) => ({
    bucket: row.bucket,
    ...Object.fromEntries(row.goals.map((goal) => [goal.key, goal.count])),
  }));

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' } }}>
        <MetricCard label={t('dashboard.profiles.detail.insights.chats.total')} value={summary.total_chats} />
        <MetricCard label={t('dashboard.profiles.detail.insights.chats.averageMessages')} value={summary.average_messages_per_chat.toFixed(1)} />
        <MetricCard label={t('dashboard.profiles.detail.insights.chats.averageDuration')} value={t('dashboard.profiles.detail.insights.chats.minutes', { value: summary.average_duration_minutes.toFixed(1) })} />
        <MetricCard label={t('dashboard.profiles.detail.insights.chats.averageConfidence')} value={`${(summary.average_confidence * 100).toFixed(1)}%`} />
        <MetricCard label={t('dashboard.profiles.detail.insights.chats.closed')} value={summary.closed_chats} />
        <MetricCard label={t('dashboard.profiles.detail.insights.chats.open')} value={summary.open_chats} />
        <MetricCard label={t('dashboard.profiles.detail.insights.chats.singleMessage')} value={summary.single_message_chats} />
        <MetricCard label={t('dashboard.profiles.detail.insights.coverage.classified')} value={`${data.analysis_coverage.classified}/${data.analysis_coverage.total_chats}`} />
      </Box>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
        <CategoryList categories={data.goals} t={t} />
        <Coverage coverage={data.analysis_coverage} t={t} />
      </Stack>

      <Card>
        <CardHeader subheader={t('dashboard.profiles.detail.insights.chats.goalTrendHelp')} title={t('dashboard.profiles.detail.insights.chats.goalTrend')} />
        <CardContent>
          {trendKeys.length ? (
            <ResponsiveContainer height={320} width="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="bucket" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
                {trendKeys.map((key, index) => <Bar dataKey={key} fill={chartColors[index % chartColors.length]} key={key} name={goalLabel(t, key)} stackId="goals" />)}
              </BarChart>
            </ResponsiveContainer>
          ) : <Typography color="text.secondary">{t('dashboard.profiles.detail.insights.categories.empty')}</Typography>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader subheader={t('dashboard.profiles.detail.insights.chats.actionsHelp')} title={t('dashboard.profiles.detail.insights.chats.actions')} />
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: 'auto' }}><Table size="small">
            <TableHead><TableRow>
              <TableCell>{t('dashboard.profiles.detail.insights.categories.title')}</TableCell>
              <TableCell align="right">{t('dashboard.profiles.detail.insights.chats.total')}</TableCell>
              <TableCell align="right">{t('dashboard.profiles.detail.insights.chats.productChats')}</TableCell>
              <TableCell align="right">{t('dashboard.profiles.detail.insights.chats.productRate')}</TableCell>
              <TableCell align="right">WhatsApp</TableCell>
              <TableCell align="right">{t('dashboard.profiles.detail.insights.chats.socialChats')}</TableCell>
              <TableCell align="right">{t('dashboard.profiles.detail.insights.chats.mediaExits')}</TableCell>
            </TableRow></TableHead>
            <TableBody>{data.goal_actions.filter((row) => row.chats > 0).map((row) => (
              <TableRow key={row.key}>
                <TableCell>{goalLabel(t, row.key)}</TableCell><TableCell align="right">{row.chats}</TableCell>
                <TableCell align="right">{row.product_click_chats}</TableCell><TableCell align="right">{row.product_click_rate.toFixed(1)}%</TableCell>
                <TableCell align="right">{row.whatsapp_click_chats}</TableCell><TableCell align="right">{row.social_click_chats}</TableCell>
                <TableCell align="right">{row.media_exit_chats}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table></Box>
        </CardContent>
      </Card>
    </Stack>
  );
}

function Coverage({ coverage, t }: { coverage: ProfileChatInsights['analysis_coverage']; t: TFunction }): React.JSX.Element {
  const percent = coverage.total_chats ? (coverage.classified / coverage.total_chats) * 100 : 0;

  return (
    <Card sx={{ flex: '1 1 0' }}>
      <CardHeader title={t('dashboard.profiles.detail.insights.coverage.title')} />
      <CardContent><Stack spacing={2}>
        <Typography variant="h3">{percent.toFixed(1)}%</Typography><LinearProgress value={percent} variant="determinate" />
        <Typography color="text.secondary" variant="body2">{t('dashboard.profiles.detail.insights.coverage.summary', { classified: coverage.classified, total: coverage.total_chats })}</Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Chip label={`${t('dashboard.profiles.detail.insights.coverage.pending')}: ${coverage.pending}`} size="small" />
          <Chip color="warning" label={`${t('dashboard.profiles.detail.insights.coverage.review')}: ${coverage.needs_review}`} size="small" />
          <Chip color="error" label={`${t('dashboard.profiles.detail.insights.coverage.failed')}: ${coverage.failed}`} size="small" />
          <Chip label={`${t('dashboard.profiles.detail.insights.coverage.unclassified')}: ${coverage.unclassified}`} size="small" />
        </Stack>
      </Stack></CardContent>
    </Card>
  );
}

function ProductsReport({ data, language, t }: { data: ProfileProductInsights; language: string; t: TFunction }): React.JSX.Element {
  if (!data.available.available) {
    return <Alert color="info">{t('dashboard.profiles.detail.insights.products.unavailable')}</Alert>;
  }

  return (
    <Stack spacing={3}>
      {data.available.mode === 'historical_only' ? <Alert color="info">{t('dashboard.profiles.detail.insights.products.historicalOnly')}</Alert> : null}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' } }}>
        <MetricCard label={t('dashboard.profiles.detail.insights.products.products')} value={data.summary.products} />
        <MetricCard label={t('dashboard.profiles.detail.insights.products.shown')} value={data.summary.shown} />
        <MetricCard label={t('dashboard.profiles.detail.insights.products.clicks')} value={data.summary.clicks} />
        <MetricCard label={t('dashboard.profiles.detail.insights.products.ctr')} value={`${data.summary.ctr.toFixed(1)}%`} />
        <MetricCard label={t('dashboard.profiles.detail.insights.products.uniqueVisitors')} value={data.summary.unique_click_visitors} />
      </Box>

      <Card>
        <CardHeader subheader={t('dashboard.profiles.detail.insights.products.trendHelp')} title={t('dashboard.profiles.detail.insights.products.trend')} />
        <CardContent><ResponsiveContainer height={300} width="100%"><LineChart data={data.series}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="bucket" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
          <Line dataKey="shown" name={t('dashboard.profiles.detail.insights.products.shown')} stroke={chartColors[0]} strokeWidth={2} />
          <Line dataKey="clicks" name={t('dashboard.profiles.detail.insights.products.clicks')} stroke={chartColors[1]} strokeWidth={2} />
        </LineChart></ResponsiveContainer></CardContent>
      </Card>

      <Card>
        <CardHeader subheader={t('dashboard.profiles.detail.insights.products.tableHelp')} title={t('dashboard.profiles.detail.insights.products.performance')} />
        <CardContent sx={{ p: 0 }}><Box sx={{ overflowX: 'auto' }}><Table size="small">
          <TableHead><TableRow>
            <TableCell>{t('dashboard.profiles.detail.insights.products.product')}</TableCell>
            <TableCell>{t('dashboard.profiles.detail.insights.products.status')}</TableCell>
            <TableCell align="right">{t('dashboard.profiles.detail.insights.products.shown')}</TableCell>
            <TableCell align="right">{t('dashboard.profiles.detail.insights.products.clicks')}</TableCell>
            <TableCell align="right">{t('dashboard.profiles.detail.insights.products.ctr')}</TableCell>
            <TableCell align="right">{t('dashboard.profiles.detail.insights.products.uniqueVisitors')}</TableCell>
            <TableCell align="right">{t('dashboard.profiles.detail.insights.products.imageClicks')}</TableCell>
            <TableCell align="right">{t('dashboard.profiles.detail.insights.products.buttonClicks')}</TableCell>
            <TableCell>{t('dashboard.profiles.detail.insights.products.destination')}</TableCell>
            <TableCell>{t('dashboard.profiles.detail.insights.categories.title')}</TableCell>
          </TableRow></TableHead>
          <TableBody>{data.products.map((product) => <ProductRow key={product.key} language={language} product={product} t={t} />)}</TableBody>
        </Table></Box></CardContent>
      </Card>
    </Stack>
  );
}

function ProductRow({ language, product, t }: { language: string; product: ProfileProductInsight; t: TFunction }): React.JSX.Element {
  return (
    <TableRow>
      <TableCell><Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 220 }}>
        {product.image_url ? <Box alt="" component="img" src={product.image_url} sx={{ borderRadius: 1, height: 44, objectFit: 'cover', width: 44 }} /> : null}
        <Stack spacing={0.25}><Typography variant="body2">{product.name}</Typography><Typography color="text.secondary" variant="caption">{product.public_id}</Typography></Stack>
      </Stack></TableCell>
      <TableCell><Chip color={product.status === 'published' ? 'success' : product.status === 'draft' ? 'warning' : 'default'} label={t(`dashboard.profiles.detail.insights.products.statuses.${product.status}`)} size="small" /></TableCell>
      <TableCell align="right">{product.shown.toLocaleString(language)}</TableCell><TableCell align="right">{product.clicks.toLocaleString(language)}</TableCell>
      <TableCell align="right">{product.ctr.toFixed(1)}%</TableCell><TableCell align="right">{product.unique_click_visitors}</TableCell>
      <TableCell align="right">{product.image_clicks}</TableCell><TableCell align="right">{product.button_clicks}</TableCell>
      <TableCell>{product.destination_type ? t(`dashboard.profiles.detail.insights.products.destinations.${product.destination_type}`) : '—'}</TableCell>
      <TableCell>{product.goals.length ? product.goals.map((goal) => `${goalLabel(t, goal.key)} (${goal.chats})`).join(', ') : '—'}</TableCell>
    </TableRow>
  );
}

function goalLabel(t: TFunction, key: string): string {
  return t(`dashboard.profiles.detail.insights.categories.${key}`);
}

function getInitialRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - 1);
  return { from: toInputDate(from), to: toInputDate(to) };
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getSection(pathname: string): Section {
  if (pathname.endsWith('/chats')) return 'chats';
  if (pathname.endsWith('/products')) return 'products';
  return 'dashboard';
}
