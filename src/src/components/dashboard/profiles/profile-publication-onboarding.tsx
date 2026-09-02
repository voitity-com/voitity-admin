'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Fade from '@mui/material/Fade';
import GlobalStyles from '@mui/material/GlobalStyles';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import type { PopoverOrigin } from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { File as FileIcon } from '@phosphor-icons/react/dist/ssr/File';
import { Image as ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { RocketLaunch as RocketLaunchIcon } from '@phosphor-icons/react/dist/ssr/RocketLaunch';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import type { Profile, ProfilePublicationRequirement } from '@/lib/profiles/api-client';
import { getProfile } from '@/lib/profiles/api-client';
import { useDelayedOpen } from '@/hooks/use-delayed-open';
import { useMediaQuery } from '@/hooks/use-media-query';
import { usePathname } from '@/hooks/use-pathname';

type StepKey = 'avatar' | 'publication' | 'source';

interface OnboardingStep {
  key: StepKey;
  targetId: string;
}

const publicationTargetId = 'profile-publication-dock';
const onboardingDelayMs = 500;
const onboardingTransitionMs = 260;
const onboardingStoragePrefix = 'bigmelo.profilePublicationOnboarding';

const stepTargets = {
  avatar: 'profile-detail-nav-avatar',
  publication: publicationTargetId,
  source: 'profile-detail-nav-sources',
} satisfies Record<StepKey, string>;

export function ProfilePublicationOnboarding(): React.JSX.Element | null {
  const pathname = usePathname();
  const navigate = useNavigate();
  const { profileId = '' } = useParams();
  const { t } = useTranslation();
  const isMobile = useMediaQuery('down', 'sm');
  const [activeIndex, setActiveIndex] = React.useState<number>(0);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [dismissed, setDismissed] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [profile, setProfile] = React.useState<Profile | null>(null);

  const loadProfile = React.useCallback(async (): Promise<void> => {
    if (!profileId) {
      return;
    }

    setIsLoading(true);

    try {
      setProfile(await getProfile(profileId));
    } catch (err) {
      logger.error(err);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  React.useEffect(() => {
    const stored = readOnboardingState(profileId);
    setActiveIndex(stored.activeIndex);
    setAnchorEl(null);
    setDismissed(stored.dismissed);
  }, [profileId]);

  React.useEffect(() => {
    loadProfile().catch((err) => {
      logger.error(err);
    });
  }, [loadProfile, pathname]);

  React.useEffect(() => {
    const handleRefresh = (): void => {
      loadProfile().catch((err) => {
        logger.error(err);
      });
    };
    const handleRestart = (): void => {
      writeOnboardingState(profileId, { activeIndex: 0, dismissed: false });
      setActiveIndex(0);
      setDismissed(false);
    };

    window.addEventListener('profile-publication:changed', handleRefresh);
    window.addEventListener('profile-publication:refresh', handleRefresh);
    window.addEventListener('profile-publication:onboarding-restart', handleRestart);

    return () => {
      window.removeEventListener('profile-publication:changed', handleRefresh);
      window.removeEventListener('profile-publication:refresh', handleRefresh);
      window.removeEventListener('profile-publication:onboarding-restart', handleRestart);
    };
  }, [loadProfile, profileId]);

  const requirements = React.useMemo(() => profile?.publication?.requirements ?? [], [profile]);
  const missingRequirements = React.useMemo(
    () => requirements.filter((requirement) => !requirement.passed),
    [requirements]
  );
  const steps = React.useMemo(() => buildSteps({ missingRequirements, profile }), [missingRequirements, profile]);

  React.useEffect(() => {
    if (activeIndex >= steps.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, steps.length]);

  const openReady = !dismissed && !isLoading && steps.length > 0;
  const open = useDelayedOpen(openReady, onboardingDelayMs);
  const activeStep = open ? steps[activeIndex] : undefined;

  React.useEffect(() => {
    if (!activeStep) {
      setAnchorEl(null);
      return undefined;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const nextAnchorEl = document.getElementById(activeStep.targetId);

      if (!nextAnchorEl) {
        setAnchorEl(null);

        // The compact navigation only renders the active item, so the Avatar and
        // Sources anchors are intentionally absent on phones. The mobile guide is
        // a fixed panel and does not need an anchor to show those steps.
        if (isMobile) {
          return;
        }

        if (activeIndex < steps.length - 1) {
          setActiveIndex((current) => current + 1);
        } else {
          setDismissed(true);
        }
        return;
      }

      nextAnchorEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
      setAnchorEl(nextAnchorEl);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [activeIndex, activeStep, isMobile, steps.length]);

  if (!activeStep) {
    return null;
  }

  const isLastStep = activeIndex === steps.length - 1;
  const missingItems = formatMissingRequirements(missingRequirements, t);

  const handleNext = (): void => {
    if (isLastStep) {
      setDismissed(true);
      writeOnboardingState(profileId, { activeIndex: 0, dismissed: true });
      return;
    }

    setActiveIndex((current) => {
      const nextIndex = current + 1;
      writeOnboardingState(profileId, { activeIndex: nextIndex, dismissed: false });
      return nextIndex;
    });
  };

  const handleClose = (): void => {
    setDismissed(true);
    writeOnboardingState(profileId, { activeIndex, dismissed: true });
  };

  const handleStepAction = (step: OnboardingStep): void => {
    const href = getStepHref(step.key, profileId);

    if (!href) {
      handleNext();
      return;
    }

    setDismissed(true);
    writeOnboardingState(profileId, { activeIndex, dismissed: true });
    navigate(href);
  };

  return (
    <React.Fragment>
      <GlobalStyles styles={(theme) => getSpotlightStyles(activeStep.targetId, theme.zIndex.modal + 2)} />
      <Fade in={open} mountOnEnter timeout={onboardingTransitionMs} unmountOnExit>
        <Box
          sx={(theme) => ({
            backdropFilter: 'blur(2px)',
            bgcolor: 'rgba(15, 23, 42, 0.72)',
            inset: 0,
            position: 'fixed',
            zIndex: theme.zIndex.modal,
          })}
        />
      </Fade>
      <OnboardingPopover
        anchorEl={anchorEl}
        currentStep={activeIndex + 1}
        isLastStep={isLastStep}
        missingItems={missingItems}
        onClose={handleClose}
        onNext={handleNext}
        onStepAction={handleStepAction}
        open={open}
        step={activeStep}
        totalSteps={steps.length}
      />
    </React.Fragment>
  );
}

function OnboardingPopover({
  anchorEl,
  currentStep,
  isLastStep,
  missingItems,
  onClose,
  onNext,
  onStepAction,
  open,
  step,
  totalSteps,
}: {
  anchorEl: HTMLElement | null;
  currentStep: number;
  isLastStep: boolean;
  missingItems: string;
  onClose: () => void;
  onNext: () => void;
  onStepAction: (step: OnboardingStep) => void;
  open: boolean;
  step: OnboardingStep;
  totalSteps: number;
}): React.JSX.Element {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('down', 'sm');
  const popoverOpen = open ? Boolean(anchorEl) : false;
  const origins = getPopoverOrigins(step.key);

  if (isMobile) {
    return (
      <MobileOnboardingPanel
        currentStep={currentStep}
        isLastStep={isLastStep}
        missingItems={missingItems}
        onClose={onClose}
        onNext={onNext}
        onStepAction={onStepAction}
        open={open}
        step={step}
        totalSteps={totalSteps}
      />
    );
  }

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={origins.anchorOrigin}
      disableScrollLock
      hideBackdrop
      open={popoverOpen}
      slotProps={{
        paper: {
          sx: {
            border: '1px solid rgba(255, 255, 255, 0.32)',
            boxShadow: '0 24px 80px rgba(15, 23, 42, 0.42)',
            maxWidth: 'calc(100vw - 32px)',
            width: { sm: 430, xs: 'calc(100vw - 32px)' },
          },
        },
        root: {
          sx: (theme) => ({
            pointerEvents: 'none',
            zIndex: theme.zIndex.modal + 3,
          }),
        },
      }}
      transformOrigin={origins.transformOrigin}
      transitionDuration={onboardingTransitionMs}
    >
      <Stack spacing={2.5} sx={{ pointerEvents: 'auto', p: { sm: 3, xs: 2.5 } }}>
        <Stack direction="row" spacing={1.5}>
          <Box
            sx={{
              alignItems: 'center',
              bgcolor: 'primary.main',
              borderRadius: 1.5,
              color: 'primary.contrastText',
              display: 'flex',
              flex: '0 0 auto',
              height: 44,
              justifyContent: 'center',
              width: 44,
            }}
          >
            {renderStepIcon(step.key)}
          </Box>
          <Stack spacing={0.5} sx={{ flex: '1 1 auto', minWidth: 0 }}>
            <Typography color="primary.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }} variant="caption">
              {t(`dashboard.profiles.detail.onboarding.steps.${step.key}.eyebrow`)}
            </Typography>
            <Typography variant="h6">{t(`dashboard.profiles.detail.onboarding.steps.${step.key}.title`)}</Typography>
          </Stack>
          <IconButton
            aria-label={t('dashboard.profiles.detail.onboarding.actions.close')}
            edge="end"
            onClick={onClose}
            size="small"
          >
            <XIcon />
          </IconButton>
        </Stack>
        <Stack spacing={1}>
          <Typography color="text.secondary" variant="body2">
            {t(`dashboard.profiles.detail.onboarding.steps.${step.key}.description`, { items: missingItems })}
          </Typography>
          {step.key === 'publication' ? (
            <Typography color="text.secondary" sx={{ fontWeight: 600 }} variant="caption">
              {t('dashboard.profiles.detail.onboarding.missingItems', { items: missingItems })}
            </Typography>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography color="text.secondary" variant="caption">
            {t('dashboard.profiles.detail.onboarding.progress', { current: currentStep, total: totalSteps })}
          </Typography>
          <Button endIcon={isLastStep ? <CheckCircleIcon /> : <ArrowRightIcon />} onClick={onNext} variant="contained">
            {isLastStep
              ? t('dashboard.profiles.detail.onboarding.actions.finish')
              : t('dashboard.profiles.detail.onboarding.actions.next')}
          </Button>
        </Stack>
      </Stack>
    </Popover>
  );
}

function MobileOnboardingPanel({
  currentStep,
  isLastStep,
  missingItems,
  onClose,
  onNext,
  onStepAction,
  open,
  step,
  totalSteps,
}: {
  currentStep: number;
  isLastStep: boolean;
  missingItems: string;
  onClose: () => void;
  onNext: () => void;
  onStepAction: (step: OnboardingStep) => void;
  open: boolean;
  step: OnboardingStep;
  totalSteps: number;
}): React.JSX.Element {
  const { t } = useTranslation();
  const hasStepAction = step.key !== 'publication';
  const bottomOffset = 'calc(88px + env(safe-area-inset-bottom))';

  return (
    <Fade in={open} mountOnEnter timeout={onboardingTransitionMs} unmountOnExit>
      <Paper
        elevation={24}
        role="dialog"
        sx={(theme) => ({
          border: '1px solid rgba(255, 255, 255, 0.32)',
          borderRadius: 2,
          bottom: bottomOffset,
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.42)',
          left: 16,
          maxHeight: 'calc(100dvh - 176px)',
          overflowY: 'auto',
          p: 2.5,
          position: 'fixed',
          right: 16,
          zIndex: theme.zIndex.modal + 3,
        })}
      >
        <Stack spacing={2.25}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <Box
              sx={{
                alignItems: 'center',
                bgcolor: 'primary.main',
                borderRadius: 1.5,
                color: 'primary.contrastText',
                display: 'flex',
                flex: '0 0 auto',
                height: 44,
                justifyContent: 'center',
                width: 44,
              }}
            >
              {renderStepIcon(step.key)}
            </Box>
            <Stack spacing={0.5} sx={{ flex: '1 1 auto', minWidth: 0 }}>
              <Typography color="primary.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }} variant="caption">
                {t(`dashboard.profiles.detail.onboarding.steps.${step.key}.eyebrow`)}
              </Typography>
              <Typography variant="h6">{t(`dashboard.profiles.detail.onboarding.steps.${step.key}.title`)}</Typography>
            </Stack>
            <IconButton
              aria-label={t('dashboard.profiles.detail.onboarding.actions.close')}
              edge="end"
              onClick={onClose}
              size="small"
            >
              <XIcon />
            </IconButton>
          </Stack>
          <Stack spacing={1}>
            <Typography color="text.secondary" variant="body2">
              {t(`dashboard.profiles.detail.onboarding.steps.${step.key}.mobileDescription`, { items: missingItems })}
            </Typography>
            {step.key === 'publication' ? (
              <Typography color="text.primary" sx={{ fontWeight: 600 }} variant="body2">
                {t('dashboard.profiles.detail.onboarding.missingItems', { items: missingItems })}
              </Typography>
            ) : null}
          </Stack>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography color="text.secondary" variant="caption">
              {t('dashboard.profiles.detail.onboarding.progress', { current: currentStep, total: totalSteps })}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ minWidth: 0 }}>
              {hasStepAction && !isLastStep ? (
                <Button color="secondary" onClick={onNext} size="small" variant="outlined">
                  {t('dashboard.profiles.detail.onboarding.actions.next')}
                </Button>
              ) : null}
              {hasStepAction ? (
                <Button
                  endIcon={<ArrowRightIcon />}
                  onClick={() => {
                    onStepAction(step);
                  }}
                  size="small"
                  variant="contained"
                >
                  {t(`dashboard.profiles.detail.onboarding.actions.goTo.${step.key}`)}
                </Button>
              ) : (
                <Button
                  endIcon={isLastStep ? <CheckCircleIcon /> : <ArrowRightIcon />}
                  onClick={onNext}
                  size="small"
                  variant="contained"
                >
                  {isLastStep
                    ? t('dashboard.profiles.detail.onboarding.actions.finish')
                    : t('dashboard.profiles.detail.onboarding.actions.next')}
                </Button>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </Fade>
  );
}

function buildSteps({
  missingRequirements,
  profile,
}: {
  missingRequirements: ProfilePublicationRequirement[];
  profile: Profile | null;
}): OnboardingStep[] {
  if (!profile) {
    return [];
  }

  const missingKeys = new Set(missingRequirements.map((requirement) => requirement.key));
  if (missingRequirements.length === 0) {
    return [];
  }

  const steps: OnboardingStep[] = [];

  if (missingKeys.has('avatar')) {
    steps.push({ key: 'avatar', targetId: stepTargets.avatar });
  }

  if (missingKeys.has('source')) {
    steps.push({ key: 'source', targetId: stepTargets.source });
  }

  if (missingRequirements.length > 0) {
    steps.push({ key: 'publication', targetId: stepTargets.publication });
  }

  return steps;
}

function formatMissingRequirements(
  requirements: ProfilePublicationRequirement[],
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  return requirements
    .map((requirement) =>
      t(`dashboard.profiles.detail.publicationDock.requirements.${requirement.key}`, {
        defaultValue: requirement.key,
      })
    )
    .join(', ');
}

function getStepHref(key: StepKey, profileId: string): null | string {
  if (!profileId) {
    return null;
  }

  if (key === 'avatar') {
    return paths.dashboard.profileDetails.avatar(profileId);
  }

  if (key === 'source') {
    return paths.dashboard.profileDetails.sources(profileId);
  }

  return null;
}

function getPopoverOrigins(key: StepKey): { anchorOrigin: PopoverOrigin; transformOrigin: PopoverOrigin } {
  if (key === 'avatar' || key === 'source') {
    return {
      anchorOrigin: { horizontal: 'right', vertical: 'center' },
      transformOrigin: { horizontal: 'left', vertical: 'center' },
    };
  }

  return {
    anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
    transformOrigin: { horizontal: 'right', vertical: 'top' },
  };
}

function getSpotlightStyles(targetId: string, zIndex: number): Record<string, unknown> {
  const selector = `#${targetId}`;
  const isNavItem = targetId === stepTargets.avatar || targetId === stepTargets.source;

  return {
    ...(isNavItem
      ? {
          '#profile-detail-side-nav': {
            position: 'sticky',
            zIndex,
          },
          '#profile-detail-side-nav li': {
            opacity: 0.34,
            transition: 'opacity 160ms ease',
          },
          '#profile-detail-side-nav li a': {
            pointerEvents: 'none',
          },
        }
      : {}),
    [selector]: {
      backgroundColor: isNavItem ? 'var(--mui-palette-background-paper)' : undefined,
      borderRadius: isNavItem ? '8px' : undefined,
      boxShadow: '0 0 0 8px rgba(255, 255, 255, 0.22), 0 24px 70px rgba(15, 23, 42, 0.45)',
      outline: '2px solid rgba(255, 255, 255, 0.75)',
      outlineOffset: '4px',
      opacity: isNavItem ? 1 : undefined,
      pointerEvents: 'none',
      position: 'relative',
      zIndex: zIndex + 1,
    },
    [`${selector} > a`]: {
      backgroundColor: isNavItem ? 'var(--mui-palette-background-paper)' : undefined,
      color: isNavItem ? 'var(--mui-palette-text-primary)' : undefined,
    },
    [`#profile-detail-side-nav ${selector}`]: {
      opacity: isNavItem ? 1 : undefined,
    },
    [`${selector} svg`]: {
      color: isNavItem ? 'var(--mui-palette-text-primary)' : undefined,
      fill: isNavItem ? 'var(--mui-palette-text-primary)' : undefined,
    },
  };
}

function renderStepIcon(key: StepKey): React.JSX.Element {
  const iconProps = { fontSize: 'var(--icon-fontSize-md)', weight: 'bold' } as const;

  if (key === 'avatar') {
    return <ImageIcon {...iconProps} />;
  }

  if (key === 'source') {
    return <FileIcon {...iconProps} />;
  }

  return <RocketLaunchIcon {...iconProps} />;
}

interface StoredOnboardingState {
  activeIndex: number;
  dismissed: boolean;
}

function readOnboardingState(profileId: string): StoredOnboardingState {
  if (!profileId || typeof window === 'undefined') return { activeIndex: 0, dismissed: false };

  try {
    const raw = window.localStorage.getItem(`${onboardingStoragePrefix}.${profileId}`);
    if (!raw) return { activeIndex: 0, dismissed: false };
    const parsed = JSON.parse(raw) as Partial<StoredOnboardingState>;

    return {
      activeIndex:
        Number.isInteger(parsed.activeIndex) && Number(parsed.activeIndex) >= 0 ? Number(parsed.activeIndex) : 0,
      dismissed: parsed.dismissed === true,
    };
  } catch {
    return { activeIndex: 0, dismissed: false };
  }
}

function writeOnboardingState(profileId: string, state: StoredOnboardingState): void {
  if (!profileId || typeof window === 'undefined') return;
  window.localStorage.setItem(`${onboardingStoragePrefix}.${profileId}`, JSON.stringify(state));
}
