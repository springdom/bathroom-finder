import { GOOGLE_PLACES_API_KEY } from '@env';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../config/supabase';
import { eventEmitter, EVENTS } from '../utils/events';
import ImagePickerComponent from './components/ImagePicker';

export default function AddReviewScreen() {
  const router = useRouter();
  
  // Location state
  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(true);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected place
  const [selectedPlace, setSelectedPlace] = useState(null);
  
  // Review state
  const [description, setDescription] = useState('');
  const [overallRating, setOverallRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [amenities, setAmenities] = useState({
      // Essentials
      running_water: false,
      soap_available: false,
      toilet_paper: false,
      well_lit: false,
      door_lock: false,
      clean: false,
      
      // Access & Cost
      free: false,
      paid: false,
      wheelchair_accessible: false,
      unisex: false,
      separate_facilities: false,
      attendant_present: false,
      
      // Facilities
      mirror: false,
      full_length_mirror: false,
      ventilation: false,
      hand_sanitizer: false,
      paper_towels: false,
      baby_changing: false,
      bucket_available: false,
      waste_bin: false,
      hook_for_bags: false,
      
      // Comfort
      air_conditioning: false,
      air_freshener: false,
      lotion_available: false,
      sanitary_products: false,
      
      // Toilet Type
      western_toilet: false,
      squat_toilet: false,
      accessible_toilet: false,
      shower_available: false,
      
      // Safety & Condition
      safe_location: false,
      privacy_intact: false,
      regularly_cleaned: false,
      working_fixtures: false,
      emergency_light: false,
    });
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

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
      const radius = 500; // 100 meters for testing
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
            'You must be within 100m of a business to add a review. Please move closer to a cafe, restaurant, or mall.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } else if (data.status === 'ZERO_RESULTS') {
        console.log('No businesses found within 500m');
        Alert.alert(
          'No Businesses Nearby',
          'No cafes, restaurants, or malls found within 100m. Try moving to a more commercial area.',
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

  // Filter places based on search query
  const getFilteredPlaces = () => {
    if (!searchQuery.trim()) {
      return nearbyPlaces;
    }

    const query = searchQuery.toLowerCase();
    return nearbyPlaces.filter(place => 
      place.name.toLowerCase().includes(query) ||
      place.vicinity.toLowerCase().includes(query) ||
      (place.types && place.types.some(type => type.toLowerCase().includes(query)))
    );
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
            photos: photos.length > 0 ? photos : null,
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
              Select the business you want to review. You must be within 100m.
            </Text>
          </View>

          {/* Search Bar */}
          {nearbyPlaces.length > 0 && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="🔍 Search businesses..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearSearchText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {getFilteredPlaces().map((place) => (
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

          {getFilteredPlaces().length === 0 && nearbyPlaces.length > 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No results for "{searchQuery}"</Text>
              <Text style={styles.emptyStateSubtext}>
                Try a different search term
              </Text>
              <TouchableOpacity
                style={styles.clearSearchButtonLarge}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchButtonText}>Clear Search</Text>
              </TouchableOpacity>
            </View>
          )}

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
          {/* Photos */}
          <Text style={styles.label}>Photos (Optional)</Text>
          <ImagePickerComponent
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={3}
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
          <Text style={styles.helperText} style={{ marginBottom: 16 }}>
            Select all that apply:
          </Text>
          
          {/* Essentials */}
          <View style={styles.amenitySection}>
            <Text style={styles.amenitySectionTitle}>⭐ Essentials</Text>
            <AmenityCheckbox amenity="running_water" icon="🚰" label="Running Water" />
            <AmenityCheckbox amenity="soap_available" icon="🧼" label="Soap Available" />
            <AmenityCheckbox amenity="toilet_paper" icon="🧻" label="Toilet Paper" />
            <AmenityCheckbox amenity="well_lit" icon="💡" label="Well Lit" />
            <AmenityCheckbox amenity="door_lock" icon="🔒" label="Door Lock Works" />
            <AmenityCheckbox amenity="clean" icon="✨" label="Clean/Maintained" />
          </View>

          {/* Access & Cost */}
          <View style={styles.amenitySection}>
            <Text style={styles.amenitySectionTitle}>🚪 Access & Cost</Text>
            <AmenityCheckbox amenity="free" icon="🆓" label="Free to Use" />
            <AmenityCheckbox amenity="paid" icon="💰" label="Paid to Use" />
            <AmenityCheckbox amenity="wheelchair_accessible" icon="♿" label="Wheelchair Accessible" />
            <AmenityCheckbox amenity="unisex" icon="🚻" label="Unisex" />
            <AmenityCheckbox amenity="separate_facilities" icon="🚪" label="Separate Men's/Women's" />
            <AmenityCheckbox amenity="attendant_present" icon="🧑‍💼" label="Attendant Present" />
          </View>

          {/* Facilities */}
          <View style={styles.amenitySection}>
            <Text style={styles.amenitySectionTitle}>🛠️ Facilities</Text>
            <AmenityCheckbox amenity="mirror" icon="🪞" label="Mirror" />
            <AmenityCheckbox amenity="full_length_mirror" icon="🪞" label="Full-Length Mirror" />
            <AmenityCheckbox amenity="ventilation" icon="🪟" label="Ventilation/Fan" />
            <AmenityCheckbox amenity="hand_sanitizer" icon="🧴" label="Hand Sanitizer" />
            <AmenityCheckbox amenity="paper_towels" icon="📄" label="Paper Towels/Hand Dryer" />
            <AmenityCheckbox amenity="baby_changing" icon="🚼" label="Baby Changing Station" />
            <AmenityCheckbox amenity="bucket_available" icon="🪣" label="Bucket/Water Barrel" />
            <AmenityCheckbox amenity="waste_bin" icon="🗑️" label="Waste Bin" />
            <AmenityCheckbox amenity="hook_for_bags" icon="🎒" label="Hook for Bags/Clothes" />
          </View>

          {/* Comfort */}
          <View style={styles.amenitySection}>
            <Text style={styles.amenitySectionTitle}>✨ Comfort</Text>
            <AmenityCheckbox amenity="air_conditioning" icon="❄️" label="Air Conditioning" />
            <AmenityCheckbox amenity="air_freshener" icon="🌸" label="Air Freshener" />
            <AmenityCheckbox amenity="lotion_available" icon="🧴" label="Lotion/Hand Cream" />
            <AmenityCheckbox amenity="sanitary_products" icon="🧽" label="Sanitary Products (Pads/Tampons)" />
          </View>

          {/* Toilet Type */}
          <View style={styles.amenitySection}>
            <Text style={styles.amenitySectionTitle}>🚽 Toilet Type</Text>
            <AmenityCheckbox amenity="western_toilet" icon="🚽" label="Western Toilet (Sit-down)" />
            <AmenityCheckbox amenity="squat_toilet" icon="🕳️" label="Squat Toilet" />
            <AmenityCheckbox amenity="accessible_toilet" icon="♿" label="Accessible Toilet" />
            <AmenityCheckbox amenity="shower_available" icon="🚿" label="Shower Available" />
          </View>

          {/* Safety & Condition */}
          <View style={styles.amenitySection}>
            <Text style={styles.amenitySectionTitle}>🛡️ Safety & Condition</Text>
            <AmenityCheckbox amenity="safe_location" icon="👁️" label="Safe/Secure Location" />
            <AmenityCheckbox amenity="privacy_intact" icon="🚪" label="Privacy (Intact Walls/Door)" />
            <AmenityCheckbox amenity="regularly_cleaned" icon="🧹" label="Regularly Cleaned" />
            <AmenityCheckbox amenity="working_fixtures" icon="👨‍🔧" label="Working Fixtures (Flush/Taps)" />
            <AmenityCheckbox amenity="emergency_light" icon="🔦" label="Emergency/Backup Light" />
          </View>
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
  searchContainer: {
    marginHorizontal: 15,
    marginBottom: 12,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
    paddingRight: 45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  clearSearchButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  clearSearchButtonLarge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  clearSearchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    marginTop: 16,
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
  amenitySection: {
    marginBottom: 20,
  },
  amenitySectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
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
    fontSize: 22,
    marginRight: 8,
  },
  amenityLabel: {
    fontSize: 15,
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