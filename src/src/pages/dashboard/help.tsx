'use client';

import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { ChatCircleDots as ChatCircleDotsIcon } from '@phosphor-icons/react/dist/ssr/ChatCircleDots';
import { Lifebuoy as LifebuoyIcon } from '@phosphor-icons/react/dist/ssr/Lifebuoy';
import { Play as PlayIcon } from '@phosphor-icons/react/dist/ssr/Play';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { config } from '@/config';
import { SupportRequestDialog } from '@/components/dashboard/help/support-request-dialog';

const faqKeys = [
  'whatIsBigmelo',
  'audience',
  'createPresence',
  'avatarAndVoice',
  'answerSources',
  'missingInformation',
  'answerAccuracy',
  'visitorAccount',
  'textAndAudio',
  'socialNetworks',
  'products',
  'imageAndVoiceAuthorization',
  'plans',
  'trial',
  'limits',
  'annualLimits',
  'cancelRenewal',
  'paymentCurrency',
  'cardData',
  'dataDeletion',
] as const;

type FaqKey = (typeof faqKeys)[number];
type HelpTab = 'faq' | 'support';

interface FaqVideo {
  id: string;
  startSeconds?: number;
  thumbnailUrl: string;
  youtubeUrl: string;
}

const profileInformationVideo: FaqVideo = {
  id: 'H2yMw2IFG00',
  startSeconds: 4,
  thumbnailUrl: 'https://i.ytimg.com/vi/H2yMw2IFG00/hqdefault.jpg',
  youtubeUrl: 'https://www.youtube.com/watch?v=H2yMw2IFG00&t=4s',
};

const faqVideos: Partial<Record<FaqKey, FaqVideo>> = {
  answerAccuracy: profileInformationVideo,
  answerSources: profileInformationVideo,
  avatarAndVoice: {
    id: 'Rj1OGNxBBdg',
    thumbnailUrl: 'https://i.ytimg.com/vi/Rj1OGNxBBdg/hqdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=Rj1OGNxBBdg',
  },
  createPresence: {
    id: '4gJl-UWeIvU',
    thumbnailUrl: 'https://i.ytimg.com/vi/4gJl-UWeIvU/hqdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=4gJl-UWeIvU',
  },
  missingInformation: profileInformationVideo,
  products: {
    id: '_kuJeulksuA',
    thumbnailUrl: 'https://i.ytimg.com/vi/_kuJeulksuA/hqdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=_kuJeulksuA',
  },
  socialNetworks: {
    id: 'Jf3ylNa2zmM',
    thumbnailUrl: 'https://i.ytimg.com/vi/Jf3ylNa2zmM/hqdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=Jf3ylNa2zmM',
  },
};

interface FaqVideoTutorialProps {
  faqKey: FaqKey;
  video: FaqVideo;
}

function FaqVideoTutorial({ faqKey, video }: FaqVideoTutorialProps): React.JSX.Element {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = React.useState(false);
  const startParameter = video.startSeconds === undefined ? '' : `&start=${video.startSeconds}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&playsinline=1&rel=0${startParameter}&origin=${encodeURIComponent(window.location.origin)}`;
  const translationKey = `dashboard.help.faq.items.${faqKey}.video`;

  return (
    <Stack spacing={1.25} sx={{ maxWidth: 760, pt: 0.5 }}>
      <Typography fontWeight={600} variant="subtitle2">
        {t(`${translationKey}.title`)}
      </Typography>
      <Box
        sx={{
          aspectRatio: '16 / 9',
          bgcolor: 'common.black',
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
          width: '100%',
        }}
      >
        {isPlaying ? (
          <Box
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            component="iframe"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            src={embedUrl}
            sx={{ border: 0, display: 'block', height: '100%', width: '100%' }}
            title={String(t(`${translationKey}.iframeTitle`))}
          />
        ) : (
          <React.Fragment>
            <Box
              alt={String(t(`${translationKey}.thumbnailAlt`))}
              component="img"
              loading="lazy"
              src={video.thumbnailUrl}
              sx={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
            />
            <Box
              sx={{
                bgcolor: 'rgba(15, 23, 42, 0.34)',
                inset: 0,
                position: 'absolute',
              }}
            />
            <Button
              color="inherit"
              onClick={() => {
                setIsPlaying(true);
              }}
              startIcon={<PlayIcon size={20} weight="fill" />}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.94)',
                color: 'text.primary',
                left: '50%',
                position: 'absolute',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: 'common.white' },
              }}
              variant="contained"
            >
              {t(`${translationKey}.play`)}
            </Button>
          </React.Fragment>
        )}
      </Box>
      <Link
        href={video.youtubeUrl}
        rel="noopener noreferrer"
        sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
        target="_blank"
        variant="body2"
      >
        {t(`${translationKey}.openOnYouTube`)}
      </Link>
    </Stack>
  );
}

export function Page(): React.JSX.Element {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedFaq, setExpandedFaq] = React.useState<FaqKey | null>(null);
  const [supportDialogOpen, setSupportDialogOpen] = React.useState(false);
  const activeTab: HelpTab = searchParams.get('tab') === 'support' ? 'support' : 'faq';

  const selectTab = React.useCallback(
    (nextTab: HelpTab): void => {
      const nextSearchParams = new URLSearchParams(searchParams);

      if (nextTab === 'faq') {
        nextSearchParams.delete('tab');
      } else {
        nextSearchParams.set('tab', nextTab);
      }

      setSearchParams(nextSearchParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );
  const handleTabChange = React.useCallback(
    (_event: React.SyntheticEvent, nextTab: HelpTab): void => {
      selectTab(nextTab);
    },
    [selectTab]
  );

  return (
    <React.Fragment>
      <Helmet>
        <title>{t('dashboard.help.pageTitle', { product: config.site.name })}</title>
      </Helmet>
      <Box
        sx={{
          maxWidth: 'var(--Content-maxWidth)',
          m: 'var(--Content-margin)',
          p: 'var(--Content-padding)',
          width: 'var(--Content-width)',
        }}
      >
        <Stack spacing={4}>
          <Stack spacing={0.75}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <LifebuoyIcon fontSize="var(--icon-fontSize-lg)" />
              <Typography variant="h4">{t('dashboard.help.title')}</Typography>
            </Stack>
            <Typography color="text.secondary" variant="body2">
              {t('dashboard.help.description')}
            </Typography>
          </Stack>

          <Card>
            <Tabs
              aria-label={t('dashboard.help.tabs.ariaLabel')}
              onChange={handleTabChange}
              sx={{ px: { xs: 1, sm: 2 } }}
              value={activeTab}
              variant="scrollable"
            >
              <Tab aria-controls="help-panel-faq" id="help-tab-faq" label={t('dashboard.help.tabs.faq')} value="faq" />
              <Tab
                aria-controls="help-panel-support"
                id="help-tab-support"
                label={t('dashboard.help.tabs.support')}
                value="support"
              />
            </Tabs>
            <Divider />

            {activeTab === 'faq' ? (
              <Box aria-labelledby="help-tab-faq" id="help-panel-faq" role="tabpanel" sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={3}>
                  <Stack spacing={0.5}>
                    <Typography variant="h5">{t('dashboard.help.faq.title')}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {t('dashboard.help.faq.description')}
                    </Typography>
                  </Stack>

                  <Stack spacing={1.25}>
                    {faqKeys.map((faqKey) => {
                      const expanded = expandedFaq === faqKey;
                      const video = faqVideos[faqKey];

                      return (
                        <Accordion
                          disableGutters
                          elevation={0}
                          expanded={expanded}
                          key={faqKey}
                          onChange={(_event, nextExpanded) => {
                            setExpandedFaq(nextExpanded ? faqKey : null);
                          }}
                          sx={{
                            border: '1px solid',
                            borderColor: expanded ? 'primary.main' : 'divider',
                            borderRadius: '8px !important',
                            overflow: 'hidden',
                            transition: 'border-color 160ms ease, box-shadow 160ms ease',
                            '&:before': { display: 'none' },
                            '&.Mui-expanded': {
                              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                              m: 0,
                            },
                          }}
                        >
                          <AccordionSummary
                            aria-controls={`faq-${faqKey}-content`}
                            expandIcon={<CaretDownIcon />}
                            id={`faq-${faqKey}-header`}
                            sx={{
                              minHeight: 60,
                              px: { xs: 2, sm: 2.5 },
                              '& .MuiAccordionSummary-content': { my: 1.5 },
                            }}
                          >
                            <Typography fontWeight={600} variant="subtitle1">
                              {t(`dashboard.help.faq.items.${faqKey}.question`)}
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5, pt: 0 }}>
                            <Stack spacing={2}>
                              <Typography color="text.secondary" sx={{ maxWidth: 920 }} variant="body2">
                                {t(`dashboard.help.faq.items.${faqKey}.answer`)}
                              </Typography>
                              {expanded && video ? <FaqVideoTutorial faqKey={faqKey} video={video} /> : null}
                            </Stack>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </Stack>

                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{
                      alignItems: { sm: 'center' },
                      bgcolor: 'var(--mui-palette-background-level1)',
                      borderRadius: 1,
                      justifyContent: 'space-between',
                      p: 2,
                    }}
                  >
                    <Typography fontWeight={600} variant="body2">
                      {t('dashboard.help.faq.stillNeedHelp')}
                    </Typography>
                    <Button
                      onClick={() => {
                        selectTab('support');
                      }}
                      variant="outlined"
                    >
                      {t('dashboard.help.faq.openSupport')}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ) : (
              <Box
                aria-labelledby="help-tab-support"
                id="help-panel-support"
                role="tabpanel"
                sx={{ p: { xs: 2, sm: 3 } }}
              >
                <Stack spacing={3}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={{ xs: 2, md: 3 }}
                    sx={{ alignItems: { md: 'center' } }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: 'primary.light',
                        color: 'primary.dark',
                        height: { xs: 48, sm: 56 },
                        width: { xs: 48, sm: 56 },
                      }}
                    >
                      <ChatCircleDotsIcon fontSize="var(--icon-fontSize-xl)" />
                    </Avatar>
                    <Stack spacing={0.75} sx={{ flex: '1 1 auto' }}>
                      <Typography variant="h5">{t('dashboard.help.support.title')}</Typography>
                      <Typography color="text.secondary" sx={{ maxWidth: 720 }} variant="body2">
                        {t('dashboard.help.support.description')}
                      </Typography>
                    </Stack>
                    <Button
                      onClick={() => {
                        setSupportDialogOpen(true);
                      }}
                      sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                      variant="contained"
                    >
                      {t('dashboard.help.support.actions.contact')}
                    </Button>
                  </Stack>

                  <Divider />

                  <Stack spacing={1.5}>
                    <Typography variant="h6">{t('dashboard.help.support.requestTitle')}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {t('dashboard.help.support.requestDescription')}
                    </Typography>
                    <Box component="ul" sx={{ color: 'text.secondary', m: 0, pl: 3 }}>
                      <Typography component="li" sx={{ mb: 1 }} variant="body2">
                        {t('dashboard.help.support.requestItems.account')}
                      </Typography>
                      <Typography component="li" sx={{ mb: 1 }} variant="body2">
                        {t('dashboard.help.support.requestItems.profile')}
                      </Typography>
                      <Typography component="li" variant="body2">
                        {t('dashboard.help.support.requestItems.evidence')}
                      </Typography>
                    </Box>
                  </Stack>

                  <Alert severity="info">
                    {t('dashboard.help.support.privacyPrefix')}{' '}
                    <Link href="mailto:privacy@bigmelo.com">privacy@bigmelo.com</Link>.
                  </Alert>
                </Stack>
              </Box>
            )}
          </Card>
        </Stack>
      </Box>
      <SupportRequestDialog
        onClose={() => {
          setSupportDialogOpen(false);
        }}
        open={supportDialogOpen}
      />
    </React.Fragment>
  );
}
