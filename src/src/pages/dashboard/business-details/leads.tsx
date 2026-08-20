import * as React from 'react';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { logger } from '@/lib/default-logger';
import type { BusinessLead, BusinessLeadStatus } from '@/lib/business/api-client';
import { listBusinessLeads, updateBusinessLeadStatus } from '@/lib/business/api-client';
import { toast } from '@/components/core/toaster';

const statuses: BusinessLeadStatus[] = ['created', 'contacted', 'sale', 'no_response'];

export function Page(): React.JSX.Element {
  const { businessId = '' } = useParams();
  const { t } = useTranslation();
  const [leads, setLeads] = React.useState<BusinessLead[]>([]);
  const load = React.useCallback(async () => { try { setLeads(await listBusinessLeads(businessId)); } catch (error) { logger.error(error); toast.error(t('dashboard.business.errors.generic')); } }, [businessId, t]);
  React.useEffect(() => { load().catch(logger.error); }, [load]);

  return <Stack spacing={3}><Stack spacing={0.5}><Typography variant="h4">{t('dashboard.business.nav.leads')}</Typography><Typography color="text.secondary" variant="body2">{t('dashboard.business.leads.subtitle')}</Typography></Stack><Card sx={{ overflowX: 'auto' }}><Table sx={{ minWidth: 1280 }}><TableHead><TableRow><TableCell>{t('dashboard.business.leads.contact')}</TableCell><TableCell>{t('dashboard.business.leads.organization')}</TableCell><TableCell>{t('dashboard.business.leads.problem')}</TableCell><TableCell>{t('dashboard.business.leads.solution')}</TableCell><TableCell>{t('dashboard.business.fields.status')}</TableCell><TableCell>{t('dashboard.business.fields.updated')}</TableCell></TableRow></TableHead><TableBody>{leads.map((lead) => <TableRow key={lead.id} sx={{ verticalAlign: 'top' }}><TableCell><Stack spacing={0.5}><Typography variant="subtitle2">{lead.full_name || '-'}</Typography><Typography color="text.secondary" variant="caption">{lead.email || '-'}</Typography><Typography color="text.secondary" variant="caption">{t('dashboard.business.leads.phone')}: {lead.phone || '-'}</Typography><Typography color="text.secondary" variant="caption">WhatsApp: {lead.whatsapp || '-'}</Typography></Stack></TableCell><TableCell><Typography variant="subtitle2">{lead.company || t('dashboard.business.leads.notProvided')}</Typography>{lead.website && /^https?:\/\//i.test(lead.website) ? <Link href={lead.website} rel="noreferrer" target="_blank" variant="caption">{lead.website}</Link> : <Typography color="text.secondary" variant="caption">{t('dashboard.business.leads.noWebsite')}</Typography>}</TableCell><TableCell sx={{ maxWidth: 320 }}><Typography sx={{ whiteSpace: 'pre-wrap' }} variant="body2">{lead.project_summary || '-'}</Typography></TableCell><TableCell sx={{ maxWidth: 360 }}><Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }} variant="body2">{lead.ai_solution_summary || '-'}</Typography></TableCell><TableCell><Select onChange={async (event) => { await updateBusinessLeadStatus(businessId, lead.id, event.target.value as BusinessLeadStatus); toast.success(t('dashboard.business.toasts.leadUpdated')); await load(); }} size="small" value={lead.status}>{statuses.map((status) => <MenuItem key={status} value={status}>{t(`dashboard.business.leads.status.${status}`)}</MenuItem>)}</Select></TableCell><TableCell>{lead.created_at ? new Date(lead.created_at).toLocaleString() : '-'}</TableCell></TableRow>)}{!leads.length ? <TableRow><TableCell colSpan={6}><Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>{t('dashboard.business.leads.empty')}</Typography></TableCell></TableRow> : null}</TableBody></Table></Card></Stack>;
}
