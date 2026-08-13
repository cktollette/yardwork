import { isUserCameraGesture, shouldApplyResolvedFix } from './cameraGuard';

describe('isUserCameraGesture', () => {
  it('is true for an active user gesture', () => {
    expect(isUserCameraGesture({ gestures: { isGestureActive: true } })).toBe(true);
  });

  it('is false for a programmatic move (gesture inactive)', () => {
    // A programmatic <Camera> recenter fires onCameraChanged with this false —
    // the exact case that must NOT trip the guard.
    expect(isUserCameraGesture({ gestures: { isGestureActive: false } })).toBe(false);
  });

  it('is false when the state carries no gesture info', () => {
    expect(isUserCameraGesture({ properties: { center: [0, 0] } } as never)).toBe(false);
  });

  it('is false for null / undefined (defensive)', () => {
    expect(isUserCameraGesture(null)).toBe(false);
    expect(isUserCameraGesture(undefined)).toBe(false);
  });
});

describe('shouldApplyResolvedFix', () => {
  it('applies the fix when the user has neither moved the camera nor drawn', () => {
    // location-resolves-first → apply (existing behavior).
    expect(shouldApplyResolvedFix({ userMovedCamera: false, hasDrawnVertices: false })).toBe(true);
  });

  it('discards the fix once the user has moved the camera', () => {
    // interaction-first → discard silently.
    expect(shouldApplyResolvedFix({ userMovedCamera: true, hasDrawnVertices: false })).toBe(false);
  });

  it('discards the fix once drawing has begun (preserves the pre-existing guard)', () => {
    expect(shouldApplyResolvedFix({ userMovedCamera: false, hasDrawnVertices: true })).toBe(false);
  });

  it('discards when both are true', () => {
    expect(shouldApplyResolvedFix({ userMovedCamera: true, hasDrawnVertices: true })).toBe(false);
  });
});
