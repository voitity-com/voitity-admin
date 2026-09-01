'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useTranslation } from 'react-i18next';

import { logger } from '@/lib/default-logger';
import { getSubscriptionLimits, SubscriptionApiError } from '@/lib/subscription/api-client';
import { useUser } from '@/hooks/use-user';
import { profileGuideStepKeys, profileGuideTutorials } from '@/components/dashboard/help/profile-guide-tutorial-link';

import { useNoPlanTutorial } from './no-plan-tutorial-context';

const tutorialStep = 'createProfile';

export function NoPlanTutorialDialog(): React.JSX.Element {
  const { t } = useTranslation();
  const { user } = useUser();
  const { setStatus, status } = useNoPlanTutorial();
  const open = status === 'open';
  const tutorial = profileGuideTutorials[tutorialStep];
  const stepNumber = profileGuideStepKeys.indexOf(tutorialStep) + 1;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${tutorial.id}?autoplay=1&playsinline=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`;

  React.useEffect(() => {
    let isMounted = true;

    setStatus('checking');

    if (!user?.id) {
      setStatus('not-required');

      return () => {
        isMounted = false;
      };
    }

    getSubscriptionLimits()
      .then(() => {
        if (isMounted) {
          setStatus('not-required');
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) {
          return;
        }

        if (err instanceof SubscriptionApiError && err.status === 404) {
          setStatus('open');
          return;
        }

        logger.error(err);
        setStatus('not-required');
      });

    return () => {
      isMounted = false;
    };
  }, [setStatus, user?.id]);

  return (
    <Dialog aria-labelledby="no-plan-tutorial-dialog-title" disableEscapeKeyDown fullWidth maxWidth="md" open={open}>
      <DialogTitle id="no-plan-tutorial-dialog-title" sx={{ pb: 1.5, pr: 7 }}>
        <Stack spacing={0.5}>
          <Typography color="primary.main" fontWeight={700} variant="overline">
            {t('dashboard.help.guide.stepOfTotal', { number: stepNumber, total: profileGuideStepKeys.length })}
          </Typography>
          <Typography component="span" variant="h5">
            {t('dashboard.help.guide.steps.createProfile.title')}
          </Typography>
        </Stack>
        <IconButton
          aria-label={String(t('dashboard.help.guide.close'))}
          onClick={() => {
            setStatus('closed');
          }}
          sx={{ position: 'absolute', right: 16, top: 16 }}
        >
          <XIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography color="text.secondary" variant="body2">
            {t('dashboard.help.guide.steps.createProfile.description')}
          </Typography>
          <Box
            sx={{
              aspectRatio: '16 / 9',
              bgcolor: 'common.black',
              borderRadius: 2,
              overflow: 'hidden',
              width: '100%',
            }}
          >
            {open ? (
              <Box
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                component="iframe"
                referrerPolicy="strict-origin-when-cross-origin"
                src={embedUrl}
                sx={{ border: 0, display: 'block', height: '100%', width: '100%' }}
                title={String(t(`dashboard.help.faq.items.${tutorial.faqKey}.video.iframeTitle`))}
              />
            ) : null}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
