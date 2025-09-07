import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
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

// Calculate streak of consecutive weeks with at least one session
const calculateWeeklyStreak = (sessions: ClimbingSession[]): number => {
  if (sessions.length === 0) return 0;

  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
  currentWeekStart.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkWeek = new Date(currentWeekStart);

  while (true) {
    const weekEnd = new Date(checkWeek);
    weekEnd.setDate(checkWeek.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Check if there's at least one session in this week
    const hasSessionInWeek = sessions.some(session => {
      const sessionDate = new Date(session.when);
      return sessionDate >= checkWeek && sessionDate <= weekEnd;
    });

    if (hasSessionInWeek) {
      streak++;
      // Move to previous week
      checkWeek.setDate(checkWeek.getDate() - 7);
    } else {
      break;
    }
  }

  return streak;
};

// Calculate selected month metrics
const calculateSelectedMonthMetrics = (sessions: ClimbingSession[], selectedMonth: number, selectedYear: number) => {
  const selectedMonthSessions = sessions.filter(session => {
    const sessionDate = new Date(session.when);
    return sessionDate.getMonth() === selectedMonth && sessionDate.getFullYear() === selectedYear;
  });

  const sessionsThisMonth = selectedMonthSessions.length;
  const routesCompleted = selectedMonthSessions.filter(s => s.completion === 'Completed').length;
  const totalAttempts = selectedMonthSessions.filter(s => s.completion === 'Attempt').length;
  // Find the session with the highest completed grade
  const completedSessions = selectedMonthSessions.filter(s => s.grade && s.completion === 'Completed');
  let maxGrade = '-';
  if (completedSessions.length > 0) {
    const maxSession = completedSessions.reduce((prev, current) => {
      return gradeToNumeric(current.grade!) > gradeToNumeric(prev.grade!) ? current : prev;
    });
    maxGrade = maxSession.grade || '-';
  }

  return {
    sessionsThisMonth,
    routesCompleted,
    totalAttempts,
    maxGrade,
  };
};

// Generate marked dates for calendar
const generateMarkedDates = (sessions: ClimbingSession[], selectedMonth: number, selectedYear: number) => {
  const targetMonth = selectedMonth + 1; // getMonth() returns 0-based, so add 1
  
  const markedDates: { [key: string]: any } = {};
  
  // Process each session
  sessions.forEach(session => {
    // Convert session.when to YYYY-MM-DD format, avoiding timezone issues
    const sessionDate = new Date(session.when);
    const sessionYear = sessionDate.getFullYear();
    const sessionMonth = sessionDate.getMonth() + 1;
    
    // Only include sessions from selected month
    if (sessionYear === selectedYear && sessionMonth === targetMonth) {
      // Create date string in YYYY-MM-DD format with local timezone
      const dateString = `${sessionYear}-${String(sessionMonth).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`;
      
      markedDates[dateString] = {
        hasSession: true,
      };
    }
  });
  
  return markedDates;
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
  
  // State for month selection
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadSessions();
    }, [])
  );

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
  
  // Month navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    const currentDate = new Date();
    const isCurrentMonth = selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear();
    
    if (direction === 'next' && isCurrentMonth) {
      return; // Can't go to future months
    }
    
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else if (direction === 'next') {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };
  
  const getMonthLabel = () => {
    const date = new Date(selectedYear, selectedMonth);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };
  
  const canNavigateNext = () => {
    const currentDate = new Date();
    return !(selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear());
  };

  // Process data for new analytics features
  const weeklyStreak = calculateWeeklyStreak(sessions);
  const selectedMonthMetrics = calculateSelectedMonthMetrics(sessions, selectedMonth, selectedYear);
  const markedDates = generateMarkedDates(sessions, selectedMonth, selectedYear);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Track your climbing progress and insights</Text>
      </View>
      
      {/* Weekly Streak Card */}
      <View style={styles.streakCard}>
        <Text style={styles.streakNumber}>{weeklyStreak}</Text>
        <Text style={styles.streakLabel}>Week Streak</Text>
        <Text style={styles.streakSubtitle}>Consecutive weeks with sessions</Text>
      </View>

      {/* Activity Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.monthSelectorContainer}>
            <View style={styles.monthSelector}>
              <TouchableOpacity 
                style={styles.monthArrow} 
                onPress={() => navigateMonth('prev')}
              >
                <Text style={styles.monthArrowText}>{'‹'}</Text>
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{getMonthLabel()}</Text>
              <TouchableOpacity 
                style={[styles.monthArrow, !canNavigateNext() && styles.monthArrowDisabled]} 
                onPress={() => canNavigateNext() && navigateMonth('next')}
              >
                <Text style={[styles.monthArrowText, !canNavigateNext() && styles.monthArrowTextDisabled]}>{'›'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Metrics Cards */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Routes</Text>
            <Text style={styles.metricNumber}>{selectedMonthMetrics.sessionsThisMonth}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Completed</Text>
            <Text style={styles.metricNumber}>{selectedMonthMetrics.routesCompleted}</Text>
          </View>
        </View>
        
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Max grade completed</Text>
            <Text style={styles.metricNumber}>{selectedMonthMetrics.maxGrade}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Attempts</Text>
            <Text style={styles.metricNumber}>{selectedMonthMetrics.totalAttempts}</Text>
          </View>
        </View>

        {/* Monthly Activity Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            key={`${selectedYear}-${selectedMonth}`}
            // Show selected month name in English
            renderHeader={(date) => (
              <Text style={styles.calendarTitle}>
                {new Date(selectedYear, selectedMonth).toLocaleString('en-US', { month: 'long' })}
              </Text>
            )}
            
            // Custom day component - show dots for session days
            dayComponent={({date, marking}) => {
              if (!date) return <View style={styles.calendarDay} />;
              
              const targetMonth = String(selectedMonth + 1).padStart(2, '0');
              const targetYear = String(selectedYear);
              
              // Parse dateString (YYYY-MM-DD) without timezone conversion
              const [year, month, day] = date.dateString.split('-');
              
              // Check if this day is in the selected month
              const isSelectedMonth = month === targetMonth && year === targetYear;
              
              // Only check for sessions if it's the selected month
              const hasSession = isSelectedMonth ? (markedDates[date.dateString]?.hasSession || false) : false;
              
              // Check if it's today
              const today = new Date();
              const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              const isToday = date.dateString === todayString;
              
              // Always render a day component, but only show session indicator for selected month
              return (
                <View style={[
                  styles.calendarDay,
                  { 
                    backgroundColor: hasSession ? THEME_COLORS.bluePrimary : '#E0E0E0',
                    borderWidth: isToday && isSelectedMonth ? 2 : 0,
                    borderColor: isToday && isSelectedMonth ? '#FF5B30' : 'transparent',
                    opacity: isSelectedMonth ? 1 : 0  // Hide days from other months completely
                  }
                ]} />
              );
            }}
            
            // Pass marked dates and set current date for selected month
            markedDates={markedDates}
            current={`${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`}
            
            // Hide arrows to prevent navigation
            hideArrows={true}
            
            // Disable day press
            disableAllTouchEventsForDisabledDays={true}
            
            // Hide month title (we're using custom header)
            hideDayNames={false}
            
            // Calendar theme
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: '#666666',
              textSectionTitleDisabledColor: '#d9e1e8',
              selectedDayBackgroundColor: THEME_COLORS.bluePrimary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: THEME_COLORS.orange,
              dayTextColor: 'transparent', // Hide day numbers
              textDisabledColor: 'transparent', // Hide disabled day numbers
              dotColor: THEME_COLORS.bluePrimary,
              selectedDotColor: '#ffffff',
              arrowColor: THEME_COLORS.bluePrimary,
              disabledArrowColor: '#d9e1e8',
              monthTextColor: '#2c3e50',
              indicatorColor: 'transparent',
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '300',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '500',
              textDayFontSize: 0, // Hide day numbers
              textMonthFontSize: 16,
              textDayHeaderFontSize: 12,
            }}
          />
        </View>
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
  streakCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: THEME_COLORS.bluePrimary,
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  streakSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    lineHeight: 32,
    textAlignVertical: 'center',
  },
  monthSelectorContainer: {
    backgroundColor: `${THEME_COLORS.bluePrimary}20`,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-end',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    height: 32,
  },
  monthArrow: {
    width: 28,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthArrowDisabled: {
    backgroundColor: 'transparent',
  },
  monthArrowText: {
    color: THEME_COLORS.bluePrimary,
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
    textAlignVertical: 'center',
    textAlign: 'center',
    marginTop: -4,
  },
  monthArrowTextDisabled: {
    opacity: 0.3,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME_COLORS.bluePrimary,
    minWidth: 70,
    textAlign: 'center',
    lineHeight: 32,
    height: 32,
    textAlignVertical: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'flex-start',
    flex: 1,
    minHeight: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7f8c8d',
    marginBottom: 2,
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME_COLORS.bluePrimary,
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  calendarDay: {
    width: 12,
    height: 12,
    borderRadius: 6,
    margin: 2,
  },
});
