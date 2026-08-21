import * as React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useTranslation } from 'react-i18next';

import type { BusinessLead, BusinessLeadStatusHistory } from '@/lib/business/api-client';

interface BusinessLeadDetailDialogProps {
  lead: BusinessLead | null;
  onClose: () => void;
  open: boolean;
}

export function BusinessLeadDetailDialog({ lead, onClose, open }: BusinessLeadDetailDialogProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const [tab, setTab] = React.useState<'history' | 'info'>('info');
  const language = i18n.resolvedLanguage ?? i18n.language;

  React.useEffect(() => {
    if (open) setTab('info');
  }, [open, lead?.id]);

  const histories = React.useMemo(() => getCompleteHistory(lead), [lead]);

  return (
    <Dialog fullWidth maxWidth="md" onClose={onClose} open={open}>
      <DialogTitle sx={{ pr: 7 }}>
        <Stack spacing={0.5}>
          <Typography variant="h5">{lead?.full_name || t('dashboard.business.leads.detail.notAvailable')}</Typography>
          <Typography color="text.secondary" variant="body2">{lead?.email || t('dashboard.business.leads.detail.notAvailable')}</Typography>
        </Stack>
        <IconButton aria-label={t('dashboard.business.leads.detail.close')} onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <XIcon />
        </IconButton>
      </DialogTitle>
      <Tabs aria-label={t('dashboard.business.leads.detail.tabs.label')} onChange={(_event, value: 'history' | 'info') => { setTab(value); }} sx={{ px: 3 }} value={tab}>
        <Tab label={t('dashboard.business.leads.detail.tabs.info')} value="info" />
        <Tab label={t('dashboard.business.leads.detail.tabs.history')} value="history" />
      </Tabs>
      <Divider />
      <DialogContent>
        {lead && tab === 'info' ? <LeadInfo language={language} lead={lead} /> : null}
        {lead && tab === 'history' ? <LeadHistory histories={histories} language={language} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function LeadInfo({ language, lead }: { language: string; lead: BusinessLead }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
        <InfoField label={t('dashboard.business.fields.status')} value={<Chip color="primary" label={t(`dashboard.business.leads.status.${lead.status}`)} size="small" sx={{ alignSelf: 'flex-start' }} variant="outlined" />} />
        <InfoField label={t('dashboard.business.leads.detail.fields.name')} value={lead.full_name} />
        <InfoField label={t('dashboard.business.leads.detail.fields.email')} value={lead.email} />
        <InfoField label={t('dashboard.business.leads.phone')} value={lead.phone} />
        <InfoField label="WhatsApp" value={lead.whatsapp} />
        <InfoField label={t('dashboard.business.leads.detail.fields.company')} value={lead.company} />
        <InfoField
          label={t('dashboard.business.leads.detail.fields.website')}
          value={lead.website && /^https?:\/\//i.test(lead.website) ? <Link href={lead.website} rel="noreferrer" target="_blank">{lead.website}</Link> : lead.website}
        />
        <InfoField label={t('dashboard.business.leads.detail.fields.createdAt')} value={formatDateTime(lead.created_at, language)} />
        <InfoField label={t('dashboard.business.leads.detail.fields.updatedAt')} value={formatDateTime(lead.updated_at, language)} />
        <InfoField label={t('dashboard.business.leads.detail.fields.conversation')} value={lead.conversation?.uuid} />
        <InfoField label={t('dashboard.business.leads.detail.fields.conversationStarted')} value={formatDateTime(lead.conversation?.started_at, language)} />
        <InfoField label={t('dashboard.business.leads.detail.fields.conversationCompleted')} value={formatDateTime(lead.conversation?.completed_at, language)} />
      </Box>
      <DetailText label={t('dashboard.business.leads.problem')} value={lead.project_summary} />
      <DetailText label={t('dashboard.business.leads.solution')} value={lead.ai_solution_summary} />
    </Stack>
  );
}

function LeadHistory({ histories, language }: { histories: BusinessLeadStatusHistory[]; language: string }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table sx={{ minWidth: 700 }}>
        <TableHead>
          <TableRow>
            <TableCell>{t('dashboard.business.leads.detail.history.date')}</TableCell>
            <TableCell>{t('dashboard.business.leads.detail.history.change')}</TableCell>
            <TableCell>{t('dashboard.business.leads.detail.history.observations')}</TableCell>
            <TableCell>{t('dashboard.business.leads.detail.history.changedBy')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {histories.map((history) => (
            <TableRow key={history.id} sx={{ verticalAlign: 'top' }}>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(history.created_at, language)}</TableCell>
              <TableCell>
                {history.from_status ? (
                  <Typography variant="body2">
                    {t(`dashboard.business.leads.status.${history.from_status}`)} → {t(`dashboard.business.leads.status.${history.to_status}`)}
                  </Typography>
                ) : <Typography variant="body2">{t('dashboard.business.leads.detail.history.created')}</Typography>}
              </TableCell>
              <TableCell sx={{ maxWidth: 320, whiteSpace: 'pre-wrap' }}>{history.note || t('dashboard.business.leads.detail.history.noObservations')}</TableCell>
              <TableCell>{history.changed_by?.name || t('dashboard.business.leads.detail.history.system')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }): React.JSX.Element {
  return (
    <Stack spacing={0.5}>
      <Typography color="text.secondary" variant="caption">{label}</Typography>
      {React.isValidElement(value) ? value : <Typography variant="body2">{value || '-'}</Typography>}
    </Stack>
  );
}

function DetailText({ label, value }: { label: string; value?: null | string }): React.JSX.Element {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{label}</Typography>
      <Box sx={{ bgcolor: 'background.level1', borderRadius: 1, p: 2 }}>
        <Typography sx={{ whiteSpace: 'pre-wrap' }} variant="body2">{value || '-'}</Typography>
      </Box>
    </Stack>
  );
}

function getCompleteHistory(lead: BusinessLead | null): BusinessLeadStatusHistory[] {
  if (!lead) return [];
  const histories = lead.histories ?? [];
  if (histories.some((history) => history.from_status === null && history.to_status === 'created')) return histories;

  return [{ created_at: lead.created_at, from_status: null, id: -lead.id, note: null, to_status: 'created' }, ...histories];
}

function formatDateTime(value: null | string | undefined, language: string): string {
  if (!value) return '-';

  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
