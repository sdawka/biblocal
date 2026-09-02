/**
 * Single source of truth for book intent labels and prompt copy.
 * Pure utility — no framework imports.
 */
import type { BookIntent } from './types';

// Prompt shown above the intent selector / badges.
export const INTENT_PROMPT = 'Open to:';

// Display label for each intent.
export const INTENT_LABELS: Record<BookIntent, string> = {
  borrowable: 'Lending',
  discussable: 'Discussion',
  giftable: 'Gifting',
};

// Ordered options for selector/filter components.
export const INTENT_OPTIONS: { value: BookIntent; label: string }[] = [
  { value: 'borrowable', label: INTENT_LABELS.borrowable },
  { value: 'discussable', label: INTENT_LABELS.discussable },
  { value: 'giftable', label: INTENT_LABELS.giftable },
];

// The data model deliberately keeps one stable value for each intent. Intake
// presents direction-specific language for those values, while filters and
// book details retain their neutral labels above.
export const INTENT_VALUES: BookIntent[] = INTENT_OPTIONS.map((option) => option.value);
