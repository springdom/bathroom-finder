import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../config/supabase';

interface ImagePickerComponentProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export default function ImagePickerComponent({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 3 
}: ImagePickerComponentProps) {
  const [uploading, setUploading] = useState(false);

  // Request permissions
  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('Permission Required', 'Please enable camera and photo library permissions.');
      return false;
    }
    return true;
  };

  // Compress image before upload (prevents Android crashes)
  const compressImage = async (uri: string) => {
    try {
      console.log('🗜️ Compressing image...');
      
      // Android needs MUCH more aggressive compression
      const isAndroid = Platform.OS === 'android';
      
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: isAndroid ? 600 : 800 } }, // Smaller for Android
        ],
        {
          compress: isAndroid ? 0.3 : 0.5, // More compression for Android
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      console.log('✅ Image compressed:', manipulatedImage.uri);
      return manipulatedImage.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri;
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      if (photos.length >= maxPhotos) {
        Alert.alert('Maximum Photos', `You can only upload ${maxPhotos} photos per review.`);
        return;
      }

      console.log('📷 Opening camera...');
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: Platform.OS === 'android' ? 0.1 : 0.2, // MUCH lower for Android
        exif: false,
        base64: false,
      });

      console.log('📷 Camera result received');

      if (!result.canceled && result.assets && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        console.log('📷 Photo taken, size:', result.assets[0].fileSize, 'bytes');
        
        // Longer delay for Android to fully close camera
        setTimeout(async () => {
          console.log('📷 Starting compression...');
          const compressedUri = await compressImage(photoUri);
          console.log('📷 Uploading compressed image...');
          await uploadPhoto(compressedUri);
        }, Platform.OS === 'android' ? 300 : 100); // Longer delay for Android
      } else {
        console.log('📷 Camera canceled');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Could not access camera. Please try again.');
    }
  };

// Pick photo from gallery
  const pickPhoto = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      if (photos.length >= maxPhotos) {
        Alert.alert('Maximum Photos', `You can only upload ${maxPhotos} photos per review.`);
        return;
      }

      console.log('🖼️ Opening gallery...');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: Platform.OS === 'android' ? 0.1 : 0.3, // MUCH lower for Android
        exif: false,
        base64: false,
      });

      console.log('🖼️ Gallery result received');

      if (!result.canceled && result.assets && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        console.log('🖼️ Photo selected, size:', result.assets[0].fileSize, 'bytes');
        
        // Longer delay for Android
        setTimeout(async () => {
          console.log('🖼️ Starting compression...');
          const compressedUri = await compressImage(photoUri);
          console.log('🖼️ Uploading compressed image...');
          await uploadPhoto(compressedUri);
        }, Platform.OS === 'android' ? 300 : 100);
      } else {
        console.log('🖼️ Gallery canceled');
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Could not access photo library. Please try again.');
    }
  };

// Upload photo to Supabase Storage (simpler SDK approach)
  const uploadPhoto = async (uri: string) => {
    console.log('⬆️ Starting upload for:', uri);
    setUploading(true);
    
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const uniqueFileName = `${timestamp}-${random}.jpg`;

      console.log('⬆️ Uploading to Supabase:', uniqueFileName);

      // Read file as blob
      console.log('📦 Reading file as blob...');
      const response = await fetch(uri);
      const blob = await response.blob();
      
      console.log('📦 Blob size:', blob.size, 'bytes');

      if (blob.size === 0) {
        throw new Error('Image file is empty');
      }

      // Convert blob to array buffer for upload
      const arrayBuffer = await new Response(blob).arrayBuffer();
      
      console.log('⬆️ Uploading to Supabase...');

      // Upload using Supabase SDK (handles auth automatically)
      const { data, error } = await supabase.storage
        .from('bathroom-photos')
        .upload(uniqueFileName, arrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('❌ Upload error:', error);
        throw error;
      }

      console.log('✅ Upload successful:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('bathroom-photos')
        .getPublicUrl(uniqueFileName);

      console.log('✅ Public URL:', urlData.publicUrl);

      // Add to photos array
      onPhotosChange([...photos, urlData.publicUrl]);
      
      setUploading(false);
      Alert.alert('Success!', 'Photo uploaded successfully');
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      setUploading(false);
      Alert.alert('Upload Failed', `Could not upload photo: ${error.message || 'Unknown error'}`);
    }
  };

  // Remove photo
  const removePhoto = (index: number) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newPhotos = photos.filter((_, i) => i !== index);
            onPhotosChange(newPhotos);
          },
        },
      ]
    );
  };

  // Show upload options
  const showUploadOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickPhoto },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Photo Grid */}
      <View style={styles.photoGrid}>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoContainer}>
            <Image source={{ uri: photo }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removePhoto(index)}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Photo Button */}
        {photos.length < maxPhotos && (
          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={showUploadOptions}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#3b82f6" />
            ) : (
              <>
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.helperText}>
        {photos.length}/{maxPhotos} photos • Max 3 photos per review
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoContainer: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  addPhotoIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  addPhotoText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
});