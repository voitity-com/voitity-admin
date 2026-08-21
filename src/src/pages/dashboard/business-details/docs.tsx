import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { config } from '@/config';

type EndpointKey = 'message' | 'start' | 'status' | 'widget';

interface EndpointExample {
  key: EndpointKey;
  method: 'GET' | 'POST';
  path: string;
  request: string | null;
  response: string;
  responseStatus: string;
}

const conversationId = '550e8400-e29b-41d4-a716-446655440000';

const endpoints: EndpointExample[] = [
  {
    key: 'widget',
    method: 'GET',
    path: '/api/business/widget',
    request: null,
    responseStatus: '200 OK',
    response: `{
  "message": "Business widget retrieved successfully.",
  "data": {
    "business_name": "Soluciones Digitales QA",
    "locale": "es",
    "title": "¿Cómo podemos ayudarte?",
    "button_label": "Habla con nosotros",
    "welcome_message": "Cuéntanos qué necesitas.",
    "primary_color": "#635BFF",
    "position": "right"
  }
}`,
  },
  {
    key: 'start',
    method: 'POST',
    path: '/api/business/conversations',
    request: `{
  "visitor_id": "visitor-123"
}`,
    responseStatus: '201 Created',
    response: `{
  "message": "Business conversation started successfully.",
  "data": {
    "conversation_id": "${conversationId}",
    "status": "in_progress",
    "session": "encrypted-session-token",
    "messages": [
      {
        "id": 101,
        "role": "assistant",
        "content": "¡Hola! Soy el bot de BIGMELOlabs. ¿Cómo te llamas?",
        "created_at": "2026-08-20T15:30:00.000000Z",
        "required_fields": ["full_name"]
      }
    ]
  }
}`,
  },
  {
    key: 'message',
    method: 'POST',
    path: '/api/business/conversations/{conversation_id}/messages',
    request: `{
  "message": "Necesito automatizar el procesamiento de facturas con IA."
}`,
    responseStatus: '200 OK',
    response: `{
  "message": "Business message processed successfully.",
  "data": {
    "conversation_id": "${conversationId}",
    "status": "in_progress",
    "finished": false,
    "messages": [
      {
        "id": 104,
        "role": "assistant",
        "content": "Entiendo el problema que quieres resolver.",
        "created_at": "2026-08-20T15:32:01.000000Z"
      },
      {
        "id": 105,
        "role": "assistant",
        "content": "Para continuar, indícanos tus datos de contacto.",
        "created_at": "2026-08-20T15:32:01.000000Z",
        "required_fields": ["full_name", "email", "phone", "whatsapp"],
        "optional_fields": ["company", "website"]
      }
    ]
  }
}`,
  },
  {
    key: 'status',
    method: 'GET',
    path: '/api/business/conversations/{conversation_id}/status',
    request: null,
    responseStatus: '200 OK',
    response: `{
  "message": "Business conversation status retrieved successfully.",
  "data": {
    "conversation_id": "${conversationId}",
    "status": "in_progress",
    "finished": false,
    "current_node": "request-contact-data",
    "started_at": "2026-08-20T15:30:00.000000Z",
    "completed_at": null
  }
}`,
  },
];

const conversationTurns = [
  {
    key: 'name',
    request: `{
  "message": "Soy Laura Gómez."
}`,
    response: `{
  "data": {
    "status": "in_progress",
    "finished": false,
    "messages": [
      {
        "role": "assistant",
        "content": "Cuéntanos qué problema quieres resolver o en qué podemos ayudarte.",
        "required_fields": ["project_summary"]
      }
    ]
  }
}`,
  },
  {
    key: 'problem',
    request: `{
  "message": "Procesamos cientos de facturas manualmente y queremos extraer y validar los datos con IA."
}`,
    response: `{
  "data": {
    "status": "in_progress",
    "finished": false,
    "messages": [
      {
        "role": "assistant",
        "content": "Para continuar indícanos email, teléfono y WhatsApp con indicativo. Empresa y sitio web son opcionales.",
        "required_fields": ["email", "phone", "whatsapp"],
        "optional_fields": ["company", "website"]
      }
    ]
  }
}`,
  },
  {
    key: 'missing',
    request: `{
  "message": "Email laura@acme.com, teléfono +57 300 111 2233. Empresa ACME."
}`,
    response: `{
  "data": {
    "status": "in_progress",
    "finished": false,
    "messages": [
      {
        "role": "assistant",
        "content": "Falta el número de WhatsApp con indicativo de país.",
        "required_fields": ["whatsapp"]
      }
    ]
  }
}`,
  },
  {
    key: 'complete',
    request: `{
  "message": "Mi WhatsApp es +57 310 555 6677."
}`,
    response: `{
  "data": {
    "status": "completed",
    "finished": true,
    "messages": [
      {
        "role": "assistant",
        "content": "Muchas gracias. Analizaremos la información y te contactaremos."
      }
    ]
  }
}`,
  },
] as const;

export function Page(): React.JSX.Element {
  const { t } = useTranslation();
  const base = config.api?.baseUrl ?? 'http://localhost:8000';

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">{t('dashboard.business.docs.title')}</Typography>
        <Typography color="text.secondary" variant="body2">{t('dashboard.business.docs.subtitle')}</Typography>
      </Box>
      <Alert severity="info">{t('dashboard.business.docs.security')}</Alert>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">{t('dashboard.business.docs.headers')}</Typography>
            <Code>{`Origin: https://tu-dominio.com
X-Bigmelo-Business-Key: biz_pk_...
Accept: application/json
Content-Type: application/json

# Después de iniciar
X-Bigmelo-Business-Session: <session>

# Solo al enviar mensajes
Idempotency-Key: <uuid>`}</Code>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">{t('dashboard.business.docs.responseGuide')}</Typography>
              <Typography color="text.secondary" variant="body2">{t('dashboard.business.docs.responseGuideHelp')}</Typography>
            </Box>
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'minmax(150px, 0.25fr) minmax(0, 1fr)' } }}>
              {(['conversation_id', 'session', 'status', 'finished', 'messages', 'required_fields', 'optional_fields'] as const).map((field) => (
                <React.Fragment key={field}>
                  <Typography component="code" fontWeight={700}>{field}</Typography>
                  <Typography color="text.secondary" variant="body2">{t(`dashboard.business.docs.fields.${field}`)}</Typography>
                </React.Fragment>
              ))}
            </Box>
            <Alert severity="warning">{t('dashboard.business.docs.multipleMessagesNote')}</Alert>
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={2}>
        <Box>
          <Typography variant="h5">{t('dashboard.business.docs.reference')}</Typography>
          <Typography color="text.secondary" variant="body2">{t('dashboard.business.docs.referenceHelp')}</Typography>
        </Box>
        {endpoints.map((endpoint) => <EndpointCard base={base} endpoint={endpoint} key={endpoint.path} />)}
      </Stack>

      <Card>
        <CardContent>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h5">{t('dashboard.business.docs.conversationExample')}</Typography>
              <Typography color="text.secondary" variant="body2">{t('dashboard.business.docs.conversationExampleHelp')}</Typography>
            </Box>
            <Alert severity="success">{t('dashboard.business.docs.internalSolution')}</Alert>
            {conversationTurns.map((turn, index) => (
              <Box key={turn.key}>
                {index > 0 ? <Divider sx={{ mb: 2.5 }} /> : null}
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Chip color="primary" label={t('dashboard.business.docs.turn', { number: index + 1 })} size="small" />
                    <Typography fontWeight={600} variant="subtitle2">{t(`dashboard.business.docs.turns.${turn.key}`)}</Typography>
                  </Stack>
                  <ExampleColumns request={turn.request} response={turn.response} />
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="h6">{t('dashboard.business.docs.completion')}</Typography>
            <Typography color="text.secondary" variant="body2">{t('dashboard.business.docs.completionHelp')}</Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

function EndpointCard({ base, endpoint }: { base: string; endpoint: EndpointExample }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
            <Chip color={endpoint.method === 'GET' ? 'success' : 'primary'} label={endpoint.method} size="small" />
            <Typography component="code" sx={{ overflowWrap: 'anywhere' }}>{base}{endpoint.path}</Typography>
          </Stack>
          <Typography color="text.secondary" variant="body2">{t(`dashboard.business.docs.endpoint.${endpoint.key}`)}</Typography>
          <Divider />
          <ExampleColumns request={endpoint.request} response={endpoint.response} responseStatus={endpoint.responseStatus} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function ExampleColumns({ request, response, responseStatus }: { request: string | null; response: string; responseStatus?: string }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', xl: 'repeat(2, minmax(0, 1fr))' } }}>
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Typography fontWeight={600} variant="subtitle2">{t('dashboard.business.docs.request')}</Typography>
        {request ? <Code>{request}</Code> : <Code>{String(t('dashboard.business.docs.noBody'))}</Code>}
      </Stack>
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography fontWeight={600} variant="subtitle2">{t('dashboard.business.docs.response')}</Typography>
          {responseStatus ? <Chip label={responseStatus} size="small" variant="outlined" /> : null}
        </Stack>
        <Code>{response}</Code>
      </Stack>
    </Box>
  );
}

function Code({ children }: { children: string }): React.JSX.Element {
  return <Box component="pre" sx={{ bgcolor: '#111827', borderRadius: 1, color: '#F9FAFB', fontFamily: 'monospace', fontSize: '0.8125rem', lineHeight: 1.55, m: 0, maxWidth: '100%', minWidth: 0, overflowWrap: 'anywhere', overflowX: 'auto', p: 2, whiteSpace: 'pre-wrap' }}>{children}</Box>;
}
