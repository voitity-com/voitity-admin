'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Microphone as MicrophoneIcon } from '@phosphor-icons/react/dist/ssr/Microphone';
import { Stop as StopIcon } from '@phosphor-icons/react/dist/ssr/Stop';
import { UploadSimple as UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import lamejsScriptUrl from 'lamejs/lame.min.js?url';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import type { Profile, Voice } from '@/lib/profiles/api-client';
import { createVoice, getProfile, uploadVoiceSample } from '@/lib/profiles/api-client';
import { logger } from '@/lib/default-logger';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Voice | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
const languageCode = 'es';
const readText =
  'Hola, este es un ejemplo de mi voz para configurar mi perfil. Estoy leyendo este texto de forma clara y natural para crear una muestra de voz.';
let lameJsPromise: null | Promise<LameJs> = null;

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = React.useState<null | Profile>(null);
  const [voiceId, setVoiceId] = React.useState<string>(() => getStoredVoiceId(profileId));
  const [voiceName, setVoiceName] = React.useState<string>('');
  const [voiceDescription, setVoiceDescription] = React.useState<string>('');
  const [audioBlob, setAudioBlob] = React.useState<null | Blob>(null);
  const [audioUrl, setAudioUrl] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const [sampleDialogOpen, setSampleDialogOpen] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isCreating, setIsCreating] = React.useState<boolean>(false);
  const [isRecording, setIsRecording] = React.useState<boolean>(false);
  const [isUploading, setIsUploading] = React.useState<boolean>(false);
  const chunksRef = React.useRef<Blob[]>([]);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      stopTracks(streamRef.current);
    };
  }, [audioUrl]);

  const loadProfile = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      const nextProfile = await getProfile(profileId);
      setProfile(nextProfile);
      setVoiceName((current) => current || `${nextProfile.name} Voice`);
      setVoiceDescription((current) => current || nextProfile.description || '');
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  React.useEffect(() => {
    setVoiceId(getStoredVoiceId(profileId));
    loadProfile().catch((err) => {
      logger.error(err);
    });
  }, [loadProfile, profileId]);

  const handleCreateVoice = React.useCallback(async (): Promise<void> => {
    setIsCreating(true);
    setError('');

    try {
      const voice: Voice = await createVoice({
        description: voiceDescription,
        language_code: languageCode,
        name: voiceName,
        profile_id: profileId,
      });
      const nextVoiceId = String(voice.id);
      setVoiceId(nextVoiceId);
      storeVoiceId(profileId, nextVoiceId);
      toast.success('Voice created');
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }, [profileId, voiceDescription, voiceName]);

  const handleStartRecording = React.useCallback(async (): Promise<void> => {
    setError('');

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Audio recording is not supported by this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl('');
      }

      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stopTracks(stream);
        streamRef.current = null;
        recorderRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      logger.error(err);
      setError('Unable to access the microphone.');
    }
  }, [audioUrl]);

  const handleStopRecording = React.useCallback((): void => {
    recorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const handleSampleDialogClose = React.useCallback((): void => {
    if (isRecording) {
      return;
    }

    setSampleDialogOpen(false);
  }, [isRecording]);

  const handleUploadSample = React.useCallback(async (): Promise<void> => {
    if (!voiceId) {
      setError('Create a voice before uploading a sample.');
      return;
    }

    if (!audioBlob) {
      setError('Record a voice sample before sending it.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const file = await convertAudioBlobToMp3File(audioBlob);
      await uploadVoiceSample({ file, language_code: languageCode, voiceId });
      toast.success('Voice sample uploaded');
      setSampleDialogOpen(false);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }, [audioBlob, voiceId]);

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}
        <Card>
          <CardHeader
            subheader={profile ? profile.name : 'Create voice and upload a voice sample'}
            title="Voice"
          />
          {isLoading ? (
            <Stack sx={{ alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <React.Fragment>
              <CardContent>
                <Stack spacing={3}>
                  <Stack spacing={2}>
                    <FormControl>
                      <InputLabel>Voice name</InputLabel>
                      <OutlinedInput
                        label="Voice name"
                        onChange={(event) => {
                          setVoiceName(event.target.value);
                        }}
                        value={voiceName}
                      />
                    </FormControl>
                    <FormControl>
                      <InputLabel>Description</InputLabel>
                      <OutlinedInput
                        label="Description"
                        multiline
                        onChange={(event) => {
                          setVoiceDescription(event.target.value);
                        }}
                        rows={3}
                        value={voiceDescription}
                      />
                      <FormHelperText>Language code: {languageCode}</FormHelperText>
                    </FormControl>
                    {voiceId ? (
                      <Alert color="success" variant="outlined">
                        Voice ID: {voiceId}
                      </Alert>
                    ) : null}
                  </Stack>
                </Stack>
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between', p: 3, pt: 0 }}>
                <Button disabled={isCreating || !voiceName.trim()} onClick={handleCreateVoice} variant="contained">
                  Create voice
                </Button>
                <Button
                  disabled={!voiceId}
                  onClick={() => {
                    setSampleDialogOpen(true);
                  }}
                  startIcon={<MicrophoneIcon />}
                  variant="contained"
                >
                  {t('dashboard.profiles.detail.voice.cloneVoice')}
                </Button>
              </CardActions>
            </React.Fragment>
          )}
        </Card>
      </Stack>
      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={() => {
          if (isRecording) {
            return;
          }

          handleSampleDialogClose();
        }}
        open={sampleDialogOpen}
      >
        <DialogTitle>{t('dashboard.profiles.detail.voice.cloneVoice')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {error ? <Alert color="error">{error}</Alert> : null}
            <Box
              sx={{
                bgcolor: 'var(--mui-palette-background-level1)',
                borderRadius: 1,
                p: 2,
              }}
            >
              <Typography variant="subtitle2">Read this text</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
                {readText}
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                disabled={isRecording || isUploading}
                onClick={handleStartRecording}
                startIcon={<MicrophoneIcon />}
                variant="outlined"
              >
                Start recording
              </Button>
              <Button
                color="secondary"
                disabled={!isRecording}
                onClick={handleStopRecording}
                startIcon={<StopIcon />}
                variant="outlined"
              >
                Stop
              </Button>
            </Stack>
            {audioUrl ? (
              <Box>
                <Typography sx={{ mb: 1 }} variant="subtitle2">
                  Preview
                </Typography>
                <Box component="audio" controls src={audioUrl} sx={{ display: 'block', width: '100%' }} />
              </Box>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button color="secondary" disabled={isRecording || isUploading} onClick={handleSampleDialogClose}>
            Cancel
          </Button>
          <Button
            disabled={isUploading || isRecording || !voiceId || !audioBlob}
            onClick={handleUploadSample}
            startIcon={<UploadSimpleIcon />}
            variant="contained"
          >
            Send sample
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}

async function convertAudioBlobToMp3File(blob: Blob): Promise<File> {
  const AudioContextCtor = window.AudioContext;
  const audioContext = new AudioContextCtor();

  try {
    const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
    const lamejs = await loadLameJs();
    const mp3Blob = encodeAudioBufferAsMp3(audioBuffer, lamejs);
    return new File([mp3Blob], 'voice-sample.mp3', { type: 'audio/mpeg' });
  } finally {
    await audioContext.close();
  }
}

function encodeAudioBufferAsMp3(audioBuffer: AudioBuffer, lamejs: LameJs): Blob {
  const mp3Encoder = new lamejs.Mp3Encoder(1, audioBuffer.sampleRate, 128);
  const samples = getMonoSamples(audioBuffer);
  const sampleBlockSize = 1152;
  const chunks: Int8Array[] = [];

  for (let index = 0; index < samples.length; index += sampleBlockSize) {
    const sampleChunk = samples.subarray(index, index + sampleBlockSize);
    const mp3Buffer = mp3Encoder.encodeBuffer(sampleChunk);

    if (mp3Buffer.length > 0) {
      chunks.push(mp3Buffer);
    }
  }

  const endBuffer = mp3Encoder.flush();

  if (endBuffer.length > 0) {
    chunks.push(endBuffer);
  }

  return new Blob(chunks, { type: 'audio/mpeg' });
}

function getMonoSamples(audioBuffer: AudioBuffer): Int16Array {
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, index) => audioBuffer.getChannelData(index));
  const samples = new Int16Array(audioBuffer.length);

  for (let sampleIndex = 0; sampleIndex < audioBuffer.length; sampleIndex += 1) {
    const sample =
      channels.reduce((total, channel) => total + (channel[sampleIndex] ?? 0), 0) / Math.max(channels.length, 1);
    const clampedSample = Math.max(-1, Math.min(1, sample));
    samples[sampleIndex] = clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7fff;
  }

  return samples;
}

interface LameJs {
  Mp3Encoder: new (channels: number, sampleRate: number, kbps: number) => {
    encodeBuffer: (left: Int16Array, right?: Int16Array) => Int8Array;
    flush: () => Int8Array;
  };
}

declare global {
  interface Window {
    lamejs?: LameJs;
  }
}

async function loadLameJs(): Promise<LameJs> {
  if (window.lamejs) {
    return window.lamejs;
  }

  lameJsPromise ??= new Promise<LameJs>((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = lamejsScriptUrl;
    script.onload = () => {
      if (window.lamejs) {
        resolve(window.lamejs);
        return;
      }

      reject(new Error('MP3 encoder failed to load.'));
    };
    script.onerror = () => {
      reject(new Error('MP3 encoder failed to load.'));
    };
    document.head.appendChild(script);
  });

  return lameJsPromise;
}

function getVoiceStorageKey(profileId: string): string {
  return `voitity.profile.${profileId}.voiceId`;
}

function getStoredVoiceId(profileId: string): string {
  if (typeof window === 'undefined' || !profileId) {
    return '';
  }

  return window.localStorage.getItem(getVoiceStorageKey(profileId)) ?? '';
}

function storeVoiceId(profileId: string, voiceId: string): void {
  if (typeof window === 'undefined' || !profileId) {
    return;
  }

  window.localStorage.setItem(getVoiceStorageKey(profileId), voiceId);
}

function stopTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}
