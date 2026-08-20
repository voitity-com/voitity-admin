import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { config } from '@/config';

const endpoints = [
  { method: 'GET', path: '/api/business/widget', body: null },
  { method: 'POST', path: '/api/business/conversations', body: '{\n  "visitor_id": "visitor-123"\n}' },
  { method: 'POST', path: '/api/business/conversations/{conversation_id}/messages', body: '{\n  "message": "Necesito automatizar un proceso"\n}' },
  { method: 'GET', path: '/api/business/conversations/{conversation_id}/status', body: null },
] as const;

export function Page(): React.JSX.Element {
  const { t } = useTranslation();
  const base = config.api?.baseUrl ?? 'http://localhost:8000';

  return <Stack spacing={3}><Box><Typography variant="h4">{t('dashboard.business.docs.title')}</Typography><Typography color="text.secondary" variant="body2">{t('dashboard.business.docs.subtitle')}</Typography></Box><Alert severity="info">{t('dashboard.business.docs.security')}</Alert><Card><CardContent><Stack spacing={2}><Typography variant="h6">{t('dashboard.business.docs.headers')}</Typography><Code>{`Origin: https://tu-dominio.com\nX-Bigmelo-Business-Key: biz_pk_...\nContent-Type: application/json\n\n# Después de iniciar\nX-Bigmelo-Business-Session: <session>\nIdempotency-Key: <uuid>`}</Code></Stack></CardContent></Card>{endpoints.map((endpoint) => <Card key={endpoint.path}><CardContent><Stack spacing={1.5}><Stack direction="row" spacing={1}><Typography color={endpoint.method === 'GET' ? 'success.main' : 'primary.main'} fontWeight={700}>{endpoint.method}</Typography><Typography component="code">{base}{endpoint.path}</Typography></Stack>{endpoint.body ? <Code>{endpoint.body}</Code> : null}<Typography color="text.secondary" variant="body2">{t(`dashboard.business.docs.endpoint.${endpoint.path.includes('widget') ? 'widget' : endpoint.path.endsWith('conversations') ? 'start' : endpoint.path.endsWith('messages') ? 'message' : 'status'}`)}</Typography></Stack></CardContent></Card>)}<Card><CardContent><Stack spacing={1}><Typography variant="h6">{t('dashboard.business.docs.completion')}</Typography><Code>{`{\n  "data": {\n    "conversation_id": "...",\n    "status": "completed",\n    "finished": true,\n    "messages": []\n  }\n}`}</Code><Typography color="text.secondary" variant="body2">{t('dashboard.business.docs.completionHelp')}</Typography></Stack></CardContent></Card></Stack>;
}

function Code({ children }: { children: string }): React.JSX.Element {
  return <Box component="pre" sx={{ bgcolor: '#111827', borderRadius: 1, color: '#F9FAFB', fontFamily: 'monospace', m: 0, overflowX: 'auto', p: 2, whiteSpace: 'pre-wrap' }}>{children}</Box>;
}
