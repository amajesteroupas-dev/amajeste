import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/store/auth";
import { colors, formatBRL } from "@/src/theme";

type Fav = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string | null;
};

export default function FavoritesScreen() {
  const customer = useAuth((s) => s.customer);
  const [items, setItems] = useState<Fav[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api<{ items: Fav[] }>("/api/favorites");
      setItems(res.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!customer) {
      router.replace("/login");
      return;
    }
    load();
  }, [customer, load]);

  async function remove(productId: string) {
    await api("/api/favorites", {
      method: "DELETE",
      body: { productId },
    });
    setItems((list) => list.filter((i) => i.productId !== productId));
  }

  if (!customer) return null;

  return (
    <View style={styles.root}>
      {loading ? (
        <ActivityIndicator color={colors.rose} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.productId}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum favorito ainda.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Link href={`/produto/${item.slug}`} asChild>
                <Pressable style={{ flexDirection: "row", flex: 1, gap: 12 }}>
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.thumb}
                    />
                  ) : (
                    <View
                      style={[styles.thumb, { backgroundColor: "#e8e0d6" }]}
                    />
                  )}
                  <View>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.price}>{formatBRL(item.price)}</Text>
                  </View>
                </Pressable>
              </Link>
              <Pressable onPress={() => remove(item.productId)}>
                <Text style={styles.remove}>Remover</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginBottom: 10,
  },
  thumb: { width: 56, height: 72 },
  name: { fontWeight: "600", color: colors.ink },
  price: { color: colors.rose, marginTop: 4 },
  remove: { color: colors.rose, fontSize: 12 },
});
