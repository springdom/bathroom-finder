import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../../config/supabase';
import { eventEmitter, EVENTS } from '../../utils/events';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';


export default function TabOneScreen() {
  const [location, setLocation] = useState(null);
  const [bathrooms, setBathrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const router = useRouter();
  const mapRef = useRef(null);

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
  // Add this NEW useEffect:
  useEffect(() => {
    // Listen for review added event
    const handleReviewAdded = () => {
      console.log('🔔 Review added event received - refreshing map');
      if (location) {
        fetchBathrooms(location);
      }
    };

    eventEmitter.on(EVENTS.REVIEW_ADDED, handleReviewAdded);

    // Cleanup
    return () => {
      eventEmitter.off(EVENTS.REVIEW_ADDED, handleReviewAdded);
    };
  }, [location]);
  // Reload bathrooms when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (location) {
        fetchBathrooms(location);
      }
    }, [location])
  );

  const fetchBathrooms = async (userLocation) => {
    try {
      console.log('Fetching bathrooms from Supabase...');
      
      // Fetch bathrooms with their reviews
      const { data, error } = await supabase
        .from('bathrooms')
        .select(`
          *,
          reviews (
            id,
            rating,
            cleanliness,
            amenities,
            description,
            photos,
            created_at
          )
        `);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data.length} bathrooms from Supabase`);

      // Calculate average ratings for each bathroom
      const bathroomsWithRatings = data.map(bathroom => {
        const reviews = bathroom.reviews || [];
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;
        const avgCleanliness = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.cleanliness, 0) / reviews.length
          : 0;
        
        return {
          ...bathroom,
          rating: avgRating,
          cleanliness: avgCleanliness,
          reviewCount: reviews.length,
        };
      });

      // Calculate distance for each bathroom
      const bathroomsWithDistance = bathroomsWithRatings.map(bathroom => ({
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
      
      // More specific error messages
      if (error.message?.includes('network')) {
        setErrorMsg('Network error. Please check your internet connection.');
      } else if (error.message?.includes('timeout')) {
        setErrorMsg('Request timed out. Please try again.');
      } else {
        setErrorMsg('Error loading bathrooms. Please try again.');
      }
      
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
  if (loading) {
    return <LoadingState message="Finding nearby bathrooms..." />;
  }

  // Show error state
  if (errorMsg) {
    return (
      <ErrorState 
        message={errorMsg}
        onRetry={() => {
          setLoading(true);
          setErrorMsg(null);
          Location.getCurrentPositionAsync({}).then(loc => {
            setLocation(loc);
            fetchBathrooms(loc);
          });
        }}
      />
    );
  }

  // Show error if no location
  if (!location) {
    return (
      <ErrorState 
        message="Unable to get your location. Please check your location permissions."
        onRetry={() => {
          setLoading(true);
          Location.getCurrentPositionAsync({}).then(loc => {
            setLocation(loc);
            fetchBathrooms(loc);
          });
        }}
      />
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

    // Add this new function:
  const handleRecenterMap = () => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000); // 1 second animation
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
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
            description={`⭐ ${bathroom.rating.toFixed(1)}/5 | 🧼 ${bathroom.cleanliness.toFixed(1)}/5 | ${bathroom.reviewCount} review${bathroom.reviewCount !== 1 ? 's' : ''}`}
            pinColor={getMarkerColor(bathroom.rating)}
            onCalloutPress={() => handleViewDetails(bathroom)}
          />
        ))}
      </MapView>

      <View style={styles.header}>
        <Text style={styles.title}>Throne Tracker 🚽</Text>
        <Text style={styles.subtitle}>
          {bathrooms.length} bathroom{bathrooms.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Recenter Button */}
      <TouchableOpacity 
        style={styles.recenterButton}
        onPress={handleRecenterMap}
      >
        <Text style={styles.recenterIcon}>📍</Text>
      </TouchableOpacity>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/add-review')}
      >
        <Text style={styles.fabIcon}>➕</Text>
      </TouchableOpacity>
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
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: 'white',
  },
  recenterButton: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  recenterIcon: {
    fontSize: 24,
  },
});