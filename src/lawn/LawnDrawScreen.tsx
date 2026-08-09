import Mapbox, {
  Camera,
  FillLayer,
  LineLayer,
  MarkerView,
  type MapView as MapViewType,
  MapView,
  ShapeSource,
} from '@rnmapbox/maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import type { Position } from '../mow/models';
import type { RootStackParamList } from '../mow/navigation';
import { propertyRepository } from '../mow/asyncStorageRepositories';
import { MIN_BOUNDARY_VERTICES } from '../mow/repositories';
import { colors, radii, spacing, typography } from '../theme';
import { computeAreaSqFt } from './area';
import {
  CURRENT_POSITION_TIMEOUT_MS,
  decideLocationFlow,
  pickCameraCenter,
  withTimeout,
} from './location';

/**
 * Draw / edit the lawn polygon on a Mapbox satellite layer.
 *
 * Gesture model (proven in the spike): an explicit Draw toggle separates
 * panning from editing. Draw OFF → the map pans/zooms and handles are inert, so
 * you can frame the yard. Draw ON → tapping the map appends a vertex, dragging
 * a handle moves it (immediately — no long-press), and tapping the first vertex
 * closes the ring. Persistence is one polygon per property (D-005): saving
 * replaces whatever was there.
 */

type Props = NativeStackScreenProps<RootStackParamList, 'LawnDraw'>;

const DEFAULT_CENTER: Position = [-96.8236, 33.1507]; // suburban default when location is unavailable
const DEFAULT_ZOOM = 18.5;
const ACCENT = colors.primary;
// No warning color exists in the token palette yet; kept as a local constant
// rather than mis-mapping it onto destructive/sand. See PR notes (follow-up:
// add a `warning` token).
const WARN = '#f59e0b';
// Past this the boundary is almost certainly over-tapped, not genuinely complex.
// A soft warning only — drawing is never blocked.
const SOFT_VERTEX_WARN = 40;

function formatArea(sqft: number): string {
  const rounded = Math.round(sqft);
  return `${rounded.toLocaleString('en-US')} sq ft`;
}

export default function LawnDrawScreen({ route, navigation }: Props) {
  const { propertyId, mode } = route.params;
  const insets = useSafeAreaInsets();

  const [vertices, setVertices] = useState<Position[]>([]);
  const [drawMode, setDrawMode] = useState(mode === 'create');
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  // Disabled for the duration of a vertex drag so the map's native pan gesture
  // can't steal the touch mid-drag. See beginVertexDrag/endVertexDrag.
  const [mapScrollEnabled, setMapScrollEnabled] = useState(true);

  // The controlled camera target. Both modes feed this ONE state — edit mode
  // sets it to the saved polygon's first vertex, create mode sets it to the
  // user's location once resolved. It is intentionally NOT derived from
  // `vertices` (which change on every tap): a controlled camera bound to live
  // vertices would snap the map while drawing. It only changes at deliberate
  // moments, so re-renders during drawing leave the camera untouched.
  const [cameraCenter, setCameraCenter] = useState<Position>(DEFAULT_CENTER);

  const canClose = vertices.length >= MIN_BOUNDARY_VERTICES && !closed;
  const areaSqFt = useMemo(() => computeAreaSqFt(vertices), [vertices]);

  // Live values the once-created PanResponders read without going stale.
  const drawModeRef = useRef(drawMode);
  const canCloseRef = useRef(canClose);
  useEffect(() => {
    drawModeRef.current = drawMode;
  }, [drawMode]);
  useEffect(() => {
    canCloseRef.current = canClose;
  }, [canClose]);

  // Live vertex count for the create-mode location effect: it runs once on
  // mount, so it must read the current count through a ref (not the stale
  // closure) to decide whether a late GPS refine would disturb active drawing.
  const verticesLenRef = useRef(vertices.length);
  useEffect(() => {
    verticesLenRef.current = vertices.length;
  }, [vertices.length]);

  // Disable the native-stack interactive pop/back-swipe (D-012) for the WHOLE
  // time draw mode is on, not just during a drag. The pop recognizer lives
  // above the map and can claim a left-side touch before onPanResponderGrant
  // fires (a pressure-dependent race), so scoping to draw mode removes the race
  // entirely rather than trying to win it. Two explicit exits (Save/Cancel)
  // mean losing edge swipe-back here traps nobody.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !drawMode });
  }, [drawMode, navigation]);

  // CRITICAL safety net: always restore the back-swipe on unmount. Exiting via
  // Save or Cancel while draw mode is on must not leak a disabled swipe-back
  // into the rest of the app. `navigation` is stable, so this cleanup runs on
  // unmount.
  useEffect(() => {
    return () => {
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  const mapRef = useRef<MapViewType | null>(null);
  // The map's window offset, so a screen-space drag point can be translated
  // into the map view's own coordinate space for getCoordinateFromView.
  const mapOffset = useRef({ x: 0, y: 0 });
  const measureMap = useCallback(() => {
    // measure() on the native ref lands the on-screen origin into mapOffset.
    // @ts-expect-error rnmapbox's ref exposes the RN measure() at runtime.
    mapRef.current?.measure?.((_x, _y, _w, _h, pageX, pageY) => {
      mapOffset.current = { x: pageX ?? 0, y: pageY ?? 0 };
    });
  }, []);

  // Edit mode: preload the saved boundary (already a closed, valid polygon).
  useEffect(() => {
    if (mode !== 'edit') return;
    let active = true;
    (async () => {
      const property = await propertyRepository.getById(propertyId);
      if (!active) return;
      if (property?.boundary && property.boundary.length >= MIN_BOUNDARY_VERTICES) {
        setVertices(property.boundary);
        setClosed(true);
        // Same controlled camera state create mode uses — center on the polygon.
        setCameraCenter(property.boundary[0]);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [mode, propertyId]);

  // Create mode: center the camera on the user's location. This is the impure
  // shell around ./location's pure helpers — it calls expo-location and feeds
  // the results through them, updating `cameraCenter`. Any failure path
  // (denied / unavailable / timeout) simply never updates it, leaving
  // DEFAULT_CENTER silently. Edit mode centers on the saved polygon instead and
  // never asks for location.
  useEffect(() => {
    if (mode !== 'create') return;
    let active = true;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      let gate = decideLocationFlow(status as any);
      // Only prompt when undetermined; a prior denial goes straight to fallback.
      if (gate === 'request') {
        const requested = await Location.requestForegroundPermissionsAsync();
        gate = decideLocationFlow(requested.status as any);
      }
      if (!active || gate !== 'proceed') return;

      // Instant center from the last known fix, if any.
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (active && lastKnown) {
        setCameraCenter(pickCameraCenter(lastKnown.coords, DEFAULT_CENTER));
      }

      // Refine with a fresh fix, bounded by a timeout so we never hang.
      try {
        const current = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          CURRENT_POSITION_TIMEOUT_MS,
        );
        // Skip a late refine once drawing has begun so it can't jerk the camera.
        // (Known v0 tradeoff: this does NOT cover a manual pan before the first
        // vertex — that pan will still be overridden by the refine.)
        if (active && verticesLenRef.current === 0) {
          setCameraCenter(pickCameraCenter(current.coords, DEFAULT_CENTER));
        }
      } catch {
        // Timeout / unavailable: keep last-known (or DEFAULT_CENTER).
      }
    })();
    return () => {
      active = false;
    };
    // Runs once on mount for create mode; vertices is read live via closure and
    // must not re-trigger the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const screenToCoord = useCallback(
    async (pageX: number, pageY: number): Promise<Position | null> => {
      const map = mapRef.current;
      if (!map) return null;
      const localPoint: [number, number] = [
        pageX - mapOffset.current.x,
        pageY - mapOffset.current.y,
      ];
      try {
        const coord = await map.getCoordinateFromView(localPoint);
        return coord as Position;
      } catch {
        return null;
      }
    },
    [],
  );

  const handleMapPress = useCallback(
    (feature: GeoJSON.Feature) => {
      if (!drawMode || closed) return;
      if (feature.geometry?.type !== 'Point') return;
      const coord = feature.geometry.coordinates as Position;
      setVertices((v) => [...v, coord]);
    },
    [drawMode, closed],
  );

  const moveVertex = useCallback(
    (index: number, pageX: number, pageY: number) => {
      screenToCoord(pageX, pageY).then((coord) => {
        if (!coord) return;
        setVertices((v) => v.map((p, i) => (i === index ? coord : p)));
      });
    },
    [screenToCoord],
  );

  // Drag lifecycle: freeze the map's pan on touch-down so the native recognizer
  // never competes with the handle's PanResponder, and always restore it when
  // the drag ends — including on TERMINATE, so a gesture lost to the system
  // can never leave the map permanently frozen. setState setters are stable, so
  // these stay referentially stable for the once-created PanResponder.
  // (The navigation back-swipe is handled separately, scoped to draw mode.)
  const beginVertexDrag = useCallback(() => setMapScrollEnabled(false), []);
  const endVertexDrag = useCallback(() => setMapScrollEnabled(true), []);

  const close = useCallback(() => {
    setClosed(true);
  }, []);

  const tapVertex = useCallback((index: number) => {
    // Tapping the first vertex closes the ring, once it's a polygon.
    if (index === 0 && canCloseRef.current) close();
  }, [close]);

  const undo = useCallback(() => {
    if (closed) return;
    setVertices((v) => v.slice(0, -1));
  }, [closed]);

  const redraw = useCallback(() => {
    setVertices([]);
    setClosed(false);
    setDrawMode(true);
  }, []);

  const save = useCallback(async () => {
    if (vertices.length < MIN_BOUNDARY_VERTICES) return;
    setSaving(true);
    try {
      await propertyRepository.saveBoundary(propertyId, vertices);
      navigation.goBack();
    } catch (err) {
      setSaving(false);
      Alert.alert(
        "Couldn't save your lawn",
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }, [vertices, propertyId, navigation]);

  const cancel = useCallback(() => {
    if (vertices.length === 0 || saving) {
      navigation.goBack();
      return;
    }
    Alert.alert('Discard this lawn?', 'Your drawing will not be saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  }, [vertices.length, saving, navigation]);

  const removeLawn = useCallback(() => {
    Alert.alert(
      'Remove your lawn?',
      'This deletes the saved boundary. Area and efficiency stats will lock again until you draw a new one.',
      [
        { text: 'Keep lawn', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await propertyRepository.clearBoundary(propertyId);
              navigation.goBack();
            } catch (err) {
              setSaving(false);
              Alert.alert(
                "Couldn't remove your lawn",
                err instanceof Error ? err.message : 'Please try again.',
              );
            }
          },
        },
      ],
    );
  }, [propertyId, navigation]);

  const lineShape = useMemo<GeoJSON.Feature<GeoJSON.LineString>>(
    () => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: vertices },
    }),
    [vertices],
  );

  const polygonShape = useMemo<GeoJSON.Feature<GeoJSON.Polygon>>(
    () => ({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [vertices.length ? [...vertices, vertices[0]] : []],
      },
    }),
    [vertices],
  );

  const overWarn = vertices.length > SOFT_VERTEX_WARN;

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.textOnColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={(r) => {
          mapRef.current = r;
        }}
        style={styles.map}
        styleURL={Mapbox.StyleURL.Satellite}
        onPress={handleMapPress}
        onDidFinishLoadingMap={measureMap}
        onLayout={measureMap}
        scrollEnabled={mapScrollEnabled}
        scaleBarEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Camera
          centerCoordinate={cameraCenter}
          zoomLevel={DEFAULT_ZOOM}
          animationDuration={0}
        />

        {closed ? (
          <ShapeSource id="polygon" shape={polygonShape}>
            <FillLayer
              id="polygon-fill"
              style={{ fillColor: colors.primary, fillOpacity: 0.35 }}
            />
            <LineLayer id="polygon-outline" style={{ lineColor: ACCENT, lineWidth: 3 }} />
          </ShapeSource>
        ) : (
          vertices.length >= 2 && (
            <ShapeSource id="line" shape={lineShape}>
              <LineLayer id="line-layer" style={{ lineColor: ACCENT, lineWidth: 3 }} />
            </ShapeSource>
          )
        )}

        {vertices.map((v, i) => (
          <VertexHandle
            key={`vertex-${i}`}
            index={i}
            coordinate={v}
            isFirst={i === 0}
            drawModeRef={drawModeRef}
            onDrag={moveVertex}
            onTap={tapVertex}
            onDragStart={beginVertexDrag}
            onDragEnd={endVertexDrag}
          />
        ))}
      </MapView>

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <Pressable onPress={cancel} style={styles.cancel} hitSlop={8}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.status}>
          {closed
            ? `${formatArea(areaSqFt)} · ${vertices.length} points`
            : drawMode
              ? `Tap to place  ·  ${vertices.length} points`
              : `Pan to frame your lawn  ·  ${vertices.length} points`}
        </Text>
        {mode === 'edit' ? (
          <Pressable
            onPress={removeLawn}
            disabled={saving}
            style={styles.cancel}
            hitSlop={8}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        ) : (
          <View style={styles.cancel} />
        )}
      </View>

      {overWarn && !closed && (
        <View style={[styles.warnBar, { top: insets.top + 52 }]} pointerEvents="none">
          <Text style={styles.warnText}>
            That's a lot of points — you can keep going, but most lawns need fewer.
          </Text>
        </View>
      )}

      <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
        {closed ? (
          <>
            <Pressable
              onPress={() => setDrawMode((d) => !d)}
              style={[styles.btn, drawMode ? styles.btnOn : styles.btnIdle]}
            >
              <Text style={[styles.btnText, drawMode && styles.btnTextOn]}>
                {drawMode ? 'Edit: ON' : 'Edit: OFF'}
              </Text>
            </Pressable>
            <Pressable onPress={redraw} style={[styles.btn, styles.btnIdle]}>
              <Text style={styles.btnText}>Redraw</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={saving}
              style={[styles.btn, styles.btnPrimary, saving && styles.btnDisabled]}
            >
              <Text style={[styles.btnText, styles.btnTextOn]}>
                {saving ? 'Saving…' : 'Save lawn'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => setDrawMode((d) => !d)}
              style={[styles.btn, drawMode ? styles.btnOn : styles.btnIdle]}
            >
              <Text style={[styles.btnText, drawMode && styles.btnTextOn]}>
                {drawMode ? 'Draw: ON' : 'Draw: OFF'}
              </Text>
            </Pressable>
            <Pressable
              onPress={undo}
              disabled={vertices.length === 0}
              style={[
                styles.btn,
                styles.btnIdle,
                vertices.length === 0 && styles.btnDisabled,
              ]}
            >
              <Text style={styles.btnText}>Undo</Text>
            </Pressable>
            <Pressable
              onPress={close}
              disabled={!canClose}
              style={[
                styles.btn,
                canClose ? styles.btnPrimary : styles.btnIdle,
                !canClose && styles.btnDisabled,
              ]}
            >
              <Text style={[styles.btnText, canClose && styles.btnTextOn]}>Done</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

/**
 * A draggable vertex handle rendered at a map coordinate via MarkerView (whose
 * children receive touches, unlike PointAnnotation). The PanResponder is built
 * once and reads live draw-mode / callbacks through refs so it never goes
 * stale. A press that barely moves is treated as a tap (used to close the ring
 * on the first vertex); anything with movement drags the vertex.
 *
 * onDragStart fires on touch-down to freeze the map pan BEFORE any movement,
 * pre-empting the native pan recognizer instead of racing it. onDragEnd fires
 * on both release and terminate so the map pan is always restored — a drag lost
 * to the system must never leave the map frozen.
 */
function VertexHandle({
  index,
  coordinate,
  isFirst,
  drawModeRef,
  onDrag,
  onTap,
  onDragStart,
  onDragEnd,
}: {
  index: number;
  coordinate: Position;
  isFirst: boolean;
  drawModeRef: React.MutableRefObject<boolean>;
  onDrag: (index: number, pageX: number, pageY: number) => void;
  onTap: (index: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const moved = useRef(false);
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => drawModeRef.current,
      onMoveShouldSetPanResponder: () => drawModeRef.current,
      onPanResponderGrant: () => {
        moved.current = false;
        onDragStart();
      },
      onPanResponderMove: (_e, g) => {
        if (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2) moved.current = true;
        onDrag(index, g.moveX, g.moveY);
      },
      onPanResponderRelease: () => {
        onDragEnd();
        if (!moved.current) onTap(index);
      },
      onPanResponderTerminate: () => {
        // Gesture taken over/interrupted (system, another responder): restore
        // the map pan so it can never stay frozen.
        onDragEnd();
      },
    }),
  ).current;

  return (
    <MarkerView coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} allowOverlap>
      <View {...responder.panHandlers} style={styles.handleHit} hitSlop={12}>
        <View style={[styles.handle, isFirst && styles.firstHandle]} />
      </View>
    </MarkerView>
  );
}

const styles = StyleSheet.create({
  // Black backdrop behind the satellite map (intentionally not cream — this is
  // a full-bleed map screen, no cream ever shows). No black token in the palette.
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  map: { flex: 1 },
  handleHit: { padding: 10 }, // touch-target geometry, not spacing scale
  handle: {
    // Vertex dot geometry (18px circle) — positional, not spacing tokens.
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: ACCENT,
  },
  firstHandle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT,
    borderColor: colors.surface,
  },
  topBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cancel: { minWidth: 60 },
  cancelText: { color: colors.textOnColor, fontSize: typography.bodySmall, fontWeight: '600' },
  removeText: {
    color: colors.destructive,
    fontSize: typography.bodySmall,
    fontWeight: '600',
    textAlign: 'right',
  },
  status: {
    flex: 1,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', // map-chrome scrim, no token
    color: colors.textOnColor,
    fontSize: typography.bodySmall,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  warnBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  warnText: {
    backgroundColor: WARN,
    color: colors.ink,
    fontSize: typography.caption,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    overflow: 'hidden',
    textAlign: 'center',
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  btn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    minWidth: 84,
    alignItems: 'center',
  },
  btnIdle: { backgroundColor: 'rgba(255,255,255,0.92)' }, // map-chrome scrim, no token
  btnOn: { backgroundColor: ACCENT },
  btnPrimary: { backgroundColor: ACCENT },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: typography.bodySmall, fontWeight: '700', color: colors.ink },
  btnTextOn: { color: colors.textOnColor },
});
