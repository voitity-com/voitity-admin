'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { FloppyDisk as FloppyDiskIcon } from '@phosphor-icons/react/dist/ssr/FloppyDisk';
import { Stop as StopIcon } from '@phosphor-icons/react/dist/ssr/Stop';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useTranslation } from 'react-i18next';

import type { ProfileConversationMessageType } from '@/lib/profiles/api-client';

export type ConversationMessageAudioRecordingPhase = 'countdown' | 'preparing' | 'preview' | 'recording';

export interface ConversationMessageAudioRecordingDraft {
  blob: Blob | null;
  countdown: number;
  phase: ConversationMessageAudioRecordingPhase;
  seconds: number;
  type: ProfileConversationMessageType;
  url: string;
}

interface ConversationMessageAudioRecorderProps {
  draft: ConversationMessageAudioRecordingDraft;
  onDiscard: () => void;
  onSave: () => void;
  onStop: () => void;
  uploading: boolean;
}

export function ConversationMessageAudioRecorder({
  draft,
  onDiscard,
  onSave,
  onStop,
  uploading,
}: ConversationMessageAudioRecorderProps): React.JSX.Element {
  const { t } = useTranslation();

  if (draft.phase === 'preparing') {
    return (
      <Box
        aria-live="polite"
        sx={{
          alignItems: 'center',
          border: '1px solid var(--mui-palette-divider)',
          borderRadius: 1,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          justifyContent: 'space-between',
          minHeight: 112,
          p: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={30} />
          <Box>
            <Typography fontWeight={700} variant="subtitle2">
              {t('dashboard.profiles.detail.messages.recording.preparingTitle')}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {t('dashboard.profiles.detail.messages.recording.preparingDescription')}
            </Typography>
          </Box>
        </Stack>
        <Button onClick={onDiscard} startIcon={<XIcon />} variant="outlined">
          {t('dashboard.profiles.detail.messages.actions.cancelRecording')}
        </Button>
      </Box>
    );
  }

  if (draft.phase === 'countdown') {
    return (
      <Box
        aria-live="assertive"
        sx={{
          '@keyframes messageRecordingCountdown': {
            '0%': { opacity: 0, transform: 'scale(0.72)' },
            '45%': { opacity: 1, transform: 'scale(1.08)' },
            '100%': { opacity: 1, transform: 'scale(1)' },
          },
          alignItems: 'center',
          border: '1px solid var(--mui-palette-divider)',
          borderRadius: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: 220,
          p: 3,
          textAlign: 'center',
        }}
      >
        <Box
          key={draft.countdown}
          sx={{
            alignItems: 'center',
            animation: 'messageRecordingCountdown 760ms cubic-bezier(0.16, 1, 0.3, 1)',
            bgcolor: 'var(--mui-palette-primary-main)',
            borderRadius: '50%',
            boxShadow: '0 16px 38px rgba(99, 102, 241, 0.24)',
            color: 'var(--mui-palette-primary-contrastText)',
            display: 'flex',
            fontSize: { xs: 54, sm: 66 },
            fontWeight: 800,
            height: { xs: 112, sm: 128 },
            justifyContent: 'center',
            lineHeight: 1,
            width: { xs: 112, sm: 128 },
          }}
        >
          {draft.countdown}
        </Box>
        <Typography color="text.secondary" sx={{ mt: 2 }} variant="body2">
          {t('dashboard.profiles.detail.messages.recording.countdownDescription')}
        </Typography>
        <Button onClick={onDiscard} size="small" sx={{ mt: 1.5 }} startIcon={<XIcon />}>
          {t('dashboard.profiles.detail.messages.actions.cancelRecording')}
        </Button>
      </Box>
    );
  }

  if (draft.phase === 'recording') {
    return (
      <Box
        aria-live="polite"
        sx={{
          '@keyframes messageRecordingPulse': {
            '0%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0.45)' },
            '70%': { boxShadow: '0 0 0 12px rgba(244, 67, 54, 0)' },
            '100%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0)' },
          },
          alignItems: 'center',
          bgcolor: 'rgba(244, 67, 54, 0.08)',
          border: '1px solid rgba(244, 67, 54, 0.24)',
          borderRadius: 1,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          justifyContent: 'space-between',
          minHeight: 120,
          p: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              animation: 'messageRecordingPulse 1.3s infinite',
              bgcolor: 'var(--mui-palette-error-main)',
              borderRadius: '50%',
              height: 14,
              width: 14,
            }}
          />
          <Box>
            <Typography color="error.main" fontWeight={700} variant="subtitle2">
              {t('dashboard.profiles.detail.messages.recording.liveTitle')}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {formatRecordingDuration(draft.seconds)}
            </Typography>
          </Box>
        </Stack>
        <Button
          color="error"
          onClick={onStop}
          startIcon={<StopIcon />}
          sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
          variant="contained"
        >
          {t('dashboard.profiles.detail.messages.actions.stopRecording')}
        </Button>
      </Box>
    );
  }

  return (
    <Box
      aria-live="polite"
      sx={{
        border: '1px solid var(--mui-palette-divider)',
        borderRadius: 1,
        p: { xs: 2, sm: 2.5 },
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography fontWeight={700} variant="subtitle2">
            {t('dashboard.profiles.detail.messages.recording.previewTitle')}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {t('dashboard.profiles.detail.messages.recording.previewDescription')}
          </Typography>
        </Box>
        <Box
          component="audio"
          controls
          key={draft.url}
          preload="metadata"
          src={draft.url}
          sx={{ display: 'block', maxWidth: '520px', width: '100%' }}
        />
        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button disabled={uploading} onClick={onDiscard} startIcon={<XIcon />} variant="outlined">
            {t('dashboard.profiles.detail.messages.actions.discardRecording')}
          </Button>
          <Button
            disabled={uploading}
            onClick={onSave}
            startIcon={uploading ? <CircularProgress size={18} /> : <FloppyDiskIcon />}
            variant="contained"
          >
            {uploading
              ? t('dashboard.profiles.detail.messages.actions.savingRecording')
              : t('dashboard.profiles.detail.messages.actions.saveRecording')}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

function formatRecordingDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}
