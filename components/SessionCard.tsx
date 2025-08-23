import { FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { THEME_COLORS } from '../constants/Theme';
import { ClimbingSession } from '../services/climbingSessionService';

interface SessionCardProps {
  session: ClimbingSession;
  onPress: () => void;
}

// Helper para obter a cor da sessão, com um fallback
const getSessionColor = (session: ClimbingSession) => {
  // Se uma cor específica foi salva, use-a.
  if (session.colour) {
    return session.colour;
  }
  // Caso contrário, use uma cor padrão baseada na atividade.
  switch (session.activity?.toLowerCase()) {
    case 'bouldering': return '#FF6B6B';
    case 'sport climbing': return '#4ECDC4';
    case 'traditional': return '#45B7D1';
    case 'indoor': return '#96CEB4';
    default: return THEME_COLORS.bluePrimary;
  }
};

const SessionCard = ({ session, onPress }: SessionCardProps) => {
  const sessionColor = getSessionColor(session);

  const getTitle = () => {
    const activity = session.activity || 'Climb';
    const routeNumber = session.routeNumber || '--';
    
    // Map activity names to shorter versions
    let displayActivity = activity;
    if (activity.toLowerCase().includes('bouldering')) {
      displayActivity = 'Boulder';
    } else if (activity.toLowerCase().includes('climbing')) {
      displayActivity = 'Route';
    }
    
    // Format as "Activity RouteNumber" (e.g., "Boulder 43")
    return `${displayActivity} ${routeNumber}`;
  };

  const getLocationText = () => {
    // Priority order for displaying location:
    // 1. Google Places main_text + secondary_text
    // 2. Google Places description or formatted_address
    // 3. Simple place field
    // 4. Fallback to 'Unknown location'
    
    if (session.location_data) {
      const { main_text, secondary_text, description, formatted_address } = session.location_data;
      
      if (main_text && secondary_text) {
        return `${main_text}, ${secondary_text}`;
      }
      
      if (description) {
        return description;
      }
      
      if (formatted_address) {
        return formatted_address;
      }
    }
    
    return session.place || 'Unknown location';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  const renderStars = () => {
    const numRating = session.routeRating ? parseInt(session.routeRating, 10) : 0;
    if (isNaN(numRating) || numRating <= 0) {
      return <Text style={styles.notRatedText}>Not Rated</Text>;
    }
    const stars = Array.from({ length: 5 }, (_, i) => (
      <FontAwesome
        key={i}
        name={i < numRating ? 'star' : 'star-o'}
        size={16}
        color="#FFC700"
      />
    ));
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const completionStatus = session.completion?.toLowerCase() ?? '';
  const isCompleted = completionStatus === 'completed' || completionStatus === 'flash' || completionStatus === 'onsight';

  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={[styles.colorStrip, { backgroundColor: sessionColor }]} />

      {/* Header: Title and Grade */}
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>{getTitle()}</Text>
        <View style={styles.gradeContainer}>
          <Ionicons name="speedometer-outline" size={14} color={sessionColor} />
          <Text style={styles.gradeText}>{session.grade || 'N/A'}</Text>
        </View>
      </View>

      {/* Location and Date Row */}
      <View style={styles.locationDateRow}>
        <View style={styles.locationContainer}>
          <Ionicons name="location" size={14} color={sessionColor} />
          <Text style={[styles.locationText, { color: THEME_COLORS.text.secondary }]} numberOfLines={1} ellipsizeMode="tail">
            {getLocationText()}
          </Text>
        </View>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={12} color={sessionColor} />
          <Text style={styles.dateText}>{formatDate(session.when)}</Text>
        </View>
      </View>

      {/* Footer: Rating and Completion */}
      <View style={styles.footer}>
        <View style={styles.ratingContainer}>
          {renderStars()}
        </View>
        <View style={styles.completionContainer}>
          {isCompleted ? (
            <FontAwesome5 name="check-circle" size={14} color={THEME_COLORS.success} />
          ) : completionStatus === 'attempt' ? (
            <Ionicons name="trending-up" size={14} color={THEME_COLORS.bluePrimary} />
          ) : (
            <FontAwesome5 name="times-circle" size={14} color={THEME_COLORS.error} />
          )}
          <Text style={styles.completionText}>
            {completionStatus === 'attempt' || !session.completion ? 'Attempting' : session.completion}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME_COLORS.background.secondary,
    borderRadius: 16,
    padding: 16,
    paddingTop: 20, // Make space for the color strip
    marginVertical: 8,
    marginHorizontal: 20,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: THEME_COLORS.border.light,
    overflow: 'hidden', // Important for the color strip
  },
  colorStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME_COLORS.text.primary,
    flex: 1,
  },
  gradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '500',
    color: THEME_COLORS.text.primary,
  },
  locationDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  locationText: {
    fontSize: 13,
    color: THEME_COLORS.text.secondary,
    flex: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  dateText: {
    fontSize: 12,
    color: THEME_COLORS.text.secondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: THEME_COLORS.border.light,
  },
  ratingContainer: {
    alignItems: 'flex-start',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  notRatedText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: THEME_COLORS.text.light,
  },
  completionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completionText: {
    fontSize: 12,
    color: THEME_COLORS.text.secondary,
    textTransform: 'capitalize',
  },
});

export default SessionCard; 