import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import AnalyticsCharts from '../components/AnalyticsCharts';

export default function AnalyticsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <AnalyticsCharts />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
