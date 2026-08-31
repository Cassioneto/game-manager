import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { getDb } from '../database/db';
import { useStore } from '../store/useStore';
import { getCustomersFromDb, insertCashMovementInDb } from '../database/queries';

export default function TournamentsScreen() {
  const games = useStore((state) => state.games);
  const openCashRegister = useStore((state) => state.openCashRegister);

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  
  // Create Tournament Form
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [tourDate, setTourDate] = useState('');
  const [tourTime, setTourTime] = useState('');
  const [maxVagas, setMaxVagas] = useState('16');
  const [taxa, setTaxa] = useState('200');
  const [premioText, setPremioText] = useState('Troféu + 50% das Inscrições');
  const [showAddForm, setShowAddForm] = useState(false);

  // Enroll Customer Modal
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const loadData = () => {
    try {
      const db = getDb();
      setCustomers(getCustomersFromDb());
      
      const list = db.getAllSync<any>(
        `SELECT t.*, g.nome as game_name 
         FROM tournaments t
         JOIN games g ON t.game_id = g.id
         ORDER BY t.data_hora DESC`
      );
      setTournaments(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTournament = () => {
    if (!selectedGameId) {
      Alert.alert('Erro', 'Por favor, selecione o jogo do torneio.');
      return;
    }
    if (!tourDate || !tourTime) {
      Alert.alert('Erro', 'Preencha a data e hora do torneio.');
      return;
    }
    const limit = parseInt(maxVagas);
    const entryFee = parseFloat(taxa);

    if (isNaN(limit) || limit <= 0) {
      Alert.alert('Erro', 'Informe o limite máximo de vagas.');
      return;
    }
    if (isNaN(entryFee) || entryFee < 0) {
      Alert.alert('Erro', 'Informe a taxa de inscrição.');
      return;
    }

    try {
      // Parse date DD/MM/YYYY and HH:MM
      const [day, month, year] = tourDate.split('/').map(Number);
      const [hour, min] = tourTime.split(':').map(Number);

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
        'INSERT INTO tournaments (game_id, data_hora, vagas_maximas, vagas_ocupadas, taxa_inscricao, premio, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        selectedGameId,
        timestamp,
        limit,
        0,
        entryFee,
        premioText.trim() || 'Nenhum',
        'aberto'
      );

      setSelectedGameId(null);
      setTourDate('');
      setTourTime('');
      setPremioText('Troféu + 50% das Inscrições');
      setShowAddForm(false);
      loadData();
      Alert.alert('Sucesso', 'Torneio cadastrado e aberto para inscrições!');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível cadastrar o torneio.');
      console.error(e);
    }
  };

  const handleEnrollCustomer = () => {
    if (!selectedTournament) return;
    if (!selectedCustomerId) {
      Alert.alert('Erro', 'Selecione um cliente para inscrever.');
      return;
    }

    if (selectedTournament.vagas_ocupadas >= selectedTournament.vagas_maximas) {
      Alert.alert('Erro', 'As vagas para este torneio estão esgotadas.');
      return;
    }

    // Enforce cash register open to collect entry fee
    if (selectedTournament.taxa_inscricao > 0 && !openCashRegister) {
      Alert.alert('Caixa Fechado', 'É necessário ter o caixa aberto para cobrar taxas de inscrição de torneio.');
      return;
    }

    try {
      const db = getDb();
      const now = Date.now();

      // Check if already enrolled
      const dup = db.getFirstSync<any>(
        'SELECT id FROM tournament_entries WHERE tournament_id = ? AND customer_id = ?',
        selectedTournament.id,
        selectedCustomerId
      );
      if (dup) {
        Alert.alert('Erro', 'Este cliente já está inscrito neste torneio.');
        return;
      }

      // 1. Enroll
      db.runSync(
        'INSERT INTO tournament_entries (tournament_id, customer_id, inscrito_em) VALUES (?, ?, ?)',
        selectedTournament.id,
        selectedCustomerId,
        now
      );

      // 2. Increment filled slots
      const nextOccupied = selectedTournament.vagas_ocupadas + 1;
      db.runSync(
        'UPDATE tournaments SET vagas_ocupadas = ? WHERE id = ?',
        nextOccupied,
        selectedTournament.id
      );

      // 3. Record in Cash Register
      if (selectedTournament.taxa_inscricao > 0 && openCashRegister) {
        insertCashMovementInDb({
          cashRegisterId: openCashRegister.id,
          tipo: 'venda', // or a custom type if desired, but selling slot is a revenue
          valor: selectedTournament.taxa_inscricao,
          motivo: `Taxa de inscrição torneio #${selectedTournament.id} - Cliente: ${customers.find(c => c.id === selectedCustomerId)?.nome}`,
          timestamp: now
        });
      }

      setSelectedTournament(null);
      setSelectedCustomerId(null);
      loadData();
      Alert.alert('Sucesso', 'Inscrição realizada com sucesso!');
    } catch (e) {
      Alert.alert('Erro', 'Erro ao processar inscrição no banco.');
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Torneios / Competições</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Toggle Form */}
        <TouchableOpacity style={[styles.addButton, { marginBottom: 15 }]} onPress={() => setShowAddForm(!showAddForm)}>
          <Text style={styles.addButtonText}>
            {showAddForm ? 'Fechar Formulário' : '+ Criar Novo Torneio'}
          </Text>
        </TouchableOpacity>

        {/* Create Tournament Form */}
        {showAddForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Novo Torneio</Text>
            
            <Text style={styles.label}>Selecionar Jogo</Text>
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

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Data (DD/MM/AAAA)</Text>
                <TextInput 
                  style={styles.input} 
                  value={tourDate}
                  onChangeText={setTourDate}
                  placeholder="DD/MM/AAAA" 
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Hora (HH:MM)</Text>
                <TextInput 
                  style={styles.input} 
                  value={tourTime}
                  onChangeText={setTourTime}
                  placeholder="HH:MM" 
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Vagas Máximas</Text>
                <TextInput 
                  style={styles.input} 
                  value={maxVagas}
                  onChangeText={setMaxVagas}
                  keyboardType="numeric" 
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Taxa Inscrição (Kz)</Text>
                <TextInput 
                  style={styles.input} 
                  value={taxa}
                  onChangeText={setTaxa}
                  keyboardType="numeric" 
                />
              </View>
            </View>

            <Text style={styles.label}>Premiação</Text>
            <TextInput 
              style={styles.input} 
              value={premioText}
              onChangeText={setPremioText}
              placeholder="Ex: Troféu + Dinheiro" 
            />

            <TouchableOpacity style={[styles.addButton, { backgroundColor: '#4CAF50', marginTop: 15 }]} onPress={handleCreateTournament}>
              <Text style={styles.addButtonText}>Salvar Torneio</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tournaments List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Torneios Ativos</Text>
          {tournaments.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum torneio agendado.</Text>
          ) : (
            tournaments.map((t) => (
              <View key={t.id} style={styles.item}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{t.game_name}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{t.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.itemDetail}>Data: {new Date(t.data_hora).toLocaleString()}</Text>
                <Text style={styles.itemDetail}>Taxa de inscrição: {t.taxa_inscricao} Kz</Text>
                <Text style={styles.itemDetail}>Vagas ocupadas: {t.vagas_ocupadas} / {t.vagas_maximas}</Text>
                <Text style={styles.itemDetail}>Prêmio: {t.premio}</Text>
                
                {t.status === 'aberto' && (
                  <TouchableOpacity 
                    style={styles.enrollButton}
                    onPress={() => setSelectedTournament(t)}
                  >
                    <Text style={styles.enrollButtonText}>Inscrever Cliente</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Enroll Customer Modal */}
      {selectedTournament && (
        <Modal
          transparent
          animationType="fade"
          visible={selectedTournament !== null}
          onRequestClose={() => setSelectedTournament(null)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Inscrever Cliente no Torneio</Text>
              <Text style={styles.modalSubtitle}>Torneio de {selectedTournament.game_name}</Text>
              
              <Text style={styles.label}>Selecionar Cliente</Text>
              {customers.length === 0 ? (
                <Text style={styles.emptyText}>Cadastre clientes primeiro na guia Fidelidade.</Text>
              ) : (
                <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
                  {customers.map((c) => {
                    const isSel = selectedCustomerId === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.customerItem, isSel && styles.selectedCustomerItem]}
                        onPress={() => setSelectedCustomerId(c.id)}
                      >
                        <Text style={[styles.customerItemText, isSel && styles.selectedCustomerItemText]}>{c.nome}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: '#EEE', borderColor: '#DDD', borderWidth: 1 }]}
                  onPress={() => {
                    setSelectedTournament(null);
                    setSelectedCustomerId(null);
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: '#666' }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: '#4CAF50' }]}
                  onPress={handleEnrollCustomer}
                  disabled={!selectedCustomerId}
                >
                  <Text style={styles.modalBtnText}>Confirmar Inscrição</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  addButton: {
    backgroundColor: '#0066CC',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
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
    padding: 10,
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
  },
  halfWidth: {
    width: '48%',
  },
  item: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  itemDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  enrollButton: {
    backgroundColor: '#E6F4FE',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
    borderColor: '#0066CC',
    borderWidth: 1,
  },
  enrollButtonText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    padding: 15,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
  },
  customerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  selectedCustomerItem: {
    backgroundColor: '#E6F4FE',
  },
  customerItemText: {
    fontSize: 14,
    color: '#333',
  },
  selectedCustomerItemText: {
    color: '#0066CC',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
