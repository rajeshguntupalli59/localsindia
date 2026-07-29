import { View, Text, Image, StyleSheet } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/icon.png')}
        resizeMode="contain"
        style={styles.logo}
      />

      <Text style={styles.name}>
        <Text style={styles.nameLocals}>Locals</Text>
        <Text style={styles.nameIndia}>India</Text>
      </Text>

      <Text style={styles.tagline}>Buy · Sell · Connect</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 168, height: 168, marginBottom: 16 },
  name: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  nameLocals: { color: '#163D6B' },
  nameIndia: { color: '#F7921E' },
  tagline: { fontSize: 13, fontWeight: '600', letterSpacing: 1, color: '#6B7280', textTransform: 'uppercase', marginTop: 10 },
});
