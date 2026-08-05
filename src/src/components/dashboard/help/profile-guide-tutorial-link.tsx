'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { PlayCircle as PlayCircleIcon } from '@phosphor-icons/react/dist/ssr/PlayCircle';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { paths } from '@/paths';

export const profileGuideStepKeys = [
  'createProfile',
  'avatarAndVoice',
  'informationSources',
  'socialNetworks',
  'products',
] as const;

export type ProfileGuideStepKey = (typeof profileGuideStepKeys)[number];

interface ProfileGuideTutorial {
  faqKey: 'answerSources' | 'avatarAndVoice' | 'createPresence' | 'products' | 'socialNetworks';
  id: string;
  startSeconds?: number;
  thumbnailUrl: string;
  youtubeUrl: string;
}

export const profileGuideTutorials: Record<ProfileGuideStepKey, ProfileGuideTutorial> = {
  avatarAndVoice: {
    faqKey: 'avatarAndVoice',
    id: 'Rj1OGNxBBdg',
    thumbnailUrl: 'https://i.ytimg.com/vi/Rj1OGNxBBdg/hqdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=Rj1OGNxBBdg',
  },
  createProfile: {
    faqKey: 'createPresence',
    id: '4gJl-UWeIvU',
    thumbnailUrl: 'https://i.ytimg.com/vi/4gJl-UWeIvU/hqdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=4gJl-UWeIvU',
  },
  informationSources: {
    faqKey: 'answerSources',
    id: 'H2yMw2IFG00',
    startSeconds: 4,
    thumbnailUrl: 'https://i.ytimg.com/vi/H2yMw2IFG00/hqdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=H2yMw2IFG00&t=4s',
  },
  products: {
    faqKey: 'products',
    id: '_kuJeulksuA',
    thumbnailUrl: 'https://i.ytimg.com/vi/_kuJeulksuA/hqdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=_kuJeulksuA',
  },
  socialNetworks: {
    faqKey: 'socialNetworks',
    id: 'Jf3ylNa2zmM',
    thumbnailUrl: 'https://i.ytimg.com/vi/Jf3ylNa2zmM/hqdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=Jf3ylNa2zmM',
  },
};

interface ProfileGuideTutorialLinkProps {
  step: ProfileGuideStepKey;
}

export function ProfileGuideTutorialLink({ step }: ProfileGuideTutorialLinkProps): React.JSX.Element {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const tutorial = profileGuideTutorials[step];
  const stepNumber = profileGuideStepKeys.indexOf(step) + 1;
  const translationKey = `dashboard.help.guide.steps.${step}`;
  const linkLabel = String(t(`dashboard.help.guide.links.${step}`));
  const startParameter = tutorial.startSeconds === undefined ? '' : `&start=${tutorial.startSeconds}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${tutorial.id}?autoplay=1&playsinline=1&rel=0${startParameter}&origin=${encodeURIComponent(window.location.origin)}`;

  const handleViewGuide = React.useCallback((): void => {
    setOpen(false);
    navigate(`${paths.dashboard.help}?tab=guide`);
  }, [navigate]);

  return (
    <React.Fragment>
      <Link
        component="button"
        onClick={() => {
          setOpen(true);
        }}
        sx={{ alignItems: 'center', alignSelf: 'flex-start', display: 'inline-flex', fontWeight: 700, gap: 0.75 }}
        type="button"
        underline="hover"
        variant="body2"
      >
        <PlayCircleIcon size={18} weight="fill" />
        {linkLabel}
      </Link>

      <Dialog
        fullWidth
        maxWidth="md"
        onClose={() => {
          setOpen(false);
        }}
        open={open}
      >
        <DialogTitle sx={{ pb: 1.5, pr: 7 }}>
          <Stack spacing={0.5}>
            <Typography color="primary.main" fontWeight={700} variant="overline">
              {t('dashboard.help.guide.stepOfTotal', { number: stepNumber, total: profileGuideStepKeys.length })}
            </Typography>
            <Typography component="span" variant="h5">
              {linkLabel}
            </Typography>
          </Stack>
          <IconButton
            aria-label={String(t('dashboard.help.guide.close'))}
            onClick={() => {
              setOpen(false);
            }}
            sx={{ position: 'absolute', right: 16, top: 16 }}
          >
            <XIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography color="text.secondary" variant="body2">
              {t(`${translationKey}.description`)}
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
        <DialogActions sx={{ gap: 1, justifyContent: 'space-between', px: 3, py: 2 }}>
          <Button
            color="inherit"
            onClick={() => {
              setOpen(false);
            }}
          >
            {t('dashboard.help.guide.close')}
          </Button>
          <Button endIcon={<ArrowRightIcon />} onClick={handleViewGuide} variant="contained">
            {t('dashboard.help.guide.viewFullGuide')}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
