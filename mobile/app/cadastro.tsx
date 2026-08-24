import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/store/auth";
import { api } from "@/src/api/client";
import { colors } from "@/src/theme";

export default function RegisterScreen() {
  const register = useAuth((s) => s.register);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    cpf: "",
    zipCode: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    complement: "",
  });
  const [busy, setBusy] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function lookupCep() {
    const cep = form.zipCode.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const data = await api<{
        street?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
      }>(`/api/cep/${cep}`, { auth: false });
      setForm((f) => ({
        ...f,
        street: data.street || f.street,
        neighborhood: data.neighborhood || f.neighborhood,
        city: data.city || f.city,
        state: data.state || f.state,
      }));
    } catch {
      /* ignore */
    }
  }

  async function onSubmit() {
    setBusy(true);
    try {
      await register(form);
      router.replace("/(tabs)/conta");
    } catch (e) {
      Alert.alert(
        "Cadastro",
        e instanceof Error ? e.message : "Não foi possível cadastrar"
      );
    } finally {
      setBusy(false);
    }
  }

  const fields: { key: keyof typeof form; label: string; secure?: boolean }[] = [
    { key: "name", label: "Nome" },
    { key: "email", label: "E-mail" },
    { key: "password", label: "Senha", secure: true },
    { key: "phone", label: "Telefone" },
    { key: "cpf", label: "CPF" },
    { key: "zipCode", label: "CEP" },
    { key: "street", label: "Rua" },
    { key: "number", label: "Número" },
    { key: "complement", label: "Complemento" },
    { key: "neighborhood", label: "Bairro" },
    { key: "city", label: "Cidade" },
    { key: "state", label: "UF" },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {fields.map((f) => (
        <View key={f.key}>
          <Text style={styles.label}>{f.label}</Text>
          <TextInput
            style={styles.input}
            secureTextEntry={f.secure}
            autoCapitalize={f.key === "email" ? "none" : "sentences"}
            value={form[f.key]}
            onChangeText={(v) => set(f.key, v)}
            onBlur={f.key === "zipCode" ? lookupCep : undefined}
          />
        </View>
      ))}
      <Pressable style={styles.btn} onPress={onSubmit} disabled={busy}>
        <Text style={styles.btnText}>
          {busy ? "Criando…" : "Criar conta"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
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
});
