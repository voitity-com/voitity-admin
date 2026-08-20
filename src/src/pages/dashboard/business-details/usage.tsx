import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';

import { logger } from '@/lib/default-logger';
import type { BusinessUsage } from '@/lib/business/api-client';
import { getBusinessUsage } from '@/lib/business/api-client';

export function Page(): React.JSX.Element {
  const { businessId = '' } = useParams();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRange = React.useMemo(getInitialRange, []);
  const from = searchParams.get('from') ?? initialRange.from;
  const to = searchParams.get('to') ?? initialRange.to;
  const [draftFrom, setDraftFrom] = React.useState(from);
  const [draftTo, setDraftTo] = React.useState(to);
  const [usage, setUsage] = React.useState<BusinessUsage | null>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setDraftFrom(from);
    setDraftTo(to);
  }, [from, to]);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getBusinessUsage(businessId, { from, to })
      .then((result) => {
        if (active) setUsage(result);
      })
      .catch((reason: unknown) => {
        logger.error(reason);
        if (active) setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [businessId, from, t, to]);

  const cards = usage ? [
    ['tokens', usage.tokens.total],
    ['messages', usage.messages],
    ['conversations', usage.conversations],
    ['leads', usage.leads],
    ['noLeads', usage.no_leads],
    ['sources', usage.sources],
  ] as const : [];

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4">{t('dashboard.business.nav.usage')}</Typography>
        <Typography color="text.secondary" variant="body2">{t('dashboard.business.usage.description')}</Typography>
      </Stack>

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'end' } }}>
            <TextField InputLabelProps={{ shrink: true }} fullWidth label={t('dashboard.business.usage.filters.from')} onChange={(event) => { setDraftFrom(event.target.value); }} type="date" value={draftFrom} />
            <TextField InputLabelProps={{ shrink: true }} fullWidth label={t('dashboard.business.usage.filters.to')} onChange={(event) => { setDraftTo(event.target.value); }} type="date" value={draftTo} />
            <Button disabled={!draftFrom || !draftTo || draftFrom > draftTo} onClick={() => { setSearchParams({ from: draftFrom, to: draftTo }); }} variant="contained">
              {t('dashboard.business.usage.filters.apply')}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {error ? <Alert color="error">{error}</Alert> : null}
      {loading ? <Stack sx={{ alignItems: 'center', p: 6 }}><CircularProgress /></Stack> : null}
      {!loading && !error ? (
        <React.Fragment>
          <Grid container spacing={2}>
            {cards.map(([key, value]) => (
              <Grid key={key} md={4} sm={6} xs={12}>
                <Card><CardContent><Typography color="text.secondary" variant="body2">{t(`dashboard.business.usage.${key}`)}</Typography><Typography variant="h3">{value.toLocaleString()}</Typography></CardContent></Card>
              </Grid>
            ))}
          </Grid>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="h6">{t('dashboard.business.usage.events')}</Typography>
                {usage?.events_by_type.length ? usage.events_by_type.map((event) => (
                  <Stack direction="row" key={event.event_type} sx={{ justifyContent: 'space-between' }}>
                    <Typography>{event.event_type}</Typography>
                    <Typography color="text.secondary">{event.events} · {event.tokens} {t('dashboard.business.usage.tokenCount')}</Typography>
                  </Stack>
                )) : <Typography color="text.secondary" variant="body2">{t('dashboard.business.usage.noEvents')}</Typography>}
              </Stack>
            </CardContent>
          </Card>
        </React.Fragment>
      ) : null}
    </Stack>
  );
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
