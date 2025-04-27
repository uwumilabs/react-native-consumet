import { StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import Zoro from './Zoro';
import Meta from './Meta';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      {/* <Zoro /> */}
      {/* <Movies /> */}
      <Meta />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#2c3e50',
  },
  resultContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3498db',
  },
});
