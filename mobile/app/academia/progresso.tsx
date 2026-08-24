import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/store/auth";
import { colors } from "@/src/theme";

type Progress = {
  id: string;
  weightKg?: number | null;
  notes?: string | null;
  recordedAt: string;
};

export default function ProgressScreen() {
  const customer = useAuth((s) => s.customer);
  const [items, setItems] = useState<Progress[]>([]);
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const data = await api<Progress[]>("/api/academia/progress");
    setItems(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    if (!customer) {
      router.replace("/login");
      return;
    }
    load().catch(() => setItems([]));
  }, [customer, load]);

  async function add() {
    try {
      await api("/api/academia/progress", {
        method: "POST",
        body: {
          weightKg: weightKg ? Number(weightKg) : null,
          notes,
        },
      });
      // progress API may use FormData on web — also try JSON; if fails show error
      setWeightKg("");
      setNotes("");
      await load();
    } catch (e) {
      Alert.alert("Progresso", e instanceof Error ? e.message : "Erro");
    }
  }

  if (!customer) return null;

  return (
    <View style={styles.root}>
      <TextInput
        style={styles.input}
        placeholder="Peso (kg)"
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
        value={weightKg}
        onChangeText={setWeightKg}
      />
      <TextInput
        style={[styles.input, { marginTop: 8 }]}
        placeholder="Observações"
        placeholderTextColor={colors.muted}
        value={notes}
        onChangeText={setNotes}
      />
      <Pressable style={styles.btn} onPress={add}>
        <Text style={styles.btnText}>Registrar</Text>
      </Pressable>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingTop: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>
              {item.weightKg != null ? `${item.weightKg} kg` : "Registro"}
            </Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
            <Text style={styles.date}>
              {new Date(item.recordedAt).toLocaleDateString("pt-BR")}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 12,
    color: colors.ink,
  },
  btn: {
    marginTop: 10,
    backgroundColor: colors.rose,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 12,
    marginBottom: 8,
  },
  title: { fontWeight: "600", color: colors.ink },
  notes: { color: colors.muted, marginTop: 4 },
  date: { fontSize: 11, color: colors.muted, marginTop: 6 },
});
