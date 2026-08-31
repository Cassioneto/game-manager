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
import { Machine } from "../types";

export default function MachinesScreen({ navigation }: any) {
  const machines = useStore((state) => state.machines);
  const games = useStore((state) => state.games);

  const activeSessions = useStore((state) => state.activeSessions);

  const getStatusColor = (status: Machine["status"]) => {
    switch (status) {
      case "livre":
        return "#4CAF50";
      case "ocupada":
        return "#FF9800";
      case "manutencao":
        return "#F44336";
      case "inativa":
        return "#9E9E9E";
      default:
        return "#9E9E9E";
    }
  };

  const getStatusLabel = (status: Machine["status"]) => {
    switch (status) {
      case "livre":
        return "Livre";
      case "ocupada":
        return "Ocupada";
      case "manutencao":
        return "Manutenção";
      case "inativa":
        return "Inativa";
      default:
        return status;
    }
  };

  const handleMachinePress = (machine: Machine) => {
    if (machine.status === "livre") {
      if (games.length === 0) {
        Alert.alert(
          "Nenhum jogo cadastrado",
          "Cadastre um jogo em Configurações > Jogos antes de iniciar uma sessão.",
        );
        return;
      }
      navigation.navigate("StartSession", {
        machineId: machine.id,
        machineName: machine.nome || `Máquina ${machine.numero}`,
      });
    } else if (machine.status === "ocupada") {
      const activeSess = activeSessions.find(s => s.machineId === machine.id && s.status === 'ativa');
      if (activeSess) {
        const game = games.find(g => g.id === activeSess.gameId);
        navigation.navigate("Session", {
          machineId: machine.id,
          machineName: machine.nome || `Máquina ${machine.numero}`,
          gameId: activeSess.gameId,
          gameName: game?.nome || "Jogo",
          paymentType: activeSess.tipoPagamento,
          sessionId: activeSess.id,
        });
      } else {
        Alert.alert(
          "Erro",
          "Nenhuma sessão ativa encontrada no banco para esta máquina.",
        );
      }
    } else if (machine.status === "manutencao") {
      Alert.alert(
        "Manutenção",
        `Esta máquina está em manutenção e indisponível para sessões.`,
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mapa de Máquinas</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.grid}>
          {machines.map((machine) => (
            <TouchableOpacity
              key={machine.id}
              style={[
                styles.machineCard,
                { borderLeftColor: getStatusColor(machine.status) },
              ]}
              disabled={machine.status === "inativa"}
              onPress={() => handleMachinePress(machine)}
            >
              <Text style={styles.machineNumber}>{machine.numero}</Text>
              <Text style={styles.machineName}>{machine.nome}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(machine.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {getStatusLabel(machine.status)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
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
    padding: 15,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  machineCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  machineNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  machineName: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  statusBadge: {
    marginTop: 10,
    padding: 5,
    borderRadius: 4,
    alignItems: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});
