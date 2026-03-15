import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Spacing';
import { SoilTest } from '../services/soil';
import { getPhColor } from './MapComponent';

interface SoilDetailsSheetProps {
  selectedTest: SoilTest | null;
  onClose: () => void;
}

export default function SoilDetailsSheet({ selectedTest, onClose }: SoilDetailsSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Variables
  const snapPoints = useMemo(() => ['45%'], []);

  useEffect(() => {
    if (selectedTest) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [selectedTest]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose(); // Cleanup state when sheet is fully closed
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  // Derive pH category roughly matching web logic
  const getPhCategory = (ph: number) => {
    if (ph < 5.5) return 'Acidic';
    if (ph < 6.5) return 'Slightly Acidic';
    if (ph < 7.5) return 'Neutral';
    if (ph < 8.5) return 'Slightly Alkaline';
    return 'Alkaline';
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1} // start closed
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.indicator}
    >
      <View style={styles.contentContainer}>
        {selectedTest && (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Soil Analysis</Text>
              <View style={[styles.phBadge, { backgroundColor: getPhColor(selectedTest.ph) + '1A', borderColor: getPhColor(selectedTest.ph) + '33' }]}>
                <Text style={[styles.phValue, { color: getPhColor(selectedTest.ph) }]}>pH {selectedTest.ph.toFixed(1)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Category</Text>
                <Text style={styles.infoValue}>{getPhCategory(selectedTest.ph)}</Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{new Date(selectedTest.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>

            <View style={styles.nutrientsContainer}>
              <Text style={styles.nutrientsTitle}>Macronutrients</Text>
              <View style={styles.npkGrid}>
                <View style={styles.npkBox}>
                  <Text style={styles.npkLabel}>Nitrogen (N)</Text>
                  <Text style={styles.npkAmount}>{selectedTest.n} <Text style={styles.npkUnit}>ppm</Text></Text>
                </View>
                <View style={styles.npkBox}>
                  <Text style={styles.npkLabel}>Phosphorus (P)</Text>
                  <Text style={styles.npkAmount}>{selectedTest.p} <Text style={styles.npkUnit}>ppm</Text></Text>
                </View>
                <View style={[styles.npkBox, { borderRightWidth: 0 }]}>
                  <Text style={styles.npkLabel}>Potassium (K)</Text>
                  <Text style={styles.npkAmount}>{selectedTest.k} <Text style={styles.npkUnit}>ppm</Text></Text>
                </View>
              </View>
            </View>

            <View style={styles.footerInfo}>
                <Text style={styles.footerText}>
                  Lat: {selectedTest.latitude?.toFixed(6) || 'N/A'} • Lng: {selectedTest.longitude?.toFixed(6) || 'N/A'}
                </Text>
            </View>
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#fff',
    borderRadius: 24,
  },
  indicator: {
    backgroundColor: '#D1D5DB',
    width: 40,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: 20,
    color: '#111827',
  },
  phBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  phValue: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  infoBlock: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 15,
    color: '#374151',
  },
  nutrientsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  nutrientsTitle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    color: '#4B5563',
    marginBottom: Spacing.md,
  },
  npkGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  npkBox: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  npkLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  npkAmount: {
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: '#1F2937',
  },
  npkUnit: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  footerInfo: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  footerText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    color: '#9CA3AF',
  }
});
