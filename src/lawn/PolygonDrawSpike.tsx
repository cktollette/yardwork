import Mapbox, {
  Camera,
  FillLayer,
  LineLayer,
  MapView,
  PointAnnotation,
  ShapeSource,
} from '@rnmapbox/maps';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * SPIKE — proving the core polygon-draw interaction on a Mapbox satellite
 * layer. No persistence, no navigation. The point is to feel the interaction,
 * especially the gesture separation between panning the map and placing points.
 *
 * Gesture-separation approach: an explicit "Draw" toggle. With Draw OFF the map
 * pans/zooms normally and taps do nothing (frame your lawn first). With Draw ON
 * a tap places a vertex, while a drag still pans and dragging a vertex handle
 * moves that vertex — so a tap vs. a drag is never ambiguous.
 */

type Position = [number, number];

// Default camera over a suburban area so there are lawns to trace in the sim.
const DEFAULT_CENTER: Position = [-96.8236, 33.1507];
const DEFAULT_ZOOM = 18.5;
const MIN_VERTICES = 3;
const ACCENT = '#22c55e';

export default function PolygonDrawSpike() {
  const insets = useSafeAreaInsets();
  const [vertices, setVertices] = useState<Position[]>([]);
  const [drawMode, setDrawMode] = useState(false);
  const [closed, setClosed] = useState(false);

  const canClose = vertices.length >= MIN_VERTICES && !closed;

  const handleMapPress = useCallback(
    (feature: GeoJSON.Feature) => {
      if (!drawMode || closed) return;
      if (feature.geometry?.type !== 'Point') return;
      const coord = feature.geometry.coordinates as Position;
      setVertices((v) => [...v, coord]);
    },
    [drawMode, closed],
  );

  const handleVertexDrag = useCallback((index: number, feature: GeoJSON.Feature) => {
    if (feature.geometry?.type !== 'Point') return;
    const coord = feature.geometry.coordinates as Position;
    setVertices((v) => v.map((p, i) => (i === index ? coord : p)));
  }, []);

  const undo = useCallback(() => {
    if (closed) return;
    setVertices((v) => v.slice(0, -1));
  }, [closed]);

  const close = useCallback(() => {
    setVertices((v) => (v.length >= MIN_VERTICES ? (setClosed(true), v) : v));
  }, []);

  const reset = useCallback(() => {
    setVertices([]);
    setClosed(false);
  }, []);

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

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        styleURL={Mapbox.StyleURL.Satellite}
        onPress={handleMapPress}
        scaleBarEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Camera
          defaultSettings={{
            centerCoordinate: DEFAULT_CENTER,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />

        {closed ? (
          <ShapeSource id="polygon" shape={polygonShape}>
            <FillLayer id="polygon-fill" style={{ fillColor: 'rgba(34,197,94,0.35)' }} />
            <LineLayer
              id="polygon-outline"
              style={{ lineColor: ACCENT, lineWidth: 3 }}
            />
          </ShapeSource>
        ) : (
          vertices.length >= 2 && (
            <ShapeSource id="line" shape={lineShape}>
              <LineLayer id="line-layer" style={{ lineColor: ACCENT, lineWidth: 3 }} />
            </ShapeSource>
          )
        )}

        {vertices.map((v, i) => (
          <PointAnnotation
            key={`vertex-${i}`}
            id={`vertex-${i}`}
            coordinate={v}
            draggable
            onDragEnd={(f) => handleVertexDrag(i, f as GeoJSON.Feature)}
            onSelected={() => {
              // Tapping the first vertex closes the loop (once it's a polygon).
              if (i === 0 && canClose) close();
            }}
          >
            <View style={[styles.handle, i === 0 && styles.firstHandle]} />
          </PointAnnotation>
        ))}
      </MapView>

      <View style={[styles.topBar, { top: insets.top + 8 }]} pointerEvents="none">
        <Text style={styles.status}>
          {closed
            ? `Closed · ${vertices.length} points`
            : drawMode
              ? `Draw mode · tap to place  (${vertices.length})`
              : `Pan/zoom to frame your lawn  (${vertices.length})`}
        </Text>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={() => setDrawMode((d) => !d)}
          disabled={closed}
          style={[
            styles.btn,
            drawMode ? styles.btnOn : styles.btnIdle,
            closed && styles.btnDisabled,
          ]}
        >
          <Text style={[styles.btnText, drawMode && styles.btnTextOn]}>
            {drawMode ? 'Draw: ON' : 'Draw: OFF'}
          </Text>
        </Pressable>

        <Pressable
          onPress={undo}
          disabled={closed || vertices.length === 0}
          style={[
            styles.btn,
            styles.btnIdle,
            (closed || vertices.length === 0) && styles.btnDisabled,
          ]}
        >
          <Text style={styles.btnText}>Undo</Text>
        </Pressable>

        {closed ? (
          <Pressable onPress={reset} style={[styles.btn, styles.btnIdle]}>
            <Text style={styles.btnText}>Clear</Text>
          </Pressable>
        ) : (
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
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { flex: 1 },
  handle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: ACCENT,
  },
  firstHandle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT,
    borderColor: '#fff',
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  status: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    minWidth: 84,
    alignItems: 'center',
  },
  btnIdle: { backgroundColor: 'rgba(255,255,255,0.92)' },
  btnOn: { backgroundColor: ACCENT },
  btnPrimary: { backgroundColor: ACCENT },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  btnTextOn: { color: '#fff' },
});
