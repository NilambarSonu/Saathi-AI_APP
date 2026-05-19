import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Spacing } from '../constants/Spacing';
import { SoilTest } from '@/features/soil_analysis/services/soil';
import { getPhColor } from './MapComponent';
import { useTheme } from '@/context/ThemeContext';

interface SoilDetailsSheetProps {
  selectedTest: SoilTest | null;
  onClose: () => void;
}

export default function SoilDetailsSheet({ selectedTest, onClose }: SoilDetailsSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { theme } = useTheme();

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
      backgroundStyle={[s.sheetBackground, { backgroundColor: theme.modalBackground }]}
      handleIndicatorStyle={[s.indicator, { backgroundColor: theme.sep1 }]}
    >
      <View style={s.contentContainer}>
        {selectedTest && (
          <>
            <View style={[s.header, { borderBottomColor: theme.sep1 }]}>
              <Text style={[s.title, { color: theme.textPrimary }]}>Soil Analysis</Text>
              <View style={[s.phBadge, { backgroundColor: getPhColor(selectedTest.ph) + '1A', borderColor: getPhColor(selectedTest.ph) + '33' }]}>
                <Text style={[s.phValue, { color: getPhColor(selectedTest.ph) }]}>pH {selectedTest.ph.toFixed(1)}</Text>
              </View>
            </View>

            <View style={s.infoRow}>
              <View style={s.infoBlock}>
                <Text style={[s.infoLabel, { color: theme.textMuted }]}>Category</Text>
                <Text style={[s.infoValue, { color: theme.label2 }]}>{getPhCategory(selectedTest.ph)}</Text>
              </View>
              <View style={s.infoBlock}>
                <Text style={[s.infoLabel, { color: theme.textMuted }]}>Date</Text>
                <Text style={[s.infoValue, { color: theme.label2 }]}>{selectedTest.createdAt ? new Date(selectedTest.createdAt).toLocaleDateString() : 'N/A'}</Text>
              </View>
            </View>

            <View style={[s.nutrientsContainer, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={[s.nutrientsTitle, { color: theme.textSecondary }]}>Macronutrients</Text>
              <View style={s.npkGrid}>
                <View style={[s.npkBox, { borderRightColor: theme.sep1 }]}>
                  <Text style={[s.npkLabel, { color: theme.textMuted }]}>Nitrogen (N)</Text>
                  <Text style={[s.npkAmount, { color: theme.textPrimary }]}>{selectedTest.n} <Text style={[s.npkUnit, { color: theme.textMuted }]}>ppm</Text></Text>
                </View>
                <View style={[s.npkBox, { borderRightColor: theme.sep1 }]}>
                  <Text style={[s.npkLabel, { color: theme.textMuted }]}>Phosphorus (P)</Text>
                  <Text style={[s.npkAmount, { color: theme.textPrimary }]}>{selectedTest.p} <Text style={[s.npkUnit, { color: theme.textMuted }]}>ppm</Text></Text>
                </View>
                <View style={[s.npkBox, { borderRightWidth: 0 }]}>
                  <Text style={[s.npkLabel, { color: theme.textMuted }]}>Potassium (K)</Text>
                  <Text style={[s.npkAmount, { color: theme.textPrimary }]}>{selectedTest.k} <Text style={[s.npkUnit, { color: theme.textMuted }]}>ppm</Text></Text>
                </View>
              </View>
            </View>

            <View style={s.footerInfo}>
                <Text style={[s.footerText, { color: theme.textMuted }]}>
                  Lat: {selectedTest.latitude?.toFixed(6) || 'N/A'} • Lng: {selectedTest.longitude?.toFixed(6) || 'N/A'}
                </Text>
            </View>
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  sheetBackground: {
    borderRadius: 24,
  },
  indicator: {
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
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: 20,
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
    marginBottom: 4,
  },
  infoValue: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 15,
  },
  nutrientsContainer: {
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  nutrientsTitle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
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
  },
  npkLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: 11,
    marginBottom: 4,
  },
  npkAmount: {
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
  },
  npkUnit: {
    fontSize: 11,
  },
  footerInfo: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  footerText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
  }
});
