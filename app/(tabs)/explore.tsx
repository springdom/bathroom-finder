import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { supabase } from '../../config/supabase';

export default function ExploreScreen() {
  const router = useRouter();
  const [location, setLocation] = useState(null);
  const [bathrooms, setBathrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [sortBy, setSortBy] = useState('distance');
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minRating: 0,
    maxDistance: 100,
    amenities: [],
  });

  useEffect(() => {
    (async () => {
      try {
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

        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
        await fetchBathrooms(currentLocation);
      } catch (error) {
        console.error('Error in useEffect:', error);
        setErrorMsg('Error loading data');
        setLoading(false);
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (location) {
        fetchBathrooms(location);
      }
    }, [location])
  );

  const fetchBathrooms = async (userLocation) => {
    try {
      console.log('Fetching bathrooms for list view...');
      
      const { data, error } = await supabase
        .from('bathrooms')
        .select('*');

      if (error) throw error;

      console.log(`✅ Fetched ${data.length} bathrooms`);

      const bathroomsWithDistance = data.map(bathroom => ({
        ...bathroom,
        distance: calculateDistance(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          bathroom.latitude,
          bathroom.longitude
        ),
      }));

      sortBathrooms(bathroomsWithDistance, sortBy);
      setBathrooms(bathroomsWithDistance);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bathrooms:', error);
      setErrorMsg('Error loading bathrooms');
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const sortBathrooms = (bathroomsList, criteria) => {
    switch (criteria) {
      case 'distance':
        bathroomsList.sort((a, b) => a.distance - b.distance);
        break;
      case 'rating':
        bathroomsList.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        bathroomsList.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        break;
    }
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    const sortedBathrooms = [...bathrooms];
    sortBathrooms(sortedBathrooms, newSort);
    setBathrooms(sortedBathrooms);
  };

  const getFilteredBathrooms = () => {
    let filtered = [...bathrooms];

    if (filters.minRating > 0) {
      filtered = filtered.filter(bathroom => bathroom.rating >= filters.minRating);
    }

    if (filters.maxDistance < 100) {
      filtered = filtered.filter(bathroom => bathroom.distance <= filters.maxDistance);
    }

    if (filters.amenities.length > 0) {
      filtered = filtered.filter(bathroom => {
        if (!bathroom.amenities) return false;
        return filters.amenities.every(amenity => 
          bathroom.amenities.includes(amenity)
        );
      });
    }

    return filtered;
  };

  const toggleAmenityFilter = (amenity) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const clearFilters = () => {
    setFilters({
      minRating: 0,
      maxDistance: 100,
      amenities: [],
    });
  };

  const hasActiveFilters = () => {
    return filters.minRating > 0 ||
           filters.maxDistance < 100 ||
           filters.amenities.length > 0;
  };

  const handleBathroomPress = (bathroom) => {
    router.push({
      pathname: '/bathroom-detail',
      params: { bathroom: JSON.stringify(bathroom) }
    });
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return '#10b981';
    if (rating >= 3.5) return '#f59e0b';
    return '#ef4444';
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
      stars += '⭐';
    }
    return stars || '☆';
  };

  if (loading || !location) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bathrooms</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>
            {errorMsg || 'Loading bathrooms...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bathrooms</Text>
        <Text style={styles.headerSubtitle}>
          {bathrooms.length} location{bathrooms.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'distance' && styles.sortButtonActive]}
            onPress={() => handleSortChange('distance')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'distance' && styles.sortButtonTextActive]}>
              Distance
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'rating' && styles.sortButtonActive]}
            onPress={() => handleSortChange('rating')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'rating' && styles.sortButtonTextActive]}>
              Rating
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'newest' && styles.sortButtonActive]}
            onPress={() => handleSortChange('newest')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'newest' && styles.sortButtonTextActive]}>
              Newest
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.list}>
        {/* Filter Button */}
        <View style={styles.filterButtonContainer}>
          <TouchableOpacity
            style={[styles.filterButtonLarge, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Text style={[
              styles.filterButtonText,
              showFilters && { color: 'white' }
            ]}>
              {showFilters ? '✕ Close Filters' : '⚙️ Filter Results'}
            </Text>
            {hasActiveFilters() && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {/* Filter Panel */}
        {showFilters && (
          <View style={styles.filterPanel}>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Minimum Rating</Text>
              <View style={styles.ratingFilter}>
                {[0, 3, 4, 5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingFilterButton,
                      filters.minRating === rating && styles.ratingFilterButtonActive
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, minRating: rating }))}
                  >
                    <Text style={[
                      styles.ratingFilterText,
                      filters.minRating === rating && styles.ratingFilterTextActive
                    ]}>
                      {rating === 0 ? 'Any' : `${rating}+ ⭐`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Maximum Distance</Text>
              <View style={styles.ratingFilter}>
                {[1, 5, 10, 100].map((distance) => (
                  <TouchableOpacity
                    key={distance}
                    style={[
                      styles.ratingFilterButton,
                      filters.maxDistance === distance && styles.ratingFilterButtonActive
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, maxDistance: distance }))}
                  >
                    <Text style={[
                      styles.ratingFilterText,
                      filters.maxDistance === distance && styles.ratingFilterTextActive
                    ]}>
                      {distance === 100 ? 'Any' : `< ${distance} km`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Amenities</Text>
              <View style={styles.amenitiesFilter}>
                {[
                  { key: 'wheelchair_accessible', icon: '♿', label: 'Wheelchair' },
                  { key: 'baby_changing', icon: '🚼', label: 'Baby Changing' },
                  { key: 'free', icon: '🆓', label: 'Free' },
                  { key: 'well_lit', icon: '💡', label: 'Well Lit' },
                ].map(({ key, icon, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.amenityFilterChip,
                      filters.amenities.includes(key) && styles.amenityFilterChipActive
                    ]}
                    onPress={() => toggleAmenityFilter(key)}
                  >
                    <Text style={styles.amenityFilterIcon}>{icon}</Text>
                    <Text style={[
                      styles.amenityFilterLabel,
                      filters.amenities.includes(key) && styles.amenityFilterLabelActive
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {hasActiveFilters() && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Bathroom Cards */}
        {getFilteredBathrooms().map((bathroom) => (
          <TouchableOpacity
            key={bathroom.id}
            style={styles.bathroomCard}
            onPress={() => handleBathroomPress(bathroom)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.bathroomName} numberOfLines={1}>
                🚻 {bathroom.name}
              </Text>
              <Text style={styles.distance}>
                📍 {bathroom.distance.toFixed(1)} km
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <Text style={styles.stars}>{renderStars(bathroom.rating)}</Text>
              <Text style={[styles.ratingText, { color: getRatingColor(bathroom.rating) }]}>
                {bathroom.rating}/5
              </Text>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.cleanlinessText}>
                🧼 {bathroom.cleanliness}/5
              </Text>
            </View>

            {bathroom.description && (
              <Text style={styles.description} numberOfLines={2}>
                {bathroom.description}
              </Text>
            )}

            {bathroom.amenities && bathroom.amenities.length > 0 && (
              <View style={styles.amenitiesRow}>
                {bathroom.amenities.slice(0, 3).map((amenity, index) => {
                  const icons = {
                    wheelchair_accessible: '♿',
                    baby_changing: '🚼',
                    free: '🆓',
                    well_lit: '💡',
                  };
                  return (
                    <Text key={index} style={styles.amenityIcon}>
                      {icons[amenity] || '✓'}
                    </Text>
                  );
                })}
                {bathroom.amenities.length > 3 && (
                  <Text style={styles.moreAmenities}>
                    +{bathroom.amenities.length - 3}
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}

        {getFilteredBathrooms().length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {hasActiveFilters() ? 'No bathrooms match your filters' : 'No bathrooms found'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {hasActiveFilters() ? 'Try adjusting your filters' : 'Be the first to add one!'}
            </Text>
            {hasActiveFilters() && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/add-bathroom')}
      >
        <Text style={styles.fabIcon}>➕</Text>
      </TouchableOpacity>
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
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
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
  sortContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sortLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sortButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  sortButtonTextActive: {
    color: 'white',
  },
  list: {
    flex: 1,
  },
  filterButtonContainer: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButtonLarge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  filterPanel: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  ratingFilter: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ratingFilterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  ratingFilterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  ratingFilterTextActive: {
    color: 'white',
  },
  amenitiesFilter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  amenityFilterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  amenityFilterIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  amenityFilterLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  amenityFilterLabelActive: {
    color: 'white',
  },
  clearFiltersButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  clearFiltersText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bathroomCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bathroomName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  distance: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stars: {
    fontSize: 16,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    fontSize: 14,
    color: '#d1d5db',
    marginHorizontal: 8,
  },
  cleanlinessText: {
    fontSize: 14,
    color: '#6b7280',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  amenitiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  amenityIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  moreAmenities: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
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
});