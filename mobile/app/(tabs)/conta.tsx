import { Link, router } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/src/store/auth";
import { colors } from "@/src/theme";

const PRIVACY = "https://amajeste.com.br/privacidade";
const TERMS = "https://amajeste.com.br/termos";
const SUPPORT = "https://amajeste.com.br/contato";

export default function AccountScreen() {
  const customer = useAuth((s) => s.customer);
  const logout = useAuth((s) => s.logout);

  if (!customer) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Sua conta</Text>
        <Text style={styles.sub}>
          Entre para ver pedidos, favoritos e a Academia Majesté.
        </Text>
        <Pressable style={styles.btn} onPress={() => router.push("/login")}>
          <Text style={styles.btnText}>Entrar</Text>
        </Pressable>
        <Pressable
          style={styles.btnOutline}
          onPress={() => router.push("/cadastro")}
        >
          <Text style={styles.btnOutlineText}>Criar conta</Text>
        </Pressable>
        <LegalLinks />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{customer.name}</Text>
      <Text style={styles.sub}>{customer.email}</Text>

      <Link href="/pedidos" asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowText}>Meus pedidos</Text>
        </Pressable>
      </Link>
      <Link href="/favoritos" asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowText}>Favoritos</Text>
        </Pressable>
      </Link>
      <Link href="/rastreio" asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowText}>Rastrear pedido</Text>
        </Pressable>
      </Link>
      <Link href="/(tabs)/academia" asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowText}>Academia</Text>
        </Pressable>
      </Link>

      <Pressable
        style={[styles.btnOutline, { marginTop: 24 }]}
        onPress={() => logout()}
      >
        <Text style={styles.btnOutlineText}>Sair</Text>
      </Pressable>
      <LegalLinks />
    </View>
  );
}

function LegalLinks() {
  return (
    <View style={styles.legal}>
      <Pressable onPress={() => Linking.openURL(PRIVACY)}>
        <Text style={styles.legalText}>Privacidade</Text>
      </Pressable>
      <Text style={styles.legalDot}>·</Text>
      <Pressable onPress={() => Linking.openURL(TERMS)}>
        <Text style={styles.legalText}>Termos</Text>
      </Pressable>
      <Text style={styles.legalDot}>·</Text>
      <Pressable onPress={() => Linking.openURL(SUPPORT)}>
        <Text style={styles.legalText}>Contato</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  title: { fontSize: 24, color: colors.ink, fontWeight: "600" },
  sub: { color: colors.muted, marginTop: 6, marginBottom: 24 },
  btn: {
    backgroundColor: colors.rose,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  btnOutline: {
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  btnOutlineText: { color: colors.ink, fontWeight: "600" },
  row: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 8,
  },
  rowText: { color: colors.ink, fontSize: 15 },
  legal: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
    gap: 8,
  },
  legalText: { color: colors.muted, fontSize: 12, textDecorationLine: "underline" },
  legalDot: { color: colors.muted, fontSize: 12 },
});
