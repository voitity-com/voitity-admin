import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { FloppyDisk as FloppyDiskIcon } from '@phosphor-icons/react/dist/ssr/FloppyDisk';
import { PaperPlaneTilt as PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { logger } from '@/lib/default-logger';
import type { BusinessFlowGraph } from '@/lib/business/api-client';
import { getBusinessFlow, publishBusinessFlow, saveBusinessFlow, validateBusinessFlow } from '@/lib/business/api-client';
import { toast } from '@/components/core/toaster';
import { BusinessFlowEditor } from '@/components/dashboard/business/business-flow-editor';

export function Page(): React.JSX.Element {
  const { businessId = '' } = useParams();
  const { t } = useTranslation();
  const [graph, setGraph] = React.useState<BusinessFlowGraph | null>(null);
  const [published, setPublished] = React.useState<number | null>(null);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const load = React.useCallback(async () => { try { const response = await getBusinessFlow(businessId); setGraph(response.draft_version ? { edges: response.draft_version.edges, nodes: response.draft_version.nodes } : null); setPublished(response.published_version?.version ?? null); } catch (reason) { logger.error(reason); setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic')); } }, [businessId, t]);
  React.useEffect(() => { load().catch(logger.error); }, [load]);

  if (!graph && !error) return <Card><CardContent><Stack sx={{ alignItems: 'center', p: 6 }}><CircularProgress /></Stack></CardContent></Card>;
  return <Stack spacing={2}>{error ? <Alert color="error">{error}</Alert> : null}<Stack direction={{ sm: 'row', xs: 'column' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}><Stack sx={{ flex: 1 }}><Typography variant="h4">{t('dashboard.business.flow.title')}</Typography><Typography color="text.secondary" variant="body2">{t('dashboard.business.flow.subtitle')}{published ? ` · ${t('dashboard.business.flow.publishedVersion', { version: published })}` : ''}</Typography></Stack><Button disabled={!graph || saving} onClick={async () => { if (!graph) return; setSaving(true); try { const result = await validateBusinessFlow(businessId, graph); if (!result.valid) { setError(result.errors.join(' ')); } else { toast.success(t('dashboard.business.toasts.flowValid')); setError(''); } } finally { setSaving(false); } }} variant="outlined">{t('dashboard.business.actions.validate')}</Button><Button disabled={!graph || saving} onClick={async () => { if (!graph) return; setSaving(true); try { setGraph(await saveBusinessFlow(businessId, graph)); toast.success(t('dashboard.business.toasts.flowSaved')); } catch (reason) { setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic')); } finally { setSaving(false); } }} startIcon={<FloppyDiskIcon />} variant="contained">{t('dashboard.business.actions.save')}</Button><Button disabled={!graph || saving} onClick={async () => { if (!graph) return; setSaving(true); try { await saveBusinessFlow(businessId, graph); await publishBusinessFlow(businessId); toast.success(t('dashboard.business.toasts.flowPublished')); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic')); } finally { setSaving(false); } }} startIcon={<PaperPlaneTiltIcon />} variant="contained">{t('dashboard.business.actions.publish')}</Button></Stack>{graph ? <BusinessFlowEditor graph={graph} onChange={setGraph} /> : null}</Stack>;
}
