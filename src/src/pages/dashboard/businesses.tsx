import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { config } from '@/config';
import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import type { Business, BusinessPayload } from '@/lib/business/api-client';
import { createBusiness, listBusinesses } from '@/lib/business/api-client';
import { toast } from '@/components/core/toaster';
import { BusinessFormDialog } from '@/components/dashboard/business/business-form-dialog';

export function Page(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = React.useState<Business[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setBusinesses(await listBusinesses());
      setError('');
    } catch (reason) {
      logger.error(reason);
      setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => { load().catch(logger.error); }, [load]);
  const create = async (payload: BusinessPayload): Promise<void> => {
    const business = await createBusiness(payload);
    toast.success(t('dashboard.business.toasts.created'));
    setOpen(false);
    navigate(paths.dashboard.businessDetails.general(String(business.id)));
  };

  return (
    <React.Fragment>
      <Helmet><title>{`${t('dashboard.business.title')} | ${config.site.name}`}</title></Helmet>
      <Box sx={{ m: 'var(--Content-margin)', maxWidth: 'var(--Content-maxWidth)', p: 'var(--Content-padding)', width: 'var(--Content-width)' }}>
        <Stack spacing={3}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4">{t('dashboard.business.title')}</Typography>
              <Typography color="text.secondary" variant="body2">{t('dashboard.business.subtitle')}</Typography>
            </Box>
            <Button onClick={() => { setOpen(true); }} startIcon={<PlusIcon />} variant="contained">{t('dashboard.business.actions.add')}</Button>
          </Stack>
          {error ? <Alert color="error">{error}</Alert> : null}
          <Card sx={{ overflowX: 'auto' }}>
            {loading ? <Box sx={{ display: 'grid', minHeight: 240, placeItems: 'center' }}><CircularProgress /></Box> : (
              <Table>
                <TableHead><TableRow><TableCell>{t('dashboard.business.fields.name')}</TableCell><TableCell>{t('dashboard.business.fields.status')}</TableCell><TableCell>{t('dashboard.business.fields.updated')}</TableCell></TableRow></TableHead>
                <TableBody>
                  {businesses.map((business) => (
                    <TableRow hover key={business.id} onClick={() => { navigate(paths.dashboard.businessDetails.general(String(business.id))); }} sx={{ cursor: 'pointer' }}>
                      <TableCell><Typography variant="subtitle2">{business.name}</Typography><Typography color="text.secondary" noWrap variant="caption">{business.description}</Typography></TableCell>
                      <TableCell><Chip color={business.status === 'active' ? 'success' : 'default'} label={t(`dashboard.business.status.${business.status}`)} size="small" /></TableCell>
                      <TableCell>{business.updated_at ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(business.updated_at)) : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {!businesses.length ? <TableRow><TableCell colSpan={3}><Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>{t('dashboard.business.empty')}</Typography></TableCell></TableRow> : null}
                </TableBody>
              </Table>
            )}
          </Card>
        </Stack>
      </Box>
      <BusinessFormDialog onClose={() => { setOpen(false); }} onSubmit={create} open={open} />
    </React.Fragment>
  );
}
