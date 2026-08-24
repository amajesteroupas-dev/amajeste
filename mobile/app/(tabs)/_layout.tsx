import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "@/src/theme";
import { useCart } from "@/src/store/cart";

function TabLabel({
  label,
  focused,
}: {
  label: string;
  focused: boolean;
}) {
  return (
    <Text
      style={{
        fontSize: 10,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: focused ? colors.rose : colors.muted,
        fontWeight: focused ? "700" : "500",
      }}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const totalItems = useCart((s) => s.totalItems());

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        tabBarActiveTintColor: colors.rose,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Majesté",
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Início" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="buscar"
        options={{
          title: "Buscar",
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Buscar" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="carrinho"
        options={{
          title: "Carrinho",
          tabBarBadge: totalItems > 0 ? totalItems : undefined,
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Carrinho" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="academia"
        options={{
          title: "Academia",
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Academia" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{
          title: "Conta",
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Conta" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
