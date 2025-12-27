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

export default function AddBathroomScreen() {
  const router = useRouter();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(true);
  
  // Ratings state
  const [overallRating, setOverallRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  
  // Amenities state
  const [amenities, setAmenities] = useState({
    wheelchair_accessible: false,
    baby_changing: false,
    free: false,
    well_lit: false,
  });

  // Get user's current location when screen loads
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to add a bathroom.');
          setGettingLocation(false);
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
        setGettingLocation(false);
        console.log('Got location:', currentLocation.coords);
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert('Error', 'Could not get your location. Please try again.');
        setGettingLocation(false);
      }
    })();
  }, []);

  // Toggle amenity
  const toggleAmenity = (amenity) => {
    setAmenities(prev => ({
      ...prev,
      [amenity]: !prev[amenity]
    }));
  };

  // Validate form
  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Missing Information', 'Please enter a bathroom name.');
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
    
    if (!location) {
      Alert.alert('Location Error', 'Could not get your location. Please try again.');
      return false;
    }

    return true;
  };

  // Submit form to Supabase
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Build amenities array from selected checkboxes
      const selectedAmenities = Object.keys(amenities).filter(key => amenities[key]);

      // Step 1: Check if bathroom already exists at this location
      const { data: existingBathrooms, error: searchError } = await supabase
        .from('bathrooms')
        .select('*')
        .eq('name', name.trim());

      if (searchError) throw searchError;

      let bathroomId;

      if (existingBathrooms && existingBathrooms.length > 0) {
        // Bathroom exists, use existing ID
        bathroomId = existingBathrooms[0].id;
        console.log('✅ Using existing bathroom:', bathroomId);
      } else {
        // Step 2: Insert new bathroom
        const { data: bathroomData, error: bathroomError } = await supabase
          .from('bathrooms')
          .insert([
            {
              name: name.trim(),
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              amenities: selectedAmenities,
            }
          ])
          .select()
          .single();

        if (bathroomError) throw bathroomError;

        bathroomId = bathroomData.id;
        console.log('✅ New bathroom created:', bathroomId);
      }

      // Step 3: Insert review for this bathroom
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
      
      Alert.alert(
        'Success!',
        'Your review has been added.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
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
  if (gettingLocation) {
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
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>✕ Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Review</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Form content */}
      <ScrollView style={styles.content}>
        {/* Location Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Location</Text>
          {location && (
            <View>
              <Text style={styles.locationText}>
                Lat: {location.coords.latitude.toFixed(6)}
              </Text>
              <Text style={styles.locationText}>
                Long: {location.coords.longitude.toFixed(6)}
              </Text>
              <Text style={styles.helperText}>
                This location will be used for the bathroom marker.
              </Text>
            </View>
          )}
        </View>

        {/* Basic Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ℹ️ Basic Information</Text>
          
          {/* Bathroom Name */}
          <Text style={styles.label}>Bathroom Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Starbucks Coffee - Osu"
            value={name}
            onChangeText={setName}
            editable={!loading}
            maxLength={100}
          />
          
          {/* Description */}
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
            <Text style={styles.submitButtonText}>Add Review</Text>
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
    color: '#ef4444',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  placeholder: {
    width: 60,
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
  locationText: {
    fontSize: 14,
    color: '#4b5563',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
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