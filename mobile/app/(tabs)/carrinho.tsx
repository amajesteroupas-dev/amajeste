import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { useCart } from "@/src/store/cart";
import { colors, formatBRL } from "@/src/theme";

export default function CartScreen() {
  const items = useCart((s) => s.items);
  const updateQty = useCart((s) => s.updateQty);
  const removeItem = useCart((s) => s.removeItem);
  const subtotal = useCart((s) => s.subtotal());

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Carrinho vazio</Text>
        <Text style={styles.emptySub}>
          Explore a coleção e adicione seus looks.
        </Text>
        <Link href="/(tabs)" asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>Ver produtos</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {items.map((item) => (
          <View key={item.variantId} style={styles.row}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, { backgroundColor: "#e8e0d6" }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.productName}</Text>
              <Text style={styles.meta}>
                {item.size} / {item.color}
              </Text>
              <Text style={styles.price}>{formatBRL(item.price)}</Text>
              <View style={styles.qtyRow}>
                <Pressable
                  onPress={() => updateQty(item.variantId, item.quantity - 1)}
                  style={styles.qtyBtn}
                >
                  <Text>-</Text>
                </Pressable>
                <Text style={styles.qty}>{item.quantity}</Text>
                <Pressable
                  onPress={() => updateQty(item.variantId, item.quantity + 1)}
                  style={styles.qtyBtn}
                >
                  <Text>+</Text>
                </Pressable>
                <Pressable onPress={() => removeItem(item.variantId)}>
                  <Text style={styles.remove}>Remover</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.subtotal}>Subtotal {formatBRL(subtotal)}</Text>
        <Pressable
          style={styles.btn}
          onPress={() => router.push("/checkout")}
        >
          <Text style={styles.btnText}>Finalizar compra</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.bg,
  },
  emptyTitle: { fontSize: 20, color: colors.ink, fontWeight: "600" },
  emptySub: { color: colors.muted, marginTop: 8, marginBottom: 20 },
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginBottom: 10,
  },
  thumb: { width: 72, height: 96 },
  name: { fontSize: 14, color: colors.ink, fontWeight: "600" },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  price: { fontSize: 14, color: colors.rose, marginTop: 6, fontWeight: "600" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: { minWidth: 20, textAlign: "center" },
  remove: { color: colors.rose, fontSize: 12 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    gap: 10,
  },
  subtotal: { fontSize: 16, fontWeight: "600", color: colors.ink },
  btn: {
    backgroundColor: colors.rose,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", letterSpacing: 0.5 },
});
