'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { FileCsv as FileCsvIcon } from '@phosphor-icons/react/dist/ssr/FileCsv';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { TelegramLogo as TelegramLogoIcon } from '@phosphor-icons/react/dist/ssr/TelegramLogo';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { WhatsappLogo as WhatsappLogoIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type { Metadata } from '@/types/metadata';
import { config } from '@/config';
import { logger } from '@/lib/default-logger';
import { getProfileFeatures, isFeatureEffective } from '@/lib/features/api-client';
import type {
  ProfileProduct,
  ProfileProductDestinationType,
  ProfileProductInput,
  ProfileProductsPage,
  ProfileProductStatus,
} from '@/lib/products/api-client';
import {
  bulkUpdateProfileProductDestination,
  bulkUpdateProfileProductStatus,
  createProfileProduct,
  deleteProfileProduct,
  listProfileProducts,
  setProfileProductsEnabled,
  updateProfileProduct,
} from '@/lib/products/api-client';
import { useSelection } from '@/hooks/use-selection';
import type { ColumnDef } from '@/components/core/data-table';
import { DataTable } from '@/components/core/data-table';
import { toast } from '@/components/core/toaster';
import { ProfileProductBulkDestinationDialog } from '@/components/dashboard/products/profile-product-bulk-destination-dialog';
import type { ProductLanguage } from '@/components/dashboard/products/profile-product-copy';
import { interpolate, productCopy } from '@/components/dashboard/products/profile-product-copy';
import { ProfileProductDialog } from '@/components/dashboard/products/profile-product-dialog';
import { ProfileProductImportDialog } from '@/components/dashboard/products/profile-product-import-dialog';

const metadata = { title: `Products | Profiles | Dashboard | ${config.site.name}` } satisfies Metadata;
const emptyPage: ProfileProductsPage = {
  available_slots: 15,
  max_products: 15,
  pagination: { current_page: 1, last_page: 1, per_page: 100, total: 0 },
  products: [],
  products_enabled: false,
};

export function Page(): React.JSX.Element {
  const { profileId = '' } = useParams();
  const { i18n } = useTranslation();
  const language: ProductLanguage = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es';
  const copy = productCopy[language];
  const [bulkDestinationOpen, setBulkDestinationOpen] = React.useState(false);
  const [deleteProduct, setDeleteProduct] = React.useState<null | ProfileProduct>(null);
  const [editingProduct, setEditingProduct] = React.useState<null | ProfileProduct>(null);
  const [error, setError] = React.useState('');
  const [importOpen, setImportOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMutating, setIsMutating] = React.useState(false);
  const [page, setPage] = React.useState<ProfileProductsPage>(emptyPage);
  const [productsFeatureEnabled, setProductsFeatureEnabled] = React.useState(false);
  const [productDialogOpen, setProductDialogOpen] = React.useState(false);
  const [settingsConfirmation, setSettingsConfirmation] = React.useState<null | boolean>(null);
  const productIds = React.useMemo(() => page.products.map((product) => product.id), [page.products]);
  const selection = useSelection<number>(productIds);

  const loadProducts = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      const features = await getProfileFeatures(profileId);
      const productsEnabled = isFeatureEffective(features, 'products');

      setProductsFeatureEnabled(productsEnabled);

      if (!productsEnabled) {
        setPage(emptyPage);
        return;
      }

      setPage(await listProfileProducts(profileId));
    } catch (err) {
      logger.error(err);
      setError(getErrorMessage(err, copy.errors.generic));
    } finally {
      setIsLoading(false);
    }
  }, [copy.errors.generic, profileId]);

  React.useEffect(() => {
    loadProducts().catch((err) => {
      logger.error(err);
    });
  }, [loadProducts]);

  const handleSaveProduct = React.useCallback(
    async (input: ProfileProductInput): Promise<void> => {
      try {
        if (editingProduct) {
          await updateProfileProduct(profileId, editingProduct.id, input);
          toast.success(copy.toasts.updated);
        } else {
          await createProfileProduct(profileId, input);
          toast.success(copy.toasts.created);
        }

        setProductDialogOpen(false);
        setEditingProduct(null);
        await loadProducts();
      } catch (err) {
        toast.error(getErrorMessage(err, copy.errors.generic));
        throw err;
      }
    },
    [copy.errors.generic, copy.toasts.created, copy.toasts.updated, editingProduct, loadProducts, profileId]
  );

  const handleDelete = React.useCallback(async (): Promise<void> => {
    if (!deleteProduct) {
      return;
    }

    setIsMutating(true);

    try {
      await deleteProfileProduct(profileId, deleteProduct.id);
      setDeleteProduct(null);
      toast.success(copy.toasts.deleted);
      await loadProducts();
    } catch (err) {
      toast.error(getErrorMessage(err, copy.errors.generic));
    } finally {
      setIsMutating(false);
    }
  }, [copy.errors.generic, copy.toasts.deleted, deleteProduct, loadProducts, profileId]);

  const handleBulkStatus = React.useCallback(
    async (status: ProfileProductStatus, productIdsOverride?: number[]): Promise<void> => {
      const ids = productIdsOverride ?? Array.from(selection.selected);

      if (!ids.length) {
        return;
      }

      setIsMutating(true);

      try {
        await bulkUpdateProfileProductStatus(profileId, ids, status);
        toast.success(copy.toasts.bulkStatus);
        await loadProducts();
      } catch (err) {
        toast.error(getErrorMessage(err, copy.errors.generic));
      } finally {
        setIsMutating(false);
      }
    },
    [copy.errors.generic, copy.toasts.bulkStatus, loadProducts, profileId, selection.selected]
  );

  const handleBulkDestination = React.useCallback(
    async (destination: {
      countryCode: string;
      destinationType: Exclude<ProfileProductDestinationType, 'external_url'>;
      phoneNumber: string;
    }): Promise<void> => {
      setIsMutating(true);

      try {
        await bulkUpdateProfileProductDestination(profileId, Array.from(selection.selected), destination);
        toast.success(copy.toasts.bulkDestination);
        setBulkDestinationOpen(false);
        await loadProducts();
      } finally {
        setIsMutating(false);
      }
    },
    [copy.toasts.bulkDestination, loadProducts, profileId, selection.selected]
  );

  const handleSettingsConfirmation = React.useCallback(async (): Promise<void> => {
    if (settingsConfirmation === null) {
      return;
    }

    setIsMutating(true);

    try {
      const enabled = await setProfileProductsEnabled(profileId, settingsConfirmation);
      setPage((current) => ({ ...current, products_enabled: enabled }));
      setSettingsConfirmation(null);
      toast.success(copy.toasts.settings);
    } catch (err) {
      toast.error(getErrorMessage(err, copy.errors.generic));
    } finally {
      setIsMutating(false);
    }
  }, [copy.errors.generic, copy.toasts.settings, profileId, settingsConfirmation]);

  const columns = React.useMemo(
    () =>
      getColumns({
        copy,
        language,
        onDelete: setDeleteProduct,
        onEdit: (product) => {
          setEditingProduct(product);
          setProductDialogOpen(true);
        },
        onStatus: (product) => {
          handleBulkStatus(product.status === 'published' ? 'draft' : 'published', [product.id]).catch((err) => {
            logger.error(err);
          });
        },
      }),
    [copy, handleBulkStatus, language]
  );
  const atLimit = page.available_slots <= 0;

  return (
    <React.Fragment>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <Stack spacing={3}>
        {error ? <Alert color="error">{error}</Alert> : null}

        {isLoading ? (
          <Stack sx={{ alignItems: 'center', p: 5 }}>
            <CircularProgress />
          </Stack>
        ) : null}

        {!isLoading && !productsFeatureEnabled ? (
          <Alert color="info">
            {language === 'en'
              ? 'Products are not enabled for this profile. Enable Products from profile Settings first.'
              : 'Productos no está habilitado para este perfil. Activa Productos desde Configuración del perfil primero.'}
          </Alert>
        ) : null}

        {productsFeatureEnabled ? (
          <Stack
            direction={{ md: 'row', xs: 'column' }}
            spacing={2}
            sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack spacing={0.5}>
              <Typography variant="h4">{copy.intro.title}</Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 760 }} variant="body2">
                {interpolate(copy.intro.description, { max: page.max_products })}
              </Typography>
            </Stack>
            <Stack direction={{ sm: 'row', xs: 'column' }} spacing={1}>
              <Button
                disabled={atLimit}
                onClick={() => {
                  setEditingProduct(null);
                  setProductDialogOpen(true);
                }}
                startIcon={<PlusIcon />}
                variant="contained"
              >
                {copy.actions.add}
              </Button>
              <Button
                onClick={() => {
                  setImportOpen(true);
                }}
                startIcon={<FileCsvIcon />}
                variant="outlined"
              >
                {copy.actions.import}
              </Button>
            </Stack>
          </Stack>
        ) : null}

        {productsFeatureEnabled && atLimit ? (
          <Alert color="warning">{interpolate(copy.import.limit, { max: page.max_products })}</Alert>
        ) : null}

        {productsFeatureEnabled ? (
          <Card>
            <CardHeader
              action={
                <FormControlLabel
                  control={
                    <Switch
                      checked={page.products_enabled}
                      disabled={isLoading || isMutating}
                      onChange={(_, checked) => {
                        setSettingsConfirmation(checked);
                      }}
                    />
                  }
                  label={copy.settings.label}
                />
              }
              subheader={
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
                  <Chip
                    color={page.products_enabled ? 'success' : 'default'}
                    label={page.products_enabled ? copy.settings.enabled : copy.settings.disabled}
                    size="small"
                  />
                  <Typography color="text.secondary" variant="body2">
                    {interpolate(copy.intro.usage, { count: page.pagination.total, max: page.max_products })}
                  </Typography>
                </Stack>
              }
              title={copy.intro.title}
            />

            {selection.selectedAny ? (
              <Stack
                direction={{ sm: 'row', xs: 'column' }}
                spacing={1}
                sx={{
                  alignItems: { sm: 'center' },
                  bgcolor: 'background.level1',
                  borderBlock: '1px solid var(--mui-palette-divider)',
                  px: 2,
                  py: 1.5,
                }}
              >
                <Typography sx={{ flex: '1 1 auto', fontWeight: 600 }} variant="body2">
                  {interpolate(copy.bulk.selected, { count: selection.selected.size })}
                </Typography>
                <Button
                  disabled={isMutating}
                  onClick={() => {
                    handleBulkStatus('published').catch((err) => {
                      logger.error(err);
                    });
                  }}
                  size="small"
                >
                  {copy.actions.publish}
                </Button>
                <Button
                  disabled={isMutating}
                  onClick={() => {
                    handleBulkStatus('draft').catch((err) => {
                      logger.error(err);
                    });
                  }}
                  size="small"
                >
                  {copy.actions.draft}
                </Button>
                <Button
                  disabled={isMutating}
                  onClick={() => {
                    setBulkDestinationOpen(true);
                  }}
                  size="small"
                  variant="outlined"
                >
                  {copy.actions.setDestination}
                </Button>
              </Stack>
            ) : null}

            {isLoading ? (
              <Stack sx={{ alignItems: 'center', p: 5 }}>
                <CircularProgress />
              </Stack>
            ) : (
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                {page.products.length ? (
                  <Box sx={{ overflowX: 'auto' }}>
                    <DataTable<ProfileProduct>
                      columns={columns}
                      hover
                      onDeselectAll={selection.deselectAll}
                      onDeselectOne={(_, product) => {
                        selection.deselectOne(product.id);
                      }}
                      onSelectAll={selection.selectAll}
                      onSelectOne={(_, product) => {
                        selection.selectOne(product.id);
                      }}
                      rows={page.products}
                      selectable
                      selected={selection.selected}
                    />
                  </Box>
                ) : (
                  <Stack sx={{ alignItems: 'center', p: 5 }}>
                    <StorefrontIcon size={36} />
                    <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
                      {copy.empty}
                    </Typography>
                  </Stack>
                )}
              </CardContent>
            )}
          </Card>
        ) : null}
      </Stack>

      <ProfileProductDialog
        language={language}
        onClose={() => {
          setProductDialogOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        open={productDialogOpen}
        product={editingProduct}
      />
      <ProfileProductImportDialog
        language={language}
        onClose={() => {
          setImportOpen(false);
        }}
        onImported={async () => {
          setImportOpen(false);
          await loadProducts();
        }}
        open={importOpen}
        profileId={profileId}
      />
      <ProfileProductBulkDestinationDialog
        count={selection.selected.size}
        language={language}
        onClose={() => {
          setBulkDestinationOpen(false);
        }}
        onSave={handleBulkDestination}
        open={bulkDestinationOpen}
      />

      <Dialog
        onClose={
          isMutating
            ? undefined
            : () => {
                setSettingsConfirmation(null);
              }
        }
        open={settingsConfirmation !== null}
      >
        <DialogTitle>
          {settingsConfirmation ? copy.settings.confirmTitleEnable : copy.settings.confirmTitleDisable}
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2">
            {settingsConfirmation ? copy.settings.confirmEnable : copy.settings.confirmDisable}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={isMutating}
            onClick={() => {
              setSettingsConfirmation(null);
            }}
          >
            {copy.actions.cancel}
          </Button>
          <Button disabled={isMutating} onClick={handleSettingsConfirmation} variant="contained">
            {settingsConfirmation ? copy.settings.confirmActionEnable : copy.settings.confirmActionDisable}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        onClose={
          isMutating
            ? undefined
            : () => {
                setDeleteProduct(null);
              }
        }
        open={Boolean(deleteProduct)}
      >
        <DialogTitle>{interpolate(copy.confirmDelete.title, { name: deleteProduct?.name ?? '' })}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" variant="body2">
            {copy.confirmDelete.body}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={isMutating}
            onClick={() => {
              setDeleteProduct(null);
            }}
          >
            {copy.actions.cancel}
          </Button>
          <Button color="error" disabled={isMutating} onClick={handleDelete} variant="contained">
            {copy.actions.delete}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}

function getColumns({
  copy,
  language,
  onDelete,
  onEdit,
  onStatus,
}: {
  copy: (typeof productCopy)[ProductLanguage];
  language: ProductLanguage;
  onDelete: (product: ProfileProduct) => void;
  onEdit: (product: ProfileProduct) => void;
  onStatus: (product: ProfileProduct) => void;
}): ColumnDef<ProfileProduct>[] {
  return [
    {
      formatter: (product) => (
        <Box
          alt=""
          component="img"
          src={product.image_url}
          sx={{ aspectRatio: '1', borderRadius: 1, display: 'block', objectFit: 'cover', width: 64 }}
        />
      ),
      name: copy.fields.image,
      width: 88,
    },
    {
      formatter: (product) => (
        <Stack spacing={0.25} sx={{ minWidth: 220 }}>
          <Typography variant="subtitle2">{product.name}</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 320 }} variant="body2">
            {product.description}
          </Typography>
          <Link href={product.public_url} rel="noreferrer" target="_blank" underline="hover" variant="caption">
            {product.public_url}
          </Link>
        </Stack>
      ),
      name: copy.fields.name,
      width: 330,
    },
    {
      formatter: (product) => <DestinationCell copy={copy} product={product} />,
      name: copy.fields.destination,
      width: 210,
    },
    {
      formatter: (product) => (
        <Button
          color={product.status === 'published' ? 'success' : 'inherit'}
          onClick={() => {
            onStatus(product);
          }}
          size="small"
          variant="outlined"
        >
          {product.status === 'published' ? copy.status.published : copy.status.draft}
        </Button>
      ),
      name: copy.fields.status,
      width: 120,
    },
    {
      formatter: (product) => (
        <Typography color="text.secondary" variant="body2">
          {formatDate(product.updated_at, language)}
        </Typography>
      ),
      name: copy.fields.updated,
      width: 150,
    },
    {
      align: 'right',
      formatter: (product) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <Tooltip title={copy.actions.edit}>
            <IconButton
              onClick={() => {
                onEdit(product);
              }}
            >
              <PencilSimpleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={copy.actions.delete}>
            <IconButton
              color="error"
              onClick={() => {
                onDelete(product);
              }}
            >
              <TrashIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
      name: copy.fields.actions,
      width: 112,
    },
  ];
}

function DestinationCell({
  copy,
  product,
}: {
  copy: (typeof productCopy)[ProductLanguage];
  product: ProfileProduct;
}): React.JSX.Element {
  const configByType = {
    external_url: { Icon: LinkSimpleIcon, label: copy.destination.external },
    telegram: { Icon: TelegramLogoIcon, label: copy.destination.telegram },
    whatsapp: { Icon: WhatsappLogoIcon, label: copy.destination.whatsapp },
  } satisfies Record<ProfileProductDestinationType, { Icon: React.ElementType; label: string }>;
  const destination = configByType[product.destination_type];
  const Icon = destination.Icon;

  return (
    <Button
      href={product.action_url}
      rel="noreferrer"
      startIcon={<Icon />}
      sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
      target="_blank"
    >
      {destination.label}
    </Button>
  );
}

function formatDate(value: null | string | undefined, language: ProductLanguage): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
