import { useRouter } from 'expo-router';
import { StyleSheet, View, Text, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../../config/supabase';

export default function TabOneScreen() {
  const [location, setLocation] = useState(null);
  const [bathrooms, setBathrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // Request location permissions
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          Alert.alert(
            'Location Permission Required',
            'Please enable location services to use this app.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }

        // Get current location
        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);

        // Fetch bathrooms from Supabase
        await fetchBathrooms(currentLocation);
      } catch (error) {
        console.error('Error in useEffect:', error);
        setErrorMsg('Error loading data');
        setLoading(false);
      }
    })();
  }, []);

  const fetchBathrooms = async (userLocation) => {
    try {
      console.log('Fetching bathrooms from Supabase...');
      
      const { data, error } = await supabase
        .from('bathrooms')
        .select('*');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data.length} bathrooms from Supabase`);

      // Calculate distance for each bathroom
      const bathroomsWithDistance = data.map(bathroom => ({
        ...bathroom,
        distance: calculateDistance(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          bathroom.latitude,
          bathroom.longitude
        ),
      }));

      // Sort by distance
      bathroomsWithDistance.sort((a, b) => a.distance - b.distance);

      console.log('Bathrooms loaded:', bathroomsWithDistance);
      setBathrooms(bathroomsWithDistance);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bathrooms:', error);
      setErrorMsg('Error loading bathrooms');
      setLoading(false);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance; // Distance in km
  };

  // Show loading state
  if (loading || !location) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>
          {errorMsg || 'Loading bathrooms...'}
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
    if (!amenities || amenities.length === 0) return '';
    
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
    router.push({
      pathname: '/bathroom-detail',
      params: { bathroom: JSON.stringify(bathroom) }
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
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

      <View style={styles.header}>
        <Text style={styles.title}>Bathroom Finder 🚻</Text>
        <Text style={styles.subtitle}>
          {bathrooms.length} bathroom{bathrooms.length !== 1 ? 's' : ''} found
        </Text>
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
    marginTop: 10,
  },
});