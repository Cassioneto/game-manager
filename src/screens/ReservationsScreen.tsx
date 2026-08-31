import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { getDb } from '../database/db';
import { useStore } from '../store/useStore';
import { getCustomersFromDb } from '../database/queries';

export default function ReservationsScreen() {
  const machines = useStore((state) => state.machines);
  const games = useStore((state) => state.games);

  const [reservations, setReservations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  
  // Selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');

  const loadData = () => {
    try {
      const db = getDb();
      const custList = getCustomersFromDb();
      setCustomers(custList);
      
      const list = db.getAllSync<any>(
        `SELECT r.*, c.nome as customer_name, m.nome as machine_name, g.nome as game_name 
         FROM reservations r
         JOIN customers c ON r.customer_id = c.id
         JOIN games g ON r.game_id = g.id
         LEFT JOIN machines m ON r.machine_id = m.id
         ORDER BY r.horario_reservado DESC`
      );
      setReservations(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateReservation = () => {
    if (!selectedCustomerId) {
      Alert.alert('Erro', 'Selecione um cliente. (Cadastre o cliente na guia Fidelidade se necessário).');
      return;
    }
    if (!selectedGameId) {
      Alert.alert('Erro', 'Selecione um jogo.');
      return;
    }
    if (!resDate || !resTime) {
      Alert.alert('Erro', 'Preencha a data e hora da reserva.');
      return;
    }

    try {
      // Parse date DD/MM/YYYY and HH:MM
      const [day, month, year] = resDate.split('/').map(Number);
      const [hour, min] = resTime.split(':').map(Number);

      if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(min)) {
        Alert.alert('Erro', 'Formato de data ou hora inválido.');
        return;
      }

      const dateObj = new Date(year, month - 1, day, hour, min);
      const timestamp = dateObj.getTime();

      if (isNaN(timestamp)) {
        Alert.alert('Erro', 'Data ou hora inválida.');
        return;
      }

      const db = getDb();
      db.runSync(
        'INSERT INTO reservations (customer_id, machine_id, game_id, horario_reservado, janela_bloqueio_min, status) VALUES (?, ?, ?, ?, ?, ?)',
        selectedCustomerId,
        selectedMachineId || null, // null means "any machine"
        selectedGameId,
        timestamp,
        15, // default 15 mins block window
        'confirmada'
      );

      setSelectedCustomerId(null);
      setSelectedMachineId(null);
      setSelectedGameId(null);
      setResDate('');
      setResTime('');
      loadData();
      Alert.alert('Sucesso', 'Reserva agendada com sucesso!');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a reserva no banco.');
      console.error(e);
    }
  };

  const handleCancelReservation = (id: number) => {
    Alert.alert('Cancelar Reserva', 'Deseja realmente cancelar esta reserva?', [
      { text: 'Não', style: 'cancel' },
      { 
        text: 'Sim, Cancelar', 
        onPress: () => {
          try {
            const db = getDb();
            db.runSync('UPDATE reservations SET status = ? WHERE id = ?', 'cancelada', id);
            loadData();
          } catch (e) {
            Alert.alert('Erro', 'Não foi possível cancelar.');
          }
        }
      }
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmada': return '#4CAF50';
      case 'pendente': return '#FF9800';
      case 'expirada': return '#9E9E9E';
      case 'cancelada': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reservas de Postos</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Nova Reserva Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nova Reserva</Text>
          
          <Text style={styles.label}>1. Selecionar Cliente</Text>
          <ScrollView horizontal style={styles.horizontalScroll}>
            {customers.map((c) => {
              const isSel = selectedCustomerId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, isSel && styles.selectedChip]}
                  onPress={() => setSelectedCustomerId(c.id)}
                >
                  <Text style={[styles.chipText, isSel && styles.selectedChipText]}>{c.nome}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>2. Selecionar Jogo</Text>
          <ScrollView horizontal style={styles.horizontalScroll}>
            {games.map((g) => {
              const isSel = selectedGameId === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.chip, isSel && styles.selectedChip]}
                  onPress={() => setSelectedGameId(g.id)}
                >
                  <Text style={[styles.chipText, isSel && styles.selectedChipText]}>{g.nome}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>3. Selecionar Máquina (Opcional)</Text>
          <ScrollView horizontal style={styles.horizontalScroll}>
            <TouchableOpacity
              style={[styles.chip, selectedMachineId === null && styles.selectedChip]}
              onPress={() => setSelectedMachineId(null)}
            >
              <Text style={[styles.chipText, selectedMachineId === null && styles.selectedChipText]}>Qualquer Posto</Text>
            </TouchableOpacity>
            {machines.map((m) => {
              const isSel = selectedMachineId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.chip, isSel && styles.selectedChip]}
                  onPress={() => setSelectedMachineId(m.id)}
                >
                  <Text style={[styles.chipText, isSel && styles.selectedChipText]}>{m.nome}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Data (DD/MM/AAAA)</Text>
              <TextInput
                style={styles.input}
                value={resDate}
                onChangeText={setResDate}
                placeholder="DD/MM/AAAA"
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Hora (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={resTime}
                onChangeText={setResTime}
                placeholder="HH:MM"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleCreateReservation}>
            <Text style={styles.buttonText}>Confirmar Reserva</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Reservas */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reservas Ativas</Text>
          {reservations.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma reserva agendada.</Text>
          ) : (
            reservations.map((r) => (
              <View key={r.id} style={styles.reservationItem}>
                <View style={styles.reservationHeader}>
                  <Text style={styles.customerName}>{r.customer_name}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(r.status) }
                  ]}>
                    <Text style={styles.statusText}>{r.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.reservationDetail}>Jogo: {r.game_name}</Text>
                <Text style={styles.reservationDetail}>Posto: {r.machine_name || 'Qualquer'}</Text>
                <Text style={styles.reservationDetail}>Horário: {new Date(r.horario_reservado).toLocaleString()}</Text>
                
                {r.status === 'confirmada' && (
                  <View style={styles.reservationActions}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleCancelReservation(r.id)}
                    >
                      <Text style={[styles.actionButtonText, { color: '#F44336' }]}>Cancelar Reserva</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#0066CC',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  chip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedChip: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  chipText: {
    fontSize: 13,
    color: '#666',
  },
  selectedChipText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  halfWidth: {
    width: '48%',
  },
  button: {
    backgroundColor: '#0066CC',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reservationItem: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  customerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  reservationDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  reservationActions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#E6F4FE',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    padding: 15,
  },
});
