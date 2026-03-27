/**
 * SoilMarkersContext.tsx — Saathi AI
 * Persistent + Real-Time Hybrid Soil Marker System
 *
 * Combines:
 *  - API permanent markers (fetched from backend, stored in AsyncStorage)
 *  - BLE live markers (from connect screen during sensor scan)
 *
 * Deduplication key: `${latitude}-${longitude}-${timestamp}`
 * Storage key: 'saathi_soil_markers_v1'
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SoilMarker {
  /** Unique dedup key — set automatically on add */
  key?: string;

  latitude: number;
  longitude: number;

  // Soil readings
  ph: number;
  n?: number;
  p?: number;
  k?: number;
  moisture?: number;
  temperature?: number;

  // Metadata
  timestamp: string;        // ISO string
  source: 'api' | 'ble';   // Where the marker came from
  locationDetails?: string;
  deviceId?: string;
}

interface SoilMarkersContextValue {
  /** All deduplicated markers across both sources */
  soilMarkers: SoilMarker[];

  /** Add a single BLE live marker */
  addSoilMarker: (marker: Omit<SoilMarker, 'key'>) => void;

  /** Batch-add permanent API markers (avoids multiple AsyncStorage writes) */
  addSoilMarkers: (markers: Omit<SoilMarker, 'key'>[]) => void;

  /** Wipe all stored markers (dev/debug utility) */
  clearMarkers: () => Promise<void>;

  /** True while loading from AsyncStorage on first mount */
  isLoadingMarkers: boolean;
}

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'saathi_soil_markers_v1';

function buildKey(m: Omit<SoilMarker, 'key'>): string {
  return `${m.latitude.toFixed(6)}-${m.longitude.toFixed(6)}-${m.timestamp}`;
}

function isValidMarkerShape(marker: Partial<SoilMarker>): marker is Omit<SoilMarker, 'key'> {
  return (
    typeof marker.latitude === 'number' &&
    Number.isFinite(marker.latitude) &&
    typeof marker.longitude === 'number' &&
    Number.isFinite(marker.longitude) &&
    typeof marker.timestamp === 'string' &&
    marker.timestamp.length > 0 &&
    typeof marker.ph === 'number' &&
    Number.isFinite(marker.ph) &&
    (marker.source === 'api' || marker.source === 'ble')
  );
}

function normalizeTimestamp(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

async function loadFromStorage(): Promise<SoilMarker[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveToStorage(markers: SoilMarker[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(markers));
  } catch (e) {
    console.warn('[SoilMarkersContext] Failed to persist markers:', e);
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const SoilMarkersContext = createContext<SoilMarkersContextValue | null>(null);

export function SoilMarkersProvider({ children }: { children: React.ReactNode }) {
  const [soilMarkers, setSoilMarkers] = useState<SoilMarker[]>([]);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(true);

  // Track existing keys to enable fast O(1) dedup
  const keysRef = useRef<Set<string>>(new Set());

  // ─── Load persisted markers on mount ──────────────────────────────────────
  useEffect(() => {
    loadFromStorage().then((stored) => {
      // Rehydrate + sanitize + deduplicate persisted markers.
      const uniqueMap = new Map<string, SoilMarker>();
      for (const raw of stored) {
        if (!isValidMarkerShape(raw)) continue;
        const normalized: Omit<SoilMarker, 'key'> = {
          ...raw,
          timestamp: normalizeTimestamp(raw.timestamp),
        };
        const key = buildKey(normalized);
        uniqueMap.set(key, { ...normalized, key });
      }

      const hydrated = Array.from(uniqueMap.values());
      keysRef.current = new Set(hydrated.map((m) => m.key as string));
      setSoilMarkers(hydrated);
      setIsLoadingMarkers(false);

      // Self-heal storage in case older data contained duplicates/invalid entries.
      saveToStorage(hydrated);
    });
  }, []);

  // ─── Add a single marker (BLE live) ───────────────────────────────────────
  const addSoilMarker = useCallback((marker: Omit<SoilMarker, 'key'>) => {
    const key = buildKey(marker);
    if (keysRef.current.has(key)) return; // Duplicate — skip
    keysRef.current.add(key);

    const full: SoilMarker = { ...marker, key };
    setSoilMarkers((prev) => {
      const next = [...prev, full];
      saveToStorage(next);
      return next;
    });
  }, []);

  // ─── Batch add markers (API permanent) ────────────────────────────────────
  const addSoilMarkers = useCallback((markers: Omit<SoilMarker, 'key'>[]) => {
    const newMarkers: SoilMarker[] = [];
    for (const m of markers) {
      const key = buildKey(m);
      if (keysRef.current.has(key)) continue; // Skip duplicate
      keysRef.current.add(key);
      newMarkers.push({ ...m, key });
    }
    if (newMarkers.length === 0) return;

    setSoilMarkers((prev) => {
      const next = [...prev, ...newMarkers];
      saveToStorage(next);
      return next;
    });
  }, []);

  // ─── Clear all markers ────────────────────────────────────────────────────
  const clearMarkers = useCallback(async () => {
    keysRef.current.clear();
    setSoilMarkers([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <SoilMarkersContext.Provider
      value={{ soilMarkers, addSoilMarker, addSoilMarkers, clearMarkers, isLoadingMarkers }}
    >
      {children}
    </SoilMarkersContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSoilMarkers(): SoilMarkersContextValue {
  const ctx = useContext(SoilMarkersContext);
  if (!ctx) {
    throw new Error('useSoilMarkers must be used inside <SoilMarkersProvider>');
  }
  return ctx;
}
