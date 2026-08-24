import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "@/src/api/client";
import { colors } from "@/src/theme";

export default function TrackingScreen() {
  const [pedido, setPedido] = useState("");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function track() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const qs = new URLSearchParams();
      if (pedido.trim()) qs.set("pedido", pedido.trim());
      if (codigo.trim()) qs.set("codigo", codigo.trim());
      const res = await api<Record<string, unknown>>(
        `/api/tracking?${qs.toString()}`,
        { auth: false }
      );
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no rastreio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.label}>Número do pedido</Text>
      <TextInput
        style={styles.input}
        value={pedido}
        onChangeText={setPedido}
        placeholder="Ex.: 1646"
        placeholderTextColor={colors.muted}
      />
      <Text style={styles.label}>Código de rastreio</Text>
      <TextInput
        style={styles.input}
        value={codigo}
        onChangeText={setCodigo}
        placeholder="Opcional"
        placeholderTextColor={colors.muted}
      />
      <Pressable style={styles.btn} onPress={track} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Rastrear</Text>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result ? (
        <View style={styles.box}>
          <Text style={styles.boxText}>
            {String(result.message || JSON.stringify(result, null, 2))}
          </Text>
          {result.trackingCode || result.orderNumber ? (
            <Text style={styles.boxText}>
              Pedido: {String(result.orderNumber || "—")} · Status:{" "}
              {String(result.orderStatus || "—")}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  label: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
  },
  btn: {
    marginTop: 20,
    backgroundColor: colors.rose,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  error: { color: colors.rose, marginTop: 12 },
  box: {
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  boxText: { color: colors.ink, fontSize: 13, lineHeight: 18 },
});
