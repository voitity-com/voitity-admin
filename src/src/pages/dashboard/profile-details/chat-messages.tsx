'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { paths } from '@/paths';
import type { ProfileChatMessage, ProfileChatMessagesPage } from '@/lib/profiles/api-client';
import { listProfileChatMessages } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import type { ColumnDef } from '@/components/core/data-table';
import { DataTable } from '@/components/core/data-table';
import { RouterLink } from '@/components/core/link';
import { ProfileChatPagination } from '@/components/dashboard/profiles/profile-chat-pagination';

const metadata = { title: `Chat messages | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

const MESSAGE_DATE_FIELDS = [
  'created_at',
  'createdAt',
  'sent_at',
  'sentAt',
  'timestamp',
  'date',
  'updated_at',
  'updatedAt',
] as const;
const MESSAGE_CONTENT_FIELDS = [
  'content',
  'message',
  'text',
  'body',
  'prompt',
  'response',
  'answer',
  'question',
  'api_message',
  'apiMessage',
  'openai_message',
  'openaiMessage',
] as const;
const MESSAGE_ROLE_FIELDS = ['role', 'sender', 'source', 'type', 'author', 'from'] as const;

export function Page(): React.JSX.Element {
  const { chatId = '', profileId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const page = getPage(searchParams);
  const [messagesPage, setMessagesPage] = React.useState<ProfileChatMessagesPage>({
    messages: [],
    page,
  });
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const loadMessages = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      setMessagesPage(await listProfileChatMessages({ chatId, page, profileId }));
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [chatId, page, profileId, t]);

  React.useEffect(() => {
    loadMessages().catch((err) => {
      logger.error(err);
    });
  }, [loadMessages]);

  const handlePageChange = React.useCallback(
    (nextPage: number): void => {
      const nextSearchParams = new URLSearchParams(searchParams);

      if (nextPage > 1) {
        nextSearchParams.set('message_page', String(nextPage));
      } else {
        nextSearchParams.delete('message_page');
      }

      setSearchParams(nextSearchParams);
    },
    [searchParams, setSearchParams]
  );

  const currentPage = messagesPage.page || page;
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = hasNextPageAvailable(messagesPage);
  const messages = React.useMemo(
    () => [...messagesPage.messages].sort(compareMessagesChronologically),
    [messagesPage.messages]
  );
  const totalLabel =
    typeof messagesPage.total === 'number'
      ? t('dashboard.profiles.detail.chats.pagination.messagesTotal', { total: messagesPage.total })
      : null;

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        <div>
          <Link
            color="text.primary"
            component={RouterLink}
            href={paths.dashboard.profileDetails.chats(profileId)}
            sx={{ alignItems: 'center', display: 'inline-flex', gap: 1 }}
            variant="subtitle2"
          >
            <ArrowLeftIcon fontSize="var(--icon-fontSize-md)" />
            {t('dashboard.profiles.detail.chats.messages.backToChats')}
          </Link>
        </div>
        {error ? <Alert color="error">{error}</Alert> : null}
        <Card>
          <CardHeader
            subheader={t('dashboard.profiles.detail.chats.messages.subheader')}
            title={t('dashboard.profiles.detail.chats.messages.title', { chatId })}
          />
          {isLoading ? (
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <React.Fragment>
              <CardContent sx={{ overflowX: 'auto' }}>
                {messages.length ? (
                  <DataTable<ProfileChatMessage>
                    columns={getColumns({ language, t })}
                    rows={messages}
                    sx={{ minWidth: 760 }}
                    uniqueRowId={(message) => getMessageId(message)}
                  />
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    {t('dashboard.profiles.detail.chats.messages.empty')}
                  </Typography>
                )}
              </CardContent>
              <ProfileChatPagination
                currentPage={currentPage}
                disabled={isLoading}
                hasNextPage={hasNextPage}
                hasPreviousPage={hasPreviousPage}
                onPageChange={handlePageChange}
                totalLabel={totalLabel}
              />
            </React.Fragment>
          )}
        </Card>
      </Stack>
    </React.Fragment>
  );
}

function getColumns({
  language,
  t,
}: {
  language: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}): ColumnDef<ProfileChatMessage>[] {
  return [
    {
      formatter: (message): string => formatDateTime(getFirstDisplayValue(message, MESSAGE_DATE_FIELDS), language),
      name: t('dashboard.profiles.detail.chats.messages.fields.date'),
      width: '260px',
    },
    {
      formatter: (message): string => formatRole(message, t),
      name: t('dashboard.profiles.detail.chats.messages.fields.role'),
      width: '160px',
    },
    {
      formatter: (message): React.ReactNode => (
        <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} variant="body2">
          {getMessageContent(message)}
        </Typography>
      ),
      name: t('dashboard.profiles.detail.chats.messages.fields.message'),
    },
  ];
}

function getPage(searchParams: URLSearchParams): number {
  const page = Number(searchParams.get('message_page') ?? '1');

  return Number.isInteger(page) && page > 0 ? page : 1;
}

function hasNextPageAvailable(messagesPage: ProfileChatMessagesPage): boolean {
  if (typeof messagesPage.lastPage === 'number') {
    return messagesPage.page < messagesPage.lastPage;
  }

  if (typeof messagesPage.perPage === 'number') {
    return messagesPage.messages.length >= messagesPage.perPage;
  }

  return messagesPage.messages.length > 0;
}

function compareMessagesChronologically(a: ProfileChatMessage, b: ProfileChatMessage): number {
  return getMessageTimestamp(a) - getMessageTimestamp(b);
}

function getMessageTimestamp(message: ProfileChatMessage): number {
  const rawDate = getFirstDisplayValue(message, MESSAGE_DATE_FIELDS);

  if (!rawDate) {
    return 0;
  }

  const timestamp = new Date(rawDate).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDateTime(value: null | string, language: string): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(language, { dateStyle: 'full', timeStyle: 'short' }).format(date);
}

function formatRole(
  message: ProfileChatMessage,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const role = getFirstDisplayValue(message, MESSAGE_ROLE_FIELDS);

  if (!role) {
    return '-';
  }

  const normalizedRole = role.toLowerCase();

  return t(`dashboard.profiles.detail.chats.messages.roles.${normalizedRole}`, {
    defaultValue: toTitleCase(role),
  });
}

function getMessageContent(message: ProfileChatMessage): string {
  const content = getFirstContentValue(message, MESSAGE_CONTENT_FIELDS);

  return content || '-';
}

function getMessageId(message: ProfileChatMessage): string {
  const id = message.id ?? message.chat_id ?? getFirstDisplayValue(message, MESSAGE_DATE_FIELDS);

  return id === null || id === undefined ? JSON.stringify(message) : String(id);
}

function getFirstDisplayValue(message: ProfileChatMessage, fields: readonly string[]): null | string {
  for (const field of fields) {
    const value = message[field];

    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
  }

  return null;
}

function getFirstContentValue(message: ProfileChatMessage, fields: readonly string[]): null | string {
  for (const field of fields) {
    const value = message[field];

    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if ((Array.isArray(value) || isRecord(value)) && Object.keys(value).length > 0) {
      return JSON.stringify(value, null, 2);
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toTitleCase(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
