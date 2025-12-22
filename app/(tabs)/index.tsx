import { StyleSheet, Text, View } from 'react-native';
import { db } from '../../config/firebase';

export default function TabOneScreen() {
  console.log('Firebase initialized:', db ? 'Success' : 'Failed');
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bathroom Finder</Text>
      <Text style={styles.subtitle}>Firebase Connected ✅</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'green',
  },
});
