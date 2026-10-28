// The wording on the social card at /og/: a headline and the front page's one sentence.
import { en } from '../i18n/en.ts';

export const heroCopy = {
  // The front page's h1 opens with the name, and the card already sets the name as its
  // wordmark over the headline, so the card keeps a headline of its own.
  h1: 'A shader language you write in TypeScript.',
  // The lede carries its code spans as markdown, which Rich renders on the page. The card
  // draws plain text into a picture, so the backticks come off instead of printing.
  sub: en.front.lede.replace(/`/g, ''),
} as const;
