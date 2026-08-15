export type PlaceCategory = 'all' | 'nature' | 'culture' | 'leisure';

export type PlaceSort = 'recommend' | 'distance';

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface NearbyPlace {
  contentId: string;
  title: string;
  imageUrl?: string;
  address: string;
  category: Exclude<PlaceCategory, 'all'>;
  /** Straight-line distance from the search origin, in meters. Undefined when no coords were available. */
  distanceMeters?: number;
  mapX: number;
  mapY: number;
}
