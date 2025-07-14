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
  const isColorWhite = sessionColor.toUpperCase() === '#FFFFFF';

  const getTitle = () => {
    const location = session.place || 'Unknown';
    const activity = session.activity || 'Climb';
    return `${location} ${activity}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
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
        size={18}
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

      <View style={styles.mainContentRow}>
        {/* Left Column */}
        <View style={styles.leftColumn}>
          <Text style={styles.routeValue}>{session.routeNumber || '--'}</Text>
          <Text style={[styles.locationStyleText, { color: isColorWhite ? THEME_COLORS.text.primary : sessionColor }]}>
            {getTitle()}
          </Text>
          <View style={styles.ratingContainer}>
            {renderStars()}
          </View>
        </View>

        {/* Right Column */}
        <View style={styles.rightColumn}>
          <View style={[styles.gradeBadge, { backgroundColor: sessionColor }]}>
            <Text style={[styles.gradeValue, { color: isColorWhite ? THEME_COLORS.text.primary : '#f9f9f9' }]}>
              {session.grade || 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer: Date and Completion */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={14} color={THEME_COLORS.text.secondary} />
          <Text style={styles.footerText}>{formatDate(session.when)}</Text>
        </View>
        <View style={styles.footerItem}>
          {isCompleted ? (
            <FontAwesome5 name="check-circle" size={16} color={THEME_COLORS.success} />
          ) : completionStatus === 'attempt' ? (
            <Ionicons name="trending-up" size={18} color={THEME_COLORS.bluePrimary} />
          ) : (
            <FontAwesome5 name="times-circle" size={16} color={THEME_COLORS.error} />
          )}
          <Text style={styles.footerText}>
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
    padding: 20,
    paddingTop: 30, // Make space for the color strip
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
    height: 10,
  },
  mainContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  leftColumn: {
    flex: 1,
    marginRight: 16,
  },
  rightColumn: {
    // Aligns the grade badge to the top of its column
  },
  routeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: THEME_COLORS.text.primary,
    marginBottom: 4, // Tighter spacing
  },
  gradeBadge: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  gradeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME_COLORS.text.white,
  },
  locationStyleText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10, // Tighter spacing
  },
  ratingContainer: {
    alignItems: 'flex-start',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  notRatedText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: THEME_COLORS.text.light,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: THEME_COLORS.border.light,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: THEME_COLORS.text.secondary,
    textTransform: 'capitalize',
  },
});

export default SessionCard; 