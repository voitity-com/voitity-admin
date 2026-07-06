'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Microphone as MicrophoneIcon } from '@phosphor-icons/react/dist/ssr/Microphone';
import { Stop as StopIcon } from '@phosphor-icons/react/dist/ssr/Stop';
import { UploadSimple as UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { useTranslation } from 'react-i18next';

import type { ProfileAudioTranscriptionField } from '@/lib/profiles/api-client';
import { transcribeProfileAudio } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';

type ApplyMode = 'append' | 'replace';

export interface ProfileAudioTranscriptionDialogProps {
  currentValue: string;
  field: ProfileAudioTranscriptionField;
  fieldLabel: string;
  maxLength: number;
  minLength: number;
  onApply: (value: string) => void;
  onClose: () => void;
  open: boolean;
  profileId: number | string;
}

const languageCode = 'es';

export function ProfileAudioTranscriptionDialog({
  currentValue,
  field,
  fieldLabel,
  maxLength,
  minLength,
  onApply,
  onClose,
  open,
  profileId,
}: ProfileAudioTranscriptionDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string>('');
  const [applyMode, setApplyMode] = React.useState<ApplyMode>('replace');
  const [error, setError] = React.useState<string>('');
  const [isRecording, setIsRecording] = React.useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = React.useState<boolean>(false);
  const audioUrlRef = React.useRef<string>('');
  const chunksRef = React.useRef<Blob[]>([]);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const resetRecording = React.useCallback((): void => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }

    audioUrlRef.current = '';
    setAudioBlob(null);
    setAudioUrl('');
    chunksRef.current = [];
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setApplyMode(currentValue.trim() ? 'append' : 'replace');
    setError('');
    resetRecording();
  }, [currentValue, open, resetRecording]);

  React.useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      stopTracks(streamRef.current);
    };
  }, []);

  const handleStartRecording = React.useCallback(async (): Promise<void> => {
    setError('');

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(t('dashboard.profiles.detail.profile.audio.errors.recordingUnsupported'));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getPreferredAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      resetRecording();
      chunksRef.current = [];
      recorderRef.current = recorder;
      streamRef.current = stream;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
        const nextAudioUrl = URL.createObjectURL(blob);

        setAudioBlob(blob);
        audioUrlRef.current = nextAudioUrl;
        setAudioUrl(nextAudioUrl);
        stopTracks(stream);
        streamRef.current = null;
        recorderRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      logger.error(err);
      setError(t('dashboard.profiles.detail.profile.audio.errors.microphoneAccess'));
    }
  }, [resetRecording, t]);

  const handleStopRecording = React.useCallback((): void => {
    recorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const handleClose = React.useCallback((): void => {
    if (isRecording || isTranscribing) {
      return;
    }

    resetRecording();
    onClose();
  }, [isRecording, isTranscribing, onClose, resetRecording]);

  const handleTranscribe = React.useCallback(async (): Promise<void> => {
    if (!audioBlob) {
      setError(t('dashboard.profiles.detail.profile.audio.errors.recordFirst'));
      return;
    }

    setIsTranscribing(true);
    setError('');

    try {
      const file = new File([audioBlob], getRecordingFileName(audioBlob), {
        type: audioBlob.type || 'audio/webm',
      });
      const transcription = await transcribeProfileAudio(profileId, {
        field,
        file,
        language: languageCode,
      });
      const transcribedText = transcription.text.trim();

      if (!transcribedText) {
        throw new Error(t('dashboard.profiles.detail.profile.audio.errors.emptyTranscription'));
      }

      onApply(applyTranscription(currentValue, transcribedText, applyMode));
      toast.success(t('dashboard.profiles.detail.profile.audio.toasts.applied'));
      resetRecording();
      onClose();
    } catch (err) {
      const message = getErrorMessage(err, t('dashboard.profiles.detail.errors.generic'));
      setError(message);
      toast.error(message);
    } finally {
      setIsTranscribing(false);
    }
  }, [applyMode, audioBlob, currentValue, field, onApply, onClose, profileId, resetRecording, t]);

  return (
    <Dialog fullWidth maxWidth="sm" onClose={handleClose} open={open}>
      <DialogTitle>{t('dashboard.profiles.detail.profile.audio.title', { field: fieldLabel })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5}>
          {error ? <Alert color="error">{error}</Alert> : null}
          <Box
            sx={{
              alignItems: 'center',
              bgcolor: 'var(--mui-palette-background-level1)',
              border: '1px solid var(--mui-palette-divider)',
              borderRadius: 1,
              display: 'flex',
              gap: 2,
              p: 2,
            }}
          >
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: isRecording ? 'var(--mui-palette-error-main)' : 'var(--mui-palette-primary-main)',
                borderRadius: '50%',
                color: 'var(--mui-palette-primary-contrastText)',
                display: 'flex',
                flex: '0 0 auto',
                height: 56,
                justifyContent: 'center',
                width: 56,
              }}
            >
              {isRecording ? <StopIcon fontSize="var(--icon-fontSize-lg)" /> : <MicrophoneIcon fontSize="var(--icon-fontSize-lg)" />}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1">
                {isRecording
                  ? t('dashboard.profiles.detail.profile.audio.recording')
                  : t('dashboard.profiles.detail.profile.audio.ready')}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {t('dashboard.profiles.detail.profile.audio.limitHint', { max: maxLength, min: minLength })}
              </Typography>
            </Box>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              disabled={isRecording || isTranscribing}
              onClick={handleStartRecording}
              startIcon={<MicrophoneIcon />}
              variant="outlined"
            >
              {audioBlob ? t('dashboard.profiles.detail.profile.audio.recordAgain') : t('dashboard.profiles.actions.startRecording')}
            </Button>
            <Button
              color="secondary"
              disabled={!isRecording}
              onClick={handleStopRecording}
              startIcon={<StopIcon />}
              variant="outlined"
            >
              {t('dashboard.profiles.actions.stop')}
            </Button>
          </Stack>

          {audioUrl ? (
            <Box>
              <Typography sx={{ mb: 1 }} variant="subtitle2">
                {t('dashboard.profiles.detail.profile.audio.preview')}
              </Typography>
              <Box component="audio" controls src={audioUrl} sx={{ display: 'block', width: '100%' }} />
            </Box>
          ) : null}

          <FormControl>
            <FormLabel>{t('dashboard.profiles.detail.profile.audio.applyMode')}</FormLabel>
            <RadioGroup
              onChange={(event) => {
                setApplyMode(event.target.value as ApplyMode);
              }}
              row
              value={applyMode}
            >
              <FormControlLabel
                control={<Radio />}
                label={t('dashboard.profiles.detail.profile.audio.replace')}
                value="replace"
              />
              <FormControlLabel control={<Radio />} label={t('dashboard.profiles.detail.profile.audio.append')} value="append" />
            </RadioGroup>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button color="secondary" disabled={isRecording || isTranscribing} onClick={handleClose}>
          {t('dashboard.profiles.actions.cancel')}
        </Button>
        <Button
          disabled={isRecording || isTranscribing || !audioBlob}
          onClick={handleTranscribe}
          startIcon={isTranscribing ? <CircularProgress color="inherit" size={18} /> : <UploadSimpleIcon />}
          variant="contained"
        >
          {t('dashboard.profiles.detail.profile.audio.transcribeAndApply')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function applyTranscription(currentValue: string, transcribedText: string, mode: ApplyMode): string {
  if (mode === 'replace' || !currentValue.trim()) {
    return transcribedText;
  }

  return `${currentValue.trimEnd()}\n\n${transcribedText}`;
}

function getPreferredAudioMimeType(): string {
  const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

  return supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

function getRecordingFileName(blob: Blob): string {
  const mimeType = blob.type.split(';')[0] || 'audio/webm';

  if (mimeType.includes('mp4')) {
    return 'profile-transcription.m4a';
  }

  if (mimeType.includes('ogg')) {
    return 'profile-transcription.ogg';
  }

  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
    return 'profile-transcription.mp3';
  }

  return 'profile-transcription.webm';
}

function stopTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
