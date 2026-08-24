import { Image } from "react-native";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, formatBRL } from "@/src/theme";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAt?: number | null;
  imageUrl?: string | null;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link href={`/produto/${product.slug}`} asChild>
      <Pressable style={styles.card}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.price}>{formatBRL(product.price)}</Text>
        {product.compareAt && product.compareAt > product.price ? (
          <Text style={styles.compare}>{formatBRL(product.compareAt)}</Text>
        ) : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    paddingBottom: 10,
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#eee8e0",
  },
  placeholder: { backgroundColor: "#e8e0d6" },
  name: {
    marginTop: 8,
    marginHorizontal: 8,
    fontSize: 13,
    color: colors.ink,
    minHeight: 34,
  },
  price: {
    marginHorizontal: 8,
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: colors.rose,
  },
  compare: {
    marginHorizontal: 8,
    fontSize: 11,
    color: colors.muted,
    textDecorationLine: "line-through",
  },
});
