import { FontAwesome6 } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME_COLORS } from '../constants/Theme';
import { supabase } from '../lib/supabase';
import { ClimbingSession } from '../services/climbingSessionService';

interface SessionDetailsProps {
  session: ClimbingSession;
  onClose: () => void;
}

export default function SessionDetails({ session, onClose }: SessionDetailsProps) {
  // Função para formatar data e hora
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year}, ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  // Função para determinar a cor do texto do checkmark baseada na cor de fundo
  const getCheckmarkTextColor = (backgroundColor: string) => {
    const lightColors = ['#ffffff', '#ffeb3b', '#bdbdbd'];
    return lightColors.includes(backgroundColor) ? '#333' : '#fff';
  };

  // Função para converter valor numérico da dificuldade em texto
  const getDifficultyLabel = (value: number) => {
    if (value <= 3) return 'Smooth';
    if (value <= 6) return 'Moderate';
    if (value <= 8) return 'Hard';
    return 'Very Hard';
  };

  // Renderizar avaliação por estrelas (somente visualização)
  const renderStarRating = (title: string, rating: number) => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <View key={star} style={styles.starButton}>
              <FontAwesome6
                name="star"
                size={28}
                color={star <= rating ? "#FFD700" : "#E0E0E0"}
                solid={star <= rating}
              />
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Renderizar seletor de data e hora (somente visualização)
  const renderDateTimeDisplay = (title: string, dateString: string) => {
    return (
      <View style={styles.fieldContainer}>
        <View style={styles.dateTimeDisplayContainer}>
          <FontAwesome6 
            name="calendar-days" 
            size={18} 
            color={THEME_COLORS.bluePrimary}
            style={styles.dateIcon}
          />
          <Text style={styles.dateTimeDisplayText}>
            {dateString ? formatDateTime(dateString) : 'No date selected'}
          </Text>
        </View>
      </View>
    );
  };

  // Renderizar seletor visual (somente visualização)
  const renderVisualSelector = (
    title: string, 
    selectedValue: string,
    options: Array<{value: string, label: string, imageUrl: any}>
  ) => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.locationContainer}>
          {options.map((option, index) => (
            <React.Fragment key={option.value}>
              {index > 0 && <View style={styles.buttonSpacer} />}
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  selectedValue === option.value && styles.locationButtonSelected
                ]}
                disabled={true}
              >
                <Image
                  source={option.imageUrl}
                  style={styles.locationImage}
                  resizeMode="cover"
                />
                <Text style={[
                  styles.locationText,
                  selectedValue === option.value && styles.locationTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  // Renderizar seletor de cor (somente visualização)
  const renderColorDisplay = (title: string, color: string) => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.colorDisplayContainer}>
          <View style={[styles.colorPreview, { backgroundColor: color || THEME_COLORS.bluePrimary }]} />
        </View>
      </View>
    );
  };

  // Renderizar dropdown (somente visualização)
  const renderDropdownDisplay = (title: string, value: string, placeholder: string) => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.dropdownDisplayContainer}>
          <Text style={[styles.dropdownDisplayText, !value && styles.dropdownPlaceholderText]}>
            {value || placeholder}
          </Text>
        </View>
      </View>
    );
  };

  // Renderizar seletor de opções (somente visualização)
  const renderOptionsDisplay = (title: string, selectedValue: string, options: string[]) => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
          {options.map((option) => (
            <View
              key={option}
              style={[
                styles.optionButton,
                selectedValue === option && styles.optionButtonSelected
              ]}
            >
              <Text style={[
                styles.optionText,
                selectedValue === option && styles.optionTextSelected
              ]}>
                {option}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Renderizar seletor de sentimentos (somente visualização)
  const renderFeelingDisplay = (title: string, selectedValue: string) => {
    const feelings = [
      { value: 'soft', label: 'Soft', emoji: '😌' },
      { value: 'stiff', label: 'Stiff', emoji: '😰' },
      { value: 'good', label: 'Good', emoji: '😊' },
      { value: 'bad', label: 'Bad', emoji: '😞' }
    ];

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.feelingsContainer}>
          {feelings.map((feeling) => (
            <View
              key={feeling.value}
              style={[
                styles.feelingButton,
                selectedValue === feeling.value && styles.feelingButtonSelected
              ]}
            >
              <Text style={styles.feelingEmoji}>{feeling.emoji}</Text>
              <Text 
                style={[
                  styles.feelingText,
                  selectedValue === feeling.value && styles.feelingTextSelected
                ]}
                numberOfLines={1}
              >
                {feeling.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Renderizar slider de dificuldade (somente visualização)
  const renderDifficultyDisplay = (title: string, value: number) => {
    const hasValue = value && value > 0;
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.difficultyDisplayContainer}>
          <View style={styles.difficultyBarContainer}>
            <View style={[styles.difficultyBar, !hasValue && styles.difficultyBarEmpty]}>
              {hasValue && (
                <View 
                  style={[
                    styles.difficultyProgress, 
                    { width: `${(value / 10) * 100}%` }
                  ]} 
                />
              )}
            </View>
            {hasValue && (
              <View 
                style={[
                  styles.difficultyThumb,
                  { left: `${(value / 10) * 100}%` }
                ]} 
              />
            )}
          </View>
          <View style={styles.difficultyLabelsContainer}>
            <Text style={styles.difficultyLabelLeft}>Smooth</Text>
            <Text style={styles.difficultyLabelRight}>Very Hard</Text>
          </View>
          {hasValue && (
            <Text style={styles.difficultyValue}>{value}</Text>
          )}
        </View>
      </View>
    );
  };

  // Renderizar contador de quedas (somente visualização)
  const renderFallsDisplay = (title: string, value: number) => {
    const hasValue = value && value > 0;
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.fallsDisplayContainer}>
          <Text style={[styles.fallsValue, !hasValue && styles.fallsValueEmpty]}>
            {hasValue ? value : '-'}
          </Text>
        </View>
      </View>
    );
  };

  // Renderizar seletor de tags (somente visualização)
  const renderTagsDisplay = (title: string, tags: string[]) => {
    if (!tags || tags.length === 0) {
      const emptyText = title === 'Movement' ? 'No movements logged' : 
                       title === 'Grip' ? 'No grips logged' : 
                       title === 'Footwork' ? 'No footwork logged' : 
                       'No tags selected';
      
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{title}</Text>
          <Text style={styles.emptyTagsText}>{emptyText}</Text>
        </View>
      );
    }

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.tagsContainer}>
          {tags.map((tag, index) => (
            <View key={index} style={styles.tagChip}>
              <Text style={styles.tagChipText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Renderizar campo de texto (somente visualização)
  const renderTextDisplay = (title: string, value: string, placeholder: string) => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.textDisplayContainer}>
          <Text style={[styles.textDisplayText, !value && styles.textDisplayPlaceholder]}>
            {value || placeholder}
          </Text>
        </View>
      </View>
    );
  };

  // Componente de imagem com carregamento assíncrono
  const ImageDisplay = ({ title, imagePath }: { title: string, imagePath: string | null }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!imagePath) {
        setImageUrl(null);
        return;
      }

      const loadImage = async () => {
        setLoading(true);
        setError(null);
        
        try {
          // Para buckets privados, usar createSignedUrl
          const { data, error: supabaseError } = await supabase.storage
            .from('climbing-images')
            .createSignedUrl(imagePath, 3600); // URL válida por 1 hora
          
          if (supabaseError) {
            setError(supabaseError.message);
            return;
          }
          
          const signedUrl = data.signedUrl;
          setImageUrl(signedUrl);
          
        } catch (err) {
          setError('Failed to load image');
        } finally {
          setLoading(false);
        }
      };

      loadImage();
    }, [imagePath]);

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{title}</Text>
        {imagePath ? (
          <View style={styles.imageContainer}>

            {loading ? (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>Loading image...</Text>
              </View>
            ) : error ? (
              <View style={styles.imagePlaceholder}>
                <FontAwesome6 name="exclamation-triangle" size={24} color="#ff6b6b" />
                <Text style={styles.imagePlaceholderText}>Error: {error}</Text>
              </View>
            ) : imageUrl ? (
              <Image 
                source={{ uri: imageUrl }} 
                style={styles.imagePreview}
                resizeMode="cover"

              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <FontAwesome6 name="camera" size={24} color="#999" />
                <Text style={styles.imagePlaceholderText}>No image URL generated</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <FontAwesome6 name="camera" size={24} color="#999" />
            <Text style={styles.imagePlaceholderText}>No image added</Text>
          </View>
        )}
      </View>
    );
  };

  // Opções para as tags
  const movementOptions = [
    'Dynamic', 'Static', 'Compression', 'Mantling', 'Stemming', 'Layback', 
    'Undercling', 'Deadpoint', 'Dyno', 'Campus', 'Lock-off', 'Gaston',
    'Side Pull', 'Heel Hook', 'Toe Hook', 'Flagging', 'Barn Door', 'Drop Knee'
  ];

  const gripOptions = [
    'Crimp', 'Open Hand', 'Pinch', 'Sloper', 'Jug', 'Pocket', 'Edge',
    'Volume', 'Undercling', 'Side Pull', 'Gaston', 'Horn', 'Rail',
    'Incut', 'Two Finger Pocket', 'Three Finger Pocket', 'Mono'
  ];

  const footworkOptions = [
    'Edging', 'Smearing', 'Heel Hook', 'Toe Hook', 'Inside Edge', 'Outside Edge',
    'Drop Knee', 'High Step', 'Rock Over', 'Mantling', 'Stemming', 'Flagging',
    'Back Step', 'Bicycle', 'Cam Hook', 'Toe Cam', 'Knee Bar', 'Rest Position'
  ];

  // Opções para localização
  const locationOptions = [
    {
      value: 'Indoor',
      label: 'Indoor',
      imageUrl: require('../assets/images/indoor.png')
    },
    {
      value: 'Outdoor',
      label: 'Outdoor',
      imageUrl: require('../assets/images/outdoor.png')
    }
  ];

  // Opções para atividade
  const activityOptions = [
    {
      value: 'Climbing',
      label: 'Climbing',
      imageUrl: require('../assets/images/climbing.png')
    },
    {
      value: 'Bouldering',
      label: 'Bouldering',
      imageUrl: require('../assets/images/bouldering.png')
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <FontAwesome6 name="xmark" size={22} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.modalTitle}>Session Details ✨</Text>
        <Text style={styles.modalSubtitle}>
          View your climbing session information
        </Text>

        {/* Step 1: Basic Information */}
        {renderDateTimeDisplay('', session.when)}
        
        {renderVisualSelector('Location', session.place || '', locationOptions)}
        
        {session.location && (
          <View style={styles.locationDisplayRow}>
            <FontAwesome6 name="location-dot" size={18} color={THEME_COLORS.bluePrimary} style={{ marginRight: 8 }} />
            <Text style={styles.locationDisplayText} numberOfLines={2}>{session.location}</Text>
          </View>
        )}
        
        {renderVisualSelector('Style', session.activity || '', activityOptions)}

        {/* Step 2: Route Details */}
        <View style={styles.sharedRowContainer}>
          <View style={styles.routeNameContainer}>
            {renderTextDisplay('Route number', session.routeNumber || '', 'Add number')}
          </View>
          <View style={styles.routeColorContainer}>
            {renderColorDisplay('Color', session.colour || '')}
          </View>
        </View>
        
        {renderDropdownDisplay('Grade', session.grade || '', 'Select grade')}
        
        {renderOptionsDisplay('Completion', session.completion || '', ['Completed', 'Attempt'])}

        {renderStarRating('Route Rating', parseInt(session.routeRating || '0'))}

        {/* Step 3: Performance */}
        {renderDifficultyDisplay('Difficulty', parseInt(session.difficulty || '5'))}
        
        {renderFeelingDisplay('How It Felt', session.howItFelt || '')}
        
        {renderFallsDisplay('Number of Falls', parseInt(session.falls || '0'))}
        
        {renderOptionsDisplay('Ascent Type', session.ascentType || '', ['Redpoint', 'Onsight', 'Flash'])}

        {session.activity === 'Climbing' && 
          renderOptionsDisplay('Top / Lead', session.climbingType || '', ['Top', 'Lead'])
        }

        {/* Step 4: Comments and Image */}
        {renderTextDisplay('Comments/Tips', session.comments || '', 'No comments logged')}
        
        <ImageDisplay 
          title="Image" 
          imagePath={session.images && session.images.length > 0 ? session.images[0] : null} 
        />

        {/* Step 5: Technique Tags */}
        {renderTagsDisplay('Movement', session.movement && session.movement !== '' ? session.movement.replace(/[\[\]"]/g, '').split(',').filter(tag => tag.trim() !== '') : [])}
        {renderTagsDisplay('Grip', session.grip && session.grip !== '' ? session.grip.replace(/[\[\]"]/g, '').split(',').filter(tag => tag.trim() !== '') : [])}
        {renderTagsDisplay('Footwork', session.footwork && session.footwork !== '' ? session.footwork.replace(/[\[\]"]/g, '').split(',').filter(tag => tag.trim() !== '') : [])}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME_COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  headerRight: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 0,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 25,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  // DateTime Display
  dateTimeDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 6,
  },
  dateIcon: {
    marginRight: 10,
  },
  dateTimeDisplayText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  // Visual Selector
  locationContainer: {
    flexDirection: 'row',
    marginTop: 6,
  },
  buttonSpacer: {
    width: 16,
  },
  locationButton: {
    flex: 1,
    height: 150,
    backgroundColor: THEME_COLORS.background.primary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  locationButtonSelected: {
    borderColor: THEME_COLORS.bluePrimary,
    backgroundColor: '#f0f7ff',
  },
  locationImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  locationTextSelected: {
    color: THEME_COLORS.bluePrimary,
  },
  locationDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  locationDisplayText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  // Color Display
  colorDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME_COLORS.background.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 80,
    height: 50,
    marginTop: 6,
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  colorDisplayText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  // Dropdown Display
  dropdownDisplayContainer: {
    backgroundColor: THEME_COLORS.background.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 50,
    justifyContent: 'center',
    marginTop: 6,
  },
  dropdownDisplayText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '400',
  },
  dropdownPlaceholderText: {
    color: '#999',
  },
  // Options Display
  optionsContainer: {
    flexDirection: 'row',
    marginTop: 6,
  },
  optionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionButtonSelected: {
    backgroundColor: THEME_COLORS.bluePrimary,
    borderColor: THEME_COLORS.bluePrimary,
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  // Stars Display
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  starButton: {
    marginRight: 8,
    padding: 4,
  },
  // Feelings Display
  feelingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  feelingButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
  },
  feelingButtonSelected: {
    // Sem background nem borda quando selecionado
  },
  feelingEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  feelingText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
  },
  feelingTextSelected: {
    color: THEME_COLORS.bluePrimary,
    fontWeight: '700',
  },
  // Difficulty Display
  difficultyDisplayContainer: {
    paddingHorizontal: 15,
    paddingVertical: 0,
    marginTop: 12,
  },
  difficultyBarContainer: {
    position: 'relative',
    marginBottom: 0,
  },
  difficultyBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  difficultyBarEmpty: {
    backgroundColor: '#f0f0f0',
  },
  difficultyProgress: {
    height: '100%',
    backgroundColor: THEME_COLORS.bluePrimary,
    borderRadius: 4,
  },
  difficultyThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME_COLORS.bluePrimary,
    top: -6,
    marginLeft: -8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  difficultyLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  difficultyLabelLeft: {
    fontSize: 14,
    color: '#666',
    marginRight: 15,
  },
  difficultyLabelRight: {
    fontSize: 14,
    color: '#666',
    marginLeft: 15,
  },
  difficultyValue: {
    textAlign: 'center',
    marginTop: 0,
    fontSize: 20,
    fontWeight: '600',
    color: THEME_COLORS.bluePrimary,
  },
  // Falls Display
  fallsDisplayContainer: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 0,
    marginTop: 6,
  },
  fallsValue: {
    fontSize: 20,
    fontWeight: '600',
    color: THEME_COLORS.bluePrimary,
  },
  fallsValueEmpty: {
    color: '#999',
  },
  // Tags Display
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 6,
  },
  tagChip: {
    backgroundColor: THEME_COLORS.bluePrimary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagChipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyTagsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginTop: 6,
  },
  // Text Display
  textDisplayContainer: {
    backgroundColor: THEME_COLORS.background.input,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 50,
    justifyContent: 'center',
    marginTop: 6,
  },
  textDisplayText: {
    fontSize: 16,
    color: '#000000',
  },
  textDisplayPlaceholder: {
    color: '#999',
    fontStyle: 'italic',
  },
  // Image Display
  imageContainer: {
    marginTop: 6,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
  imagePlaceholder: {
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#999',
  },

  // Shared Row
  sharedRowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeNameContainer: {
    flex: 1,
    marginRight: 15,
  },
  routeColorContainer: {
    alignItems: 'flex-end',
  },
}); 