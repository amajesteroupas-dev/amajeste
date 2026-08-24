import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/store/auth";
import { colors, formatBRL } from "@/src/theme";

type OrderDetail = {
  orderNumber: string;
  status: string;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  total: number;
  shippingCost: number;
  shippingMethod?: string | null;
  trackingCode?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  pixCopyPaste?: string | null;
  items: {
    productName: string;
    size: string;
    color: string;
    quantity: number;
    total: number;
  }[];
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customer = useAuth((s) => s.customer);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const res = await api<{ order: OrderDetail }>(
          `/api/account/orders/${id}`
        );
        setOrder(res.order);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, customer]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.rose} />
      </View>
    );
  }
  if (!order) {
    return (
      <View style={styles.center}>
        <Text>Pedido não encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Pedido #{order.orderNumber}</Text>
      <Text style={styles.meta}>
        Status: {order.status}
        {order.paymentStatus ? ` · Pagamento ${order.paymentStatus}` : ""}
      </Text>
      <Text style={styles.meta}>
        Frete: {order.shippingMethod || "—"} ({formatBRL(order.shippingCost)})
      </Text>
      {order.trackingCode ? (
        <Text style={styles.meta}>Rastreio: {order.trackingCode}</Text>
      ) : null}
      <Text style={styles.total}>Total {formatBRL(order.total)}</Text>

      <Text style={styles.section}>Itens</Text>
      {order.items.map((i, idx) => (
        <View key={idx} style={styles.item}>
          <Text style={styles.itemName}>
            {i.productName} ({i.size}/{i.color}) ×{i.quantity}
          </Text>
          <Text style={styles.itemPrice}>{formatBRL(i.total)}</Text>
        </View>
      ))}

      {order.pixCopyPaste ? (
        <Text style={styles.pix} selectable>
          Pix: {order.pixCopyPaste}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "600", color: colors.ink },
  meta: { color: colors.muted, marginTop: 6 },
  total: { marginTop: 12, fontSize: 18, fontWeight: "700", color: colors.rose },
  section: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
    fontWeight: "700",
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 10,
  },
  itemName: { color: colors.ink },
  itemPrice: { color: colors.muted, marginTop: 2 },
  pix: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    fontSize: 12,
  },
});
