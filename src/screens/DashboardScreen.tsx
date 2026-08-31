import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useStore } from "../store/useStore";
import { Machine, Session, Game } from "../types";

function ActiveSessionItem({ session, machine, game, navigation }: { session: Session, machine: Machine | undefined, game: Game | undefined, navigation: any }) {
  const [timeLeftStr, setTimeLeftStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      if (session.fimPrevisto) {
        const remaining = Math.max(0, Math.round((session.fimPrevisto - now) / 1000));
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        setTimeLeftStr(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      } else {
        const elapsed = Math.round((now - session.inicio) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        setTimeLeftStr(`Livre: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <TouchableOpacity
      style={styles.sessionItem}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Session', {
        machineId: machine?.id,
        machineName: machine?.nome,
        gameId: game?.id,
        gameName: game?.nome,
        paymentType: session.tipoPagamento,
        sessionId: session.id
      })}
    >
      <View>
        <Text style={styles.sessionMachine}>{machine?.nome || `Máquina ${session.machineId}`}</Text>
        <Text style={styles.sessionGame}>{game?.nome || 'Jogo'}</Text>
      </View>
      <View style={styles.sessionTimeBadge}>
        <Text style={styles.sessionTimeText}>{timeLeftStr}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ navigation }: any) {
  const machines = useStore((state) => state.machines);
  const games = useStore((state) => state.games);
  const openCashRegister = useStore((state) => state.openCashRegister);
  const activeSessions = useStore((state) => state.activeSessions);

  const activeMachines = machines.filter((m) => m.status === "ocupada");
  const freeMachines = machines.filter((m) => m.status === "livre");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Game Room Manager</Text>
        <Text style={styles.role}>Painel de Controle</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Caixa Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Caixa do Dia</Text>
          {openCashRegister ? (
            <View>
              <Text style={[styles.cardValue, { color: '#4CAF50' }]}>Aberto</Text>
              <Text style={styles.cardSubtitle}>
                Abertura: {new Date(openCashRegister.dataAbertura).toLocaleTimeString()}
              </Text>
              <Text style={styles.cardSubtitle}>
                Fundo de troco: {openCashRegister.valorInicial} Kz
              </Text>
            </View>
          ) : (
            <View>
              <Text style={[styles.cardValue, { color: '#F44336' }]}>Fechado</Text>
              <Text style={styles.cardSubtitle}>Abra o caixa na aba Caixa para começar</Text>
            </View>
          )}
        </View>

        {/* Máquinas Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Postos / Máquinas</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>{freeMachines.length}</Text>
              <Text style={styles.statLabel}>Livres</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#FF9800' }]}>{activeMachines.length}</Text>
              <Text style={styles.statLabel}>Ocupadas</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#0066CC' }]}>{machines.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Sessões Ativas */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sessões Ativas ({activeSessions.length})</Text>
          {activeSessions.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma sessão em andamento</Text>
          ) : (
            activeSessions.map((session) => {
              const machine = machines.find((m) => m.id === session.machineId);
              const game = games.find((g) => g.id === session.gameId);
              return (
                <ActiveSessionItem
                  key={session.id}
                  session={session}
                  machine={machine}
                  game={game}
                  navigation={navigation}
                />
              );
            })
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ações Rápidas</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("Machines")}
          >
            <Text style={styles.actionButtonText}>Mapa de Máquinas (Iniciar Sessão)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => navigation.navigate("Products")}
          >
            <Text style={styles.actionButtonText}>Venda de Produtos</Text>
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
  welcome: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  role: {
    fontSize: 14,
    color: "#E6F4FE",
    marginTop: 5,
  },
  content: {
    padding: 15,
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
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0066CC",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 5,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 3,
  },
  actionButton: {
    backgroundColor: "#0066CC",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    paddingVertical: 15,
    fontSize: 14,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  sessionMachine: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  sessionGame: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  sessionTimeBadge: {
    backgroundColor: '#E8F0FB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderColor: '#0066CC',
    borderWidth: 1,
  },
  sessionTimeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0066CC',
  },
});
