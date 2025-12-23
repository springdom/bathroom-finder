import { StyleSheet, View, Text, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

// Sample bathroom data - we'll replace this with Firebase data later
const SAMPLE_BATHROOMS = [
  {
    id: '1',
    name: 'Starbucks Coffee',
    latitude: null,
    longitude: null,
    rating: 4.5,
    cleanliness: 4,
    description: 'Clean bathroom, requires purchase',
    amenities: ['wheelchair_accessible', 'baby_changing'],
  },
  {
    id: '2',
    name: 'City Mall - 2nd Floor',
    latitude: null,
    longitude: null,
    rating: 4.0,
    cleanliness: 4,
    description: 'Public restroom, well maintained',
    amenities: ['wheelchair_accessible', 'free'],
  },
  {
    id: '3',
    name: 'Central Park Public Restroom',
    latitude: null,
    longitude: null,
    rating: 3.5,
    cleanliness: 3,
    description: 'Basic facilities, free to use',
    amenities: ['free'],
  },
  {
    id: '4',
    name: 'Grand Hotel Lobby',
    latitude: null,
    longitude: null,
    rating: 5.0,
    cleanliness: 5,
    description: 'Luxurious, spotlessly clean',
    amenities: ['wheelchair_accessible', 'baby_changing', 'well_lit'],
  },
  {
    id: '5',
    name: 'Gas Station - Route 1',
    latitude: null,
    longitude: null,
    rating: 2.5,
    cleanliness: 2,
    description: 'Basic, could be cleaner',
    amenities: ['free'],
  },
];

export default function TabOneScreen() {
  const [location, setLocation] = useState(null);
  const [bathrooms, setBathrooms] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        Alert.alert(
          'Location Permission Required',
          'Please enable location services to use this app.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get current location
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);

      // Generate sample bathrooms around user's location
      const bathroomsWithLocations = SAMPLE_BATHROOMS.map((bathroom, index) => {
        // Spread bathrooms in a circle around user
        const angle = (index * 360) / SAMPLE_BATHROOMS.length;
        const radius = 0.01; // ~1km
        const latOffset = radius * Math.cos((angle * Math.PI) / 180);
        const lngOffset = radius * Math.sin((angle * Math.PI) / 180);

        return {
          ...bathroom,
          latitude: currentLocation.coords.latitude + latOffset,
          longitude: currentLocation.coords.longitude + lngOffset,
        };
      });

      setBathrooms(bathroomsWithLocations);
    })();
  }, []);

  // Show loading state while getting location
  if (!location) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>
          {errorMsg || 'Getting your location...'}
        </Text>
      </View>
    );
  }

  // Function to get marker color based on rating
  const getMarkerColor = (rating) => {
    if (rating >= 4.5) return '#10b981'; // Green for excellent
    if (rating >= 3.5) return '#f59e0b'; // Orange for good
    return '#ef4444'; // Red for poor
  };

  // Format amenities for display
  const formatAmenities = (amenities) => {
    const amenityMap = {
      wheelchair_accessible: '♿ Wheelchair',
      baby_changing: '🚼 Baby Station',
      free: '🆓 Free',
      well_lit: '💡 Well Lit',
    };
    return amenities.map(a => amenityMap[a] || a).join(', ');
  };

  // Handle when user taps the callout
  const handleViewDetails = (bathroom) => {
    const amenitiesText = bathroom.amenities.length > 0 
      ? `\n\nAmenities: ${formatAmenities(bathroom.amenities)}`
      : '';
    
    Alert.alert(
      bathroom.name,
      `⭐ Rating: ${bathroom.rating}/5\n🧼 Cleanliness: ${bathroom.cleanliness}/5\n\n${bathroom.description}${amenitiesText}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Render bathroom markers */}
        {bathrooms.map((bathroom) => (
          <Marker
            key={bathroom.id}
            coordinate={{
              latitude: bathroom.latitude,
              longitude: bathroom.longitude,
            }}
            title={bathroom.name}
            description={`⭐ ${bathroom.rating}/5 | 🧼 Cleanliness: ${bathroom.cleanliness}/5\n${bathroom.description}`}
            pinColor={getMarkerColor(bathroom.rating)}
            onCalloutPress={() => handleViewDetails(bathroom)}
          />
        ))}
      </MapView>

      {/* Title and bathroom count */}
      <View style={styles.header}>
        <Text style={styles.title}>Bathroom Finder 🚻</Text>
        <Text style={styles.subtitle}>{bathrooms.length} bathrooms nearby</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});