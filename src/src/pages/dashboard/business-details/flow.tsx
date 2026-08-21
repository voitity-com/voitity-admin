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

import type { BusinessFlowGraph, BusinessFlowResponse } from '@/lib/business/api-client';
import {
  getBusinessFlow,
  publishBusinessFlow,
  saveBusinessFlow,
  validateBusinessFlow,
} from '@/lib/business/api-client';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';
import { BusinessFlowEditor } from '@/components/dashboard/business/business-flow-editor';

const actionPulseSx = {
  '@keyframes businessFlowActionPulse': {
    '0%, 100%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)', transform: 'scale(1)' },
    '50%': { boxShadow: '0 0 0 8px rgba(99, 102, 241, 0.24)', transform: 'scale(1.035)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  animation: 'businessFlowActionPulse 1.35s ease-in-out infinite',
};

function graphFromResponse(response: BusinessFlowResponse): BusinessFlowGraph | null {
  return response.draft_version ? { edges: response.draft_version.edges, nodes: response.draft_version.nodes } : null;
}

function graphsAreEqual(first: BusinessFlowGraph | null, second: BusinessFlowGraph | null): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function responseHasUnpublishedDraft(response: BusinessFlowResponse): boolean {
  if (!response.draft_version) return false;
  if (!response.published_version) return true;

  // Publishing creates revision 1 as an exact copy of the published graph.
  // Any later successful save increments the draft revision.
  return response.draft_version.revision > 1;
}

export function Page(): React.JSX.Element {
  const { businessId = '' } = useParams();
  const { t } = useTranslation();
  const [graph, setGraph] = React.useState<BusinessFlowGraph | null>(null);
  const [savedGraph, setSavedGraph] = React.useState<BusinessFlowGraph | null>(null);
  const [published, setPublished] = React.useState<number | null>(null);
  const [hasUnpublishedDraft, setHasUnpublishedDraft] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async (): Promise<void> => {
    try {
      const response = await getBusinessFlow(businessId);
      const nextGraph = graphFromResponse(response);
      setGraph(nextGraph);
      setSavedGraph(nextGraph);
      setPublished(response.published_version?.version ?? null);
      setHasUnpublishedDraft(responseHasUnpublishedDraft(response));
      setError('');
    } catch (reason) {
      logger.error(reason);
      setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
    }
  }, [businessId, t]);

  React.useEffect(() => {
    load().catch(logger.error);
  }, [load]);

  const hasUnsavedChanges = !graphsAreEqual(graph, savedGraph);
  const shouldPulseSave = hasUnsavedChanges && !saving;
  const shouldPulsePublish = !hasUnsavedChanges && hasUnpublishedDraft && !saving;

  React.useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const warnBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const save = async (): Promise<void> => {
    if (!graph || !hasUnsavedChanges) return;
    setSaving(true);
    try {
      const result = await saveBusinessFlow(businessId, graph);
      const nextGraph = { edges: result.edges, nodes: result.nodes };
      setGraph(nextGraph);
      setSavedGraph(nextGraph);
      setHasUnpublishedDraft(true);
      setError('');
      toast.success(t('dashboard.business.toasts.flowSaved'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const publish = async (): Promise<void> => {
    if (!graph || hasUnsavedChanges || !hasUnpublishedDraft) return;
    setSaving(true);
    try {
      await publishBusinessFlow(businessId);
      toast.success(t('dashboard.business.toasts.flowPublished'));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  if (!graph && !error) {
    return (
      <Card>
        <CardContent>
          <Stack sx={{ alignItems: 'center', p: 6 }}>
            <CircularProgress />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert color="error">{error}</Alert> : null}
      {hasUnsavedChanges ? (
        <Alert id="business-flow-unsaved-warning" severity="warning" variant="outlined">
          {t('dashboard.business.flow.unsavedWarning')}
        </Alert>
      ) : null}
      {!hasUnsavedChanges && hasUnpublishedDraft ? (
        <Alert id="business-flow-unpublished-warning" severity="warning" variant="outlined">
          {published
            ? t('dashboard.business.flow.unpublishedWarning', { version: published })
            : t('dashboard.business.flow.neverPublishedWarning')}
        </Alert>
      ) : null}
      <Stack direction={{ sm: 'row', xs: 'column' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <Stack sx={{ flex: 1 }}>
          <Typography variant="h4">{t('dashboard.business.flow.title')}</Typography>
          <Typography color="text.secondary" variant="body2">
            {t('dashboard.business.flow.subtitle')}
            {published ? ` · ${t('dashboard.business.flow.publishedVersion', { version: published })}` : ''}
          </Typography>
        </Stack>
        <Button
          disabled={!graph || saving}
          onClick={async () => {
            if (!graph) return;
            setSaving(true);
            try {
              const result = await validateBusinessFlow(businessId, graph);
              if (!result.valid) {
                setError(result.errors.join(' '));
              } else {
                toast.success(t('dashboard.business.toasts.flowValid'));
                setError('');
              }
            } finally {
              setSaving(false);
            }
          }}
          variant="outlined"
        >
          {t('dashboard.business.actions.validate')}
        </Button>
        <Button
          aria-describedby={hasUnsavedChanges ? 'business-flow-unsaved-warning' : undefined}
          disabled={!graph || saving || !hasUnsavedChanges}
          onClick={save}
          startIcon={<FloppyDiskIcon />}
          sx={shouldPulseSave ? actionPulseSx : undefined}
          variant="contained"
        >
          {t('dashboard.business.actions.save')}
        </Button>
        <Button
          aria-describedby={shouldPulsePublish ? 'business-flow-unpublished-warning' : undefined}
          disabled={!graph || saving || hasUnsavedChanges || !hasUnpublishedDraft}
          onClick={publish}
          startIcon={<PaperPlaneTiltIcon />}
          sx={shouldPulsePublish ? actionPulseSx : undefined}
          variant="contained"
        >
          {t('dashboard.business.actions.publish')}
        </Button>
      </Stack>
      {graph ? <BusinessFlowEditor graph={graph} onChange={setGraph} /> : null}
    </Stack>
  );
}
