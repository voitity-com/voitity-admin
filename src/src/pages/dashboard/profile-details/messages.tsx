'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { FloppyDisk as FloppyDiskIcon } from '@phosphor-icons/react/dist/ssr/FloppyDisk';
import { Microphone as MicrophoneIcon } from '@phosphor-icons/react/dist/ssr/Microphone';
import { SpeakerHigh as SpeakerHighIcon } from '@phosphor-icons/react/dist/ssr/SpeakerHigh';
import { Stop as StopIcon } from '@phosphor-icons/react/dist/ssr/Stop';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { logger } from '@/lib/default-logger';
import type {
  Profile,
  ProfileConversationMessage,
  ProfileConversationMessages,
  ProfileConversationMessageType,
} from '@/lib/profiles/api-client';
import {
  clearProfileConversationMessageAudio,
  generateProfileConversationMessageAudio,
  getProfile,
  getProfileConversationMessages,
  updateProfileConversationMessages,
  uploadProfileConversationMessageAudio,
} from '@/lib/profiles/api-client';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Messages | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
const MESSAGE_TYPES: ProfileConversationMessageType[] = ['initial', 'fallback_no_answer'];
const MAX_MESSAGE_LENGTH = 1000;

type Drafts = Record<ProfileConversationMessageType, string>;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = React.useState<null | Profile>(null);
  const [messages, setMessages] = React.useState<null | ProfileConversationMessages>(null);
  const [drafts, setDrafts] = React.useState<Drafts>({ fallback_no_answer: '', initial: '' });
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [savingType, setSavingType] = React.useState<null | ProfileConversationMessageType>(null);
  const [generatingType, setGeneratingType] = React.useState<null | ProfileConversationMessageType>(null);
  const [uploadingType, setUploadingType] = React.useState<null | ProfileConversationMessageType>(null);
  const [clearingType, setClearingType] = React.useState<null | ProfileConversationMessageType>(null);
  const [recordingType, setRecordingType] = React.useState<null | ProfileConversationMessageType>(null);
  const [recordingSeconds, setRecordingSeconds] = React.useState<number>(0);
  const chunksRef = React.useRef<Blob[]>([]);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const recordingTypeRef = React.useRef<null | ProfileConversationMessageType>(null);

  const loadMessages = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      const [nextProfile, nextMessages] = await Promise.all([
        getProfile(profileId),
        getProfileConversationMessages(profileId),
      ]);

      setProfile(nextProfile);
      setMessages(nextMessages);
      setDrafts({
        fallback_no_answer: nextMessages.fallback_no_answer.text ?? '',
        initial: nextMessages.initial.text ?? '',
      });
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, t]);

  React.useEffect(() => {
    loadMessages().catch((err) => {
      logger.error(err);
    });
  }, [loadMessages]);

  React.useEffect(() => {
    if (!recordingType) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setRecordingSeconds((current) => current + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [recordingType]);

  React.useEffect(() => {
    return () => {
      stopTracks(streamRef.current);
    };
  }, []);

  const updateMessage = React.useCallback((nextMessage: ProfileConversationMessage): void => {
    setMessages((current) =>
      current
        ? {
            ...current,
            [nextMessage.type]: nextMessage,
          }
        : current
    );
    setDrafts((current) => ({
      ...current,
      [nextMessage.type]: nextMessage.text ?? '',
    }));
  }, []);

  const handleDraftChange = React.useCallback((type: ProfileConversationMessageType, value: string): void => {
    setDrafts((current) => ({ ...current, [type]: value }));
  }, []);

  const handleSave = React.useCallback(
    async (type: ProfileConversationMessageType): Promise<void> => {
      setSavingType(type);
      setError('');

      try {
        const nextMessages = await updateProfileConversationMessages(profileId, {
          [type]: { text: drafts[type].trim() || null },
        });
        setMessages(nextMessages);
        setDrafts({
          fallback_no_answer: nextMessages.fallback_no_answer.text ?? '',
          initial: nextMessages.initial.text ?? '',
        });
        toast.success(t('dashboard.profiles.detail.messages.toasts.saved'));
      } catch (err) {
        const message = getErrorMessage(err, t('dashboard.profiles.detail.errors.generic'));
        setError(message);
        toast.error(message);
      } finally {
        setSavingType(null);
      }
    },
    [drafts, profileId, t]
  );

  const handleGenerateAudio = React.useCallback(
    async (type: ProfileConversationMessageType): Promise<void> => {
      setGeneratingType(type);
      setError('');

      try {
        const savedMessages = await updateProfileConversationMessages(profileId, {
          [type]: { text: drafts[type].trim() || null },
        });
        setMessages(savedMessages);
        setDrafts({
          fallback_no_answer: savedMessages.fallback_no_answer.text ?? '',
          initial: savedMessages.initial.text ?? '',
        });

        if (savedMessages[type].audio_url && savedMessages[type].audio_source === 'generated') {
          updateMessage(savedMessages[type]);
          toast.success(t('dashboard.profiles.detail.messages.toasts.audioGenerated'));
          return;
        }

        const nextMessage = await generateProfileConversationMessageAudio(profileId, type);
        updateMessage(nextMessage);
        toast.success(t('dashboard.profiles.detail.messages.toasts.audioGenerated'));
      } catch (err) {
        const message = getErrorMessage(err, t('dashboard.profiles.detail.messages.errors.generateAudio'));
        setError(message);
        toast.error(message);
      } finally {
        setGeneratingType(null);
      }
    },
    [drafts, profileId, t, updateMessage]
  );

  const uploadRecordedAudio = React.useCallback(
    async (type: ProfileConversationMessageType, audio: Blob): Promise<void> => {
      setUploadingType(type);
      setError('');

      try {
        const nextMessage = await uploadProfileConversationMessageAudio({
          audio,
          filename: `${type}.webm`,
          profileId,
          type,
        });
        updateMessage(nextMessage);
        toast.success(t('dashboard.profiles.detail.messages.toasts.audioUploaded'));
      } catch (err) {
        const message = getErrorMessage(err, t('dashboard.profiles.detail.messages.errors.uploadAudio'));
        setError(message);
        toast.error(message);
      } finally {
        setUploadingType(null);
      }
    },
    [profileId, t, updateMessage]
  );

  const handleStartRecording = React.useCallback(
    async (type: ProfileConversationMessageType): Promise<void> => {
      setError('');

      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setError(t('dashboard.profiles.detail.messages.errors.recordingUnsupported'));
        return;
      }

      try {
        const savedMessages = await updateProfileConversationMessages(profileId, {
          [type]: { text: drafts[type].trim() || null },
        });
        setMessages(savedMessages);
        setDrafts({
          fallback_no_answer: savedMessages.fallback_no_answer.text ?? '',
          initial: savedMessages.initial.text ?? '',
        });

        stopTracks(streamRef.current);
        chunksRef.current = [];

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        streamRef.current = stream;
        recorderRef.current = recorder;
        recordingTypeRef.current = type;

        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        recorder.onstop = () => {
          const stoppedType = recordingTypeRef.current;
          const mimeType = recorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });

          stopTracks(streamRef.current);
          streamRef.current = null;
          recorderRef.current = null;
          recordingTypeRef.current = null;
          setRecordingType(null);
          setRecordingSeconds(0);

          if (stoppedType && audioBlob.size > 0) {
            uploadRecordedAudio(stoppedType, audioBlob).catch((err) => {
              logger.error(err);
            });
          }
        };

        setRecordingSeconds(0);
        setRecordingType(type);
        recorder.start();
      } catch (err) {
        logger.error(err);
        stopTracks(streamRef.current);
        streamRef.current = null;
        recorderRef.current = null;
        recordingTypeRef.current = null;
        setRecordingType(null);
        setRecordingSeconds(0);
        setError(t('dashboard.profiles.detail.messages.errors.microphoneAccess'));
      }
    },
    [drafts, profileId, t, uploadRecordedAudio]
  );

  const handleStopRecording = React.useCallback((): void => {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, []);

  const handleClearAudio = React.useCallback(
    async (type: ProfileConversationMessageType): Promise<void> => {
      setClearingType(type);
      setError('');

      try {
        const nextMessage = await clearProfileConversationMessageAudio(profileId, type);
        updateMessage(nextMessage);
        toast.success(t('dashboard.profiles.detail.messages.toasts.audioCleared'));
      } catch (err) {
        const message = getErrorMessage(err, t('dashboard.profiles.detail.errors.generic'));
        setError(message);
        toast.error(message);
      } finally {
        setClearingType(null);
      }
    },
    [profileId, t, updateMessage]
  );

  if (isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        <div>
          <Typography variant="h4">{t('dashboard.profiles.detail.messages.title')}</Typography>
          <Typography color="text.secondary" variant="body1">
            {t('dashboard.profiles.detail.messages.subheader')}
          </Typography>
        </div>

        {error ? <Alert color="error">{error}</Alert> : null}

        {!profile?.voice ? <Alert color="info">{t('dashboard.profiles.detail.messages.voiceHint')}</Alert> : null}

        {messages ? (
          <Stack spacing={3}>
            {MESSAGE_TYPES.map((type) => (
              <ConversationMessageCard
                draft={drafts[type]}
                generating={generatingType === type}
                key={type}
                message={messages[type]}
                onClearAudio={() => handleClearAudio(type)}
                onDraftChange={(value) => handleDraftChange(type, value)}
                onGenerateAudio={() => handleGenerateAudio(type)}
                onSave={() => handleSave(type)}
                onStartRecording={() => handleStartRecording(type)}
                onStopRecording={handleStopRecording}
                recording={recordingType === type}
                recordingSeconds={recordingSeconds}
                removingAudio={clearingType === type}
                saving={savingType === type}
                title={t(`dashboard.profiles.detail.messages.cards.${type}.title`)}
                description={t(`dashboard.profiles.detail.messages.cards.${type}.description`)}
                helper={t(`dashboard.profiles.detail.messages.cards.${type}.helper`)}
                uploading={uploadingType === type}
              />
            ))}
          </Stack>
        ) : null}
      </Stack>
    </React.Fragment>
  );
}

interface ConversationMessageCardProps {
  description: string;
  draft: string;
  generating: boolean;
  helper: string;
  message: ProfileConversationMessage;
  onClearAudio: () => void;
  onDraftChange: (value: string) => void;
  onGenerateAudio: () => void;
  onSave: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  recording: boolean;
  recordingSeconds: number;
  removingAudio: boolean;
  saving: boolean;
  title: string;
  uploading: boolean;
}

function ConversationMessageCard({
  description,
  draft,
  generating,
  helper,
  message,
  onClearAudio,
  onDraftChange,
  onGenerateAudio,
  onSave,
  onStartRecording,
  onStopRecording,
  recording,
  recordingSeconds,
  removingAudio,
  saving,
  title,
  uploading,
}: ConversationMessageCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const disabled = saving || generating || uploading || removingAudio || recording;
  const characterCount = draft.length;
  const exceedsLimit = characterCount > MAX_MESSAGE_LENGTH;
  const canUseAudioActions = message.type === 'initial' || draft.trim().length > 0;

  return (
    <Card>
      <CardHeader
        action={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Chip
              color={message.enabled ? 'success' : 'default'}
              label={
                message.enabled
                  ? t('dashboard.profiles.detail.messages.status.enabled')
                  : t('dashboard.profiles.detail.messages.status.disabled')
              }
              size="small"
              variant="soft"
            />
            <Chip
              color={message.audio_url ? 'primary' : 'default'}
              label={
                message.audio_url
                  ? t('dashboard.profiles.detail.messages.audioSources.withSource', {
                      source: getAudioSourceLabel(message.audio_source, t),
                    })
                  : t('dashboard.profiles.detail.messages.audioSources.none')
              }
              size="small"
              variant="soft"
            />
          </Stack>
        }
        subheader={description}
        title={title}
      />
      <CardContent>
        <Stack spacing={3}>
          <FormControl error={exceedsLimit} fullWidth>
            <InputLabel>{t('dashboard.profiles.detail.messages.fields.text')}</InputLabel>
            <OutlinedInput
              disabled={disabled}
              label={t('dashboard.profiles.detail.messages.fields.text')}
              minRows={4}
              multiline
              onChange={(event) => onDraftChange(event.target.value)}
              value={draft}
            />
            <FormHelperText>
              {exceedsLimit
                ? t('dashboard.profiles.detail.messages.validation.tooLong', {
                    count: characterCount,
                    max: MAX_MESSAGE_LENGTH,
                  })
                : helper}
            </FormHelperText>
          </FormControl>

          <Divider />

          <Stack spacing={1.5}>
            <Typography variant="subtitle2">{t('dashboard.profiles.detail.messages.audioTitle')}</Typography>
            {message.audio_url ? (
              <Box
                component="audio"
                controls
                src={message.audio_url}
                sx={{ display: 'block', maxWidth: '520px', width: '100%' }}
              />
            ) : (
              <Typography color="text.secondary" variant="body2">
                {t('dashboard.profiles.detail.messages.audioEmpty')}
              </Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>
      <CardActions sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button disabled={disabled || exceedsLimit} onClick={onSave} startIcon={<FloppyDiskIcon />}>
            {saving
              ? t('dashboard.profiles.detail.messages.actions.saving')
              : t('dashboard.profiles.detail.messages.actions.save')}
          </Button>
          <Button
            disabled={disabled || exceedsLimit || !canUseAudioActions}
            onClick={onGenerateAudio}
            startIcon={<SpeakerHighIcon />}
          >
            {generating
              ? t('dashboard.profiles.detail.messages.actions.generating')
              : t('dashboard.profiles.detail.messages.actions.generateAudio')}
          </Button>
          {recording ? (
            <Button color="error" onClick={onStopRecording} startIcon={<StopIcon />} variant="contained">
              {t('dashboard.profiles.detail.messages.actions.stopRecording', {
                seconds: recordingSeconds,
              })}
            </Button>
          ) : (
            <Button
              disabled={disabled || exceedsLimit || !canUseAudioActions}
              onClick={onStartRecording}
              startIcon={<MicrophoneIcon />}
            >
              {t('dashboard.profiles.detail.messages.actions.recordAudio')}
            </Button>
          )}
        </Stack>

        <Button
          color="error"
          disabled={disabled || !message.audio_url}
          onClick={onClearAudio}
          startIcon={<TrashIcon />}
          variant="text"
        >
          {removingAudio
            ? t('dashboard.profiles.detail.messages.actions.removing')
            : t('dashboard.profiles.detail.messages.actions.clearAudio')}
        </Button>
      </CardActions>
    </Card>
  );
}

function getAudioSourceLabel(source: null | string | undefined, t: (key: string) => string): string {
  if (!source) {
    return t('dashboard.profiles.detail.messages.audioSources.none');
  }

  const knownSources = ['default', 'generated', 'recorded'];

  if (knownSources.includes(source)) {
    return t(`dashboard.profiles.detail.messages.audioSources.${source}`);
  }

  return source;
}

function stopTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
