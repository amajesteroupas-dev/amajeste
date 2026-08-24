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

type Workout = {
  id: string;
  title: string;
  notes?: string | null;
  trainedAt: string;
};

export default function WorkoutsScreen() {
  const customer = useAuth((s) => s.customer);
  const [items, setItems] = useState<Workout[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const data = await api<Workout[]>("/api/academia/workouts");
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
    if (!title.trim()) return;
    try {
      await api("/api/academia/workouts", { body: { title, notes } });
      setTitle("");
      setNotes("");
      await load();
    } catch (e) {
      Alert.alert("Treino", e instanceof Error ? e.message : "Erro");
    }
  }

  async function remove(id: string) {
    await api(`/api/academia/workouts?id=${id}`, { method: "DELETE" });
    await load();
  }

  if (!customer) return null;

  return (
    <View style={styles.root}>
      <TextInput
        style={styles.input}
        placeholder="Título do treino"
        placeholderTextColor={colors.muted}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, { marginTop: 8 }]}
        placeholder="Notas (opcional)"
        placeholderTextColor={colors.muted}
        value={notes}
        onChangeText={setNotes}
      />
      <Pressable style={styles.btn} onPress={add}>
        <Text style={styles.btnText}>Adicionar treino</Text>
      </Pressable>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingTop: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
            <Text style={styles.date}>
              {new Date(item.trainedAt).toLocaleDateString("pt-BR")}
            </Text>
            <Pressable onPress={() => remove(item.id)}>
              <Text style={styles.remove}>Excluir</Text>
            </Pressable>
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
  remove: { color: colors.rose, marginTop: 8, fontSize: 12 },
});
