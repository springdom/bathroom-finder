import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking, Share, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function BathroomDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // Parse the bathroom data from params
  const bathroom = JSON.parse(params.bathroom as string);

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
    
    return stars;
  };

  // Open directions in maps app
  const handleGetDirections = () => {
    const label = encodeURIComponent(bathroom.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${bathroom.latitude},${bathroom.longitude}`,
      android: `geo:0,0?q=${bathroom.latitude},${bathroom.longitude}(${label})`
    });

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          // Fallback to Google Maps web
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${bathroom.latitude},${bathroom.longitude}`;
          return Linking.openURL(googleMapsUrl);
        }
      })
      .catch((err) => {
        console.error('Error opening maps:', err);
        Alert.alert('Error', 'Could not open maps application');
      });
  };

  // Share bathroom location
  const handleShare = async () => {
    try {
      const message = `Check out this bathroom I found on Throne Tracker!\n\n🚻 ${bathroom.name}\n⭐ Rating: ${bathroom.rating}/5\n📍 ${bathroom.distance ? bathroom.distance.toFixed(2) + ' km away' : 'Location'}\n\n${bathroom.description || ''}\n\nhttps://www.google.com/maps/search/?api=1&query=${bathroom.latitude},${bathroom.longitude}`;

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
          <Text style={styles.backButtonText}>← Back to Map</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView style={styles.content}>
        {/* Bathroom name */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>🚻 {bathroom.name}</Text>
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

        {/* Overall Rating */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Overall Rating</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{renderStars(bathroom.rating)}</Text>
            <Text style={styles.ratingText}>{bathroom.rating}/5</Text>
          </View>
        </View>

        {/* Cleanliness */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧼 Cleanliness</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{renderStars(bathroom.cleanliness)}</Text>
            <Text style={styles.ratingText}>{bathroom.cleanliness}/5</Text>
          </View>
        </View>

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

        {/* Description */}
        {bathroom.description && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Description</Text>
            <Text style={styles.description}>{bathroom.description}</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
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
  description: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
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