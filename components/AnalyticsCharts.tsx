import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  BarChart,
  LineChart,
  PieChart,
  ProgressChart,
} from 'react-native-chart-kit';
import { THEME_COLORS } from '../constants/Theme';
import { supabase } from '../lib/supabase';
import { ClimbingSession, climbingSessionService } from '../services/climbingSessionService';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 80; // 20px container padding + 20px card padding on each side = 40px per side

// Utility functions for data processing
const gradeToNumeric = (grade: string | null): number => {
  if (!grade) return 0;
  const numericGrade = parseFloat(grade.replace(/[^\d.]/g, ''));
  return isNaN(numericGrade) ? 0 : numericGrade;
};

const processGradeProgression = (sessions: ClimbingSession[]) => {
  const sessionsByMonth = sessions.reduce((acc, session) => {
    const month = new Date(session.when).toLocaleDateString('en-US', { month: 'short' });
    if (!acc[month]) acc[month] = [];
    if (session.grade) acc[month].push(gradeToNumeric(session.grade));
    return acc;
  }, {} as Record<string, number[]>);

  const labels = Object.keys(sessionsByMonth);
  const avgGrades = labels.map(month => {
    const grades = sessionsByMonth[month];
    return grades.length ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : 0;
  });

  return {
    labels: labels.slice(-6), // Last 6 months
    datasets: [{
      data: avgGrades.slice(-6),
      color: (opacity = 1) => `${THEME_COLORS.bluePrimary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
      strokeWidth: 3,
    }],
  };
};

const processTimeOfDay = (sessions: ClimbingSession[]) => {
  const timeStats = sessions.reduce((acc, session) => {
    const time = session.timeOfDay || 'Unknown';
    acc[time] = (acc[time] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    labels: Object.keys(timeStats),
    datasets: [{
      data: Object.values(timeStats),
    }],
  };
};

const processClimbingTypes = (sessions: ClimbingSession[]) => {
  const typeStats = sessions.reduce((acc, session) => {
    const type = session.climbingType || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const colors = [THEME_COLORS.orange, THEME_COLORS.bluePrimary, THEME_COLORS.blueSecondary, THEME_COLORS.softRed, THEME_COLORS.green];
  return Object.entries(typeStats).map(([name, count], index) => ({
    name,
    population: count,
    color: colors[index % colors.length],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));
};

const processTechnicalSkills = (sessions: ClimbingSession[]) => {
  const skills = ['movement', 'grip', 'footwork'];
  const skillCounts = skills.map(skill => {
    const count = sessions.filter(s => s[skill as keyof ClimbingSession]).length;
    return count / sessions.length;
  });

  return {
    labels: ['Movement', 'Grip', 'Footwork', 'Overall'],
    data: [...skillCounts, skillCounts.reduce((sum, val) => sum + val, 0) / skillCounts.length],
  };
};

const processLocationStats = (sessions: ClimbingSession[]) => {
  const locationStats = sessions.reduce((acc, session) => {
    const location = session.place || session.location_data?.name || 'Unknown';
    acc[location] = (acc[location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topLocations = Object.entries(locationStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return {
    labels: topLocations.map(([name]) => name.length > 8 ? name.substring(0, 8) + '...' : name),
    datasets: [{
      data: topLocations.map(([, count]) => count),
    }],
  };
};

const processCompletionByGrade = (sessions: ClimbingSession[]) => {
  const gradeStats = sessions.reduce((acc, session) => {
    if (session.grade && session.completion) {
      const grade = session.grade;
      if (!acc[grade]) acc[grade] = { total: 0, completed: 0 };
      acc[grade].total += 1;
      if (session.completion === 'Completed') acc[grade].completed += 1;
    }
    return acc;
  }, {} as Record<string, { total: number; completed: number }>);

  const grades = Object.keys(gradeStats).sort((a, b) => gradeToNumeric(a) - gradeToNumeric(b));
  const completionRates = grades.map(grade => 
    gradeStats[grade].total > 0 ? (gradeStats[grade].completed / gradeStats[grade].total) * 100 : 0
  );

  return {
    labels: grades.slice(-6), // Last 6 grades
    datasets: [{
      data: completionRates.slice(-6),
    }],
  };
};

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientFromOpacity: 1,
  backgroundGradientTo: '#ffffff',
  backgroundGradientToOpacity: 1,
  color: (opacity = 1) => `${THEME_COLORS.bluePrimary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
  strokeWidth: 2,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
  decimalPlaces: 1,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: THEME_COLORS.bluePrimary,
  },
  propsForBackgroundLines: {
    strokeDasharray: '',
    strokeOpacity: 0.1,
  },
};

export default function AnalyticsCharts() {
  const [sessions, setSessions] = useState<ClimbingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const userSessions = await climbingSessionService.getUserSessions(user.email);
        setSessions(userSessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Track your climbing progress and insights</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME_COLORS.bluePrimary} />
          <Text style={styles.loadingText}>Loading your climbing data...</Text>
        </View>
      </ScrollView>
    );
  }

  if (sessions.length === 0) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Track your climbing progress and insights</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Data Available</Text>
          <Text style={styles.emptyText}>Start logging your climbing sessions to see your analytics!</Text>
        </View>
      </ScrollView>
    );
  }

  // Process data for charts
  const gradeProgression = processGradeProgression(sessions);
  const timeOfDayStats = processTimeOfDay(sessions);
  const climbingTypesData = processClimbingTypes(sessions);
  const technicalSkills = processTechnicalSkills(sessions);
  const locationStats = processLocationStats(sessions);
  const completionByGrade = processCompletionByGrade(sessions);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Track your climbing progress and insights</Text>
      </View>
      
      {/* Performance Progress */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Performance Progress</Text>
        <Text style={styles.chartSubtitle}>Grade evolution over time</Text>
        <LineChart
          data={gradeProgression}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          yAxisSuffix=""
          fromZero={false}
        />
      </View>

      {/* Activity Analysis */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Activity Analysis</Text>
        <Text style={styles.chartSubtitle}>Sessions by time of day</Text>
        <BarChart
          data={timeOfDayStats}
          width={chartWidth}
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `${THEME_COLORS.green}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
          }}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
          fromZero
        />
      </View>

      {/* Technical Performance */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Technical Performance</Text>
        <Text style={styles.chartSubtitle}>Climbing type distribution</Text>
        <PieChart
          data={climbingTypesData}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      </View>

      {/* Technical Skills */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Technical Skills</Text>
        <Text style={styles.chartSubtitle}>Movement, grip, and footwork analysis</Text>
        <ProgressChart
          data={technicalSkills}
          width={chartWidth}
          height={220}
          strokeWidth={16}
          radius={32}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1, index) => {
              const themeColors = [THEME_COLORS.orange, THEME_COLORS.bluePrimary, THEME_COLORS.blueSecondary, THEME_COLORS.softRed];
              return themeColors[(index || 0) % themeColors.length];
            },
          }}
          style={styles.chart}
        />
      </View>

      {/* Location Analytics */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Location Analytics</Text>
        <Text style={styles.chartSubtitle}>Most visited climbing spots</Text>
        <BarChart
          data={locationStats}
          width={chartWidth}
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `${THEME_COLORS.softRed}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
          }}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
          fromZero
          showValuesOnTopOfBars
        />
      </View>

      {/* Success Metrics */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Success Metrics</Text>
        <Text style={styles.chartSubtitle}>Completion rate by grade (%)</Text>
        <BarChart
          data={completionByGrade}
          width={chartWidth}
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `${THEME_COLORS.blueSecondary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
          }}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix="%"
          fromZero
        />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: THEME_COLORS.bluePrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    paddingHorizontal: 0,
    paddingVertical: 15,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000000',
    opacity: 0.7,
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  chart: {
    borderRadius: 8,
  },
});
