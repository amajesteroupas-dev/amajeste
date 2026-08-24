import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { api, getApiBase } from "@/src/api/client";
import { useAuth } from "@/src/store/auth";
import { colors } from "@/src/theme";

type Look = {
  id: string;
  imageUrl: string;
  caption?: string | null;
  productName?: string | null;
  status?: string;
};

function abs(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${getApiBase()}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default function LooksScreen() {
  const customer = useAuth((s) => s.customer);
  const [items, setItems] = useState<Look[]>([]);

  const load = useCallback(async () => {
    const data = await api<Look[] | { looks: Look[] }>("/api/academia/looks");
    const list = Array.isArray(data) ? data : data.looks || [];
    setItems(list);
  }, []);

  useEffect(() => {
    if (!customer) {
      router.replace("/login");
      return;
    }
    load().catch(() => setItems([]));
  }, [customer, load]);

  if (!customer) return null;

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 8 }}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nenhum look ainda. Envie pelo site Academia.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: abs(item.imageUrl) }} style={styles.img} />
            {item.caption || item.productName ? (
              <Text style={styles.cap} numberOfLines={2}>
                {item.productName || item.caption}
              </Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  img: { width: "100%", aspectRatio: 3 / 4, backgroundColor: "#eee" },
  cap: { padding: 8, fontSize: 12, color: colors.ink },
});
