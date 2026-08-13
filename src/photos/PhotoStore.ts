/**
 * Photo-file storage boundary.
 *
 * All image-file I/O for mow photos lives behind this interface. The mow
 * repository depends on THIS type only — never on expo-file-system specifics —
 * so the local filesystem backend can be swapped for Supabase Storage at the
 * sync branch without touching the repository's callers or the screens. Same
 * dependency-inversion pattern as WeatherService / ActivityService (D-047).
 *
 * Screens never import this: they pass picker temp URIs to the repository, and
 * the repository is the single choke point that copies/deletes files, so no code
 * path can orphan a file (D-057).
 */
export interface PhotoStore {
  /**
   * Copy a source image (a picker's temporary URI) into an app-owned directory,
   * re-encoding it (downscaled/compressed, which also strips EXIF), and return
   * the stable app-owned URI. The caller stores the returned URI on the mow.
   */
  copyIntoStore(sourceUri: string): Promise<string>;
  /**
   * Delete a stored file. Idempotent: a missing file (or an empty/undefined URI)
   * is a silent no-op — the same rule as deleting a missing mow id (D-027).
   */
  deleteFile(uri: string | undefined): Promise<void>;
}
