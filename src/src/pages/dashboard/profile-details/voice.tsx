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
import LinearProgress from '@mui/material/LinearProgress';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { Microphone as MicrophoneIcon } from '@phosphor-icons/react/dist/ssr/Microphone';
import { Pause as PauseIcon } from '@phosphor-icons/react/dist/ssr/Pause';
import { Play as PlayIcon } from '@phosphor-icons/react/dist/ssr/Play';
import { Stop as StopIcon } from '@phosphor-icons/react/dist/ssr/Stop';
import { UploadSimple as UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import lamejsScriptUrl from 'lamejs/lame.min.js?url';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { logger } from '@/lib/default-logger';
import type { Profile, Voice, VoiceTestAudio } from '@/lib/profiles/api-client';
import {
  createVoice,
  getProfile,
  processVoiceSample,
  testVoiceAudio,
  uploadVoiceSample,
} from '@/lib/profiles/api-client';
import { toast } from '@/components/core/toaster';

const metadata = { title: `Voice | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
const languageCode = 'es';
let lameJsPromise: null | Promise<LameJs> = null;

type SampleRecordingStep = 'intro' | 'countdown' | 'recording' | 'review';

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
  const [sampleStep, setSampleStep] = React.useState<SampleRecordingStep>('intro');
  const [countdown, setCountdown] = React.useState<number>(3);
  const [recordingSeconds, setRecordingSeconds] = React.useState<number>(0);
  const [scriptPartIndex, setScriptPartIndex] = React.useState<number>(0);
  const [playbackSeconds, setPlaybackSeconds] = React.useState<number>(0);
  const [playbackDuration, setPlaybackDuration] = React.useState<number>(0);
  const [isSampleAudioPlaying, setIsSampleAudioPlaying] = React.useState<boolean>(false);
  const [testDialogOpen, setTestDialogOpen] = React.useState<boolean>(false);
  const [testText, setTestText] = React.useState<string>(() => t('dashboard.profiles.detail.voice.testTextDefault'));
  const [testAudio, setTestAudio] = React.useState<null | VoiceTestAudio>(null);
  const [testAudioUrl, setTestAudioUrl] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isCreating, setIsCreating] = React.useState<boolean>(false);
  const [isRecording, setIsRecording] = React.useState<boolean>(false);
  const [isTestingVoice, setIsTestingVoice] = React.useState<boolean>(false);
  const [isUploading, setIsUploading] = React.useState<boolean>(false);
  const chunksRef = React.useRef<Blob[]>([]);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const sampleAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const sampleScriptParts = React.useMemo(
    () => [
      t('dashboard.profiles.detail.voice.sampleScript.part1'),
      t('dashboard.profiles.detail.voice.sampleScript.part2'),
      t('dashboard.profiles.detail.voice.sampleScript.part3'),
      t('dashboard.profiles.detail.voice.sampleScript.part4'),
      t('dashboard.profiles.detail.voice.sampleScript.part5'),
      t('dashboard.profiles.detail.voice.sampleScript.part6'),
    ],
    [t]
  );

  React.useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      stopTracks(streamRef.current);
    };
  }, [audioUrl]);

  React.useEffect(() => {
    return () => {
      if (testAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(testAudioUrl);
      }
    };
  }, [testAudioUrl]);

  React.useEffect(() => {
    setPlaybackSeconds(0);
    setPlaybackDuration(0);
    setIsSampleAudioPlaying(false);
  }, [audioUrl]);

  React.useEffect(() => {
    if (sampleStep !== 'countdown') {
      return undefined;
    }

    if (countdown <= 0) {
      const recorder = recorderRef.current;

      if (!recorder) {
        setSampleStep('intro');
        return undefined;
      }

      chunksRef.current = [];
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      setSampleStep('recording');
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [countdown, sampleStep]);

  React.useEffect(() => {
    if (!isRecording) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setRecordingSeconds((current) => current + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRecording]);

  const loadProfile = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      const nextProfile = await getProfile(profileId);
      const nextVoiceId = getProfileVoiceId(nextProfile);

      setProfile(nextProfile);
      setVoiceId(nextVoiceId);
      setVoiceName(
        (current) => current || t('dashboard.profiles.detail.voice.voiceNameDefault', { name: nextProfile.name })
      );
      setVoiceDescription((current) => current || nextProfile.description || '');

      if (nextVoiceId) {
        storeVoiceId(profileId, nextVoiceId);
      } else {
        clearStoredVoiceId(profileId);
      }
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [profileId, t]);

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
      toast.success(t('dashboard.profiles.detail.voice.toasts.voiceCreated'));
    } catch (err) {
      const message = getErrorMessage(err, t('dashboard.profiles.detail.errors.generic'));
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }, [profileId, t, voiceDescription, voiceName]);

  const handleStartRecording = React.useCallback(async (): Promise<void> => {
    setError('');

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(t('dashboard.profiles.detail.voice.errors.recordingUnsupported'));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      sampleAudioRef.current?.pause();
      setAudioBlob(null);
      setAudioUrl('');
      setPlaybackSeconds(0);
      setPlaybackDuration(0);
      setIsSampleAudioPlaying(false);
      setScriptPartIndex(0);
      setCountdown(3);
      setRecordingSeconds(0);
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
        setSampleStep('review');
        stopTracks(stream);
        streamRef.current = null;
        recorderRef.current = null;
      };

      setSampleStep('countdown');
    } catch (err) {
      logger.error(err);
      setError(t('dashboard.profiles.detail.voice.errors.microphoneAccess'));
    }
  }, [t]);

  const handleStopRecording = React.useCallback((): void => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }

    setIsRecording(false);
  }, []);

  const handleOpenSampleDialog = React.useCallback((): void => {
    setError('');
    setSampleStep(audioBlob && audioUrl ? 'review' : 'intro');
    setCountdown(3);
    setRecordingSeconds(0);
    setScriptPartIndex(0);
    setSampleDialogOpen(true);
  }, [audioBlob, audioUrl]);

  const handleSampleDialogClose = React.useCallback((): void => {
    if (isRecording || isUploading || sampleStep === 'countdown') {
      return;
    }

    sampleAudioRef.current?.pause();
    setIsSampleAudioPlaying(false);
    setSampleDialogOpen(false);
  }, [isRecording, isUploading, sampleStep]);

  const handleNextScriptPart = React.useCallback((): void => {
    setScriptPartIndex((current) => Math.min(current + 1, sampleScriptParts.length - 1));
  }, [sampleScriptParts.length]);

  const handleRecordAgain = React.useCallback((): void => {
    handleStartRecording().catch((err) => {
      logger.error(err);
    });
  }, [handleStartRecording]);

  const handleToggleSamplePlayback = React.useCallback((): void => {
    const audio = sampleAudioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      if (audio.ended || (Number.isFinite(audio.duration) && audio.currentTime >= audio.duration)) {
        audio.currentTime = 0;
        setPlaybackSeconds(0);
      }

      audio
        .play()
        .then(() => {
          setIsSampleAudioPlaying(true);
        })
        .catch((err: unknown) => {
          logger.error(err);
        });
      return;
    }

    audio.pause();
    setIsSampleAudioPlaying(false);
  }, []);

  const handleUploadSample = React.useCallback(async (): Promise<void> => {
    if (!voiceId) {
      setError(t('dashboard.profiles.detail.voice.errors.createBeforeUpload'));
      return;
    }

    if (!audioBlob) {
      setError(t('dashboard.profiles.detail.voice.errors.recordBeforeSend'));
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const file = await convertAudioBlobToMp3File(
        audioBlob,
        t('dashboard.profiles.detail.voice.errors.encoderFailed')
      );
      const voiceSample = await uploadVoiceSample({ file, language_code: languageCode, voiceId });
      await processVoiceSample({ sampleId: voiceSample.id, voiceId });
      toast.success(t('dashboard.profiles.detail.voice.toasts.sampleUploaded'));
      sampleAudioRef.current?.pause();
      setAudioBlob(null);
      setAudioUrl('');
      setPlaybackSeconds(0);
      setPlaybackDuration(0);
      setIsSampleAudioPlaying(false);
      setSampleStep('intro');
      setSampleDialogOpen(false);
    } catch (err) {
      const message = getErrorMessage(err, t('dashboard.profiles.detail.errors.generic'));
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }, [audioBlob, t, voiceId]);

  const handleTestDialogClose = React.useCallback((): void => {
    if (isTestingVoice) {
      return;
    }

    setTestDialogOpen(false);
  }, [isTestingVoice]);

  const handleGetAudio = React.useCallback(async (): Promise<void> => {
    const text = testText.trim();

    if (!text) {
      setError(t('dashboard.profiles.detail.voice.errors.enterText'));
      return;
    }

    setIsTestingVoice(true);
    setError('');

    try {
      const generatedAudio = await testVoiceAudio({ profile_id: profileId, text });
      const nextAudioUrl = resolveVoiceTestAudioUrl(generatedAudio);

      if (!nextAudioUrl) {
        throw new Error(t('dashboard.profiles.detail.voice.errors.audioNotReturned'));
      }

      if (testAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(testAudioUrl);
      }

      setTestAudio(generatedAudio);
      setTestAudioUrl(nextAudioUrl);
      toast.success(t('dashboard.profiles.detail.voice.toasts.audioGenerated'));
    } catch (err) {
      const message = getErrorMessage(err, t('dashboard.profiles.detail.errors.generic'));
      setError(message);
      toast.error(message);
    } finally {
      setIsTestingVoice(false);
    }
  }, [profileId, t, testAudioUrl, testText]);

  const voiceEnabled = hasProfileVoiceEnabled(profile);
  const isLastScriptPart = scriptPartIndex >= sampleScriptParts.length - 1;
  const playbackProgress = playbackDuration > 0 ? Math.min(100, (playbackSeconds / playbackDuration) * 100) : 0;
  const scriptProgress = ((scriptPartIndex + 1) / sampleScriptParts.length) * 100;

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}
        <Card>
          <CardHeader
            subheader={profile ? profile.name : t('dashboard.profiles.detail.voice.createSubheader')}
            title={t('dashboard.profiles.detail.voice.title')}
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
                      <InputLabel>{t('dashboard.profiles.detail.voice.fields.voiceName')}</InputLabel>
                      <OutlinedInput
                        label={t('dashboard.profiles.detail.voice.fields.voiceName')}
                        onChange={(event) => {
                          setVoiceName(event.target.value);
                        }}
                        value={voiceName}
                      />
                    </FormControl>
                    <FormControl>
                      <InputLabel>{t('dashboard.profiles.detail.voice.fields.description')}</InputLabel>
                      <OutlinedInput
                        label={t('dashboard.profiles.detail.voice.fields.description')}
                        multiline
                        onChange={(event) => {
                          setVoiceDescription(event.target.value);
                        }}
                        rows={3}
                        value={voiceDescription}
                      />
                      <FormHelperText>
                        {t('dashboard.profiles.detail.voice.fields.languageCode', { code: languageCode })}
                      </FormHelperText>
                    </FormControl>
                    {voiceId ? (
                      <Alert color="success" variant="outlined">
                        {t('dashboard.profiles.detail.voice.voiceId', { id: voiceId })}
                      </Alert>
                    ) : null}
                  </Stack>
                </Stack>
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between', p: 3, pt: 0 }}>
                <Button disabled={isCreating || !voiceName.trim()} onClick={handleCreateVoice} variant="contained">
                  {t('dashboard.profiles.actions.createVoice')}
                </Button>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    disabled={!voiceId}
                    onClick={handleOpenSampleDialog}
                    startIcon={<MicrophoneIcon />}
                    variant="contained"
                  >
                    {t('dashboard.profiles.detail.voice.cloneVoice')}
                  </Button>
                  {voiceEnabled ? (
                    <Button
                      color="secondary"
                      onClick={() => {
                        setTestDialogOpen(true);
                      }}
                      variant="outlined"
                    >
                      {t('dashboard.profiles.detail.voice.testVoice')}
                    </Button>
                  ) : null}
                </Stack>
              </CardActions>
            </React.Fragment>
          )}
        </Card>
      </Stack>
      <Dialog
        fullWidth
        maxWidth="md"
        onClose={() => {
          handleSampleDialogClose();
        }}
        open={sampleDialogOpen}
      >
        <DialogTitle>{t('dashboard.profiles.detail.voice.cloneVoice')}</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            {error ? <Alert color="error">{error}</Alert> : null}
            <Box
              sx={{
                border: '1px solid var(--mui-palette-divider)',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  bgcolor: 'var(--mui-palette-background-level1)',
                  borderBottom: '1px solid var(--mui-palette-divider)',
                  p: 2.5,
                }}
              >
                <Stack spacing={1}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
                  >
                    <Typography variant="h6">{t('dashboard.profiles.detail.voice.cloneIntroTitle')}</Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <MicrophoneIcon size={20} weight="fill" />
                      <Typography color="text.secondary" variant="body2">
                        {t('dashboard.profiles.detail.voice.estimatedDuration')}
                      </Typography>
                    </Stack>
                  </Stack>
                  <Typography color="text.secondary" variant="body2">
                    {t('dashboard.profiles.detail.voice.cloneIntroDescription')}
                  </Typography>
                </Stack>
              </Box>

              <Box sx={{ p: 2.5 }}>
                <Stack spacing={2.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Alert color="info" icon={false} sx={{ flex: 1 }}>
                      {t('dashboard.profiles.detail.voice.quietPlace')}
                    </Alert>
                    <Alert color="info" icon={false} sx={{ flex: 1 }}>
                      {t('dashboard.profiles.detail.voice.naturalVoice')}
                    </Alert>
                  </Stack>

                  {sampleStep === 'intro' ? (
                    <Stack spacing={2}>
                      <Box
                        sx={{
                          border: '1px solid var(--mui-palette-divider)',
                          borderRadius: 1,
                          p: 2,
                        }}
                      >
                        <Typography color="text.secondary" variant="caption">
                          {t('dashboard.profiles.detail.voice.scriptPart', {
                            current: scriptPartIndex + 1,
                            total: sampleScriptParts.length,
                          })}
                        </Typography>
                        <Typography sx={{ mt: 1, whiteSpace: 'pre-line' }} variant="body1">
                          {sampleScriptParts[scriptPartIndex]}
                        </Typography>
                      </Box>
                      <Button
                        disabled={isUploading}
                        onClick={handleStartRecording}
                        size="large"
                        startIcon={<MicrophoneIcon />}
                        variant="contained"
                      >
                        {t('dashboard.profiles.actions.startRecording')}
                      </Button>
                    </Stack>
                  ) : null}

                  {sampleStep === 'countdown' ? (
                    <Stack spacing={2.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
                      <Box
                        sx={{
                          alignItems: 'center',
                          bgcolor: 'var(--mui-palette-primary-main)',
                          borderRadius: '50%',
                          color: 'var(--mui-palette-primary-contrastText)',
                          display: 'flex',
                          fontSize: 56,
                          fontWeight: 700,
                          height: 112,
                          justifyContent: 'center',
                          lineHeight: 1,
                          width: 112,
                        }}
                      >
                        {countdown}
                      </Box>
                      <Typography color="text.secondary" variant="body2">
                        {t('dashboard.profiles.detail.voice.countdownTitle')}
                      </Typography>
                      <Box
                        sx={{
                          border: '1px solid var(--mui-palette-divider)',
                          borderRadius: 1,
                          p: 2,
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <Typography color="text.secondary" variant="caption">
                          {t('dashboard.profiles.detail.voice.scriptPart', {
                            current: scriptPartIndex + 1,
                            total: sampleScriptParts.length,
                          })}
                        </Typography>
                        <Typography sx={{ mt: 1, whiteSpace: 'pre-line' }} variant="body1">
                          {sampleScriptParts[scriptPartIndex]}
                        </Typography>
                      </Box>
                    </Stack>
                  ) : null}

                  {sampleStep === 'recording' ? (
                    <Stack spacing={2.5}>
                      <Box
                        sx={{
                          alignItems: 'center',
                          bgcolor: 'rgba(244, 67, 54, 0.08)',
                          border: '1px solid rgba(244, 67, 54, 0.24)',
                          borderRadius: 1,
                          color: 'var(--mui-palette-error-main)',
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          gap: 1.5,
                          justifyContent: 'space-between',
                          p: 2,
                        }}
                      >
                        <Box
                          sx={{
                            '@keyframes voiceRecordingPulse': {
                              '0%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0.45)' },
                              '70%': { boxShadow: '0 0 0 12px rgba(244, 67, 54, 0)' },
                              '100%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0)' },
                            },
                            animation: 'voiceRecordingPulse 1.3s infinite',
                            bgcolor: 'var(--mui-palette-error-main)',
                            borderRadius: '50%',
                            flex: '0 0 auto',
                            height: 14,
                            width: 14,
                          }}
                        />
                        <Box sx={{ flex: '1 1 auto' }}>
                          <Typography fontWeight={700} variant="subtitle2">
                            {t('dashboard.profiles.detail.voice.recordingLive')}
                          </Typography>
                          <Typography color="text.secondary" variant="body2">
                            {formatDuration(recordingSeconds)}
                          </Typography>
                        </Box>
                        <Button
                          color="error"
                          onClick={handleStopRecording}
                          startIcon={<StopIcon />}
                          sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
                          variant="contained"
                        >
                          {t('dashboard.profiles.detail.voice.stopRecording')}
                        </Button>
                      </Box>

                      <Box
                        sx={{
                          border: '1px solid var(--mui-palette-divider)',
                          borderRadius: 1,
                          p: 2,
                        }}
                      >
                        <Stack spacing={1.5}>
                          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography color="text.secondary" variant="caption">
                              {t('dashboard.profiles.detail.voice.scriptPart', {
                                current: scriptPartIndex + 1,
                                total: sampleScriptParts.length,
                              })}
                            </Typography>
                            <Typography color="text.secondary" variant="caption">
                              {Math.round(scriptProgress)}%
                            </Typography>
                          </Stack>
                          <LinearProgress value={scriptProgress} variant="determinate" />
                          <Typography sx={{ minHeight: 112, whiteSpace: 'pre-line' }} variant="body1">
                            {sampleScriptParts[scriptPartIndex]}
                          </Typography>
                          <Button
                            disabled={isLastScriptPart}
                            endIcon={<ArrowRightIcon />}
                            onClick={handleNextScriptPart}
                            variant="outlined"
                          >
                            {t('dashboard.profiles.detail.voice.continueReading')}
                          </Button>
                        </Stack>
                      </Box>
                    </Stack>
                  ) : null}

                  {sampleStep === 'review' && audioUrl ? (
                    <Stack spacing={2.5}>
                      <Alert color="success">{t('dashboard.profiles.detail.voice.recordingReady')}</Alert>
                      <Box
                        sx={{
                          border: '1px solid var(--mui-palette-divider)',
                          borderRadius: 1,
                          p: 2,
                        }}
                      >
                        <Box
                          component="audio"
                          key={audioUrl}
                          onEnded={(event: React.SyntheticEvent<HTMLAudioElement>) => {
                            setIsSampleAudioPlaying(false);
                            setPlaybackSeconds(event.currentTarget.duration || playbackDuration);
                          }}
                          onLoadedMetadata={(event: React.SyntheticEvent<HTMLAudioElement>) => {
                            const nextDuration = Number.isFinite(event.currentTarget.duration)
                              ? event.currentTarget.duration
                              : 0;
                            setPlaybackDuration(nextDuration);
                          }}
                          onPause={() => {
                            setIsSampleAudioPlaying(false);
                          }}
                          onPlay={() => {
                            setIsSampleAudioPlaying(true);
                          }}
                          onTimeUpdate={(event: React.SyntheticEvent<HTMLAudioElement>) => {
                            setPlaybackSeconds(event.currentTarget.currentTime);
                          }}
                          preload="metadata"
                          ref={sampleAudioRef}
                          src={audioUrl}
                          sx={{ display: 'none' }}
                        />
                        <Stack spacing={1.5}>
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                            <Button
                              onClick={handleToggleSamplePlayback}
                              startIcon={isSampleAudioPlaying ? <PauseIcon /> : <PlayIcon />}
                              variant="contained"
                            >
                              {isSampleAudioPlaying
                                ? t('dashboard.profiles.detail.voice.pauseRecording')
                                : t('dashboard.profiles.detail.voice.playRecording')}
                            </Button>
                            <Typography color="text.secondary" variant="body2">
                              {formatDuration(playbackSeconds)} / {formatDuration(playbackDuration)}
                            </Typography>
                          </Stack>
                          <LinearProgress value={playbackProgress} variant="determinate" />
                        </Stack>
                      </Box>
                      <Button
                        disabled={isUploading}
                        onClick={handleRecordAgain}
                        startIcon={<MicrophoneIcon />}
                        variant="outlined"
                      >
                        {t('dashboard.profiles.detail.voice.recordAgain')}
                      </Button>
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', p: 3, pt: 0 }}>
          <Button
            color="secondary"
            disabled={isRecording || isUploading || sampleStep === 'countdown'}
            onClick={handleSampleDialogClose}
          >
            {t('dashboard.profiles.actions.cancel')}
          </Button>
          {sampleStep === 'review' ? (
            <Button
              disabled={isUploading || isRecording || !voiceId || !audioBlob}
              onClick={handleUploadSample}
              startIcon={<UploadSimpleIcon />}
              variant="contained"
            >
              {isUploading
                ? t('dashboard.profiles.detail.voice.uploadingSample')
                : t('dashboard.profiles.actions.sendSample')}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={() => {
          handleTestDialogClose();
        }}
        open={testDialogOpen}
      >
        <DialogTitle>{t('dashboard.profiles.detail.voice.testVoice')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {error ? <Alert color="error">{error}</Alert> : null}
            <FormControl fullWidth>
              <InputLabel>{t('dashboard.profiles.detail.voice.fields.text')}</InputLabel>
              <OutlinedInput
                label={t('dashboard.profiles.detail.voice.fields.text')}
                multiline
                onChange={(event) => {
                  setTestText(event.target.value);
                }}
                rows={4}
                value={testText}
              />
              {testAudio?.duration ? (
                <FormHelperText>
                  {t('dashboard.profiles.detail.voice.duration', { duration: testAudio.duration })}
                </FormHelperText>
              ) : null}
            </FormControl>
            {testAudioUrl ? (
              <Box>
                <Typography sx={{ mb: 1 }} variant="subtitle2">
                  {t('dashboard.profiles.detail.voice.audio')}
                </Typography>
                <Box
                  component="audio"
                  controls
                  key={testAudioUrl}
                  preload="metadata"
                  src={testAudioUrl}
                  sx={{ display: 'block', width: '100%' }}
                />
              </Box>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button color="secondary" disabled={isTestingVoice} onClick={handleTestDialogClose}>
            {t('dashboard.profiles.actions.cancel')}
          </Button>
          <Button disabled={isTestingVoice || !testText.trim()} onClick={handleGetAudio} variant="contained">
            {t('dashboard.profiles.actions.getAudio')}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}

function formatDuration(value: number): string {
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function convertAudioBlobToMp3File(blob: Blob, encoderErrorMessage: string): Promise<File> {
  const AudioContextCtor = window.AudioContext;
  const audioContext = new AudioContextCtor();

  try {
    const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
    const lamejs = await loadLameJs(encoderErrorMessage);
    const mp3Blob = encodeAudioBufferAsMp3(audioBuffer, lamejs);
    return new File([mp3Blob], 'voice-sample.mp3', { type: 'audio/mpeg' });
  } finally {
    await audioContext.close();
  }
}

function hasProfileVoiceEnabled(profile: null | Profile): boolean {
  if (!profile) {
    return false;
  }

  if (profile.voice === true) {
    return true;
  }

  return profile.data?.voice === true;
}

function getProfileVoiceId(profile: Profile): string {
  if (profile.voice_id !== null && profile.voice_id !== undefined && String(profile.voice_id).trim()) {
    return String(profile.voice_id);
  }

  const dataVoiceId = profile.data?.voice_id;

  if ((typeof dataVoiceId === 'string' || typeof dataVoiceId === 'number') && String(dataVoiceId).trim()) {
    return String(dataVoiceId);
  }

  return '';
}

function resolveVoiceTestAudioUrl(audio: VoiceTestAudio): string {
  if (audio.audio_content) {
    const audioFormat = audio.audio_format || 'mp3';
    const mimeType = audioFormat === 'wav' ? 'audio/wav' : 'audio/mpeg';
    const base64Content = audio.audio_content.includes(',')
      ? audio.audio_content.split(',').pop() ?? ''
      : audio.audio_content;
    const bytes = Uint8Array.from(atob(base64Content), (character) => character.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  }

  if (audio.audio_url) {
    return audio.audio_url.startsWith('http') ? audio.audio_url : `${config.api.baseUrl}${audio.audio_url}`;
  }

  return '';
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
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, index) =>
    audioBuffer.getChannelData(index)
  );
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
  Mp3Encoder: new (
    channels: number,
    sampleRate: number,
    kbps: number
  ) => {
    encodeBuffer: (left: Int16Array, right?: Int16Array) => Int8Array;
    flush: () => Int8Array;
  };
}

declare global {
  interface Window {
    lamejs?: LameJs;
  }
}

async function loadLameJs(errorMessage: string): Promise<LameJs> {
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

      reject(new Error(errorMessage));
    };
    script.onerror = () => {
      reject(new Error(errorMessage));
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

function clearStoredVoiceId(profileId: string): void {
  if (typeof window === 'undefined' || !profileId) {
    return;
  }

  window.localStorage.removeItem(getVoiceStorageKey(profileId));
}

function stopTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
