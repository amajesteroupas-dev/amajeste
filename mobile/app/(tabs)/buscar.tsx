import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "@/src/api/client";
import { ProductCard, ProductCardData } from "@/src/components/ProductCard";
import { colors } from "@/src/theme";

export default function SearchScreen() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api<{ products: ProductCardData[] }>(
        `/api/catalog/products?q=${encodeURIComponent(q.trim())}&limit=40`,
        { auth: false }
      );
      setItems(res.products || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <TextInput
          style={styles.input}
          placeholder="Buscar produtos…"
          placeholderTextColor={colors.muted}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={search}
          returnKeyType="search"
        />
        <Pressable style={styles.btn} onPress={search}>
          <Text style={styles.btnText}>Buscar</Text>
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.rose} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={styles.grid}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            searched ? (
              <Text style={styles.empty}>Nenhum produto encontrado.</Text>
            ) : (
              <Text style={styles.empty}>
                Digite o nome ou categoria e busque.
              </Text>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.cell}>
              <ProductCard product={item} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bg,
    color: colors.ink,
  },
  btn: {
    backgroundColor: colors.rose,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  grid: { gap: 10 },
  cell: { flex: 1, maxWidth: "50%" },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
});
