/**
 * Share module barrel. The Mow Share Card: a pure view-model builder, the
 * branded presentational card, and the preview modal that captures it to a PNG
 * and hands it to the native share sheet.
 */
export { buildShareCardModel } from './shareCardModel';
export type { ShareCardModel, ShareCardRing } from './shareCardModel';
export { default as MowShareCard, SHARE_CARD_SIZE } from './MowShareCard';
export { default as ShareCardModal } from './ShareCardModal';
