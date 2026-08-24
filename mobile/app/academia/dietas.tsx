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

type Diet = {
  id: string;
  title: string;
  content?: string | null;
  createdAt: string;
};

export default function DietsScreen() {
  const customer = useAuth((s) => s.customer);
  const [items, setItems] = useState<Diet[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const load = useCallback(async () => {
    const data = await api<Diet[]>("/api/academia/diets");
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
    if (!title.trim() || !content.trim()) return;
    try {
      await api("/api/academia/diets", { body: { title, content } });
      setTitle("");
      setContent("");
      await load();
    } catch (e) {
      Alert.alert("Dieta", e instanceof Error ? e.message : "Erro");
    }
  }

  if (!customer) return null;

  return (
    <View style={styles.root}>
      <TextInput
        style={styles.input}
        placeholder="Título da dieta / plano"
        placeholderTextColor={colors.muted}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, { marginTop: 8, minHeight: 80 }]}
        placeholder="Conteúdo do plano"
        placeholderTextColor={colors.muted}
        multiline
        value={content}
        onChangeText={setContent}
      />
      <Pressable style={styles.btn} onPress={add}>
        <Text style={styles.btnText}>Salvar</Text>
      </Pressable>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingTop: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            {item.content ? (
              <Text style={styles.notes}>{item.content}</Text>
            ) : null}
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
});
