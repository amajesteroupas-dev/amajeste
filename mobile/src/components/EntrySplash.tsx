import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

const PHRASES = [
  "Vista sua força",
  "Cada treino, sua coroa",
  "Fitness com presença",
  "Movimento que eleva",
  "Sua melhor versão começa aqui",
  "Força, elegância e constância",
];

type Props = {
  onDone: () => void;
};

/** Tela de entrada do app nativo (logo + frase). */
export function EntrySplash({ onDone }: Props) {
  const [leaving, setLeaving] = useState(false);
  const phrase = useMemo(
    () => PHRASES[Math.floor(Math.random() * PHRASES.length)],
    []
  );

  useEffect(() => {
    const leaveAt = setTimeout(() => setLeaving(true), 2200);
    const hideAt = setTimeout(onDone, 2900);
    return () => {
      clearTimeout(leaveAt);
      clearTimeout(hideAt);
    };
  }, [onDone]);

  return (
    <View style={[styles.root, leaving && styles.leaving]}>
      <View style={styles.glow} />
      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Majesté Fitness"
      />
      <Text style={styles.phrase}>{phrase}</Text>
      <View style={styles.rule} />
      <Text style={styles.brand}>MAJESTÉ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#1a1612",
    opacity: 1,
  },
  leaving: {
    opacity: 0,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    opacity: 0.15,
    // Approximate radial glow with layered solid tints (RN has no CSS radial)
    shadowColor: "#c9a24a",
  },
  logo: {
    width: 220,
    height: 220,
    marginBottom: 28,
  },
  phrase: {
    color: "#e8d090",
    fontSize: 22,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.6,
    lineHeight: 30,
    maxWidth: 280,
    fontFamily: "Georgia",
  },
  rule: {
    width: 64,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#c9a24a",
    marginTop: 28,
    marginBottom: 16,
    opacity: 0.7,
  },
  brand: {
    color: "rgba(168, 132, 47, 0.85)",
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: "600",
  },
});
