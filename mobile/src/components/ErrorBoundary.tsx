import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { reportError } from '../lib/errorReporting';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, info.componentStack?.split('\n')[1]?.trim());
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.text}>The app hit an unexpected error. Please try again.</Text>
          <TouchableOpacity style={styles.button} onPress={() => this.setState({ hasError: false })}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: 32 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 10 },
  text: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
