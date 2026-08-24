import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { api } from "@/src/api/client";
import { useCart } from "@/src/store/cart";
import { useAuth } from "@/src/store/auth";
import { colors, formatBRL } from "@/src/theme";

type Quote = {
  id: string;
  name: string;
  company: string;
  price: number;
  deliveryDays: number;
};

type PayMethod = { id: string; label: string };

export default function CheckoutScreen() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const shippingZip = useCart((s) => s.shippingZip);
  const setShippingZip = useCart((s) => s.setShippingZip);
  const subtotal = useCart((s) => s.subtotal());
  const customer = useAuth((s) => s.customer);

  const [form, setForm] = useState({
    guestName: customer?.name || "",
    guestEmail: customer?.email || "",
    guestPhone: customer?.phone || "",
    cpf: "",
    shippingZip: shippingZip || "",
    shippingStreet: "",
    shippingNumber: "",
    shippingComplement: "",
    shippingNeighborhood: "",
    shippingCity: "",
    shippingState: "",
    couponCode: "",
  });
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedShip, setSelectedShip] = useState<Quote | null>(null);
  const [methods, setMethods] = useState<PayMethod[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [busy, setBusy] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    api<{ methods: PayMethod[] }>("/api/payments/methods", { auth: false })
      .then((r) => {
        const list = r.methods || [];
        setMethods(list);
        if (list[0]) setPaymentMethod(list[0].id);
      })
      .catch(() => setMethods([{ id: "pix", label: "Pix" }]));
  }, []);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "shippingZip") setShippingZip(value);
  }

  async function lookupCep() {
    const cep = form.shippingZip.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const data = await api<{
        street?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
      }>(`/api/cep/${cep}`, { auth: false });
      setForm((f) => ({
        ...f,
        shippingStreet: data.street || f.shippingStreet,
        shippingNeighborhood: data.neighborhood || f.shippingNeighborhood,
        shippingCity: data.city || f.shippingCity,
        shippingState: data.state || f.shippingState,
      }));
      await quoteShipping(cep);
    } catch {
      /* ignore */
    }
  }

  async function quoteShipping(cep?: string) {
    const toZip = (cep || form.shippingZip).replace(/\D/g, "");
    if (toZip.length !== 8 || items.length === 0) return;
    try {
      const res = await api<{ quotes?: Quote[]; options?: Quote[] }>(
        "/api/shipping/quote",
        {
          body: {
            toZip,
            items: items.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
            })),
          },
        }
      );
      const list = res.quotes || res.options || [];
      setQuotes(list);
      setSelectedShip(list[0] || null);
    } catch (e) {
      Alert.alert(
        "Frete",
        e instanceof Error ? e.message : "Não foi possível cotar"
      );
    }
  }

  async function placeOrder() {
    if (items.length === 0) {
      Alert.alert("Carrinho vazio");
      return;
    }
    if (!selectedShip) {
      Alert.alert("Selecione o frete");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{
        orderNumber?: string;
        order?: { orderNumber: string; id: string };
        pixCopyPaste?: string;
        payment?: { pixCopyPaste?: string; pixQrCode?: string };
      }>("/api/orders", {
        body: {
          ...form,
          shippingZip: form.shippingZip.replace(/\D/g, ""),
          shippingMethod: `${selectedShip.company} · ${selectedShip.name}`,
          shippingServiceId: selectedShip.id,
          shippingCost: selectedShip.price,
          paymentMethod,
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        },
      });
      const num = res.orderNumber || res.order?.orderNumber;
      setOrderNumber(num || null);
      const pix =
        res.pixCopyPaste ||
        res.payment?.pixCopyPaste ||
        res.payment?.pixQrCode ||
        null;
      setPixCode(pix);
      clear();
      if (num && !pix) {
        router.replace(`/pedido/${num}`);
      }
    } catch (e) {
      Alert.alert(
        "Checkout",
        e instanceof Error ? e.message : "Falha ao criar pedido"
      );
    } finally {
      setBusy(false);
    }
  }

  if (orderNumber && pixCode) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Pedido {orderNumber}</Text>
        <Text style={styles.sub}>Pague com Pix copiando o código abaixo.</Text>
        <Text style={styles.pix} selectable>
          {pixCode}
        </Text>
        <Pressable
          style={styles.btn}
          onPress={async () => {
            await Clipboard.setStringAsync(pixCode);
            Alert.alert("Copiado");
          }}
        >
          <Text style={styles.btnText}>Copiar código Pix</Text>
        </Pressable>
        <Pressable
          style={styles.btnOutline}
          onPress={() => router.replace(`/pedido/${orderNumber}`)}
        >
          <Text style={styles.btnOutlineText}>Ver pedido</Text>
        </Pressable>
      </View>
    );
  }

  if (items.length === 0 && !orderNumber) {
    return (
      <View style={[styles.root, { justifyContent: "center" }]}>
        <Text style={styles.sub}>Carrinho vazio.</Text>
        <Pressable style={styles.btn} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.btnText}>Voltar à loja</Text>
        </Pressable>
      </View>
    );
  }

  const ship = selectedShip?.price || 0;
  const total = subtotal + ship;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>Checkout</Text>
      <Text style={styles.sub}>
        Subtotal {formatBRL(subtotal)}
        {selectedShip
          ? ` · Frete ${formatBRL(ship)} · Total ${formatBRL(total)}`
          : ""}
      </Text>

      {(
        [
          ["guestName", "Nome"],
          ["guestEmail", "E-mail"],
          ["guestPhone", "Telefone"],
          ["cpf", "CPF"],
          ["shippingZip", "CEP"],
          ["shippingStreet", "Rua"],
          ["shippingNumber", "Número"],
          ["shippingComplement", "Complemento"],
          ["shippingNeighborhood", "Bairro"],
          ["shippingCity", "Cidade"],
          ["shippingState", "UF"],
          ["couponCode", "Cupom"],
        ] as const
      ).map(([key, label]) => (
        <View key={key}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            value={form[key]}
            onChangeText={(v) => set(key, v)}
            onBlur={key === "shippingZip" ? lookupCep : undefined}
            autoCapitalize={key === "guestEmail" ? "none" : "sentences"}
          />
        </View>
      ))}

      <Pressable style={styles.btnOutline} onPress={() => quoteShipping()}>
        <Text style={styles.btnOutlineText}>Calcular frete</Text>
      </Pressable>

      {quotes.map((q) => (
        <Pressable
          key={q.id}
          style={[styles.ship, selectedShip?.id === q.id && styles.shipOn]}
          onPress={() => setSelectedShip(q)}
        >
          <Text style={styles.shipTitle}>
            {q.company} · {q.name}
          </Text>
          <Text style={styles.shipMeta}>
            {formatBRL(q.price)} · {q.deliveryDays}d
          </Text>
        </Pressable>
      ))}

      <Text style={styles.label}>Pagamento</Text>
      {methods.map((m) => (
        <Pressable
          key={m.id}
          style={[styles.ship, paymentMethod === m.id && styles.shipOn]}
          onPress={() => setPaymentMethod(m.id)}
        >
          <Text style={styles.shipTitle}>{m.label || m.id}</Text>
        </Pressable>
      ))}
      {paymentMethod === "card" || paymentMethod === "credit_card" ? (
        <Text style={styles.note}>
          Cartão no app: use Pix por enquanto ou finalize no site com Mercado
          Pago. Integração nativa do cartão entra na próxima build EAS.
        </Text>
      ) : null}

      <Pressable style={styles.btn} onPress={placeOrder} disabled={busy}>
        <Text style={styles.btnText}>
          {busy ? "Processando…" : "Confirmar pedido"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  title: { fontSize: 22, fontWeight: "600", color: colors.ink },
  sub: { color: colors.muted, marginTop: 6, marginBottom: 12 },
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
    paddingVertical: 10,
    color: colors.ink,
  },
  btn: {
    marginTop: 20,
    backgroundColor: colors.rose,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  btnOutline: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  btnOutlineText: { color: colors.ink, fontWeight: "600" },
  ship: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    backgroundColor: colors.surface,
  },
  shipOn: { borderColor: colors.rose, backgroundColor: colors.roseSoft },
  shipTitle: { fontWeight: "600", color: colors.ink },
  shipMeta: { color: colors.muted, marginTop: 2, fontSize: 13 },
  pix: {
    marginVertical: 16,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    fontSize: 12,
    color: colors.ink,
  },
  note: { marginTop: 8, fontSize: 12, color: colors.muted },
});
