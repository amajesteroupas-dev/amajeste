import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { api } from "@/src/api/client";
import { useCart } from "@/src/store/cart";
import { useAuth } from "@/src/store/auth";
import { colors, formatBRL } from "@/src/theme";

type Variant = {
  id: string;
  size: string;
  color: string;
  stock: number;
  price: number;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  images: { url: string }[];
  variants: Variant[];
  reviews?: { rating: number; comment: string; customerName: string }[];
};

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [msg, setMsg] = useState("");
  const addItem = useCart((s) => s.addItem);
  const token = useAuth((s) => s.token);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ product: Product }>(
          `/api/catalog/products/${slug}`,
          { auth: false }
        );
        setProduct(res.product);
        const v = res.product.variants.find((x) => x.stock > 0);
        if (v) {
          setSize(v.size);
          setColor(v.color);
        }
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const sizes = useMemo(() => {
    if (!product) return [];
    return [...new Set(product.variants.map((v) => v.size))];
  }, [product]);

  const colorsAvail = useMemo(() => {
    if (!product) return [];
    return [
      ...new Set(
        product.variants
          .filter((v) => v.size === size)
          .map((v) => v.color)
      ),
    ];
  }, [product, size]);

  const selected = product?.variants.find(
    (v) => v.size === size && v.color === color
  );

  async function toggleFavorite() {
    if (!token) {
      router.push("/login");
      return;
    }
    if (!product) return;
    try {
      await api("/api/favorites", { body: { productId: product.id } });
      setMsg("Salvo nos favoritos");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao favoritar");
    }
  }

  function addToCart() {
    if (!product || !selected || selected.stock < 1) {
      setMsg("Selecione tamanho e cor disponíveis");
      return;
    }
    addItem({
      variantId: selected.id,
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      size: selected.size,
      color: selected.color,
      price: selected.price || product.price,
      imageUrl: product.imageUrl || product.images[0]?.url || "",
      maxStock: selected.stock,
    });
    setMsg("Adicionado ao carrinho");
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.rose} />
      </View>
    );
  }
  if (!product) {
    return (
      <View style={styles.center}>
        <Text>Produto não encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      {product.imageUrl || product.images[0]?.url ? (
        <Image
          source={{ uri: product.imageUrl || product.images[0].url }}
          style={styles.image}
        />
      ) : null}
      <View style={styles.body}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>
          {formatBRL(selected?.price || product.price)}
        </Text>
        <Text style={styles.desc}>{product.description}</Text>

        <Text style={styles.label}>Tamanho</Text>
        <View style={styles.chips}>
          {sizes.map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                setSize(s);
                const first = product.variants.find(
                  (v) => v.size === s && v.stock > 0
                );
                if (first) setColor(first.color);
              }}
              style={[styles.chip, size === s && styles.chipOn]}
            >
              <Text style={size === s ? styles.chipOnText : undefined}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Cor</Text>
        <View style={styles.chips}>
          {colorsAvail.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.chip, color === c && styles.chipOn]}
            >
              <Text style={color === c ? styles.chipOnText : undefined}>{c}</Text>
            </Pressable>
          ))}
        </View>

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}

        <Pressable style={styles.btn} onPress={addToCart}>
          <Text style={styles.btnText}>Adicionar ao carrinho</Text>
        </Pressable>
        <Pressable style={styles.btnOutline} onPress={toggleFavorite}>
          <Text style={styles.btnOutlineText}>Favoritar</Text>
        </Pressable>

        {(product.reviews || []).length > 0 ? (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.label}>Avaliações</Text>
            {product.reviews!.slice(0, 5).map((r, i) => (
              <View key={i} style={styles.review}>
                <Text style={styles.reviewName}>
                  {r.customerName} · {r.rating}/5
                </Text>
                <Text style={styles.reviewBody}>{r.comment}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", aspectRatio: 3 / 4, backgroundColor: "#eee" },
  body: { padding: 16 },
  name: { fontSize: 22, fontWeight: "600", color: colors.ink },
  price: { fontSize: 18, color: colors.rose, fontWeight: "700", marginTop: 6 },
  desc: { marginTop: 12, color: colors.muted, lineHeight: 20, fontSize: 14 },
  label: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
    fontWeight: "700",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.rose, borderColor: colors.rose },
  chipOnText: { color: "#fff", fontWeight: "600" },
  btn: {
    marginTop: 20,
    backgroundColor: colors.rose,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  btnOutline: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  btnOutlineText: { color: colors.ink, fontWeight: "600" },
  msg: { marginTop: 12, color: colors.success },
  review: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: 10,
  },
  reviewName: { fontSize: 12, fontWeight: "600", color: colors.ink },
  reviewBody: { fontSize: 13, color: colors.muted, marginTop: 4 },
});
