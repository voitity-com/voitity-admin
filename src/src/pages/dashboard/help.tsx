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
import { ArrowSquareOut as ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { ChatCircleDots as ChatCircleDotsIcon } from '@phosphor-icons/react/dist/ssr/ChatCircleDots';
import { Lifebuoy as LifebuoyIcon } from '@phosphor-icons/react/dist/ssr/Lifebuoy';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { config } from '@/config';

const faqKeys = [
  'whatIsBigmelo',
  'audience',
  'createPresence',
  'answerSources',
  'missingInformation',
  'answerAccuracy',
  'visitorAccount',
  'textAndAudio',
  'socialAndProducts',
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

export function Page(): React.JSX.Element {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedFaq, setExpandedFaq] = React.useState<FaqKey | null>(null);
  const activeTab: HelpTab = searchParams.get('tab') === 'support' ? 'support' : 'faq';
  const contactUrl = `${config.publicProfile.baseUrl.replace(/\/+$/, '')}/#contact`;

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
              <Tab
                aria-controls="help-panel-faq"
                id="help-tab-faq"
                label={t('dashboard.help.tabs.faq')}
                value="faq"
              />
              <Tab
                aria-controls="help-panel-support"
                id="help-tab-support"
                label={t('dashboard.help.tabs.support')}
                value="support"
              />
            </Tabs>
            <Divider />

            {activeTab === 'faq' ? (
              <Box
                aria-labelledby="help-tab-faq"
                id="help-panel-faq"
                role="tabpanel"
                sx={{ p: { xs: 2, sm: 3 } }}
              >
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
                          <AccordionDetails
                            sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5, pt: 0 }}
                          >
                            <Typography color="text.secondary" sx={{ maxWidth: 920 }} variant="body2">
                              {t(`dashboard.help.faq.items.${faqKey}.answer`)}
                            </Typography>
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
                      component="a"
                      endIcon={<ArrowSquareOutIcon />}
                      href={contactUrl}
                      rel="noreferrer"
                      sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                      target="_blank"
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
    </React.Fragment>
  );
}
