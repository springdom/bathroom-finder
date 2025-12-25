import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function AddBathroomScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
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

      {/* Form content (placeholder for now) */}
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Location</Text>
          <Text style={styles.helperText}>
            Your current location will be used for this bathroom.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ℹ️ Basic Information</Text>
          <Text style={styles.helperText}>
            Form fields coming in Task #13...
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>⭐ Ratings</Text>
          <Text style={styles.helperText}>
            Rating component coming in Task #14...
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>✓ Amenities</Text>
          <Text style={styles.helperText}>
            Amenities checklist coming in Task #15...
          </Text>
        </View>

        {/* Temporary submit button */}
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={() => {
            alert('Form will be functional in Tasks #13-15!');
          }}
        >
          <Text style={styles.submitButtonText}>Submit (Coming Soon)</Text>
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
    width: 60, // Same width as back button for centering
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
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#d1d5db',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
});