import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { THEME_COLORS } from '../constants/Theme';

export default function AnalyticsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.constructionText}>In construction</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: THEME_COLORS.bluePrimary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  constructionText: {
    fontSize: 18,
    fontWeight: '500',
    color: THEME_COLORS.text.secondary,
  },
});
