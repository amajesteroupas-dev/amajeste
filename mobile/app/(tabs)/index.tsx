import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { api } from "@/src/api/client";
import { ProductCard, ProductCardData } from "@/src/components/ProductCard";
import { colors } from "@/src/theme";

type HomeData = {
  banners: {
    id: string;
    title: string;
    subtitle?: string | null;
    imageUrl?: string | null;
    ctaHref?: string | null;
  }[];
  featured: ProductCardData[];
  destaques: ProductCardData[];
  categories: {
    id: string;
    name: string;
    slug: string;
    children?: { id: string; name: string; slug: string }[];
  }[];
};

export default function HomeScreen() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<HomeData>("/api/catalog/home", { auth: false });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.rose} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={load} style={styles.btn}>
          <Text style={styles.btnText}>Tentar de novo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.brand}>Majesté</Text>
        <Text style={styles.tag}>Fitness com presença</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bannerRow}
      >
        {(data?.banners || []).map((b) => (
          <View key={b.id} style={styles.banner}>
            {b.imageUrl ? (
              <Image source={{ uri: b.imageUrl }} style={styles.bannerImg} />
            ) : null}
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>{b.title}</Text>
              {b.subtitle ? (
                <Text style={styles.bannerSub}>{b.subtitle}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>

      <Text style={styles.section}>Categorias</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {(data?.categories || []).map((c) => (
          <Link key={c.id} href={`/categoria/${c.slug}`} asChild>
            <Pressable style={styles.catChip}>
              <Text style={styles.catText}>{c.name}</Text>
            </Pressable>
          </Link>
        ))}
      </ScrollView>

      <Text style={styles.section}>Coleção Majesté</Text>
      <FlatList
        data={data?.featured || []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        scrollEnabled={false}
        columnWrapperStyle={styles.grid}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ProductCard product={item} />
          </View>
        )}
      />

      <Text style={styles.section}>Destaques</Text>
      <FlatList
        data={data?.destaques || []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        scrollEnabled={false}
        columnWrapperStyle={styles.grid}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ProductCard product={item} />
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.bg,
  },
  hero: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  brand: {
    fontSize: 36,
    color: colors.ink,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  tag: {
    marginTop: 4,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.gold,
  },
  bannerRow: { paddingHorizontal: 16, gap: 12 },
  banner: {
    width: 280,
    height: 160,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  bannerImg: { ...StyleSheet.absoluteFill, opacity: 0.9 },
  bannerText: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
    backgroundColor: "rgba(42,36,32,0.25)",
  },
  bannerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  bannerSub: { color: "#fff", fontSize: 12, marginTop: 2 },
  section: {
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 16,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.muted,
    fontWeight: "700",
  },
  catRow: { paddingHorizontal: 16, gap: 8 },
  catChip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  catText: { fontSize: 13, color: colors.ink },
  grid: { gap: 10, paddingHorizontal: 16 },
  cell: { flex: 1, maxWidth: "50%" },
  error: { color: colors.rose, textAlign: "center", marginBottom: 12 },
  btn: {
    backgroundColor: colors.rose,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnText: { color: "#fff", fontWeight: "600" },
});
