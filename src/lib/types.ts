export type BookStatus =
  | 'private'
  | 'visible'
  | 'borrowable'
  | 'discussable'
  | 'giftable'
  | 'class-resource'
  | 'seeking-home';

export interface Book {
  id: string;
  isbn?: string;
  title: string;
  author: string;
  status: BookStatus;
  notes?: string;
  coverUrl?: string;
  subjects?: string[];
  addedVia: 'scan' | 'manual';
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
