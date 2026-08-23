import { COUNTRIES } from './location';
import SearchablePicker, { type PickerOption } from './SearchablePicker';

/** Country options for the shared searchable picker: shows names, stores codes. */
const COUNTRY_OPTIONS: readonly PickerOption[] = COUNTRIES.map((c) => ({
  code: c.code,
  label: c.name,
}));

/**
 * Searchable, fully-bundled country picker (no network). Renders display names;
 * `onSelect` reports the ISO 3166-1 alpha-2 CODE, which is what gets stored.
 */
export default function CountryPicker({
  selectedCode,
  onSelect,
  onClose,
}: {
  selectedCode?: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  return (
    <SearchablePicker
      options={COUNTRY_OPTIONS}
      selectedCode={selectedCode}
      onSelect={onSelect}
      onClose={onClose}
      searchLabel="Search countries"
    />
  );
}
