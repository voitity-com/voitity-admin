'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { ProfileChat, ProfileChatsPage } from '@/lib/profiles/api-client';
import { listProfileChats } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import type { ColumnDef } from '@/components/core/data-table';
import { DataTable } from '@/components/core/data-table';

const metadata = { title: `Chats | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const page = getPage(searchParams);
  const [chatsPage, setChatsPage] = React.useState<ProfileChatsPage>({
    chats: [],
    page,
  });
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const loadChats = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      setChatsPage(await listProfileChats({ page, profileId }));
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [page, profileId, t]);

  React.useEffect(() => {
    loadChats().catch((err) => {
      logger.error(err);
    });
  }, [loadChats]);

  const handlePageChange = React.useCallback(
    (nextPage: number): void => {
      const nextSearchParams = new URLSearchParams(searchParams);

      if (nextPage > 1) {
        nextSearchParams.set('chat_page', String(nextPage));
      } else {
        nextSearchParams.delete('chat_page');
      }

      setSearchParams(nextSearchParams);
    },
    [searchParams, setSearchParams]
  );

  const currentPage = chatsPage.page || page;
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = hasNextPageAvailable(chatsPage);

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}
        <Card>
          <CardHeader
            subheader={t('dashboard.profiles.detail.chats.subheader')}
            title={t('dashboard.profiles.detail.chats.title')}
          />
          {isLoading ? (
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <React.Fragment>
              <CardContent>
                {chatsPage.chats.length ? (
                  <DataTable<ProfileChat>
                    columns={getColumns({ language, t })}
                    rows={chatsPage.chats}
                  />
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    {t('dashboard.profiles.detail.chats.empty')}
                  </Typography>
                )}
              </CardContent>
              <CardActions
                sx={{
                  alignItems: 'center',
                  borderTop: '1px solid var(--mui-palette-divider)',
                  justifyContent: 'space-between',
                  px: 3,
                }}
              >
                <Typography color="text.secondary" variant="body2">
                  {t('dashboard.profiles.detail.chats.pagination.page', { page: currentPage })}
                  {typeof chatsPage.total === 'number'
                    ? ` · ${t('dashboard.profiles.detail.chats.pagination.total', { total: chatsPage.total })}`
                    : null}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    color="secondary"
                    disabled={!hasPreviousPage || isLoading}
                    onClick={() => {
                      handlePageChange(currentPage - 1);
                    }}
                    variant="outlined"
                  >
                    {t('dashboard.profiles.detail.chats.pagination.previous')}
                  </Button>
                  <Button
                    color="secondary"
                    disabled={!hasNextPage || isLoading}
                    onClick={() => {
                      handlePageChange(currentPage + 1);
                    }}
                    variant="outlined"
                  >
                    {t('dashboard.profiles.detail.chats.pagination.next')}
                  </Button>
                </Stack>
              </CardActions>
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
}): ColumnDef<ProfileChat>[] {
  return [
    {
      formatter: (chat): string => String(chat.id ?? chat.chat_id ?? '-'),
      name: t('dashboard.profiles.detail.chats.fields.id'),
      width: '160px',
    },
    {
      formatter: (chat): string => formatDate(chat.created_at, language),
      name: t('dashboard.profiles.detail.chats.fields.createdAt'),
      width: '260px',
    },
    {
      formatter: (chat): string => formatNumber(chat.api_messages_count),
      name: t('dashboard.profiles.detail.chats.fields.api'),
      width: '100px',
    },
    {
      formatter: (chat): string => formatNumber(chat.openai_messages_count),
      name: t('dashboard.profiles.detail.chats.fields.ai'),
      width: '100px',
    },
    {
      formatter: (chat): string => formatDate(chat.last_message_at, language),
      name: t('dashboard.profiles.detail.chats.fields.lastMessage'),
      width: '260px',
    },
  ];
}

function getPage(searchParams: URLSearchParams): number {
  const page = Number(searchParams.get('chat_page') ?? '1');

  return Number.isInteger(page) && page > 0 ? page : 1;
}

function hasNextPageAvailable(chatsPage: ProfileChatsPage): boolean {
  if (typeof chatsPage.lastPage === 'number') {
    return chatsPage.page < chatsPage.lastPage;
  }

  if (typeof chatsPage.perPage === 'number') {
    return chatsPage.chats.length >= chatsPage.perPage;
  }

  return chatsPage.chats.length > 0;
}

function formatDate(value: null | string | undefined, language: string): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat(language, { dateStyle: 'full' }).format(new Date(value));
}

function formatNumber(value: null | number | undefined): string {
  return typeof value === 'number' ? String(value) : '-';
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
