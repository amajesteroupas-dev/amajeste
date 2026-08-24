import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/store/auth";
import { colors, formatBRL } from "@/src/theme";

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  paymentStatus?: string | null;
};

export default function OrdersScreen() {
  const customer = useAuth((s) => s.customer);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!customer) return;
    setLoading(true);
    try {
      const res = await api<{ orders: OrderRow[] }>("/api/account/orders");
      setOrders(res.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    if (!customer) {
      router.replace("/login");
      return;
    }
    load();
  }, [customer, load]);

  if (!customer) return null;

  return (
    <View style={styles.root}>
      {loading ? (
        <ActivityIndicator color={colors.rose} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum pedido ainda.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/pedido/${item.orderNumber}`)}
            >
              <Text style={styles.num}>#{item.orderNumber}</Text>
              <Text style={styles.meta}>
                {item.status}
                {item.paymentStatus ? ` · ${item.paymentStatus}` : ""}
              </Text>
              <Text style={styles.total}>{formatBRL(item.total)}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  num: { fontWeight: "700", color: colors.ink },
  meta: { color: colors.muted, marginTop: 4, fontSize: 12 },
  total: { color: colors.rose, fontWeight: "600", marginTop: 8 },
});
