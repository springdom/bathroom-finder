import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  Alert,
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../config/supabase';
import { GOOGLE_PLACES_API_KEY } from '../config/google-places';
import { eventEmitter, EVENTS } from '../utils/events';

export default function AddReviewScreen() {
  const router = useRouter();
  
  // Location state
  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(true);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  
  // Selected place
  const [selectedPlace, setSelectedPlace] = useState(null);
  
  // Review state
  const [description, setDescription] = useState('');
  const [overallRating, setOverallRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [amenities, setAmenities] = useState({
    wheelchair_accessible: false,
    baby_changing: false,
    free: false,
    well_lit: false,
  });
  const [loading, setLoading] = useState(false);

  // Get user's location and fetch nearby places
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to add a review.');
          setGettingLocation(false);
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
        console.log('Got location:', currentLocation.coords);

        // Fetch nearby places
        await fetchNearbyPlaces(currentLocation.coords.latitude, currentLocation.coords.longitude);
        
        setGettingLocation(false);
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert('Error', 'Could not get your location. Please try again.');
        setGettingLocation(false);
      }
    })();
  }, []);

  // Fetch nearby places from Google Places API
  const fetchNearbyPlaces = async (latitude, longitude) => {
    setLoadingPlaces(true);
    try {
      const radius = 500; // 500 meters for testing (change to 100 for production)
      const types = 'restaurant|cafe|shopping_mall|store|establishment';
      
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${types}&key=${GOOGLE_PLACES_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        console.log(`✅ Found ${data.results.length} nearby places`);
        setNearbyPlaces(data.results);
        
        if (data.results.length === 0) {
          Alert.alert(
            'No Businesses Nearby',
            'You must be within 500m of a business to add a review. Please move closer to a cafe, restaurant, or mall.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } else if (data.status === 'ZERO_RESULTS') {
        console.log('No businesses found within 500m');
        Alert.alert(
          'No Businesses Nearby',
          'No cafes, restaurants, or malls found within 500m. Try moving to a more commercial area.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        console.error('Places API error:', data.status, data.error_message);
        Alert.alert('Error', `Could not search for businesses: ${data.status}`);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      Alert.alert('Error', 'Could not search for nearby businesses.');
    } finally {
      setLoadingPlaces(false);
    }
  };

  // Toggle amenity
  const toggleAmenity = (amenity) => {
    setAmenities(prev => ({
      ...prev,
      [amenity]: !prev[amenity]
    }));
  };

  // Validate form
  const validateForm = () => {
    if (!selectedPlace) {
      Alert.alert('Select a Business', 'Please select which business you are reviewing.');
      return false;
    }
    
    if (overallRating === 0) {
      Alert.alert('Missing Rating', 'Please provide an overall rating.');
      return false;
    }
    
    if (cleanlinessRating === 0) {
      Alert.alert('Missing Rating', 'Please provide a cleanliness rating.');
      return false;
    }

    return true;
  };

  // Submit review
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const selectedAmenities = Object.keys(amenities).filter(key => amenities[key]);

      // Check if bathroom already exists (by place_id)
      const { data: existingBathrooms, error: searchError } = await supabase
        .from('bathrooms')
        .select('*')
        .eq('place_id', selectedPlace.place_id);

      if (searchError) throw searchError;

      let bathroomId;

      if (existingBathrooms && existingBathrooms.length > 0) {
        // Bathroom exists
        bathroomId = existingBathrooms[0].id;
        console.log('✅ Using existing bathroom:', bathroomId);
      } else {
        // Create new bathroom
        const { data: bathroomData, error: bathroomError } = await supabase
          .from('bathrooms')
          .insert([
            {
              name: selectedPlace.name,
              place_id: selectedPlace.place_id,
              latitude: selectedPlace.geometry.location.lat,
              longitude: selectedPlace.geometry.location.lng,
              address: selectedPlace.vicinity,
              amenities: selectedAmenities,
            }
          ])
          .select()
          .single();

        if (bathroomError) throw bathroomError;

        bathroomId = bathroomData.id;
        console.log('✅ New bathroom created:', bathroomId);
      }

      // Insert review
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .insert([
          {
            bathroom_id: bathroomId,
            rating: overallRating,
            cleanliness: cleanlinessRating,
            amenities: selectedAmenities,
            description: description.trim() || null,
          }
        ])
        .select();

      if (reviewError) throw reviewError;

      console.log('✅ Review added:', reviewData);
      
      // Emit event to notify screens to refresh
      eventEmitter.emit(EVENTS.REVIEW_ADDED);
      
      Alert.alert(
        'Success!',
        'Your review has been added.',
        [{ 
          text: 'OK', 
          onPress: () => router.back()
        }]
      );
    } catch (error) {
      console.error('Error adding review:', error);
      Alert.alert('Error', 'Could not add review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Star Rating Component
  const StarRating = ({ rating, onRatingChange, label }) => {
    return (
      <View style={styles.starRatingContainer}>
        <Text style={styles.starLabel}>{label}</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => onRatingChange(star)}
              disabled={loading}
            >
              <Text style={styles.star}>
                {star <= rating ? '⭐' : '☆'}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.ratingText}>{rating}/5</Text>
        </View>
      </View>
    );
  };

  // Amenity Checkbox Component
  const AmenityCheckbox = ({ amenity, label, icon }) => {
    const isChecked = amenities[amenity];
    
    return (
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => toggleAmenity(amenity)}
        disabled={loading}
      >
        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
          {isChecked && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.amenityIcon}>{icon}</Text>
        <Text style={styles.amenityLabel}>{label}</Text>
      </TouchableOpacity>
    );
  };

  // Show loading while getting location
  if (gettingLocation || loadingPlaces) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Review</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>
            {gettingLocation ? 'Getting your location...' : 'Finding nearby businesses...'}
          </Text>
        </View>
      </View>
    );
  }

  // Show business selection if no business selected yet
  if (!selectedPlace) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Business</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Which business are you at?</Text>
            <Text style={styles.helperText}>
              Select the business you want to review. You must be within 500m.
            </Text>
          </View>

          {nearbyPlaces.map((place) => (
            <TouchableOpacity
              key={place.place_id}
              style={styles.placeCard}
              onPress={() => setSelectedPlace(place)}
            >
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeAddress}>{place.vicinity}</Text>
                {place.types && (
                  <Text style={styles.placeType}>
                    {place.types[0].replace(/_/g, ' ')}
                  </Text>
                )}
              </View>
              <Text style={styles.placeArrow}>→</Text>
            </TouchableOpacity>
          ))}

          {nearbyPlaces.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No businesses found nearby</Text>
              <Text style={styles.emptyStateSubtext}>
                Move closer to a cafe, restaurant, or mall to add a review.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // Show review form after business is selected
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setSelectedPlace(null)}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>← Change</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Review</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Selected Business */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Business</Text>
          <Text style={styles.selectedBusinessName}>{selectedPlace.name}</Text>
          <Text style={styles.selectedBusinessAddress}>{selectedPlace.vicinity}</Text>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💬 Your Review</Text>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g., Clean bathroom on the second floor, requires purchase"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            editable={!loading}
            maxLength={500}
          />
        </View>

        {/* Ratings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⭐ Ratings</Text>
          <StarRating
            label="Overall Rating *"
            rating={overallRating}
            onRatingChange={setOverallRating}
          />
          <StarRating
            label="Cleanliness *"
            rating={cleanlinessRating}
            onRatingChange={setCleanlinessRating}
          />
        </View>

        {/* Amenities */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✓ Amenities</Text>
          <Text style={styles.helperText} style={{ marginBottom: 12 }}>
            Select all that apply:
          </Text>
          
          <AmenityCheckbox
            amenity="wheelchair_accessible"
            icon="♿"
            label="Wheelchair Accessible"
          />
          <AmenityCheckbox
            amenity="baby_changing"
            icon="🚼"
            label="Baby Changing Station"
          />
          <AmenityCheckbox
            amenity="free"
            icon="🆓"
            label="Free to Use"
          />
          <AmenityCheckbox
            amenity="well_lit"
            icon="💡"
            label="Well Lit"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  placeholder: {
    width: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 15,
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
  helperText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  placeCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  placeType: {
    fontSize: 12,
    color: '#9ca3af',
    textTransform: 'capitalize',
  },
  placeArrow: {
    fontSize: 24,
    color: '#3b82f6',
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  selectedBusinessName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  selectedBusinessAddress: {
    fontSize: 14,
    color: '#6b7280',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  starRatingContainer: {
    marginBottom: 16,
  },
  starLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    fontSize: 32,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  amenityIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  amenityLabel: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});