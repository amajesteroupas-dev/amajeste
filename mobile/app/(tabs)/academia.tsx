import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/src/store/auth";
import { colors } from "@/src/theme";

const LINKS = [
  {
    href: "/academia/treinos",
    title: "Treinos",
    desc: "Registre e acompanhe seus treinos",
  },
  {
    href: "/academia/dietas",
    title: "Dietas",
    desc: "Planos alimentares e anotações",
  },
  {
    href: "/academia/progresso",
    title: "Progresso",
    desc: "Peso e medidas ao longo do tempo",
  },
  {
    href: "/academia/looks",
    title: "Looks",
    desc: "Galeria de looks Majesté",
  },
] as const;

export default function AcademiaHub() {
  const customer = useAuth((s) => s.customer);

  if (!customer) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Academia Majesté</Text>
        <Text style={styles.sub}>
          Faça login para acessar treinos, dietas, progresso e looks.
        </Text>
        <Pressable style={styles.btn} onPress={() => router.push("/login")}>
          <Text style={styles.btnText}>Entrar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Academia</Text>
      <Text style={styles.sub}>Olá, {customer.name.split(" ")[0]}</Text>
      {LINKS.map((l) => (
        <Pressable
          key={l.href}
          style={styles.card}
          onPress={() => router.push(l.href)}
        >
          <Text style={styles.cardTitle}>{l.title}</Text>
          <Text style={styles.cardDesc}>{l.desc}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  title: { fontSize: 28, color: colors.ink, fontWeight: "600" },
  sub: { color: colors.muted, marginTop: 6, marginBottom: 20 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  cardDesc: { fontSize: 13, color: colors.muted, marginTop: 4 },
  btn: {
    backgroundColor: colors.rose,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
