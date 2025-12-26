import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Clipboard, Image, Linking, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ImageView from 'react-native-image-viewing';

export default function BathroomDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // Parse the bathroom data from params
  const bathroom = JSON.parse(params.bathroom as string);
  
  // State for full-screen image viewer
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allImages, setAllImages] = useState<{uri: string}[]>([]);
  
  // Get reviews from bathroom object
  const reviews = bathroom.reviews || [];
  const reviewCount = reviews.length;

  // Open full-screen image viewer
  const openImageViewer = (photoUrl: string, allReviewPhotos: string[]) => {
    const images = allReviewPhotos.map(url => ({ uri: url }));
    const index = allReviewPhotos.findIndex(url => url === photoUrl);
    
    setAllImages(images);
    setCurrentImageIndex(index >= 0 ? index : 0);
    setImageViewerVisible(true);
  };

  // Get all photos from all reviews for gallery
  const getAllPhotos = () => {
    const allPhotos: string[] = [];
    reviews.forEach(review => {
      if (review.photos && review.photos.length > 0) {
        allPhotos.push(...review.photos);
      }
    });
    return allPhotos;
  };

  // Format amenities for display
  const formatAmenities = (amenities) => {
    if (!amenities || amenities.length === 0) return [];
    
    const amenityMap = {
      wheelchair_accessible: { icon: '♿', label: 'Wheelchair Accessible' },
      baby_changing: { icon: '🚼', label: 'Baby Changing Station' },
      free: { icon: '🆓', label: 'Free to Use' },
      well_lit: { icon: '💡', label: 'Well Lit' },
    };
    
    return amenities.map(a => amenityMap[a] || { icon: '✓', label: a });
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
      stars += '⭐';
    }
    if (hasHalfStar) {
      stars += '⭐';
    }
    
    return stars || '☆';
  };

  // Open directions - let user choose app
  const handleGetDirections = () => {
    const { latitude, longitude, name } = bathroom;
    const label = encodeURIComponent(name);

    Alert.alert(
      'Get Directions',
      'Choose your navigation app',
      [
        {
          text: 'Google Maps',
          onPress: () => {
            const url = Platform.select({
              ios: `comgooglemaps://?daddr=${label}&center=${latitude},${longitude}`,
              android: `google.navigation:q=${label}`,
            });

            Linking.canOpenURL(url).then((supported) => {
              if (supported) {
                Linking.openURL(url);
              } else {
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${label}`);
              }
            }).catch(() => {
              Alert.alert('Error', 'Could not open Google Maps');
            });
          },
        },
        {
          text: 'Apple Maps',
          onPress: () => {
            const url = Platform.select({
              ios: `maps://?q=${label}&ll=${latitude},${longitude}`,
              android: `geo:0,0?q=${label}`,
            });
            
            Linking.openURL(url).catch(() => {
              Alert.alert('Error', 'Could not open Apple Maps');
            });
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Copy bathroom name to clipboard
  const handleCopyName = () => {
    Clipboard.setString(bathroom.name);
    Alert.alert('Copied!', `"${bathroom.name}" copied to clipboard`);
  };

  // Share bathroom location
  const handleShare = async () => {
    try {
      const message = `Check out this bathroom I found on Throne Tracker!\n\n🚻 ${bathroom.name}\n⭐ Rating: ${bathroom.rating.toFixed(1)}/5\n📍 ${bathroom.distance ? bathroom.distance.toFixed(2) + ' km away' : 'Location'}\n\n${reviewCount} review${reviewCount !== 1 ? 's' : ''}\n\nhttps://www.google.com/maps/search/?api=1&query=${bathroom.latitude},${bathroom.longitude}`;

      const result = await Share.share({
        message: message,
        title: `Share ${bathroom.name}`,
      });

      if (result.action === Share.sharedAction) {
        console.log('Shared successfully');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Could not share bathroom');
    }
  };

  const amenitiesList = formatAmenities(bathroom.amenities);

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView style={styles.content}>
        {/* Bathroom name */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>🚻 {bathroom.name}</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={handleCopyName}
            >
              <Text style={styles.copyIcon}>📋</Text>
            </TouchableOpacity>
          </View>
          {bathroom.distance && (
            <Text style={styles.distance}>📍 {bathroom.distance.toFixed(2)} km away</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleGetDirections}
          >
            <Text style={styles.actionButtonIcon}>🗺️</Text>
            <Text style={styles.actionButtonText}>Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShare}
          >
            <Text style={styles.actionButtonIcon}>📤</Text>
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Photo Gallery */}
        {getAllPhotos().length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📸 Photos ({getAllPhotos().length})</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.galleryScroll}
            >
              {getAllPhotos().map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => openImageViewer(photo, getAllPhotos())}
                  style={styles.galleryPhoto}
                >
                  <Image
                    source={{ uri: photo }}
                    style={styles.galleryPhotoImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Overall Rating */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Overall Rating</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{renderStars(bathroom.rating)}</Text>
            <Text style={styles.ratingText}>{bathroom.rating > 0 ? bathroom.rating.toFixed(1) : '0'}/5</Text>
          </View>
          <Text style={styles.reviewCount}>
            Based on {reviewCount} review{reviewCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Cleanliness */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧼 Cleanliness</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{renderStars(bathroom.cleanliness)}</Text>
            <Text style={styles.ratingText}>{bathroom.cleanliness > 0 ? bathroom.cleanliness.toFixed(1) : '0'}/5</Text>
          </View>
        </View>

        {/* All Reviews */}
        {reviews.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reviews ({reviews.length})</Text>
            {reviews.map((review, index) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewRatings}>
                    <Text style={styles.reviewRating}>⭐ {review.rating}/5</Text>
                    <Text style={styles.reviewSeparator}>•</Text>
                    <Text style={styles.reviewRating}>🧼 {review.cleanliness}/5</Text>
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {review.description && (
                  <Text style={styles.reviewDescription}>{review.description}</Text>
                )}
                
                {/* Review Photos */}
                {review.photos && review.photos.length > 0 && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.reviewPhotos}
                  >
                    {review.photos.map((photo, photoIndex) => (
                      <TouchableOpacity
                        key={photoIndex}
                        onPress={() => openImageViewer(photo, review.photos)}
                      >
                        <Image
                          source={{ uri: photo }}
                          style={styles.reviewPhoto}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                
                {review.amenities && review.amenities.length > 0 && (
                  <View style={styles.reviewAmenities}>
                    {review.amenities.map((amenity, i) => {
                      const icons = {
                        wheelchair_accessible: '♿',
                        baby_changing: '🚼',
                        free: '🆓',
                        well_lit: '💡',
                      };
                      return (
                        <Text key={i} style={styles.reviewAmenityIcon}>
                          {icons[amenity] || '✓'}
                        </Text>
                      );
                    })}
                  </View>
                )}
                {index < reviews.length - 1 && <View style={styles.reviewDivider} />}
              </View>
            ))}
          </View>
        )}

        {/* Amenities */}
        {amenitiesList.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Amenities</Text>
            {amenitiesList.map((amenity, index) => (
              <View key={index} style={styles.amenityRow}>
                <Text style={styles.amenityIcon}>{amenity.icon}</Text>
                <Text style={styles.amenityLabel}>{amenity.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Location Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location</Text>
          <Text style={styles.coordinates}>
            Lat: {bathroom.latitude.toFixed(4)}, Long: {bathroom.longitude.toFixed(4)}
          </Text>
        </View>

        {/* Added date */}
        {bathroom.created_at && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Added: {new Date(bathroom.created_at).toLocaleDateString()}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Full-screen Image Viewer */}
      <ImageView
        images={allImages}
        imageIndex={currentImageIndex}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  titleSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    flex: 1,
  },
  copyButton: {
    padding: 8,
    marginLeft: 8,
  },
  copyIcon: {
    fontSize: 20,
  },
  distance: {
    fontSize: 16,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  galleryScroll: {
    marginTop: 8,
  },
  galleryPhoto: {
    marginRight: 12,
  },
  galleryPhotoImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    fontSize: 20,
    marginRight: 8,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
  },
  reviewCount: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  reviewItem: {
    marginTop: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewRatings: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewRating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  reviewSeparator: {
    fontSize: 14,
    color: '#d1d5db',
    marginHorizontal: 6,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  reviewDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewAmenities: {
    flexDirection: 'row',
    gap: 6,
  },
  reviewPhotos: {
    marginVertical: 8,
  },
  reviewPhoto: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  reviewAmenityIcon: {
    fontSize: 18,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginTop: 12,
  },
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  amenityIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 30,
  },
  amenityLabel: {
    fontSize: 16,
    color: '#4b5563',
  },
  coordinates: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  footer: {
    padding: 15,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});