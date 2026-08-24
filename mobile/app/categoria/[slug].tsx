import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { api } from "@/src/api/client";
import { ProductCard, ProductCardData } from "@/src/components/ProductCard";
import { colors } from "@/src/theme";

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ products: ProductCardData[] }>(
          `/api/catalog/products?category=${encodeURIComponent(String(slug))}&limit=48`,
          { auth: false }
        );
        setItems(res.products || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: String(slug) }} />
      {loading ? (
        <ActivityIndicator color={colors.rose} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: colors.muted }}>
              Nenhum produto nesta categoria.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
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
});
