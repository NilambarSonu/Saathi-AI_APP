import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { SoilTest } from '../services/soil';

// Matches web's getPhColor logic exactly
export const getPhColor = (ph: number): string => {
  if (ph < 4.5) return '#DC2626'; // Strongly acidic - Red
  if (ph < 5.5) return '#EF4444'; // Acidic - Light red
  if (ph < 6.5) return '#22C55E'; // Slightly acidic - Green
  if (ph < 7.5) return '#3B82F6'; // Neutral - Blue
  if (ph < 8.5) return '#F59E0B'; // Slightly alkaline - Orange
  return '#B45309'; // Alkaline - Dark orange
};

interface MapComponentProps {
  tests: SoilTest[];
  onMarkerPress?: (test: SoilTest) => void;
  style?: any;
}

// Default to India roughly
const DEFAULT_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 15,
  longitudeDelta: 15,
};

export default function MapComponent({ tests, onMarkerPress, style }: MapComponentProps) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (!tests || tests.length === 0 || !mapRef.current || !isRendered) return;

    const mappedTests = tests.filter(t => t.latitude !== null && t.longitude !== null);

    if (mappedTests.length === 0) return;

    if (mappedTests.length === 1) {
       const t = mappedTests[0];
       mapRef.current.animateToRegion({
         latitude: t.latitude!,
         longitude: t.longitude!,
         latitudeDelta: 0.05,
         longitudeDelta: 0.05,
       }, 1000);
       return;
    }

    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;

    mappedTests.forEach(test => {
      const lat = test.latitude!;
      const lng = test.longitude!;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const deltaLat = Math.max(maxLat - minLat, 0.01) * 1.5;
    const deltaLng = Math.max(maxLng - minLng, 0.01) * 1.5;

    mapRef.current.animateToRegion({
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLng,
    }, 1000);

  }, [tests, isRendered]);

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        // PROVIDER_GOOGLE removed — requires API key. Default: Apple Maps (iOS) / Google (Android)
        style={styles.map}
        initialRegion={region}
        mapType="standard"
        showsUserLocation
        showsMyLocationButton
        showsCompass
        pitchEnabled={false}
        onMapReady={() => setIsRendered(true)}
      >
        {isRendered && tests.map((test) => {
          if (test.latitude === null || test.longitude === null) return null;

          const markerColor = getPhColor(test.ph);

          return (
            <Marker
              key={test.id}
              coordinate={{
                latitude: test.latitude,
                longitude: test.longitude,
              }}
              onPress={() => onMarkerPress && onMarkerPress(test)}
              tracksViewChanges={false} // Performance optimization for static markers
            >
              {/* Custom colored circle marker matching web UI */}
              <View style={[styles.customPin, { backgroundColor: markerColor }]}>
                <View style={styles.customPinInner} />
              </View>
            </Marker>
          );
        })}
      </MapView>
      
      {!isRendered && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1A7B3C" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0', // Placeholder gray before loading
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  customPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  customPinInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  }
});
