'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { ChatCircle as ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { EnvelopeSimple as EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { Key as KeyIcon } from '@phosphor-icons/react/dist/ssr/Key';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { z as zod } from 'zod';

import { config } from '@/config';
import { logger } from '@/lib/default-logger';
import type { BusinessApiClient, BusinessSettings } from '@/lib/business/api-client';
import { createBusinessApiClient, getBusinessConfiguration, revokeBusinessApiClient, updateBusinessConfiguration } from '@/lib/business/api-client';
import { toast } from '@/components/core/toaster';

interface SettingsValues {
  lead_recipient_email: string;
  reply_to_email: string;
  sender_email: string;
  sender_name: string;
  widget_button_label: string;
  widget_enabled: boolean;
  widget_position: 'bottom-left' | 'bottom-right';
  widget_primary_color: string;
  widget_title: string;
  widget_welcome_message: string;
}
interface ClientValues { name: string; origins: string }
type ConfigurationTab = 'api' | 'email' | 'widget';

const defaults: SettingsValues = { lead_recipient_email: '', reply_to_email: '', sender_email: '', sender_name: '', widget_button_label: 'Hablar con nosotros', widget_enabled: false, widget_position: 'bottom-right', widget_primary_color: '#6366F1', widget_title: '¿Cómo podemos ayudarte?', widget_welcome_message: '' };

export function Page(): React.JSX.Element {
  const { businessId = '' } = useParams();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const selectedTab: ConfigurationTab = tabParam === 'widget' || tabParam === 'api' ? tabParam : 'email';
  const [clients, setClients] = React.useState<BusinessApiClient[]>([]);
  const [clientOpen, setClientOpen] = React.useState(false);
  const [plainKey, setPlainKey] = React.useState('');
  const [error, setError] = React.useState('');
  const settingsSchema = React.useMemo(() => zod.object({
    lead_recipient_email: zod.string().email(t('dashboard.business.validation.email')).or(zod.literal('')),
    sender_email: zod.string().email(t('dashboard.business.validation.email')).or(zod.literal('')),
    sender_name: zod.string().max(255),
    reply_to_email: zod.string().email(t('dashboard.business.validation.email')).or(zod.literal('')),
    widget_enabled: zod.boolean(), widget_title: zod.string().min(1), widget_button_label: zod.string().min(1), widget_welcome_message: zod.string(),
    widget_primary_color: zod.string().regex(/^#[0-9A-Fa-f]{6}$/), widget_position: zod.enum(['bottom-left', 'bottom-right']),
  }), [t]);
  const clientSchema = React.useMemo(() => zod.object({ name: zod.string().trim().min(1), origins: zod.string().trim().min(1, t('dashboard.business.validation.originRequired')) }), [t]);
  const settingsForm = useForm<SettingsValues>({ defaultValues: defaults, resolver: zodResolver(settingsSchema) });
  const clientForm = useForm<ClientValues>({ defaultValues: { name: '', origins: 'http://localhost:3001' }, resolver: zodResolver(clientSchema) });
  const resetSettings = settingsForm.reset;

  const load = React.useCallback(async (): Promise<void> => {
    try {
      const result = await getBusinessConfiguration(businessId);
      setClients(result.api_clients);
      resetSettings({ ...defaults, ...Object.fromEntries(Object.entries(result.settings).map(([key, value]) => [key, value ?? ''])) } as SettingsValues);
      setError('');
    } catch (reason) {
      logger.error(reason);
      setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
    }
  }, [businessId, resetSettings, t]);
  React.useEffect(() => { load().catch(logger.error); }, [load]);

  const saveSettings = settingsForm.handleSubmit(async (values) => {
    try {
      await updateBusinessConfiguration(businessId, values as BusinessSettings);
      setError('');
      toast.success(t('dashboard.business.toasts.saved'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('dashboard.business.errors.generic'));
    }
  });
  const snippet = plainKey ? `<script src="${config.publicProfile?.baseUrl ?? 'http://localhost:3001'}/widget/business-v1.js" data-bigmelo-business="${plainKey}" data-bigmelo-api="${config.api?.baseUrl ?? 'http://localhost:8000'}"></script>` : '';

  return (
    <React.Fragment>
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <Typography variant="h4">{t('dashboard.business.nav.configuration')}</Typography>
          <Typography color="text.secondary" variant="body2">{t('dashboard.business.configuration.description')}</Typography>
        </Stack>
        <Tabs
          aria-label={t('dashboard.business.configuration.tabs.label')}
          onChange={(_, value: ConfigurationTab) => {
            const next = new URLSearchParams(searchParams);
            if (value === 'email') next.delete('tab'); else next.set('tab', value);
            setSearchParams(next, { replace: true });
          }}
          sx={{ minHeight: 44 }}
          value={selectedTab}
          variant="scrollable"
        >
          <Tab label={t('dashboard.business.configuration.tabs.email')} value="email" />
          <Tab label={t('dashboard.business.configuration.tabs.widget')} value="widget" />
          <Tab label={t('dashboard.business.configuration.tabs.api')} value="api" />
        </Tabs>
        {error ? <Alert color="error">{error}</Alert> : null}

        {selectedTab === 'email' ? (
          <Card><CardHeader avatar={<EnvelopeSimpleIcon fontSize="var(--icon-fontSize-lg)" />} subheader={t('dashboard.business.configuration.emailSubtitle')} title={t('dashboard.business.configuration.emailTitle')} /><CardContent><form onSubmit={saveSettings}><Stack spacing={2}>
            <Controller control={settingsForm.control} name="lead_recipient_email" render={({ field }) => <FormControl error={Boolean(settingsForm.formState.errors.lead_recipient_email)}><InputLabel>{t('dashboard.business.configuration.recipientEmail')}</InputLabel><OutlinedInput {...field} label={t('dashboard.business.configuration.recipientEmail')} /><FormHelperText>{settingsForm.formState.errors.lead_recipient_email?.message}</FormHelperText></FormControl>} />
            <Controller control={settingsForm.control} name="sender_email" render={({ field }) => <FormControl error={Boolean(settingsForm.formState.errors.sender_email)}><InputLabel>{t('dashboard.business.configuration.senderEmail')}</InputLabel><OutlinedInput {...field} label={t('dashboard.business.configuration.senderEmail')} /><FormHelperText>{settingsForm.formState.errors.sender_email?.message}</FormHelperText></FormControl>} />
            <Controller control={settingsForm.control} name="sender_name" render={({ field }) => <FormControl><InputLabel>{t('dashboard.business.configuration.senderName')}</InputLabel><OutlinedInput {...field} label={t('dashboard.business.configuration.senderName')} /></FormControl>} />
            <Controller control={settingsForm.control} name="reply_to_email" render={({ field }) => <FormControl error={Boolean(settingsForm.formState.errors.reply_to_email)}><InputLabel>{t('dashboard.business.configuration.replyTo')}</InputLabel><OutlinedInput {...field} label={t('dashboard.business.configuration.replyTo')} /><FormHelperText>{settingsForm.formState.errors.reply_to_email?.message}</FormHelperText></FormControl>} />
            <Button disabled={settingsForm.formState.isSubmitting} sx={{ alignSelf: 'flex-start' }} type="submit" variant="contained">{t('dashboard.business.actions.save')}</Button>
          </Stack></form></CardContent></Card>
        ) : null}

        {selectedTab === 'widget' ? (
          <Card><CardHeader avatar={<ChatCircleIcon fontSize="var(--icon-fontSize-lg)" />} subheader={t('dashboard.business.configuration.widgetSubtitle')} title={t('dashboard.business.configuration.widgetTitle')} /><CardContent><form onSubmit={saveSettings}><Stack spacing={2}>
            <Controller control={settingsForm.control} name="widget_enabled" render={({ field }) => <FormControlLabel control={<Switch checked={field.value} onChange={(_, checked) => { field.onChange(checked); }} />} label={t('dashboard.business.configuration.widgetEnabled')} />} />
            <Controller control={settingsForm.control} name="widget_title" render={({ field }) => <FormControl><InputLabel>{t('dashboard.business.configuration.title')}</InputLabel><OutlinedInput {...field} label={t('dashboard.business.configuration.title')} /></FormControl>} />
            <Controller control={settingsForm.control} name="widget_button_label" render={({ field }) => <FormControl><InputLabel>{t('dashboard.business.configuration.buttonLabel')}</InputLabel><OutlinedInput {...field} label={t('dashboard.business.configuration.buttonLabel')} /></FormControl>} />
            <Controller control={settingsForm.control} name="widget_welcome_message" render={({ field }) => <FormControl><InputLabel>{t('dashboard.business.configuration.welcome')}</InputLabel><OutlinedInput {...field} label={t('dashboard.business.configuration.welcome')} multiline rows={3} /></FormControl>} />
            <Stack direction={{ sm: 'row', xs: 'column' }} spacing={2}><Controller control={settingsForm.control} name="widget_primary_color" render={({ field }) => <FormControl fullWidth><InputLabel>{t('dashboard.business.configuration.color')}</InputLabel><OutlinedInput {...field} label={t('dashboard.business.configuration.color')} startAdornment={<Box sx={{ bgcolor: field.value, borderRadius: 1, height: 24, mr: 1, width: 24 }} />} /></FormControl>} /><Controller control={settingsForm.control} name="widget_position" render={({ field }) => <FormControl fullWidth><InputLabel>{t('dashboard.business.configuration.position')}</InputLabel><Select {...field} label={t('dashboard.business.configuration.position')}><MenuItem value="bottom-right">{t('dashboard.business.configuration.bottomRight')}</MenuItem><MenuItem value="bottom-left">{t('dashboard.business.configuration.bottomLeft')}</MenuItem></Select></FormControl>} /></Stack>
            <Button disabled={settingsForm.formState.isSubmitting} sx={{ alignSelf: 'flex-start' }} type="submit" variant="contained">{t('dashboard.business.actions.save')}</Button>
          </Stack></form></CardContent></Card>
        ) : null}

        {selectedTab === 'api' ? (
          <Card><CardHeader action={<Button onClick={() => { setClientOpen(true); }} variant="contained">{t('dashboard.business.configuration.createKey')}</Button>} avatar={<KeyIcon fontSize="var(--icon-fontSize-lg)" />} subheader={t('dashboard.business.configuration.securitySubtitle')} title={t('dashboard.business.configuration.securityTitle')} /><CardContent><Stack spacing={2}>
            {plainKey ? <Alert severity="warning"><Typography fontWeight={600}>{t('dashboard.business.configuration.keyOnce')}</Typography><Box component="code" sx={{ display: 'block', mt: 1, overflowWrap: 'anywhere' }}>{plainKey}</Box>{snippet ? <React.Fragment><Typography sx={{ mt: 2 }} variant="subtitle2">{t('dashboard.business.configuration.embedCode')}</Typography><Box component="pre" sx={{ bgcolor: 'background.level1', borderRadius: 1, overflowX: 'auto', p: 1.5, whiteSpace: 'pre-wrap' }}>{snippet}</Box><Button onClick={() => { navigator.clipboard.writeText(snippet).then(() => { toast.success(t('dashboard.business.toasts.copied')); }).catch(logger.error); }} size="small">{t('dashboard.business.actions.copy')}</Button></React.Fragment> : null}</Alert> : null}
            {clients.map((client) => <Stack direction={{ sm: 'row', xs: 'column' }} key={client.id} spacing={2} sx={{ alignItems: { sm: 'center' }, borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}><Box sx={{ flex: 1 }}><Typography variant="subtitle2">{client.name} · {client.key_prefix}…</Typography><Typography color="text.secondary" variant="caption">{client.origins.map((origin) => origin.origin).join(', ')}</Typography></Box><Chip color={client.enabled ? 'success' : 'default'} label={client.enabled ? t('dashboard.business.configuration.activeKey') : t('dashboard.business.configuration.revokedKey')} size="small" variant="outlined" />{client.enabled ? <Button color="error" onClick={async () => { await revokeBusinessApiClient(businessId, client.id); await load(); }}>{t('dashboard.business.actions.revoke')}</Button> : null}</Stack>)}
          </Stack></CardContent></Card>
        ) : null}
      </Stack>

      <Dialog fullWidth maxWidth="sm" onClose={() => { setClientOpen(false); }} open={clientOpen}><form onSubmit={clientForm.handleSubmit(async (values) => { try { const result = await createBusinessApiClient(businessId, { name: values.name, origins: values.origins.split(/\n|,/).map((value) => value.trim()).filter(Boolean) }); setPlainKey(result.key); setClientOpen(false); clientForm.reset(); await load(); } catch (reason) { clientForm.setError('origins', { message: reason instanceof Error ? reason.message : t('dashboard.business.errors.generic') }); } })}><DialogTitle>{t('dashboard.business.configuration.createKey')}</DialogTitle><DialogContent dividers><Stack spacing={2}><Controller control={clientForm.control} name="name" render={({ field }) => <FormControl><InputLabel>{t('dashboard.business.configuration.keyName')}</InputLabel><OutlinedInput {...field} label={t('dashboard.business.configuration.keyName')} /></FormControl>} /><Controller control={clientForm.control} name="origins" render={({ field }) => <FormControl error={Boolean(clientForm.formState.errors.origins)}><InputLabel>{t('dashboard.business.configuration.origins')}</InputLabel><OutlinedInput {...field} label={t('dashboard.business.configuration.origins')} multiline rows={4} /><FormHelperText>{clientForm.formState.errors.origins?.message ?? t('dashboard.business.configuration.originsHelp')}</FormHelperText></FormControl>} /></Stack></DialogContent><DialogActions><Button onClick={() => { setClientOpen(false); }}>{t('dashboard.business.actions.cancel')}</Button><Button disabled={clientForm.formState.isSubmitting} type="submit" variant="contained">{t('dashboard.business.actions.create')}</Button></DialogActions></form></Dialog>
    </React.Fragment>
  );
}
