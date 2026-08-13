import { FileSystemPhotoStore } from './FileSystemPhotoStore';
import type { PhotoStore } from './PhotoStore';

export type { PhotoStore } from './PhotoStore';

/**
 * The app's PhotoStore singleton, typed as the interface so callers depend on
 * behavior, not implementation. Swapping to Supabase Storage at the sync branch
 * means changing only this binding (D-047).
 */
export const photoStore: PhotoStore = new FileSystemPhotoStore();
