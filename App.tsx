import React, { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import AppNavigator from "./src/navigation/AppNavigator";
import { bootstrapApp } from "./src/startup";

// Keep the native splash visible until bootstrapApp() finishes (DB init,
// seeding and store hydration). Must run in global scope so it takes effect
// before the first render.
SplashScreen.preventAutoHideAsync().catch(() => {});

type LaunchState = "loading" | "ready" | "error";

export default function App() {
  const [launchState, setLaunchState] = useState<LaunchState>("loading");

  const bootstrap = useCallback(async () => {
    try {
      await bootstrapApp();
      setLaunchState("ready");
    } catch (error) {
      console.error("App bootstrap failed:", error);
      setLaunchState("error");
    } finally {
      await SplashScreen.hideAsync();
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (launchState === "loading") {
    // Native splash is still covering the app.
    return null;
  }

  if (launchState === "error") {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Falha ao iniciar</Text>
        <Text style={styles.errorText}>
          Não foi possível preparar o banco de dados. Toque abaixo para tentar
          novamente.
        </Text>
        <TouchableOpacity style={styles.errorButton} onPress={bootstrap}>
          <Text style={styles.errorButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  errorText: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: "#0066CC",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  errorButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
