'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';

import { paths } from '@/paths';
import { FilterButton, FilterPopover, useFilterContext } from '@/components/core/filter-button';
import { Option } from '@/components/core/option';

import { useProfilesSelection } from './profiles-selection-context';

export interface Filters {
  genre?: string;
  name?: string;
  status?: string;
}

export type SortDir = 'asc' | 'desc';

export interface ProfilesFiltersProps {
  filters?: Filters;
  sortDir?: SortDir;
  totals?: {
    active: number;
    all: number;
    inactive: number;
  };
}

export function ProfilesFilters({
  filters = {},
  sortDir = 'desc',
  totals = { active: 0, all: 0, inactive: 0 },
}: ProfilesFiltersProps): React.JSX.Element {
  const { genre, name, status } = filters;
  const navigate = useNavigate();
  const selection = useProfilesSelection();

  const tabs = React.useMemo(
    () => [
      { label: 'All', value: '', count: totals.all },
      { label: 'Active', value: 'active', count: totals.active },
      { label: 'Inactive', value: 'inactive', count: totals.inactive },
    ],
    [totals]
  );

  const updateSearchParams = React.useCallback(
    (newFilters: Filters, newSortDir: SortDir): void => {
      const searchParams = new URLSearchParams();

      if (newSortDir === 'asc') {
        searchParams.set('sortDir', newSortDir);
      }

      if (newFilters.status) {
        searchParams.set('status', newFilters.status);
      }

      if (newFilters.name) {
        searchParams.set('name', newFilters.name);
      }

      if (newFilters.genre) {
        searchParams.set('genre', newFilters.genre);
      }

      const query = searchParams.toString();
      navigate(query ? `${paths.dashboard.profiles}?${query}` : paths.dashboard.profiles);
    },
    [navigate]
  );

  const handleClearFilters = React.useCallback(() => {
    updateSearchParams({}, sortDir);
  }, [sortDir, updateSearchParams]);

  const handleStatusChange = React.useCallback(
    (_: React.SyntheticEvent, value: string) => {
      updateSearchParams({ ...filters, status: value }, sortDir);
    },
    [filters, sortDir, updateSearchParams]
  );

  const handleNameChange = React.useCallback(
    (value?: string) => {
      updateSearchParams({ ...filters, name: value }, sortDir);
    },
    [filters, sortDir, updateSearchParams]
  );

  const handleGenreChange = React.useCallback(
    (value?: string) => {
      updateSearchParams({ ...filters, genre: value }, sortDir);
    },
    [filters, sortDir, updateSearchParams]
  );

  const handleSortChange = React.useCallback(
    (event: SelectChangeEvent) => {
      updateSearchParams(filters, event.target.value as SortDir);
    },
    [filters, updateSearchParams]
  );

  const hasFilters = status || name || genre;

  return (
    <div>
      <Tabs onChange={handleStatusChange} sx={{ px: 3 }} value={status ?? ''} variant="scrollable">
        {tabs.map((tab) => (
          <Tab
            icon={<Chip label={tab.count} size="small" variant="soft" />}
            iconPosition="end"
            key={tab.value}
            label={tab.label}
            sx={{ minHeight: 'auto' }}
            tabIndex={0}
            value={tab.value}
          />
        ))}
      </Tabs>
      <Divider />
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', px: 3, py: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flex: '1 1 auto', flexWrap: 'wrap' }}>
          <FilterButton
            displayValue={name}
            label="Name"
            onFilterApply={(value) => {
              handleNameChange(value as string);
            }}
            onFilterDelete={() => {
              handleNameChange();
            }}
            popover={<TextFilterPopover title="Filter by name" />}
            value={name}
          />
          <FilterButton
            displayValue={genre}
            label="Genre"
            onFilterApply={(value) => {
              handleGenreChange(value as string);
            }}
            onFilterDelete={() => {
              handleGenreChange();
            }}
            popover={<TextFilterPopover title="Filter by genre" />}
            value={genre}
          />
          {hasFilters ? <Button onClick={handleClearFilters}>Clear filters</Button> : null}
        </Stack>
        {selection.selectedAny ? (
          <Typography color="text.secondary" variant="body2">
            {selection.selected.size} selected
          </Typography>
        ) : null}
        <Select name="sort" onChange={handleSortChange} sx={{ maxWidth: '100%', width: '120px' }} value={sortDir}>
          <Option value="desc">Newest</Option>
          <Option value="asc">Oldest</Option>
        </Select>
      </Stack>
    </div>
  );
}

function TextFilterPopover({ title }: { title: string }): React.JSX.Element {
  const { anchorEl, onApply, onClose, open, value: initialValue } = useFilterContext();
  const [value, setValue] = React.useState<string>('');

  React.useEffect(() => {
    setValue((initialValue as string | undefined) ?? '');
  }, [initialValue]);

  return (
    <FilterPopover anchorEl={anchorEl} onClose={onClose} open={open} title={title}>
      <FormControl>
        <OutlinedInput
          onChange={(event) => {
            setValue(event.target.value);
          }}
          onKeyUp={(event) => {
            if (event.key === 'Enter') {
              onApply(value);
            }
          }}
          value={value}
        />
      </FormControl>
      <Button
        onClick={() => {
          onApply(value);
        }}
        variant="contained"
      >
        Apply
      </Button>
    </FilterPopover>
  );
}
