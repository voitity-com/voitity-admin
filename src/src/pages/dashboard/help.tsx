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
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { Books as BooksIcon } from '@phosphor-icons/react/dist/ssr/Books';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { ChatCircleDots as ChatCircleDotsIcon } from '@phosphor-icons/react/dist/ssr/ChatCircleDots';
import { IdentificationCard as IdentificationCardIcon } from '@phosphor-icons/react/dist/ssr/IdentificationCard';
import { Lifebuoy as LifebuoyIcon } from '@phosphor-icons/react/dist/ssr/Lifebuoy';
import { Play as PlayIcon } from '@phosphor-icons/react/dist/ssr/Play';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { UserCirclePlus as UserCirclePlusIcon } from '@phosphor-icons/react/dist/ssr/UserCirclePlus';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { config } from '@/config';
import { profileGuideTutorials } from '@/components/dashboard/help/profile-guide-tutorial-link';
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
type HelpTab = 'faq' | 'guide' | 'support';

interface FaqVideo {
  id: string;
  startSeconds?: number;
  thumbnailUrl: string;
  youtubeUrl: string;
}

const profileInformationVideo = profileGuideTutorials.informationSources;

const faqVideos: Partial<Record<FaqKey, FaqVideo>> = {
  answerAccuracy: profileInformationVideo,
  answerSources: profileInformationVideo,
  avatarAndVoice: profileGuideTutorials.avatarAndVoice,
  createPresence: profileGuideTutorials.createProfile,
  missingInformation: profileInformationVideo,
  products: profileGuideTutorials.products,
  socialNetworks: profileGuideTutorials.socialNetworks,
};

const guideSteps = [
  { faqKey: 'createPresence', icon: UserCirclePlusIcon, key: 'createProfile' },
  { faqKey: 'avatarAndVoice', icon: IdentificationCardIcon, key: 'avatarAndVoice' },
  { faqKey: 'answerSources', icon: BooksIcon, key: 'informationSources' },
  { faqKey: 'socialNetworks', icon: ShareNetworkIcon, key: 'socialNetworks' },
  { faqKey: 'products', icon: StorefrontIcon, key: 'products' },
] as const satisfies readonly { faqKey: FaqKey; icon: React.ElementType; key: string }[];

type GuideStep = (typeof guideSteps)[number];
type GuideStepKey = GuideStep['key'];

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

interface ProfileGuideProps {
  onSelectStep: (stepKey: GuideStepKey) => void;
}

function ProfileGuide({ onSelectStep }: ProfileGuideProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Stack spacing={0.75} sx={{ maxWidth: 760 }}>
          <Typography color="primary.main" fontWeight={700} letterSpacing={0.8} variant="overline">
            {t('dashboard.help.guide.eyebrow')}
          </Typography>
          <Typography variant="h5">{t('dashboard.help.guide.title')}</Typography>
          <Typography color="text.secondary" variant="body2">
            {t('dashboard.help.guide.description')}
          </Typography>
        </Stack>
        <Box
          sx={{
            alignSelf: { sm: 'flex-start' },
            bgcolor: 'primary.main',
            borderRadius: 999,
            color: 'primary.contrastText',
            fontSize: '0.75rem',
            fontWeight: 700,
            px: 1.5,
            py: 0.75,
            whiteSpace: 'nowrap',
          }}
        >
          {t('dashboard.help.guide.badge')}
        </Box>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
          },
        }}
      >
        {guideSteps.map((step, index) => {
          const video = faqVideos[step.faqKey];
          const StepIcon = step.icon;
          const translationKey = `dashboard.help.guide.steps.${step.key}`;

          if (!video) {
            return null;
          }

          return (
            <Card
              key={step.key}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
                height: '100%',
                minWidth: 0,
                overflow: 'hidden',
                transition: 'border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: '0 14px 34px rgba(15, 23, 42, 0.12)',
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardActionArea
                aria-label={String(
                  t('dashboard.help.guide.openAriaLabel', {
                    number: index + 1,
                    title: t(`${translationKey}.title`),
                  })
                )}
                onClick={() => {
                  onSelectStep(step.key);
                }}
                sx={{ alignItems: 'stretch', display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                <Box sx={{ aspectRatio: '16 / 9', bgcolor: 'common.black', overflow: 'hidden', position: 'relative' }}>
                  <Box
                    alt={String(t(`dashboard.help.faq.items.${step.faqKey}.video.thumbnailAlt`))}
                    component="img"
                    loading="lazy"
                    src={video.thumbnailUrl}
                    sx={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
                  />
                  <Box
                    sx={{
                      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.08) 25%, rgba(15, 23, 42, 0.72) 100%)',
                      inset: 0,
                      position: 'absolute',
                    }}
                  />
                  <Box
                    sx={{
                      alignItems: 'center',
                      bgcolor: 'rgba(255, 255, 255, 0.94)',
                      borderRadius: '50%',
                      color: 'primary.main',
                      display: 'flex',
                      height: 46,
                      justifyContent: 'center',
                      left: '50%',
                      position: 'absolute',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 46,
                    }}
                  >
                    <PlayIcon size={22} weight="fill" />
                  </Box>
                </Box>

                <CardContent
                  sx={{
                    display: 'flex',
                    flex: '1 1 auto',
                    flexDirection: 'column',
                    gap: 1.25,
                    p: 2,
                    width: '100%',
                    '&:last-child': { pb: 2 },
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.light',
                        color: 'primary.dark',
                        height: 34,
                        width: 34,
                      }}
                    >
                      <StepIcon size={18} weight="duotone" />
                    </Avatar>
                    <Typography
                      color="primary.main"
                      fontWeight={800}
                      sx={{ fontSize: '2.5rem', letterSpacing: '-0.04em', lineHeight: 1 }}
                    >
                      {t('dashboard.help.guide.stepLabel', { number: index + 1 })}
                    </Typography>
                  </Stack>
                  <Typography fontWeight={700} sx={{ lineHeight: 1.3 }} variant="subtitle1">
                    {t(`${translationKey}.title`)}
                  </Typography>
                  <Typography color="text.secondary" sx={{ flex: '1 1 auto' }} variant="body2">
                    {t(`${translationKey}.description`)}
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'primary.main', pt: 0.5 }}>
                    <PlayIcon size={16} weight="fill" />
                    <Typography fontWeight={700} variant="caption">
                      {t('dashboard.help.guide.watchTutorial')}
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Stack>
  );
}

interface GuideVideoDialogProps {
  onClose: () => void;
  step: GuideStep | null;
}

function GuideVideoDialog({ onClose, step }: GuideVideoDialogProps): React.JSX.Element | null {
  const { t } = useTranslation();

  if (!step) {
    return null;
  }

  const stepIndex = guideSteps.findIndex((guideStep) => guideStep.key === step.key);
  const translationKey = `dashboard.help.guide.steps.${step.key}`;
  const video = faqVideos[step.faqKey];

  if (!video) {
    return null;
  }

  const startParameter = video.startSeconds === undefined ? '' : `&start=${video.startSeconds}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&playsinline=1&rel=0${startParameter}&origin=${encodeURIComponent(window.location.origin)}`;

  return (
    <Dialog fullWidth maxWidth="md" onClose={onClose} open>
      <DialogTitle sx={{ pb: 1.5, pr: 7 }}>
        <Stack spacing={0.5}>
          <Typography color="primary.main" fontWeight={700} variant="overline">
            {t('dashboard.help.guide.stepOfTotal', { number: stepIndex + 1, total: guideSteps.length })}
          </Typography>
          <Typography component="span" variant="h5">
            {t(`${translationKey}.title`)}
          </Typography>
        </Stack>
        <IconButton
          aria-label={String(t('dashboard.help.guide.close'))}
          onClick={onClose}
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
            <Box
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              component="iframe"
              referrerPolicy="strict-origin-when-cross-origin"
              src={embedUrl}
              sx={{ border: 0, display: 'block', height: '100%', width: '100%' }}
              title={String(t(`dashboard.help.faq.items.${step.faqKey}.video.iframeTitle`))}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button color="inherit" onClick={onClose}>
          {t('dashboard.help.guide.close')}
        </Button>
        <Button component="a" href={video.youtubeUrl} rel="noopener noreferrer" target="_blank" variant="contained">
          {t('dashboard.help.guide.openOnYouTube')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function Page(): React.JSX.Element {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedFaq, setExpandedFaq] = React.useState<FaqKey | null>(null);
  const [selectedGuideStep, setSelectedGuideStep] = React.useState<GuideStepKey | null>(null);
  const [supportDialogOpen, setSupportDialogOpen] = React.useState(false);
  const requestedTab = searchParams.get('tab');
  const activeTab: HelpTab = requestedTab === 'faq' || requestedTab === 'support' ? requestedTab : 'guide';
  const activeGuideStep = guideSteps.find((step) => step.key === selectedGuideStep) ?? null;

  const selectTab = React.useCallback(
    (nextTab: HelpTab): void => {
      const nextSearchParams = new URLSearchParams(searchParams);

      if (nextTab === 'guide') {
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
              <Tab
                aria-controls="help-panel-guide"
                id="help-tab-guide"
                label={t('dashboard.help.tabs.guide')}
                value="guide"
              />
              <Tab aria-controls="help-panel-faq" id="help-tab-faq" label={t('dashboard.help.tabs.faq')} value="faq" />
              <Tab
                aria-controls="help-panel-support"
                id="help-tab-support"
                label={t('dashboard.help.tabs.support')}
                value="support"
              />
            </Tabs>
            <Divider />

            {activeTab === 'guide' ? (
              <Box aria-labelledby="help-tab-guide" id="help-panel-guide" role="tabpanel" sx={{ p: { xs: 2, sm: 3 } }}>
                <ProfileGuide onSelectStep={setSelectedGuideStep} />
              </Box>
            ) : null}

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
            ) : null}

            {activeTab === 'support' ? (
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
            ) : null}
          </Card>
        </Stack>
      </Box>
      <GuideVideoDialog
        onClose={() => {
          setSelectedGuideStep(null);
        }}
        step={activeGuideStep}
      />
      <SupportRequestDialog
        onClose={() => {
          setSupportDialogOpen(false);
        }}
        open={supportDialogOpen}
      />
    </React.Fragment>
  );
}
