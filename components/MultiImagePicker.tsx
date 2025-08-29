import { FontAwesome6 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { THEME_COLORS } from '../constants/Theme';

const { width: screenWidth } = Dimensions.get('window');

interface MultiImagePickerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  title?: string;
  placeholder?: string;
  fullWidthButton?: boolean;
  containerWidth?: number;
}

export default function MultiImagePicker({
  images = [],
  onImagesChange,
  maxImages = 5,
  title = "Images",
  placeholder = "Add photos",
  fullWidthButton = false,
  containerWidth
}: MultiImagePickerProps) {
  const [loading, setLoading] = useState(false);

  const pickImages = async () => {
    try {
      setLoading(true);
      
      // Ask permission if not granted
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need media library permission to select photos.');
        return;
      }

      // Check if we've reached the max limit
      if (images.length >= maxImages) {
        Alert.alert('Limit reached', `You can only select up to ${maxImages} images.`);
        return;
      }

      const remainingSlots = maxImages - images.length;
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,  // Remove crop functionality
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImageUris = result.assets.map(asset => asset.uri);
        const updatedImages = [...images, ...newImageUris];
        onImagesChange(updatedImages);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    onImagesChange(updatedImages);
  };

  const renderImageItem = ({ item: imageUri, index }: { item: string; index: number }) => (
    <View style={[styles.imageContainer, { width: itemWidth, height: itemWidth }]}>
      <Image source={{ uri: imageUri }} style={styles.imagePreview} />
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeImage(index)}
      >
        <FontAwesome6 name="xmark" size={14} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderAddButton = () => (
    <TouchableOpacity
      style={[
        fullWidthButton ? styles.addImageButtonFullWidth : styles.addImageButton, 
        loading && styles.addImageButtonDisabled
      ]}
      onPress={pickImages}
      disabled={loading || images.length >= maxImages}
    >
      {loading ? (
        <>
          <ActivityIndicator size="small" color={THEME_COLORS.bluePrimary} />
          <Text style={styles.addImageText}>Selecting photos...</Text>
        </>
      ) : (
        <>
          <FontAwesome6 name="camera" size={24} color="#666" />
          <Text style={styles.addImageText}>{placeholder}</Text>
        </>
      )}
    </TouchableOpacity>
  );

  // Calculate item width using container measurement instead of screen width
  const [containerMeasuredWidth, setContainerMeasuredWidth] = useState<number | null>(null);
  
  const effectiveWidth = containerWidth || containerMeasuredWidth || screenWidth;
  const itemSpacing = 10; // spacing between items
  const totalSpacing = itemSpacing * 2; // 2 gaps for 3 columns
  const itemWidth = (effectiveWidth - totalSpacing) / 3;

  return (
    <View 
      style={styles.container}
      onLayout={!containerWidth ? (event) => {
        const { width } = event.nativeEvent.layout;
        setContainerMeasuredWidth(width);
      } : undefined}
    >
      <Text style={styles.label}>{title}</Text>
      
      {images.length === 0 ? (
        renderAddButton()
      ) : (effectiveWidth > 0 ? (
        <View>
          <FlatList
            data={images}
            renderItem={renderImageItem}
            keyExtractor={(item, index) => `${item}-${index}`}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={styles.imageGrid}
            ItemSeparatorComponent={() => <View style={{ width: 10, height: 10 }} />}
            columnWrapperStyle={styles.imageRow}
          />
          
          {images.length < maxImages && (
            <View style={{ marginTop: 10 }}>
              {renderAddButton()}
            </View>
          )}
          
          <Text style={styles.imageCount}>
            {images.length} of {maxImages} images
          </Text>
        </View>
      ) : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: THEME_COLORS.text,
  },
  imageGrid: {
    paddingHorizontal: 0,
  },
  imageRow: {
    justifyContent: 'flex-start',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButtonFullWidth: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButtonDisabled: {
    opacity: 0.5,
  },
  addImageText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  imageCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});

