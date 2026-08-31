import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useStore } from "../store/useStore";

export default function SettingsScreen({ navigation }: any) {

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configurações</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Removed Account management card since this is a single-user app */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gestão</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("MachinesManagement")}
          >
            <Text style={styles.menuItemText}>Máquinas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Games")}
          >
            <Text style={styles.menuItemText}>Jogos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Pricing")}
          >
            <Text style={styles.menuItemText}>Tabela de Preços</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Operações</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Maintenance")}
          >
            <Text style={styles.menuItemText}>Manutenção</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Cleaning")}
          >
            <Text style={styles.menuItemText}>Limpeza</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Reports")}
          >
            <Text style={styles.menuItemText}>Relatórios</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Funcionalidades</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Loyalty")}
          >
            <Text style={styles.menuItemText}>Sistema de Fidelidade</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Reservations")}
          >
            <Text style={styles.menuItemText}>Reservas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("HappyHour")}
          >
            <Text style={styles.menuItemText}>Happy Hour</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Tournaments")}
          >
            <Text style={styles.menuItemText}>Torneios</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Exportação</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Export")}
          >
            <Text style={styles.menuItemText}>Exportar Dados (CSV/Excel)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Backup</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Backup")}
          >
            <Text style={styles.menuItemText}>Backup e Restauração</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#0066CC",
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  userInfo: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  logoutButton: {
    backgroundColor: "#F44336",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
  },
});
