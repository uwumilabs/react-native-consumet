import type { ITitle } from 'react-native-consumet';

/** A title as text: providers give a string, AniList an ITitle (English, else romaji, else native). */
export const titleText = (title: string | ITitle | undefined): string =>
  typeof title === 'string' ? title : (title?.english ?? title?.romaji ?? title?.native ?? '');

/** An error's message, or `fallback` when it has none. */
export const errorText = (error: unknown, fallback: string): string =>
  (error instanceof Error && error.message) || fallback;
