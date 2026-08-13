/**
 * Pure, device-free helpers for the late-GPS-fix camera guard on the draw
 * screen. No Mapbox import, no React — the screen is the impure shell that wires
 * a ref and the map's onCameraChanged callback to these decisions, so the guard
 * logic stays unit-testable without a device (same split as ./location).
 *
 * Problem: create mode centers the camera on the user's location, but the fresh
 * GPS fix can resolve LATE — after the user has already panned/zoomed to frame
 * their yard. Snapping the camera then would yank the map out from under them.
 * The guard tracks whether the user has taken over the camera and discards a
 * late fix if so.
 */

/** The shape onCameraChanged hands us (a MapState); we only read the gesture flag. */
type CameraChangeState = {
  gestures?: { isGestureActive?: boolean };
} | null | undefined;

/**
 * Was this camera change driven by a user gesture (pan/zoom), as opposed to a
 * programmatic `<Camera centerCoordinate>` write?
 *
 * CRITICAL to the guard not defeating itself: @rnmapbox/maps reports
 * `gestures.isGestureActive === true` only while a real touch gesture drives the
 * camera; a programmatic recenter fires onCameraChanged with the flag false. So
 * this returns true ONLY for genuine user interaction. Verified against
 * @rnmapbox/maps 10.3.5 (MapState.gestures.isGestureActive).
 */
export function isUserCameraGesture(state: CameraChangeState): boolean {
  return !!state?.gestures?.isGestureActive;
}

/**
 * Should a just-resolved location fix be written to the camera?
 *
 * Discard it once the user has taken over — either by moving the camera
 * (`userMovedCamera`) or by starting to draw (`hasDrawnVertices`). Both are
 * "the user is in control now"; a late snap in either case is unwelcome. Applies
 * to every location write (last-known AND the refined fix), so the initial
 * center is guarded identically to the refine.
 */
export function shouldApplyResolvedFix(opts: {
  userMovedCamera: boolean;
  hasDrawnVertices: boolean;
}): boolean {
  return !opts.userMovedCamera && !opts.hasDrawnVertices;
}
