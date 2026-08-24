import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/store/auth";
import { colors } from "@/src/theme";

export default function LoginScreen() {
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)/conta");
    } catch (e) {
      Alert.alert("Login", e instanceof Error ? e.message : "Falha no login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.label}>E-mail</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Text style={styles.label}>Senha</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable
        style={styles.btn}
        onPress={onSubmit}
        disabled={busy}
      >
        <Text style={styles.btnText}>{busy ? "Entrando…" : "Entrar"}</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/cadastro")}>
        <Text style={styles.link}>Criar conta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  label: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
  },
  btn: {
    marginTop: 24,
    backgroundColor: colors.rose,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  link: {
    marginTop: 16,
    textAlign: "center",
    color: colors.rose,
    fontWeight: "600",
  },
});
