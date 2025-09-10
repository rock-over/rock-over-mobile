import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import {
    BarChart,
    LineChart,
    PieChart,
    StackedBarChart,
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

// Helper function to safely parse dates avoiding timezone issues
const safeParseDateString = (dateString: string): Date => {
  // Se é uma string no formato YYYY-MM-DD, parse manualmente para evitar timezone issues
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  } else {
    // Para outros formatos, usa o comportamento normal
    return new Date(dateString);
  }
};




const processCompletionByGrade = (sessions: ClimbingSession[], period: '7d' | '30d' | '6m' | '1y' | 'all') => {
  // Filter sessions by period
  const now = new Date();
  let startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(now.getDate() - 6);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 29);
      break;
    case '6m':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
      if (sessions.length > 0) {
        startDate = new Date(Math.min(...sessions.map(s => safeParseDateString(s.when).getTime())));
      }
      break;
  }

  const filteredSessions = period === 'all' ? sessions : sessions.filter(session => {
    const sessionDate = safeParseDateString(session.when);
    return sessionDate >= startDate && sessionDate <= now;
  });

  const gradeStats = filteredSessions.reduce((acc, session) => {
    if (session.grade && session.completion) {
      const grade = session.grade;
      if (!acc[grade]) acc[grade] = { total: 0, completed: 0, attempt: 0 };
      if (session.completion === 'Completed') {
        acc[grade].completed += 1;
      } else if (session.completion === 'Attempt') {
        acc[grade].attempt += 1;
      }
      acc[grade].total = acc[grade].completed + acc[grade].attempt;
    }
    return acc;
  }, {} as Record<string, { total: number; completed: number; attempt: number }>);

  const grades = Object.keys(gradeStats).sort((a, b) => gradeToNumeric(a) - gradeToNumeric(b));
  const filteredGrades = grades.slice(-6); // Last 6 grades

  if (filteredGrades.length === 0) {
    return {
      labels: ['No Data'],
      legend: ['Completed', 'Attempt'],
      data: [[0, 0]],
      barColors: [THEME_COLORS.bluePrimary, '#FF5B30'],
      hasData: false,
    };
  }

  const stackedData = filteredGrades.map(grade => [
    gradeStats[grade].completed,
    gradeStats[grade].attempt
  ]);

  return {
    labels: filteredGrades,
    legend: ['Completed', 'Attempt'],
    data: stackedData,
    barColors: [THEME_COLORS.bluePrimary, '#FF5B30'],
    hasData: true,
  };
};

// Movement analytics function
const processMovementData = (sessions: ClimbingSession[], period: '7d' | '30d' | '6m' | '1y' | 'all') => {
  // Filter sessions by period
  const now = new Date();
  let startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(now.getDate() - 6);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 29);
      break;
    case '6m':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
      if (sessions.length > 0) {
        startDate = new Date(Math.min(...sessions.map(s => safeParseDateString(s.when).getTime())));
      }
      break;
  }

  const filteredSessions = period === 'all' ? sessions : sessions.filter(session => {
    const sessionDate = safeParseDateString(session.when);
    return sessionDate >= startDate && sessionDate <= now;
  });

  const movementCount: Record<string, number> = {};
  
  filteredSessions.forEach(session => {
    // Only process sessions that have movement data
    if (session.movement && session.movement.trim() !== '' && session.movement.trim() !== '[]') {
      // Split by comma and clean up each movement
      const movements = session.movement.split(',').map(m => m.trim());
      movements.forEach(movement => {
        // Only count non-empty movements
        if (movement && movement !== '' && movement !== 'null' && movement !== 'undefined' && movement !== '[]') {
          movementCount[movement] = (movementCount[movement] || 0) + 1;
        }
      });
    }
  });

  // Convert to array and sort by frequency
  const allMovements = Object.entries(movementCount)
    .sort(([,a], [,b]) => b - a);
  
  // Get top 4 movements and group the rest as "Others"
  const topMovements = allMovements.slice(0, 4);
  const otherMovements = allMovements.slice(4);
  
  let movementEntries = [...topMovements];
  
  // Add "Others" category if there are more movements
  if (otherMovements.length > 0) {
    const othersCount = otherMovements.reduce((sum, [, count]) => sum + count, 0);
    movementEntries.push(['Others', othersCount]);
  }

  if (movementEntries.length === 0) {
    return {
      data: [],
      hasData: false,
    };
  }

  // Generate colors for each movement (max 5: top 4 + Others)
  const colors = [
    THEME_COLORS.bluePrimary,
    '#FF5B30',
    '#34C759',
    '#FF9500',
    '#999999', // Gray for Others
  ];

  // Calculate total to get percentages
  const totalCount = movementEntries.reduce((sum, [, count]) => sum + count, 0);

  const data = movementEntries.map(([name, count], index) => {
    // Clean the name but ensure it's not empty
    let cleanedName = name.trim().replace(/['"[\]]/g, '');
    
    // If name becomes empty after cleaning, use original name
    if (cleanedName === '') {
      cleanedName = name.trim() || 'Unknown';
    }
    
    // Calculate percentage
    const percentage = Math.round((count / totalCount) * 100);
    
    return {
      name: cleanedName,
      population: percentage, // Use percentage for the pie chart calculation
      count: count, // Keep original count for reference
      color: colors[index % colors.length],
      legendFontColor: '#999999',
      legendFontSize: 12,
    };
  });

  return {
    data,
    hasData: true,
  };
};

// Performance section data processing functions
const processRoutesByGrade = (sessions: ClimbingSession[], period: '7d' | '30d' | '6m' | '1y' | 'all') => {
  // Filter sessions by period
  const now = new Date();
  let startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(now.getDate() - 6);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 29);
      break;
    case '6m':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
      if (sessions.length > 0) {
        startDate = new Date(Math.min(...sessions.map(s => safeParseDateString(s.when).getTime())));
      }
      break;
  }

  const filteredSessions = period === 'all' ? sessions : sessions.filter(session => {
    const sessionDate = safeParseDateString(session.when);
    return sessionDate >= startDate && sessionDate <= now;
  });

  const gradeStats = filteredSessions.reduce((acc, session) => {
    if (session.grade) {
      const grade = session.grade;
      acc[grade] = (acc[grade] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const sortedGrades = Object.keys(gradeStats).sort((a, b) => gradeToNumeric(a) - gradeToNumeric(b));
  
  return {
    labels: sortedGrades,
    datasets: [{
      data: sortedGrades.map(grade => gradeStats[grade]),
    }],
  };
};


const processAttemptCompletedPercentage = (sessions: ClimbingSession[], period: '7d' | '30d' | '6m' | '1y' | 'all') => {
  // Filter sessions by period
  const now = new Date();
  let startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(now.getDate() - 6);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 29);
      break;
    case '6m':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
      if (sessions.length > 0) {
        startDate = new Date(Math.min(...sessions.map(s => safeParseDateString(s.when).getTime())));
      }
      break;
  }

  const filteredSessions = period === 'all' ? sessions : sessions.filter(session => {
    const sessionDate = safeParseDateString(session.when);
    return sessionDate >= startDate && sessionDate <= now;
  });

  // Group sessions by appropriate time period
  let groupBy: 'day' | 'month' = period === '7d' || period === '30d' ? 'day' : 'month';
  
  const sessionsByPeriod = filteredSessions.reduce((acc, session) => {
    if (!session.completion) return acc;
    
    const sessionDate = safeParseDateString(session.when);
    let periodKey: string;
    let periodLabel: string;
    
    if (groupBy === 'day') {
      periodKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`;
      periodLabel = sessionDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    } else {
      periodKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;
      periodLabel = sessionDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    }
    
    if (!acc[periodKey]) {
      acc[periodKey] = {
        label: periodLabel,
        completed: 0,
        attempt: 0,
      };
    }
    
    if (session.completion === 'Completed') {
      acc[periodKey].completed += 1;
    } else if (session.completion === 'Attempt') {
      acc[periodKey].attempt += 1;
    }
    
    return acc;
  }, {} as Record<string, { label: string; completed: number; attempt: number }>);

  // Sort chronologically and limit results for readability
  const sortedPeriods = Object.entries(sessionsByPeriod)
    .sort(([a], [b]) => a.localeCompare(b));

  // Limit results based on period to avoid overcrowded charts
  let finalPeriods = sortedPeriods;
  if (groupBy === 'day' && sortedPeriods.length > 10) {
    finalPeriods = sortedPeriods.slice(-10); // Last 10 days
  } else if (groupBy === 'month' && sortedPeriods.length > 6) {
    finalPeriods = sortedPeriods.slice(-6); // Last 6 months
  }

  if (finalPeriods.length === 0) {
    return {
      labels: ['No Data'],
      legend: ['Completed', 'Attempt'],
      data: [[0, 0]],
      barColors: [THEME_COLORS.bluePrimary, '#FF5B30'],
      hasData: false,
    };
  }

  const labels = finalPeriods.map(([, data]) => data.label);
  const stackedData = finalPeriods.map(([, data]) => [data.completed, data.attempt]);

  return {
    labels,
    legend: ['Completed', 'Attempt'],
    data: stackedData,
    barColors: [THEME_COLORS.bluePrimary, '#FF5B30'],
    hasData: true,
  };
};

// Week Streak Display Component
const WeekStreakDisplay = ({ streak }: { streak: number }) => {
  const maxMilestone = 12; // Maximum milestone for progress calculation
  const milestones = [4, 8, 12]; // Milestone markers
  
  // Calculate progress percentage (cap at 100% for display)
  const progressPercentage = Math.min((streak / maxMilestone) * 100, 100);
  
  return (
    <View style={styles.weekStreakCard}>
      <Text style={styles.streakLabel}>Week Streak</Text>
      
      {/* Progress Section */}
      <View style={styles.progressSection}>
        
        {/* Progress Bar Container */}
        <View style={styles.progressBarContainer}>
          {/* Background Bar */}
          <View style={styles.progressBarBackground}>
            {/* Progress Fill with Gradient Effect */}
            {progressPercentage > 0 && (
              <LinearGradient
                colors={['#4A90E2', THEME_COLORS.bluePrimary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
              />
            )}
          </View>
          
          {/* Milestone Markers - Same level as bar */}
          {milestones.map((milestone, index) => {
            const milestonePosition = (milestone / maxMilestone) * 100;
            const isReached = streak >= milestone;
            
            return (
              <View
                key={milestone}
                style={[
                  styles.milestoneContainer,
                  { left: `${milestonePosition}%` }
                ]}
              >
                {/* Milestone Dashed Line */}
                <View style={styles.milestoneLineContainer}>
                  {Array.from({ length: 6 }).map((_, dashIndex) => (
                    <View
                      key={dashIndex}
                      style={[
                        styles.milestoneDash,
                        {
                          backgroundColor: '#FF9500',
                          opacity: isReached ? 1 : 0.5,
                        }
                      ]}
                    />
                  ))}
                </View>
                
                {/* Milestone Number Below */}
                <Text style={[
                  styles.milestoneText,
                  { color: isReached ? THEME_COLORS.bluePrimary : '#999999' }
                ]}>
                  {milestone}
                </Text>
              </View>
            );
          })}
          
          {/* Streak Circle - Rendered outside/above the bar */}
          {progressPercentage > 0 && (
            <View style={[
              styles.streakCircleContainer, 
              { left: `${Math.min(progressPercentage, 95)}%` }
            ]}>
              <View style={styles.streakCircle}>
                <Text style={styles.streakCircleText}>{streak}</Text>
              </View>
            </View>
          )}
          
        </View>
      </View>
    </View>
  );
};

// Rewards Info Component
const RewardsInfo = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity style={styles.rewardsCard} onPress={onPress}>
      <View style={styles.rewardsBackground}>
        <Image 
          source={require('../assets/images/rewards-trophy-full.png')}
          style={styles.rewardsBackgroundImage}
        />
        <View style={styles.rewardsContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.rewardsTitle}>Earn Rewards!</Text>
            <Text style={styles.rewardsText}>Reach milestones to unlock{'\n'}exclusive gear</Text>
            <Text style={styles.rewardsLink}>Tap to learn more →</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Calculate streak of consecutive weeks with at least one session
const calculateWeeklyStreak = (sessions: ClimbingSession[]): number => {
  if (sessions.length === 0) return 0;

  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
  currentWeekStart.setHours(0, 0, 0, 0);

  // Helper function to check if a week has sessions
  const hasSessionsInWeek = (weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return sessions.some(session => {
      const sessionDate = safeParseDateString(session.when);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });
  };

  // Check current week
  const currentWeekHasSessions = hasSessionsInWeek(currentWeekStart);
  
  // Check previous week
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(currentWeekStart.getDate() - 7);
  const previousWeekHasSessions = hasSessionsInWeek(previousWeekStart);

  // If both current and previous week have no sessions, streak is 0
  if (!currentWeekHasSessions && !previousWeekHasSessions) {
    return 0;
  }

  // If current week has sessions but previous doesn't, streak is 1
  if (currentWeekHasSessions && !previousWeekHasSessions) {
    return 1;
  }

  // If previous week has sessions (regardless of current week), calculate full streak
  let streak = 0;
  let checkWeek = new Date(currentWeekStart);

  // Count current week if it has sessions
  if (currentWeekHasSessions) {
    streak++;
  }

  // Check previous weeks
  checkWeek.setDate(checkWeek.getDate() - 7); // Move to previous week
  
  while (true) {
    const hasSessionInWeek = hasSessionsInWeek(checkWeek);
    
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

// Process sessions timeline data by selected period
const processSessionsTimeline = (sessions: ClimbingSession[], period: '7d' | '30d' | '6m' | '1y' | 'all') => {
  if (sessions.length === 0) return { labels: [], datasets: [{ data: [] }] };

  const now = new Date();
  let startDate = new Date();
  let groupBy: 'day' | 'week' | 'month' = 'day';
  let dateFormat = '';

  // Set start date and grouping based on period
  switch (period) {
    case '7d':
      startDate.setDate(now.getDate() - 6);
      groupBy = 'day';
      dateFormat = 'MM/DD';
      break;
    case '30d':
      startDate.setDate(now.getDate() - 29);
      groupBy = 'day';
      dateFormat = 'MM/DD';
      break;
    case '6m':
      startDate.setMonth(now.getMonth() - 6);
      groupBy = 'month';
      dateFormat = 'MMM';
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      groupBy = 'month';
      dateFormat = 'MMM';
      break;
    case 'all':
      if (sessions.length > 0) {
        startDate = new Date(Math.min(...sessions.map(s => safeParseDateString(s.when).getTime())));
        groupBy = 'month';
        dateFormat = 'MMM YY';
      }
      break;
  }

  // Filter sessions within the period
  const filteredSessions = sessions.filter(session => {
    const sessionDate = new Date(session.when);
    return sessionDate >= startDate && sessionDate <= now;
  });

  // Group sessions by time period
  const groupedSessions: { [key: string]: number } = {};
  
  if (groupBy === 'day') {
    // Generate all days in the range
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
      groupedSessions[key] = 0;
    }
    
    // Count sessions per day
    filteredSessions.forEach(session => {
      const sessionDate = safeParseDateString(session.when);
      const key = sessionDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
      if (groupedSessions[key] !== undefined) {
        groupedSessions[key]++;
      }
    });
  } else if (groupBy === 'month') {
    // Create array to maintain chronological order
    const monthsArray: { date: Date, key: string, count: number }[] = [];
    
    // Generate all months in the range
    for (let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1); d <= now; d.setMonth(d.getMonth() + 1)) {
      const key = period === 'all' 
        ? d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
        : (period === '1y' ? d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) 
           : d.toLocaleDateString('en-GB', { month: 'short' }));
      monthsArray.push({ date: new Date(d), key, count: 0 });
    }
    
    // Count sessions per month
    filteredSessions.forEach(session => {
      const sessionDate = safeParseDateString(session.when);
      const key = period === 'all'
        ? sessionDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
        : (period === '1y' ? sessionDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
           : sessionDate.toLocaleDateString('en-GB', { month: 'short' }));
      
      const monthEntry = monthsArray.find(m => m.key === key);
      if (monthEntry) {
        monthEntry.count++;
      }
    });
    
    // Sort by date to ensure chronological order
    monthsArray.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Use the chronologically ordered data directly
    const orderedLabels = monthsArray.map(m => m.key);
    const orderedData = monthsArray.map(m => m.count);
    
    // Apply label reduction logic for periods with many data points
    let displayLabels = orderedLabels;
    let displayData = orderedData;
    if (orderedLabels.length > 5) {
      const step = Math.ceil(orderedLabels.length / 5);
      displayLabels = orderedLabels.map((label, index) => 
        index % step === 0 ? label : ''
      );
      // Keep all data points, just hide some labels
      displayData = orderedData;
    }
    
    return {
      labels: displayLabels,
      datasets: [{
        data: displayData,
        color: () => THEME_COLORS.bluePrimary,
        strokeWidth: 2,
      }],
    };
  }

  // For non-month groupings (day), process normally
  const labels = Object.keys(groupedSessions);
  const data = Object.values(groupedSessions);

  // Reduce labels to prevent overlap on X-axis
  let displayLabels = labels;
  if (labels.length > 5) {
    // For periods with many data points, show only every nth label
    const step = Math.ceil(labels.length / 5); // Show maximum 5 labels
    displayLabels = labels.map((label, index) => 
      index % step === 0 ? label : ''
    );
  }

  return {
    labels: displayLabels,
    datasets: [{
      data,
      color: () => THEME_COLORS.bluePrimary,
      strokeWidth: 2,
    }],
  };
};

// Calculate selected month metrics
const calculateSelectedMonthMetrics = (sessions: ClimbingSession[], selectedMonth: number, selectedYear: number) => {
  const selectedMonthSessions = sessions.filter(session => {
    const sessionDate = safeParseDateString(session.when);
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
    const sessionDate = safeParseDateString(session.when);
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
  decimalPlaces: 0,
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
  propsForHorizontalLabels: {
    fontSize: 12,
    color: '#999999',
    fontWeight: 'bold',
  },
  propsForVerticalLabels: {
    fontSize: 12,
    color: '#999999',
    fontWeight: 'bold',
  },
};

export default function AnalyticsCharts() {
  const [sessions, setSessions] = useState<ClimbingSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for month selection
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  // State for session timeline filter
  const [sessionTimelinePeriod, setSessionTimelinePeriod] = useState<'7d' | '30d' | '6m' | '1y' | 'all'>('30d');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  
  // State for performance section filter
  const [performancePeriod, setPerformancePeriod] = useState<'7d' | '30d' | '6m' | '1y' | 'all'>('30d');
  const [showPerformancePeriodDropdown, setShowPerformancePeriodDropdown] = useState(false);
  
  const [showRewardsModal, setShowRewardsModal] = useState(false);

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
          <Image 
            source={require('../assets/images/empty-state-dash.png')}
            style={styles.emptyStateImage}
          />
          <Text style={styles.emptyTitle}>No data available</Text>
          <Text style={styles.emptyText}>Start logging your climbing sessions to analyze your progress on a dashboard!</Text>
        </View>
      </ScrollView>
    );
  }

  // Process data for charts
  const completionByGrade = processCompletionByGrade(sessions, performancePeriod);
  const sessionsTimeline = processSessionsTimeline(sessions, sessionTimelinePeriod);
  const movementData = processMovementData(sessions, performancePeriod);
  
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
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  const getPeriodLabel = () => {
    const periodLabels = {
      '7d': 'Last 7 days',
      '30d': 'Last 30 days',
      '6m': 'Last 6 months',
      '1y': 'Last year',
      'all': 'All time',
    };
    return periodLabels[sessionTimelinePeriod];
  };
  
  const getPerformancePeriodLabel = () => {
    const periodLabels = {
      '7d': 'Last 7 days',
      '30d': 'Last 30 days',
      '6m': 'Last 6 months',
      '1y': 'Last year',
      'all': 'All time',
    };
    return periodLabels[performancePeriod];
  };
  
  const canNavigateNext = () => {
    const currentDate = new Date();
    return !(selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear());
  };

  // Process data for new analytics features
  const weeklyStreak = calculateWeeklyStreak(sessions);
  const selectedMonthMetrics = calculateSelectedMonthMetrics(sessions, selectedMonth, selectedYear);
  const markedDates = generateMarkedDates(sessions, selectedMonth, selectedYear);
  
  // Process data for Performance section
  const routesByGradeData = processRoutesByGrade(sessions, performancePeriod);
  const attemptCompletedData = processAttemptCompletedPercentage(sessions, performancePeriod);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Track your climbing progress and insights</Text>
      </View>
      
      {/* Week Streak Display */}
      <WeekStreakDisplay streak={weeklyStreak} />
      
      {/* Rewards Info */}
      <RewardsInfo onPress={() => setShowRewardsModal(true)} />

      {/* Sessions Timeline */}
      <View style={styles.chartContainer}>
        {/* Chart Header with Title and Period Dropdown */}
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Session Timeline</Text>
          <View style={styles.periodSelectorContainer}>
            <TouchableOpacity 
              style={styles.periodSelector}
              onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
            >
              <Text style={styles.periodLabel}>{getPeriodLabel()}</Text>
              <Text style={styles.dropdownArrow}>{'▼'}</Text>
            </TouchableOpacity>
            
            {showPeriodDropdown && (
              <View style={styles.dropdown}>
                {[
                  { key: '7d', label: 'Last 7 days' },
                  { key: '30d', label: 'Last 30 days' },
                  { key: '6m', label: 'Last 6 months' },
                  { key: '1y', label: 'Last year' },
                  { key: 'all', label: 'All time' },
                ].map((period) => (
                  <TouchableOpacity
                    key={period.key}
                    style={[
                      styles.dropdownItem,
                      sessionTimelinePeriod === period.key && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setSessionTimelinePeriod(period.key as '7d' | '30d' | '6m' | '1y' | 'all');
                      setShowPeriodDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        sessionTimelinePeriod === period.key && styles.dropdownItemTextActive,
                      ]}
                    >
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Timeline Chart */}
        {sessionsTimeline.datasets[0].data.length > 0 ? (
          <LineChart
            data={sessionsTimeline}
            width={chartWidth}
            height={220}
            yLabelsOffset={20} 
            chartConfig={{
              backgroundGradientFrom: '#ffffff',
              backgroundGradientFromOpacity: 1,
              backgroundGradientTo: '#ffffff',
              backgroundGradientToOpacity: 1,
              color: () => THEME_COLORS.bluePrimary,
              labelColor: () => '#999999', // Override label color to gray
              fillShadowGradientFrom: THEME_COLORS.bluePrimary,
              fillShadowGradientFromOpacity: 0.4,
              fillShadowGradientTo: THEME_COLORS.bluePrimary,
              fillShadowGradientToOpacity: 0.0,
              strokeWidth: 1,
              barPercentage: 1,
              useShadowColorFromDataset: false,
              decimalPlaces: 0,
              style: {
                borderRadius: 0,
                // paddingLeft: 0, // Internal left padding of the chart
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: THEME_COLORS.bluePrimary,
              },
              propsForBackgroundLines: {
                strokeDasharray: '5,5',
                strokeOpacity: 0.5,
                stroke: '#E0E0E0',
              },
              propsForHorizontalLabels: {
                fontSize: 12,
                color: '#999999',
                fontWeight: 'bold',
              },
            }}
            bezier
            style={{
              borderRadius: 8,
              marginLeft: -20,

            }}
            yAxisSuffix=""
            fromZero={true}
            withShadow={true}
            withOuterLines={false}
            withHorizontalLabels={true}
            withVerticalLabels={false}
            withVerticalLines={false}
            withDots={false}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No sessions found for this period</Text>
          </View>
        )}
      </View>

      {/* Spacing between Sessions Timeline and Activity Section */}
      <View style={{ marginBottom: SPACING.SECTION_GAP }} />

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
      
      {/* Performance Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.periodSelectorContainer}>
            <TouchableOpacity 
              style={styles.periodSelector}
              onPress={() => setShowPerformancePeriodDropdown(!showPerformancePeriodDropdown)}
            >
              <Text style={styles.periodLabel}>{getPerformancePeriodLabel()}</Text>
              <Text style={styles.dropdownArrow}>{'▼'}</Text>
            </TouchableOpacity>
            
            {showPerformancePeriodDropdown && (
              <View style={styles.dropdown}>
                {[
                  { key: '7d', label: 'Last 7 days' },
                  { key: '30d', label: 'Last 30 days' },
                  { key: '6m', label: 'Last 6 months' },
                  { key: '1y', label: 'Last year' },
                  { key: 'all', label: 'All time' },
                ].map((period) => (
                  <TouchableOpacity
                    key={period.key}
                    style={[
                      styles.dropdownItem,
                      performancePeriod === period.key && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setPerformancePeriod(period.key as '7d' | '30d' | '6m' | '1y' | 'all');
                      setShowPerformancePeriodDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        performancePeriod === period.key && styles.dropdownItemTextActive,
                      ]}
                    >
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        
        {/* Routes by Grade */}
        <View style={[styles.chartContainer, styles.firstChartInSection]}>
          <Text style={styles.chartTitle}>Routes by Grade</Text>
          <Text style={styles.chartSubtitle}>Distribution of routes attempted by difficulty</Text>
          {routesByGradeData.labels.length > 0 ? (
            <View style={styles.chartWrapper}>
              <BarChart
                data={routesByGradeData}
                width={chartWidth} // Increase width to compensate
                height={220}
                yLabelsOffset={45} // Smaller offset to avoid overlap
                // xLabelsOffset={-15} // Move X axis labels left too
                chartConfig={{
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientFromOpacity: 1,
                  backgroundGradientTo: '#ffffff',
                  backgroundGradientToOpacity: 1,
                  color: (opacity = 1) => THEME_COLORS.bluePrimary,
                  labelColor: () => '#999999', // Override label color to gray
                  fillShadowGradientFrom: THEME_COLORS.bluePrimary,
                  fillShadowGradientTo: THEME_COLORS.bluePrimary,
                  fillShadowGradientFromOpacity: 0.9,
                  fillShadowGradientToOpacity: 1,
                  strokeWidth: 0, // Remove stroke to clean up bars
                  barPercentage: 0.6, // Further reduce bar width to create more rounded appearance
                  useShadowColorFromDataset: false,
                  decimalPlaces: 0,
                  style: {
                    borderRadius: 12,
                    paddingLeft: 5, // Minimal left padding to move bars closer to Y-axis
                    paddingRight: 40, // Add right padding to balance increased width
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '5,5',
                    strokeOpacity: 0.7,
                    stroke: '#E0E0E0',
                  },
                  propsForHorizontalLabels: {
                    fontSize: 12,
                    color: '#999999',
                    fontWeight: 'bold',
                  },
                  propsForVerticalLabels: {
                    fontSize: 12,
                    color: '#999999',
                    fontWeight: 'bold',
                  },
                }}
                style={{
                  ...styles.roundedBars,
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
                yAxisLabel=""
                yAxisSuffix=""
                fromZero
                withInnerLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                withCustomBarColorFromData={false}
                segments={4} // Add segments for better grid
              />
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No routes found for this month</Text>
            </View>
          )}
        </View>


        {/* Success Rate */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Success Rate by Period</Text>
          <Text style={styles.chartSubtitle}>Attempts vs completed routes over selected period</Text>
          {attemptCompletedData.hasData ? (
            <View>
              <StackedBarChart
                data={attemptCompletedData}
                width={chartWidth}
                height={220}
                yLabelsOffset={25}
                hideLegend={true}
                chartConfig={{
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientFromOpacity: 1,
                  backgroundGradientTo: '#ffffff',
                  backgroundGradientToOpacity: 1,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: () => '#999999',
                  strokeWidth: 0,
                  barPercentage: 0.7,
                  useShadowColorFromDataset: false,
                  decimalPlaces: 0,
                  style: {
                    borderRadius: 12,
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '5,5',
                    strokeOpacity: 0.5,
                    stroke: '#E0E0E0',
                  },
                  propsForHorizontalLabels: {
                    fontSize: 12,
                    color: '#999999',
                    fontWeight: 'bold',
                  },
                  propsForVerticalLabels: {
                    fontSize: 12,
                    color: '#999999',
                    fontWeight: 'bold',
                  },
                  propsForLabels: {
                    fontSize: 0, // Hide bar values
                  },
                }}
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              yAxisLabel=""
              yAxisSuffix=""
              withHorizontalLabels={true}
              withVerticalLabels={true}
            />
              
              {/* Custom Legend Below Chart */}
              <View style={styles.legendContainerBelow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: THEME_COLORS.bluePrimary }]} />
                  <Text style={[styles.legendText, { color: '#999999' }]}>Completed</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#FF5B30' }]} />
                  <Text style={[styles.legendText, { color: '#999999' }]}>Attempt</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No completion data found</Text>
            </View>
          )}
        </View>
        
        {/* Success Metrics */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Success Metrics</Text>
          <Text style={styles.chartSubtitle}>Sessions attempted vs completed by grade</Text>
          {completionByGrade.hasData ? (
            <View>
              <StackedBarChart
                data={completionByGrade}
                width={chartWidth}
                height={220}
                yLabelsOffset={25}
                hideLegend={true}
                chartConfig={{
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientFromOpacity: 1,
                  backgroundGradientTo: '#ffffff',
                  backgroundGradientToOpacity: 1,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: () => '#999999',
                  strokeWidth: 0,
                  barPercentage: 0.7,
                  useShadowColorFromDataset: false,
                  decimalPlaces: 0,
                  style: {
                    borderRadius: 12,
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '5,5',
                    strokeOpacity: 0.5,
                    stroke: '#E0E0E0',
                  },
                  propsForHorizontalLabels: {
                    fontSize: 12,
                    color: '#999999',
                    fontWeight: 'bold',
                  },
                  propsForVerticalLabels: {
                    fontSize: 12,
                    color: '#999999',
                    fontWeight: 'bold',
                  },
                  propsForLabels: {
                    fontSize: 0, // Hide bar values
                  },
                }}
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
                yAxisLabel=""
                yAxisSuffix=""
                withHorizontalLabels={true}
                withVerticalLabels={true}
              />
              
              {/* Custom Legend Below Chart */}
              <View style={styles.legendContainerBelow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: THEME_COLORS.bluePrimary }]} />
                  <Text style={[styles.legendText, { color: '#999999' }]}>Completed</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#FF5B30' }]} />
                  <Text style={[styles.legendText, { color: '#999999' }]}>Attempt</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No completion data found</Text>
            </View>
          )}
        </View>

        {/* Movement Analytics */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Movement Analytics</Text>
          <Text style={styles.chartSubtitle}>Most used climbing movements (%)</Text>
          {movementData.hasData ? (
            <View>
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
                <PieChart
                  data={movementData.data}
                  width={chartWidth}
                  height={200}
                  chartConfig={{
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientFromOpacity: 1,
                    backgroundGradientTo: '#ffffff',
                    backgroundGradientToOpacity: 1,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    strokeWidth: 2,
                    useShadowColorFromDataset: false,
                    decimalPlaces: 0,
                    propsForLabels: {
                      fontSize: 14,
                      fontWeight: 'bold',
                      color: '#ffffff',
                    },
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  absolute
                  paddingLeft="60"
                  hasLegend={false}
                  avoidFalseZero={true}
                  style={{
                    alignSelf: 'center',
                  }}
                />
              </View>
              
              {/* Custom Legend Below Chart */}
              <View style={styles.movementLegendContainer}>
                {movementData.data.map((item, index) => (
                  <View key={index} style={styles.movementLegendItem}>
                    <View style={[styles.movementLegendColor, { backgroundColor: item.color }]} />
                    <Text style={styles.movementLegendText}>{item.name} ({item.population}%)</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No movement data found</Text>
            </View>
          )}
        </View>
      </View>

      {/* Rewards Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRewardsModal}
        onRequestClose={() => setShowRewardsModal(false)}
      >
        <View style={styles.rewardsModalOverlay}>
          <View style={styles.rewardsModalContent}>
            <View style={styles.rewardsModalHeader}>
              <Text style={styles.rewardsModalTitle}>Streak Rewards</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowRewardsModal(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.rewardsModalBody}>
              <Text style={styles.rewardsModalSubtitle}>
                Build your climbing streak to unlock exclusive rewards!
              </Text>
              
              <View style={styles.milestonesList}>
                <View style={styles.milestoneItem}>
                  <View style={[styles.milestoneIcon, weeklyStreak >= 4 ? styles.milestoneUnlocked : styles.milestoneLocked]}>
                    <FontAwesome6 name="fire" size={16} color={weeklyStreak >= 4 ? "#FF6B35" : "#ccc"} />
                  </View>
                  <View style={styles.milestoneInfo}>
                    <Text style={styles.milestoneTitle}>4 Week Streak</Text>
                    <Text style={styles.milestoneDesc}>Climbing gear discount</Text>
                  </View>
                </View>

                <View style={styles.milestoneItem}>
                  <View style={[styles.milestoneIcon, weeklyStreak >= 8 ? styles.milestoneUnlocked : styles.milestoneLocked]}>
                    <FontAwesome6 name="trophy" size={16} color={weeklyStreak >= 8 ? "#FFD700" : "#ccc"} />
                  </View>
                  <View style={styles.milestoneInfo}>
                    <Text style={styles.milestoneTitle}>8 Week Streak</Text>
                    <Text style={styles.milestoneDesc}>Exclusive climbing chalk bag</Text>
                  </View>
                </View>

                <View style={styles.milestoneItem}>
                  <View style={[styles.milestoneIcon, weeklyStreak >= 12 ? styles.milestoneUnlocked : styles.milestoneLocked]}>
                    <FontAwesome6 name="crown" size={16} color={weeklyStreak >= 12 ? "#9C27B0" : "#ccc"} />
                  </View>
                  <View style={styles.milestoneInfo}>
                    <Text style={styles.milestoneTitle}>12 Week Streak</Text>
                    <Text style={styles.milestoneDesc}>Premium climbing shoes</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.rewardsModalNote}>
                Current streak: {weeklyStreak} weeks
              </Text>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

// Spacing constants
const SPACING = {
  CARD_GAP: 12,      // Spacing between cards
  SECTION_GAP: 32,   // Spacing between sections
};

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
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    backgroundColor: 'transparent',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME_COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: THEME_COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
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
    marginBottom: SPACING.CARD_GAP,
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
    marginBottom: SPACING.CARD_GAP,
  },
  chart: {
    borderRadius: 8,
  },
  roundedBars: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  chartWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  legendContainerBelow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.CARD_GAP,
    gap: 20,
  },
  // Week Streak Display Component Styles
  weekStreakCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: SPACING.CARD_GAP,
    alignItems: 'stretch', // Changed from 'center' to allow left alignment
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'visible', // Ensure circle is not clipped by card boundaries
  },
  streakLabel: {
    fontSize: 16, // Changed to match chartTitle size (Session Timeline)
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 0, // Reduced margin to bring title closer to bar
    textAlign: 'left', // Align title to the left
  },
  
  // Progress Section Styles
  progressSection: {
    width: '100%',
    alignItems: 'center',
    overflow: 'visible', // Ensure circle is not clipped
  },
  progressBarContainer: {
    width: '100%',
    height: 80, // Increased to accommodate milestone text below bar
    position: 'relative',
    overflow: 'visible', // Ensure circle is not clipped
  },
  progressBarBackground: {
    width: '100%',
    height: 16, // Increased from 8 to 16
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginTop: 28, // Increased more to center bar and give space above for circle
    marginBottom: 0, // Add bottom margin to center in taller container
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 8,
    minWidth: 12, // Increased minimum visible width
    overflow: 'hidden',
  },
  streakCircleContainer: {
    position: 'absolute',
    top: 16, // Position circle centered with bar (35px marginTop + 8px bar center - 20px circle center)
    transform: [{ translateX: -20 }], // Center the even larger circle
    zIndex: 100, // Much higher z-index to ensure it's on top
  },
  streakCircle: {
    width: 40, // Increased from 32
    height: 40, // Increased from 32
    borderRadius: 20, // Adjusted for new size
    backgroundColor: 'white',
    borderWidth: 2, // Added blue border
    borderColor: THEME_COLORS.bluePrimary, // Blue border color
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4, // Increased shadow offset
    },
    shadowOpacity: 0.3, // Increased shadow opacity
    shadowRadius: 6, // Increased shadow radius
    elevation: 15, // Much higher elevation for Android
  },
  streakCircleText: {
    fontSize: 20, // Increased from 14
    fontWeight: 'bold', // Already bold, but ensuring it
    color: THEME_COLORS.bluePrimary,
  },
  
  // Milestone Marker Styles
  milestoneContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -1 }], // Center the line (1px width)
    zIndex: 50, // Below the streak circle but above the bar
    height: 80, // Full height to contain both line and text
  },
  milestoneLineContainer: {
    position: 'absolute',
    top: 20, // Align with bar position (marginTop of progressBarBackground)
    width: 2,
    height: 32, // Line height (extends below bar)
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2, // Small padding for better spacing
  },
  milestoneDash: {
    width: 2,
    height: 4, // Each dash is 4px tall
    borderRadius: 1,
  },
  milestoneText: {
    position: 'absolute',
    top: 56, // Position below the line (20 + 32 + 4 spacing)
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: 20, // Fixed width for centering
  },
  
  // Rewards Info Component Styles
  rewardsCard: {
    borderRadius: 12,
    marginBottom: SPACING.CARD_GAP,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  rewardsBackground: {
    width: '100%',
    height: 120,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  rewardsBackgroundImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  rewardsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
  },
  textContainer: {
    flex: 1,
  },
  rewardsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  rewardsText: {
    fontSize: 14,
    color: 'white',
    marginBottom: 8,
    lineHeight: 18,
  },
  rewardsLink: {
    fontSize: 13,
    color: 'white',
    fontWeight: '600',
  },
  // Rewards Modal Styles
  rewardsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rewardsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 0,
    width: '100%',
    maxHeight: '80%',
  },
  rewardsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rewardsModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME_COLORS.text.primary,
  },
  rewardsModalBody: {
    padding: 20,
  },
  rewardsModalSubtitle: {
    fontSize: 16,
    color: THEME_COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  milestonesList: {
    gap: 16,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  milestoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  milestoneUnlocked: {
    backgroundColor: '#e8f5e8',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  milestoneLocked: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME_COLORS.text.primary,
    marginBottom: 4,
  },
  milestoneDesc: {
    fontSize: 14,
    color: THEME_COLORS.text.secondary,
  },
  rewardsModalNote: {
    fontSize: 14,
    color: THEME_COLORS.bluePrimary,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxWidth: 350,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: 'bold',
  },
  constructionContent: {
    alignItems: 'center',
  },
  constructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  constructionText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  constructionSubtext: {
    fontSize: 12,
    color: THEME_COLORS.bluePrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: SPACING.SECTION_GAP,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.CARD_GAP,
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
    marginBottom: SPACING.CARD_GAP,
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
    marginTop: 0, // Removed extra spacing since metricsRow already has marginBottom
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
  firstChartInSection: {
    marginTop: 0, // Removed extra spacing since sectionHeader already has marginBottom
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noDataText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.CARD_GAP,
    minHeight: 32,
  },
  periodSelectorContainer: {
    backgroundColor: `${THEME_COLORS.bluePrimary}20`,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-end',
    position: 'relative',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 32,
    paddingHorizontal: 8,
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME_COLORS.bluePrimary,
    lineHeight: 32,
    height: 32,
    textAlignVertical: 'center',
  },
  dropdownArrow: {
    color: THEME_COLORS.bluePrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  dropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemActive: {
    backgroundColor: `${THEME_COLORS.bluePrimary}10`,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  dropdownItemTextActive: {
    color: THEME_COLORS.bluePrimary,
    fontWeight: '600',
  },
  movementLegendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingTop: SPACING.CARD_GAP,
    paddingBottom: 5,
    gap: 15,
  },
  movementLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  movementLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 8,
  },
  movementLegendText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
  },
});
