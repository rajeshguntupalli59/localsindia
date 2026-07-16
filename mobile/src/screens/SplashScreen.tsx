import { useEffect, useRef } from 'react';
import { View, Text, Animated, Image, StyleSheet } from 'react-native';

const TAGLINE_WORDS = ['Buy', '·', 'Sell', '·', 'Connect'];

export default function SplashScreen() {
  const logoAnim = useRef(new Animated.Value(0)).current;
  const nameAnim = useRef(new Animated.Value(0)).current;
  const wordAnims = useRef(TAGLINE_WORDS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(nameAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.stagger(
        90,
        wordAnims.map((anim) =>
          Animated.spring(anim, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true })
        )
      ),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../assets/logo-mark-transparent.png')}
        resizeMode="contain"
        style={[
          styles.logo,
          {
            opacity: logoAnim,
            transform: [{ scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          },
        ]}
      />

      <Animated.Text
        style={[
          styles.name,
          {
            opacity: nameAnim,
            transform: [{ translateY: nameAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          },
        ]}
      >
        <Text style={styles.nameLocals}>Locals</Text>
        <Text style={styles.nameIndia}>India</Text>
      </Animated.Text>

      <View style={styles.taglineRow}>
        {TAGLINE_WORDS.map((word, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.taglineWord,
              {
                opacity: wordAnims[i],
                transform: [{ scale: wordAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
              },
            ]}
          >
            {word}
          </Animated.Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 96, height: 96, marginBottom: 16 },
  name: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  nameLocals: { color: '#163D6B' },
  nameIndia: { color: '#F7921E' },
  taglineRow: { flexDirection: 'row', marginTop: 10, gap: 6 },
  taglineWord: { fontSize: 13, fontWeight: '600', letterSpacing: 1, color: '#6B7280', textTransform: 'uppercase' },
});
