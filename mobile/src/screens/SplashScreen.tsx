import { useEffect, useRef } from 'react';
import { View, Text, Animated, Image, StyleSheet } from 'react-native';

const NAME_LETTERS = 'LocalsIndia'.split('');
const TAGLINE_WORDS = ['Buy', '·', 'Sell', '·', 'Connect'];

export default function SplashScreen() {
  const logoAnim = useRef(new Animated.Value(0)).current;
  const letterAnims = useRef(NAME_LETTERS.map(() => new Animated.Value(0))).current;
  const wordAnims = useRef(TAGLINE_WORDS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.stagger(
        45,
        letterAnims.map((anim) =>
          Animated.spring(anim, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true })
        )
      ),
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
        source={require('../../assets/icon.png')}
        resizeMode="contain"
        style={[
          styles.logo,
          {
            opacity: logoAnim,
            transform: [{ scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          },
        ]}
      />

      <View style={styles.nameRow}>
        {NAME_LETTERS.map((letter, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.nameLetter,
              { color: i < 6 ? '#163D6B' : '#F7921E' },
              {
                opacity: letterAnims[i],
                transform: [
                  { translateY: letterAnims[i].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                  { scale: letterAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                ],
              },
            ]}
          >
            {letter}
          </Animated.Text>
        ))}
      </View>

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
  logo: { width: 168, height: 168, marginBottom: 16 },
  nameRow: { flexDirection: 'row' },
  nameLetter: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  taglineRow: { flexDirection: 'row', marginTop: 10, gap: 6 },
  taglineWord: { fontSize: 13, fontWeight: '600', letterSpacing: 1, color: '#6B7280', textTransform: 'uppercase' },
});
