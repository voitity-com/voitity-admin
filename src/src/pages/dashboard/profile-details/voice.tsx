'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
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
  updateProfileVoiceSettings,
  updateVoice,
  uploadVoiceSample,
} from '@/lib/profiles/api-client';
import { toast } from '@/components/core/toaster';
import { ProfileGuideTutorialLink } from '@/components/dashboard/help/profile-guide-tutorial-link';

const metadata = { title: `Voice | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
type VoiceLanguageCode = 'es' | 'en';
const DEFAULT_VOICE_LANGUAGE_CODE: VoiceLanguageCode = 'es';
const VOICE_LANGUAGE_CODES: VoiceLanguageCode[] = ['es', 'en'];
let lameJsPromise: null | Promise<LameJs> = null;

type SampleRecordingStep = 'intro' | 'countdown' | 'recording' | 'review';

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = React.useState<null | Profile>(null);
  const [voiceId, setVoiceId] = React.useState<string>(() => getStoredVoiceId(profileId));
  const [voiceName, setVoiceName] = React.useState<string>('');
  const [voiceDescription, setVoiceDescription] = React.useState<string>('');
  const [voiceLanguageCode, setVoiceLanguageCode] = React.useState<VoiceLanguageCode>(DEFAULT_VOICE_LANGUAGE_CODE);
  const [voiceResponsesEnabled, setVoiceResponsesEnabled] = React.useState<boolean>(false);
  const [voiceAutoplayEnabled, setVoiceAutoplayEnabled] = React.useState<boolean>(false);
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
    };
  }, [audioUrl]);

  React.useEffect(() => {
    return () => {
      stopTracks(streamRef.current);
    };
  }, []);

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

      try {
        chunksRef.current = [];
        recorder.start();
        sampleAudioRef.current?.pause();
        setAudioBlob(null);
        setAudioUrl('');
        setPlaybackSeconds(0);
        setPlaybackDuration(0);
        setIsSampleAudioPlaying(false);
        setIsRecording(true);
        setRecordingSeconds(0);
        setSampleStep('recording');
      } catch (err) {
        logger.error(err);
        stopTracks(streamRef.current);
        streamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);
        setSampleStep(audioBlob && audioUrl ? 'review' : 'intro');
        setError(t('dashboard.profiles.detail.voice.errors.recordingStartFailed'));
      }

      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [audioBlob, audioUrl, countdown, sampleStep, t]);

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

  const applyProfile = React.useCallback(
    (nextProfile: Profile): void => {
      const nextVoiceId = getProfileVoiceId(nextProfile);

      setProfile(nextProfile);
      setVoiceId(nextVoiceId);
      setVoiceName(
        nextProfile.voice_name || t('dashboard.profiles.detail.voice.voiceNameDefault', { name: nextProfile.name })
      );
      setVoiceDescription(nextProfile.voice_description || '');
      setVoiceLanguageCode(normalizeVoiceLanguageCode(nextProfile.voice_language_code));
      setVoiceResponsesEnabled(getProfileVoiceResponsesEnabled(nextProfile));
      setVoiceAutoplayEnabled(getProfileVoiceAutoplayEnabled(nextProfile));

      if (nextVoiceId) {
        storeVoiceId(profileId, nextVoiceId);
      } else {
        clearStoredVoiceId(profileId);
      }
    },
    [profileId, t]
  );

  const loadProfile = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      applyProfile(await getProfile(profileId));
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, t('dashboard.profiles.detail.errors.generic')));
    } finally {
      setIsLoading(false);
    }
  }, [applyProfile, profileId, t]);

  React.useEffect(() => {
    setVoiceId(getStoredVoiceId(profileId));
    loadProfile().catch((err) => {
      logger.error(err);
    });
  }, [loadProfile, profileId]);

  const isCloneProcessing = isVoiceCloneProcessing(profile?.voice_clone_status);

  React.useEffect(() => {
    if (!isCloneProcessing) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      getProfile(profileId)
        .then((nextProfile) => {
          applyProfile(nextProfile);
        })
        .catch((err: unknown) => {
          logger.error(err);
        });
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [applyProfile, isCloneProcessing, profileId]);

  const saveVoiceDetails = React.useCallback(async (): Promise<Voice> => {
    const currentVoiceId = voiceId.trim();
    const nextVoiceName =
      voiceName.trim() ||
      (profile
        ? t('dashboard.profiles.detail.voice.voiceNameDefault', { name: profile.name })
        : t('dashboard.profiles.detail.voice.voiceNameFallback'));

    const voice: Voice = currentVoiceId
      ? await updateVoice(currentVoiceId, {
          description: voiceDescription,
          language_code: voiceLanguageCode,
          name: nextVoiceName,
        })
      : await createVoice({
          description: voiceDescription,
          language_code: voiceLanguageCode,
          name: nextVoiceName,
          profile_id: profileId,
        });

    const nextVoiceId = String(voice.id);

    setVoiceId(nextVoiceId);
    setVoiceName(voice.name || nextVoiceName);
    setVoiceDescription(voice.description ?? '');
    setProfile((current) =>
      current
        ? {
            ...current,
            data: { ...(current.data ?? {}), voice_id: nextVoiceId },
            voice_description: voice.description ?? '',
            voice_id: nextVoiceId,
            voice_language_code: voice.language_code ?? voiceLanguageCode,
            voice_name: voice.name || nextVoiceName,
          }
        : current
    );
    storeVoiceId(profileId, nextVoiceId);

    return voice;
  }, [profile, profileId, t, voiceDescription, voiceId, voiceLanguageCode, voiceName]);

  const handleSaveVoice = React.useCallback(async (): Promise<void> => {
    setIsCreating(true);
    setError('');

    try {
      await saveVoiceDetails();
      const updatedProfile = await updateProfileVoiceSettings(profileId, {
        voice_autoplay_enabled: voiceResponsesEnabled && voiceAutoplayEnabled,
        voice_enabled: voiceResponsesEnabled,
      });
      setProfile(updatedProfile);
      setVoiceResponsesEnabled(getProfileVoiceResponsesEnabled(updatedProfile));
      setVoiceAutoplayEnabled(getProfileVoiceAutoplayEnabled(updatedProfile));
      toast.success(t('dashboard.profiles.detail.voice.toasts.voiceSaved'));
    } catch (err) {
      const message = getErrorMessage(err, t('dashboard.profiles.detail.errors.generic'));
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }, [profileId, saveVoiceDetails, t, voiceAutoplayEnabled, voiceResponsesEnabled]);

  const handleStartRecording = React.useCallback(async (): Promise<void> => {
    setError('');

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(t('dashboard.profiles.detail.voice.errors.recordingUnsupported'));
      return;
    }

    let stream: MediaStream | null = null;

    try {
      stopTracks(streamRef.current);
      streamRef.current = null;
      recorderRef.current = null;

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      sampleAudioRef.current?.pause();
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
      stopTracks(stream);
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
    if (!audioBlob) {
      setError(t('dashboard.profiles.detail.voice.errors.recordBeforeSend'));
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const voice = await saveVoiceDetails();
      const nextVoiceId = String(voice.id);
      const file = await convertAudioBlobToMp3File(
        audioBlob,
        t('dashboard.profiles.detail.voice.errors.encoderFailed')
      );
      const voiceSample = await uploadVoiceSample({ file, language_code: voiceLanguageCode, voiceId: nextVoiceId });
      const providerRequest = await processVoiceSample({ sampleId: voiceSample.id, voiceId: nextVoiceId });
      setProfile((current) =>
        current
          ? {
              ...current,
              data: { ...(current.data ?? {}), voice_id: nextVoiceId },
              voice_clone_status: normalizeVoiceCloneStatus(providerRequest.status) ?? 'pending',
              voice_id: nextVoiceId,
            }
          : current
      );
      toast.success(t('dashboard.profiles.detail.voice.toasts.cloneStarted'));
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
  }, [audioBlob, saveVoiceDetails, t, voiceLanguageCode]);

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

  const hasConfiguredVoice = hasProfileVoiceEnabled(profile);
  const cloneActionLabel = hasConfiguredVoice
    ? t('dashboard.profiles.detail.voice.recloneVoice')
    : t('dashboard.profiles.detail.voice.cloneVoice');
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
        <ProfileGuideTutorialLink step="avatarAndVoice" />
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
                    {isCloneProcessing ? (
                      <Alert color="info">{t('dashboard.profiles.detail.voice.cloneProcessing')}</Alert>
                    ) : profile?.voice_clone_status === 'failed' ? (
                      <Alert color="error">{t('dashboard.profiles.detail.voice.cloneFailed')}</Alert>
                    ) : !hasConfiguredVoice ? (
                      <Alert color="warning">{t('dashboard.profiles.detail.voice.noClonedVoice')}</Alert>
                    ) : null}
                    <FormControl>
                      <InputLabel id="voice-language-label">
                        {t('dashboard.profiles.detail.voice.fields.language')}
                      </InputLabel>
                      <Select
                        label={t('dashboard.profiles.detail.voice.fields.language')}
                        labelId="voice-language-label"
                        onChange={(event) => {
                          setVoiceLanguageCode(normalizeVoiceLanguageCode(String(event.target.value)));
                        }}
                        value={voiceLanguageCode}
                      >
                        {VOICE_LANGUAGE_CODES.map((code) => (
                          <MenuItem key={code} value={code}>
                            {t(`dashboard.profiles.detail.voice.languages.${code}`)}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>{t('dashboard.profiles.detail.voice.fields.languageHelper')}</FormHelperText>
                    </FormControl>
                    {hasConfiguredVoice ? (
                      <React.Fragment>
                        <Box>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={voiceResponsesEnabled}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  setVoiceResponsesEnabled(checked);

                                  if (!checked) {
                                    setVoiceAutoplayEnabled(false);
                                  }
                                }}
                              />
                            }
                            label={t('dashboard.profiles.detail.voice.fields.voiceEnabled')}
                          />
                          <FormHelperText sx={{ ml: 4 }}>
                            {t('dashboard.profiles.detail.voice.fields.voiceEnabledHelper')}
                          </FormHelperText>
                        </Box>
                        <Box>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={Boolean(voiceResponsesEnabled && voiceAutoplayEnabled)}
                                disabled={!voiceResponsesEnabled}
                                onChange={(event) => {
                                  setVoiceAutoplayEnabled(event.target.checked);
                                }}
                              />
                            }
                            label={t('dashboard.profiles.detail.voice.fields.voiceAutoplayEnabled')}
                          />
                          <FormHelperText sx={{ ml: 4 }}>
                            {voiceResponsesEnabled
                              ? t('dashboard.profiles.detail.voice.fields.voiceAutoplayHelper')
                              : t('dashboard.profiles.detail.voice.fields.voiceAutoplayDisabledHelper')}
                          </FormHelperText>
                        </Box>
                      </React.Fragment>
                    ) : null}
                  </Stack>
                </Stack>
              </CardContent>
              <CardActions sx={{ justifyContent: hasConfiguredVoice ? 'space-between' : 'flex-end', p: 3, pt: 0 }}>
                {hasConfiguredVoice ? (
                  <Button disabled={isCreating || isUploading} onClick={handleSaveVoice} variant="outlined">
                    {t('dashboard.profiles.actions.save')}
                  </Button>
                ) : null}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    disabled={isCloneProcessing || isCreating || isUploading}
                    onClick={handleOpenSampleDialog}
                    startIcon={<MicrophoneIcon />}
                    variant="contained"
                  >
                    {isCloneProcessing ? t('dashboard.profiles.detail.voice.cloningVoice') : cloneActionLabel}
                  </Button>
                  {hasConfiguredVoice ? (
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
        <DialogTitle>{cloneActionLabel}</DialogTitle>
        <DialogContent sx={{ pb: sampleStep === 'intro' ? 0 : 3 }}>
          <Stack spacing={2.5}>
            {error ? <Alert color="error">{error}</Alert> : null}

            {sampleStep === 'intro' ? (
              <Box
                sx={{
                  '@keyframes voiceIntroFloat': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-8px)' },
                  },
                  alignItems: 'center',
                  border: '1px solid var(--mui-palette-divider)',
                  borderRadius: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 300,
                  justifyContent: 'center',
                  p: { xs: 3, sm: 4 },
                  textAlign: 'center',
                }}
              >
                <Box
                  sx={{
                    alignItems: 'center',
                    animation: 'voiceIntroFloat 3s ease-in-out infinite',
                    bgcolor: 'var(--mui-palette-primary-main)',
                    borderRadius: '50%',
                    color: 'var(--mui-palette-primary-contrastText)',
                    display: 'flex',
                    height: 88,
                    justifyContent: 'center',
                    mb: 2.5,
                    width: 88,
                  }}
                >
                  <MicrophoneIcon size={38} weight="fill" />
                </Box>
                <Typography variant="h5">{t('dashboard.profiles.detail.voice.cloneIntroTitle')}</Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 520, mt: 1.5 }} variant="body1">
                  {t('dashboard.profiles.detail.voice.cloneIntroDescription')}
                </Typography>
                <Button
                  disabled={isUploading}
                  onClick={handleStartRecording}
                  size="large"
                  startIcon={<MicrophoneIcon />}
                  sx={{
                    mt: 3,
                    px: 4,
                    transition: 'transform 180ms ease, box-shadow 180ms ease',
                    '&:hover': {
                      boxShadow: '0 12px 28px rgba(99, 102, 241, 0.28)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                  variant="contained"
                >
                  {t('dashboard.profiles.actions.startRecording')}
                </Button>
              </Box>
            ) : null}

            {sampleStep === 'countdown' ? (
              <Box
                sx={{
                  '@keyframes voiceCountdownPop': {
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
                  minHeight: 320,
                  p: { xs: 3, sm: 4 },
                  textAlign: 'center',
                }}
              >
                <Box
                  key={countdown}
                  sx={{
                    alignItems: 'center',
                    animation: 'voiceCountdownPop 760ms cubic-bezier(0.16, 1, 0.3, 1)',
                    bgcolor: 'var(--mui-palette-primary-main)',
                    borderRadius: '50%',
                    boxShadow: '0 20px 48px rgba(99, 102, 241, 0.28)',
                    color: 'var(--mui-palette-primary-contrastText)',
                    display: 'flex',
                    fontSize: { xs: 64, sm: 82 },
                    fontWeight: 800,
                    height: { xs: 132, sm: 156 },
                    justifyContent: 'center',
                    lineHeight: 1,
                    width: { xs: 132, sm: 156 },
                  }}
                >
                  {countdown}
                </Box>
                <Typography color="text.secondary" sx={{ mt: 3 }} variant="body1">
                  {t('dashboard.profiles.detail.voice.countdownTitle')}
                </Typography>
              </Box>
            ) : null}

            {sampleStep === 'recording' ? (
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    '@keyframes voiceRecordingPulse': {
                      '0%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0.45)' },
                      '70%': { boxShadow: '0 0 0 12px rgba(244, 67, 54, 0)' },
                      '100%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0)' },
                    },
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
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        animation: 'voiceRecordingPulse 1.3s infinite',
                        bgcolor: 'var(--mui-palette-error-main)',
                        borderRadius: '50%',
                        height: 14,
                        width: 14,
                      }}
                    />
                    <Box>
                      <Typography fontWeight={700} variant="subtitle2">
                        {t('dashboard.profiles.detail.voice.recordingLive')}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {formatDuration(recordingSeconds)}
                      </Typography>
                    </Box>
                  </Stack>
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
                    '@keyframes voiceScriptIn': {
                      '0%': { opacity: 0, transform: 'translateY(14px)' },
                      '100%': { opacity: 1, transform: 'translateY(0)' },
                    },
                    border: '1px solid var(--mui-palette-divider)',
                    borderRadius: 1,
                    p: { xs: 2.5, sm: 3 },
                    animation: 'voiceScriptIn 360ms ease-out',
                  }}
                >
                  <Stack spacing={2.5}>
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
                    <Typography
                      sx={{
                        fontSize: { xs: '1.24rem', sm: '1.55rem' },
                        fontWeight: 500,
                        lineHeight: 1.55,
                        minHeight: { xs: 210, sm: 250 },
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {sampleScriptParts[scriptPartIndex]}
                    </Typography>
                    <Button
                      disabled={isLastScriptPart}
                      endIcon={<ArrowRightIcon />}
                      onClick={handleNextScriptPart}
                      sx={{
                        '@keyframes voiceNextGlow': {
                          '0%, 100%': { boxShadow: '0 0 0 rgba(99, 102, 241, 0)' },
                          '50%': { boxShadow: '0 12px 28px rgba(99, 102, 241, 0.22)' },
                        },
                        alignSelf: { xs: 'stretch', sm: 'flex-end' },
                        animation: isLastScriptPart ? 'none' : 'voiceNextGlow 2s ease-in-out infinite',
                        px: 3,
                        transition: 'transform 180ms ease, box-shadow 180ms ease',
                        '&:hover': {
                          transform: isLastScriptPart ? 'none' : 'translateX(4px)',
                        },
                      }}
                      variant="contained"
                    >
                      {t('dashboard.profiles.detail.voice.continueReading')}
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            ) : null}

            {sampleStep === 'review' && audioUrl ? (
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    '@keyframes voiceReviewIn': {
                      '0%': { opacity: 0, transform: 'scale(0.98)' },
                      '100%': { opacity: 1, transform: 'scale(1)' },
                    },
                    animation: 'voiceReviewIn 260ms ease-out',
                    border: '1px solid var(--mui-palette-divider)',
                    borderRadius: 1,
                    p: { xs: 2.5, sm: 3 },
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
                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Button
                        onClick={handleToggleSamplePlayback}
                        startIcon={isSampleAudioPlaying ? <PauseIcon /> : <PlayIcon />}
                        sx={{ minWidth: 148 }}
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

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
                  <Button
                    disabled={isUploading}
                    onClick={handleRecordAgain}
                    startIcon={<MicrophoneIcon />}
                    variant="outlined"
                  >
                    {t('dashboard.profiles.detail.voice.recordAgain')}
                  </Button>
                  <Button
                    disabled={isCreating || isUploading || isRecording || !audioBlob}
                    onClick={handleUploadSample}
                    startIcon={<UploadSimpleIcon />}
                    variant="contained"
                  >
                    {isUploading
                      ? t('dashboard.profiles.detail.voice.uploadingSample')
                      : t('dashboard.profiles.detail.voice.saveSample')}
                  </Button>
                </Stack>
              </Stack>
            ) : null}
          </Stack>
        </DialogContent>
        {sampleStep === 'intro' ? (
          <DialogActions sx={{ justifyContent: 'flex-start', p: 3, pt: 2 }}>
            <Button color="secondary" disabled={isRecording || isUploading} onClick={handleSampleDialogClose}>
              {t('dashboard.profiles.actions.cancel')}
            </Button>
          </DialogActions>
        ) : null}
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
  return profile?.voice === true;
}

function getProfileVoiceResponsesEnabled(profile: Profile): boolean {
  if (!hasProfileVoiceEnabled(profile)) {
    return false;
  }

  if (typeof profile.voice_enabled === 'boolean') {
    return profile.voice_enabled;
  }

  if (typeof profile.data?.voice_enabled === 'boolean') {
    return profile.data.voice_enabled;
  }

  return true;
}

function getProfileVoiceAutoplayEnabled(profile: Profile): boolean {
  if (!getProfileVoiceResponsesEnabled(profile)) {
    return false;
  }

  if (typeof profile.voice_autoplay_enabled === 'boolean') {
    return profile.voice_autoplay_enabled;
  }

  if (typeof profile.data?.voice_autoplay_enabled === 'boolean') {
    return profile.data.voice_autoplay_enabled;
  }

  return true;
}

function isVoiceCloneProcessing(status: Profile['voice_clone_status']): boolean {
  return status === 'pending' || status === 'processing';
}

function normalizeVoiceCloneStatus(status: null | string | undefined): Profile['voice_clone_status'] {
  if (status === 'completed' || status === 'failed' || status === 'pending' || status === 'processing') {
    return status;
  }

  return null;
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

function normalizeVoiceLanguageCode(value: null | string | undefined): VoiceLanguageCode {
  return value === 'en' ? 'en' : DEFAULT_VOICE_LANGUAGE_CODE;
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
  return `bigmelo.profile.${profileId}.voiceId`;
}

function getLegacyVoiceStorageKey(profileId: string): string {
  return `voitity.profile.${profileId}.voiceId`;
}

function getStoredVoiceId(profileId: string): string {
  if (typeof window === 'undefined' || !profileId) {
    return '';
  }

  return (
    window.localStorage.getItem(getVoiceStorageKey(profileId)) ??
    window.localStorage.getItem(getLegacyVoiceStorageKey(profileId)) ??
    ''
  );
}

function storeVoiceId(profileId: string, voiceId: string): void {
  if (typeof window === 'undefined' || !profileId) {
    return;
  }

  window.localStorage.setItem(getVoiceStorageKey(profileId), voiceId);
  window.localStorage.removeItem(getLegacyVoiceStorageKey(profileId));
}

function clearStoredVoiceId(profileId: string): void {
  if (typeof window === 'undefined' || !profileId) {
    return;
  }

  window.localStorage.removeItem(getVoiceStorageKey(profileId));
  window.localStorage.removeItem(getLegacyVoiceStorageKey(profileId));
}

function stopTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
