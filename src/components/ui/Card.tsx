import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  featured?: boolean;
}

export default function Card({ children, style, featured = false }: CardProps) {
  return (
    <View style={[
      styles.card, 
      featured && styles.featured,
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.xl || 20,
    padding: Spacing.lg,
    ...Spacing.shadows.sm,
  },
  featured: {
    borderWidth: 2,
    borderColor: Colors.primary,
  }
});


