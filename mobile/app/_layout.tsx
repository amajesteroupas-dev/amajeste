import { useCallback, useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/src/store/auth";
import { EntrySplash } from "@/src/components/EntrySplash";
import { colors } from "@/src/theme";

export default function RootLayout() {
  const hydrate = useAuth((s) => s.hydrate);
  const ready = useAuth((s) => s.ready);
  const [splashDone, setSplashDone] = useState(false);
  const onSplashDone = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1612",
        }}
      >
        <ActivityIndicator color="#c9a24a" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={splashDone ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="produto/[slug]" options={{ title: "Produto" }} />
        <Stack.Screen name="categoria/[slug]" options={{ title: "Categoria" }} />
        <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
        <Stack.Screen name="pedido/[id]" options={{ title: "Pedido" }} />
        <Stack.Screen name="pedidos" options={{ title: "Meus pedidos" }} />
        <Stack.Screen name="favoritos" options={{ title: "Favoritos" }} />
        <Stack.Screen name="rastreio" options={{ title: "Rastreio" }} />
        <Stack.Screen name="login" options={{ title: "Entrar" }} />
        <Stack.Screen name="cadastro" options={{ title: "Criar conta" }} />
        <Stack.Screen
          name="academia/treinos"
          options={{ title: "Treinos" }}
        />
        <Stack.Screen name="academia/dietas" options={{ title: "Dietas" }} />
        <Stack.Screen
          name="academia/progresso"
          options={{ title: "Progresso" }}
        />
        <Stack.Screen name="academia/looks" options={{ title: "Looks" }} />
      </Stack>
      {!splashDone ? <EntrySplash onDone={onSplashDone} /> : null}
    </>
  );
}
