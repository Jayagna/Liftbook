import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

/** A still, faint lime wash behind a screen's header. It gives the page a top without moving or glowing. */
export function Aurora() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(200,255,80,0.075)', 'rgba(200,255,80,0.02)', 'rgba(200,255,80,0)']}
      locations={[0, 0.45, 1]}
      style={styles.layer}
    />
  );
}

const styles = StyleSheet.create({ layer: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 } });
