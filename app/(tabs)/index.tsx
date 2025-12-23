import { StyleSheet, View, Text, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export default function TabOneScreen() {
  const [location, setLocation] = useState(null);
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

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Test marker - we'll replace this with real bathrooms later */}
        <Marker
          coordinate={{
            latitude: location.coords.latitude + 0.01,
            longitude: location.coords.longitude + 0.01,
          }}
          title="Test Bathroom"
          description="This is a test marker near you"
        />
      </MapView>
      <Text style={styles.title}>Bathroom Finder 🚻</Text>
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
  title: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});