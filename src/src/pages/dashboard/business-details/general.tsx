import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { z as zod } from 'zod';

import { logger } from '@/lib/default-logger';
import { getBusiness, updateBusiness } from '@/lib/business/api-client';
import { toast } from '@/components/core/toaster';

interface Values { description: string; name: string }

export function Page(): React.JSX.Element {
  const { businessId = '' } = useParams();
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const schema = React.useMemo(() => zod.object({ name: zod.string().trim().min(1, t('dashboard.business.validation.nameRequired')).max(150), description: zod.string().max(10000) }), [t]);
  const { control, formState: { errors, isSubmitting }, handleSubmit, reset } = useForm<Values>({ defaultValues: { description: '', name: '' }, resolver: zodResolver(schema) });

  React.useEffect(() => {
    getBusiness(businessId).then((business) => { reset({ description: business.description ?? '', name: business.name }); setLoading(false); }).catch((reason) => { logger.error(reason); setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic')); setLoading(false); });
  }, [businessId, reset, t]);

  if (loading) return <Skeleton height={320} variant="rounded" />;

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4">{t('dashboard.business.nav.general')}</Typography>
        <Typography color="text.secondary" variant="body2">{t('dashboard.business.general.subtitle')}</Typography>
      </Stack>
      <Card>
        <CardContent>
        <form onSubmit={handleSubmit(async (values) => {
          try {
            await updateBusiness(businessId, values);
            window.dispatchEvent(new CustomEvent('business-updated'));
            toast.success(t('dashboard.business.toasts.saved'));
          } catch (reason) { setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic')); }
        })}>
          <Stack spacing={2}>
            {error ? <Alert color="error">{error}</Alert> : null}
            <Controller control={control} name="name" render={({ field }) => <FormControl error={Boolean(errors.name)}><InputLabel>{t('dashboard.business.fields.name')}</InputLabel><OutlinedInput {...field} label={t('dashboard.business.fields.name')} />{errors.name ? <FormHelperText>{errors.name.message}</FormHelperText> : null}</FormControl>} />
            <Controller control={control} name="description" render={({ field }) => <FormControl error={Boolean(errors.description)}><InputLabel>{t('dashboard.business.fields.description')}</InputLabel><OutlinedInput {...field} label={t('dashboard.business.fields.description')} multiline rows={5} />{errors.description ? <FormHelperText>{errors.description.message}</FormHelperText> : null}</FormControl>} />
            <Button disabled={isSubmitting} sx={{ alignSelf: 'flex-start' }} type="submit" variant="contained">{t('dashboard.business.actions.save')}</Button>
          </Stack>
        </form>
        </CardContent>
      </Card>
    </Stack>
  );
}
