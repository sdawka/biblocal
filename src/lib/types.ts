// New three-dimension model
export type BookVisibility = 'private' | 'visible';
export type BookOwnership = 'have' | 'seeking';
export type BookIntent = 'borrowable' | 'discussable' | 'giftable' | 'class-resource';

// Legacy status type - kept for migration compatibility
export type BookStatus =
  | 'private'
  | 'visible'
  | 'borrowable'
  | 'discussable'
  | 'giftable'
  | 'class-resource'
  | 'seeking-home';

export type EntityType = 'person' | 'bookstore';

export interface Book {
  id: string;
  isbn?: string;
  title: string;
  author: string;
  // New three-dimension model
  visibility: BookVisibility;
  ownership: BookOwnership;
  intents: BookIntent[];
  // Legacy status - kept during migration period
  status?: BookStatus;
  notes?: string;
  coverUrl?: string;
  subjects?: string[];
  addedVia: 'scan' | 'manual' | 'goodreads';
  addedAt: number;
}

export interface UserTopics {
  curated: string[];
  freeform: string[];
  inferred: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  city: string;
  radiusKm: number;
  topics: UserTopics;
  borrowStyle?: string;
  currentObsessions?: string[];
  shelf?: Book[];
  distance?: string;
  // Lending personality (auto-derived from shelf intents)
  lendingPersonality?: string;
  lendingPersonalityOverride?: boolean;
  // Entity type
  type?: EntityType;
  // Store-specific fields
  address?: string;
  neighborhood?: string;
  website?: string;
  phone?: string;
  specialties?: string[];
  addedBy?: string;
}

export interface MatchFacet {
  count: number;
  items: string[];
}

export interface MatchFacets {
  shelfTwin: MatchFacet;
  readingMentor: MatchFacet;
  localSource: MatchFacet;
  discussionMatch: MatchFacet;
  classChain: MatchFacet;
}

export interface Match {
  user: UserProfile;
  facets: MatchFacets;
  totalScore: number;
}
