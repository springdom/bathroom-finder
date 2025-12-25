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

  // Validate form
  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Missing Information', 'Please enter a bathroom name.');
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
      const { data, error } = await supabase
        .from('bathrooms')
        .insert([
          {
            name: name.trim(),
            description: description.trim() || null,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            rating: 0, // Default, will add star rating in Task #14
            cleanliness: 0, // Default, will add star rating in Task #14
            amenities: [], // Default, will add checklist in Task #15
          }
        ])
        .select();

      if (error) throw error;

      console.log('✅ Bathroom added:', data);
      
      Alert.alert(
        'Success!',
        'Bathroom has been added to the map.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error adding bathroom:', error);
      Alert.alert('Error', 'Could not add bathroom. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.headerTitle}>Add Bathroom</Text>
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
        <Text style={styles.headerTitle}>Add Bathroom</Text>
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

        {/* Ratings Placeholder */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⭐ Ratings</Text>
          <Text style={styles.helperText}>
            Star rating component coming in Task #14...
          </Text>
        </View>

        {/* Amenities Placeholder */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✓ Amenities</Text>
          <Text style={styles.helperText}>
            Amenities checklist coming in Task #15...
          </Text>
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
            <Text style={styles.submitButtonText}>Add Bathroom</Text>
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