import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import Link from '@mui/material/Link';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';

import type { BusinessLead, BusinessLeadFilters, BusinessLeadPage, BusinessLeadStatus } from '@/lib/business/api-client';
import { listBusinessLeads, markBusinessLeadRead, updateBusinessLeadStatus } from '@/lib/business/api-client';
import { logger } from '@/lib/default-logger';
import type { ColumnDef } from '@/components/core/data-table';
import { DataTable } from '@/components/core/data-table';
import { toast } from '@/components/core/toaster';
import { BusinessLeadDetailDialog } from '@/components/dashboard/business/business-lead-detail-dialog';
import { BusinessLeadStatusDialog } from '@/components/dashboard/business/business-lead-status-dialog';

const statuses: BusinessLeadStatus[] = ['created', 'contacted', 'sale', 'no_response', 'closed'];
const emptyPage: BusinessLeadPage = { currentPage: 1, items: [], lastPage: 1, perPage: 25, total: 0, unreadCount: 0 };

interface PendingStatusChange {
  lead: BusinessLead;
  nextStatus: BusinessLeadStatus;
}

export function Page(): React.JSX.Element {
  const { businessId = '' } = useParams();
  const { i18n, t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRange = React.useMemo(getInitialRange, []);
  const filters = React.useMemo(() => getFilters(searchParams, initialRange), [initialRange, searchParams]);
  const [draftFilters, setDraftFilters] = React.useState<BusinessLeadFilters>(filters);
  const [leadPage, setLeadPage] = React.useState<BusinessLeadPage>(emptyPage);
  const [selectedLead, setSelectedLead] = React.useState<BusinessLead | null>(null);
  const [pendingStatus, setPendingStatus] = React.useState<PendingStatusChange | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statusLoading, setStatusLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const language = i18n.resolvedLanguage ?? i18n.language;

  React.useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listBusinessLeads(businessId, filters);
      setLeadPage(result);
      setSelectedLead((current) => current ? result.items.find((lead) => lead.id === current.id) ?? current : null);
    } catch (reason) {
      logger.error(reason);
      setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [businessId, filters, t]);

  React.useEffect(() => {
    load().catch(logger.error);
  }, [load]);

  const applyFilters = (): void => {
    setSearchParams(toSearchParams({ ...draftFilters, page: 1 }));
  };

  const changePage = (page: number): void => {
    setSearchParams(toSearchParams({ ...filters, page }));
  };

  const openLead = React.useCallback((lead: BusinessLead): void => {
    setSelectedLead(lead);
    if (lead.read_at) return;

    markBusinessLeadRead(businessId, lead.id).then((updated) => {
      setSelectedLead((current) => current?.id === updated.id ? updated : current);
      setLeadPage((current) => {
        const total = filters.unreadOnly ? Math.max(0, current.total - 1) : current.total;

        return {
          ...current,
          items: filters.unreadOnly
            ? current.items.filter((item) => item.id !== updated.id)
            : current.items.map((item) => item.id === updated.id ? updated : item),
          lastPage: Math.max(1, Math.ceil(total / current.perPage)),
          total,
          unreadCount: Math.max(0, current.unreadCount - 1),
        };
      });
      window.dispatchEvent(new Event('business-updated'));
    }).catch((reason: unknown) => {
      logger.error(reason);
      toast.error(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
    });
  }, [businessId, filters.unreadOnly, t]);

  const confirmStatusChange = async (note: string): Promise<void> => {
    if (!pendingStatus) return;
    setStatusLoading(true);
    try {
      const updated = await updateBusinessLeadStatus(businessId, pendingStatus.lead.id, { note, status: pendingStatus.nextStatus });
      setSelectedLead((current) => current?.id === updated.id ? updated : current);
      setPendingStatus(null);
      toast.success(t('dashboard.business.toasts.leadUpdated'));
      await load();
    } catch (reason) {
      logger.error(reason);
      toast.error(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
    } finally {
      setStatusLoading(false);
    }
  };

  const columns = React.useMemo(() => getColumns({
    language,
    onStatusChange: (lead, nextStatus) => {
      if (lead.status !== nextStatus) setPendingStatus({ lead, nextStatus });
    },
    t,
  }), [language, t]);

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4">{t('dashboard.business.nav.leads')}</Typography>
        <Typography color="text.secondary" variant="body2">{t('dashboard.business.leads.subtitle')}</Typography>
      </Stack>

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ alignItems: { lg: 'end' } }}>
            <FormControl fullWidth>
              <InputLabel id="business-lead-date-field-label">{t('dashboard.business.leads.filters.dateField')}</InputLabel>
              <Select
                id="business-lead-date-field"
                label={t('dashboard.business.leads.filters.dateField')}
                labelId="business-lead-date-field-label"
                onChange={(event) => { setDraftFilters((current) => ({ ...current, dateField: event.target.value as BusinessLeadFilters['dateField'] })); }}
                value={draftFilters.dateField}
              >
                <MenuItem value="created_at">{t('dashboard.business.leads.filters.createdAt')}</MenuItem>
                <MenuItem value="updated_at">{t('dashboard.business.leads.filters.updatedAt')}</MenuItem>
              </Select>
            </FormControl>
            <TextField InputLabelProps={{ shrink: true }} fullWidth label={t('dashboard.business.leads.filters.from')} onChange={(event) => { setDraftFilters((current) => ({ ...current, from: event.target.value })); }} type="date" value={draftFilters.from} />
            <TextField InputLabelProps={{ shrink: true }} fullWidth label={t('dashboard.business.leads.filters.to')} onChange={(event) => { setDraftFilters((current) => ({ ...current, to: event.target.value })); }} type="date" value={draftFilters.to} />
            <FormControl fullWidth>
              <InputLabel id="business-lead-status-filter-label">{t('dashboard.business.leads.filters.status')}</InputLabel>
              <Select
                id="business-lead-status-filter"
                label={t('dashboard.business.leads.filters.status')}
                labelId="business-lead-status-filter-label"
                multiple
                onChange={(event: SelectChangeEvent<BusinessLeadStatus[]>) => {
                  const value = event.target.value;
                  setDraftFilters((current) => ({ ...current, statuses: typeof value === 'string' ? value.split(',') as BusinessLeadStatus[] : value }));
                }}
                renderValue={(selected) => selected.length === 0
                  ? t('dashboard.business.leads.filters.allStatuses')
                  : selected.map((status) => t(`dashboard.business.leads.status.${status}`)).join(', ')}
                value={draftFilters.statuses}
              >
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    <Checkbox checked={draftFilters.statuses.includes(status)} />
                    <ListItemText primary={t(`dashboard.business.leads.status.${status}`)} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Checkbox checked={draftFilters.unreadOnly} onChange={(_event, checked) => { setDraftFilters((current) => ({ ...current, unreadOnly: checked })); }} />}
              label={t('dashboard.business.leads.filters.unreadOnly')}
              sx={{ flex: '0 0 auto', mb: { lg: 0.75 }, whiteSpace: 'nowrap' }}
            />
            <Button disabled={!draftFilters.from || !draftFilters.to || draftFilters.from > draftFilters.to} onClick={applyFilters} sx={{ minWidth: 120 }} variant="contained">
              {t('dashboard.business.leads.filters.apply')}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {error ? <Alert color="error">{error}</Alert> : null}
      {loading ? <Stack sx={{ alignItems: 'center', p: 6 }}><CircularProgress /></Stack> : null}
      {!loading && !error ? (
        <Card sx={{ overflowX: 'auto' }}>
          {leadPage.items.length ? (
            <DataTable
              columns={columns}
              getRowAriaLabel={(lead) => t('dashboard.business.leads.detail.open', { name: lead.full_name || lead.email || lead.id })}
              getRowDataAttributes={(lead) => ({ 'data-read-state': lead.read_at ? 'read' : 'unread' })}
              getRowSx={(lead) => lead.read_at ? undefined : {
                bgcolor: 'action.hover',
                '& > td:first-of-type': { borderLeft: '4px solid', borderLeftColor: 'error.main' },
                '&:hover': { bgcolor: 'action.selected' },
              }}
              hover
              onClick={(_event, lead) => { openLead(lead); }}
              rows={leadPage.items}
              sx={{ minWidth: 980 }}
            />
          ) : <Typography color="text.secondary" sx={{ p: 6, textAlign: 'center' }}>{t('dashboard.business.leads.empty')}</Typography>}
          <CardActions sx={{ borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between', px: 3 }}>
            <Typography color="text.secondary" variant="body2">
              {t('dashboard.business.leads.pagination.summary', { page: leadPage.currentPage, pages: leadPage.lastPage, total: leadPage.total })}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button disabled={leadPage.currentPage <= 1} onClick={() => { changePage(leadPage.currentPage - 1); }} variant="outlined">{t('dashboard.business.leads.pagination.previous')}</Button>
              <Button disabled={leadPage.currentPage >= leadPage.lastPage} onClick={() => { changePage(leadPage.currentPage + 1); }} variant="outlined">{t('dashboard.business.leads.pagination.next')}</Button>
            </Stack>
          </CardActions>
        </Card>
      ) : null}

      <BusinessLeadDetailDialog lead={selectedLead} onClose={() => { setSelectedLead(null); }} open={Boolean(selectedLead)} />
      {pendingStatus ? (
        <BusinessLeadStatusDialog
          currentStatus={pendingStatus.lead.status}
          loading={statusLoading}
          nextStatus={pendingStatus.nextStatus}
          onClose={() => { if (!statusLoading) setPendingStatus(null); }}
          onConfirm={confirmStatusChange}
          open
        />
      ) : null}
    </Stack>
  );
}

function getColumns({ language, onStatusChange, t }: {
  language: string;
  onStatusChange: (lead: BusinessLead, status: BusinessLeadStatus) => void;
  t: TFunction;
}): ColumnDef<BusinessLead>[] {
  return [
    {
      formatter: (lead) => (
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: lead.read_at ? 600 : 700 }} variant="subtitle2">{lead.full_name || '-'}</Typography>
            {!lead.read_at ? <Chip color="error" label={t('dashboard.business.leads.unread')} size="small" /> : null}
          </Stack>
          <Typography color="text.secondary" variant="caption">{lead.email || '-'}</Typography>
          <Typography color="text.secondary" variant="caption">{t('dashboard.business.leads.phone')}: {lead.phone || '-'}</Typography>
          <Typography color="text.secondary" variant="caption">WhatsApp: {lead.whatsapp || '-'}</Typography>
        </Stack>
      ),
      name: t('dashboard.business.leads.contact'),
      width: 260,
    },
    {
      formatter: (lead) => (
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">{lead.company || t('dashboard.business.leads.notProvided')}</Typography>
          {lead.website && /^https?:\/\//i.test(lead.website)
            ? <Link href={lead.website} onClick={(event) => { event.stopPropagation(); }} rel="noreferrer" target="_blank" variant="caption">{lead.website}</Link>
            : <Typography color="text.secondary" variant="caption">{t('dashboard.business.leads.noWebsite')}</Typography>}
        </Stack>
      ),
      name: t('dashboard.business.leads.organization'),
      width: 220,
    },
    {
      formatter: (lead) => (
        <Select
          inputProps={{ 'aria-label': t('dashboard.business.leads.statusChange.select', { name: lead.full_name || lead.email || lead.id }) }}
          onChange={(event) => { onStatusChange(lead, event.target.value as BusinessLeadStatus); }}
          onClick={(event) => { event.stopPropagation(); }}
          size="small"
          value={lead.status}
        >
          {statuses.map((status) => <MenuItem key={status} value={status}>{t(`dashboard.business.leads.status.${status}`)}</MenuItem>)}
        </Select>
      ),
      name: t('dashboard.business.fields.status'),
      width: 170,
    },
    {
      formatter: (lead) => formatDateTime(lead.created_at, language),
      name: t('dashboard.business.leads.fields.createdAt'),
      width: 180,
    },
    {
      formatter: (lead) => formatDateTime(lead.updated_at, language),
      name: t('dashboard.business.leads.fields.updatedAt'),
      width: 180,
    },
  ];
}

function getInitialRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - 1);

  return { from: toInputDate(from), to: toInputDate(to) };
}

function getFilters(searchParams: URLSearchParams, initialRange: { from: string; to: string }): BusinessLeadFilters {
  const dateField = searchParams.get('date_field') === 'updated_at' ? 'updated_at' : 'created_at';
  const requestedStatuses = (searchParams.get('statuses') ?? '').split(',').filter((status): status is BusinessLeadStatus => statuses.includes(status as BusinessLeadStatus));
  const requestedPage = Number(searchParams.get('page') ?? 1);

  return {
    dateField,
    from: searchParams.get('from') ?? initialRange.from,
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    statuses: requestedStatuses,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    to: searchParams.get('to') ?? initialRange.to,
    unreadOnly: searchParams.get('unread_only') === '1',
  };
}

function toSearchParams(filters: BusinessLeadFilters): URLSearchParams {
  const params = new URLSearchParams({ date_field: filters.dateField, from: filters.from, page: String(filters.page ?? 1), to: filters.to });
  if (filters.statuses.length) params.set('statuses', filters.statuses.join(','));
  if (filters.unreadOnly) params.set('unread_only', '1');

  return params;
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateTime(value: null | string | undefined, language: string): string {
  if (!value) return '-';

  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
