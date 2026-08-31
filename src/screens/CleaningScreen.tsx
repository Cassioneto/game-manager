import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useStore } from '../store/useStore';
import { Cleaning, CleaningChecklistItem } from '../types';
import { 
  getCleaningsFromDb, 
  insertCleaningInDb, 
  getCleaningChecklistItemsFromDb 
} from '../database/queries';

export default function CleaningScreen() {
  const [checklist, setChecklist] = useState<CleaningChecklistItem[]>([]);
  const [cleanings, setCleanings] = useState<Cleaning[]>([]);
  const [selectedFreq, setSelectedFreq] = useState<'diaria' | 'semanal' | 'mensal'>('diaria');

  const loadData = () => {
    try {
      const items = getCleaningChecklistItemsFromDb();
      setChecklist(items);
      const history = getCleaningsFromDb();
      setCleanings(history);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCompleteItem = (item: CleaningChecklistItem) => {
    Alert.alert(
      'Concluir Item',
      `Marcar "${item.descricao}" como concluído?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: () => {
            try {
              const now = Date.now();
              insertCleaningInDb({
                area: item.area,
                checklistItemId: item.id,
                frequencia: selectedFreq,
                agendadoPara: now,
                concluidoEm: now,
                responsavelId: 1
              });
              loadData();
              Alert.alert('Sucesso', 'Item de limpeza registrado como concluído!');
            } catch (e) {
              Alert.alert('Erro', 'Não foi possível salvar a limpeza no banco.');
              console.error(e);
            }
          }
        }
      ]
    );
  };

  const getFilteredChecklist = () => {
    // Map area/frequency criteria based on standard suggestions
    if (selectedFreq === 'diaria') {
      return checklist.filter(item => item.id <= 7); // Standard daily tasks
    } else if (selectedFreq === 'semanal') {
      return checklist.filter(item => item.id > 7 && item.id <= 9); // Weekly tasks
    } else {
      return checklist.filter(item => item.id === 10); // Monthly tasks
    }
  };

  const getCompletedTodayCount = (itemId: number) => {
    const today = new Date().toDateString();
    return cleanings.filter(c => 
      c.checklistItemId === itemId && 
      c.concluidoEm && 
      new Date(c.concluidoEm).toDateString() === today
    ).length;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Limpeza do Espaço</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Frequency Filter Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Frequência de Checklist</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity 
              style={[styles.filterBtn, selectedFreq === 'diaria' && styles.filterBtnActive]}
              onPress={() => setSelectedFreq('diaria')}
            >
              <Text style={[styles.filterText, selectedFreq === 'diaria' && styles.filterTextActive]}>Diária</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterBtn, selectedFreq === 'semanal' && styles.filterBtnActive]}
              onPress={() => setSelectedFreq('semanal')}
            >
              <Text style={[styles.filterText, selectedFreq === 'semanal' && styles.filterTextActive]}>Semanal</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterBtn, selectedFreq === 'mensal' && styles.filterBtnActive]}
              onPress={() => setSelectedFreq('mensal')}
            >
              <Text style={[styles.filterText, selectedFreq === 'mensal' && styles.filterTextActive]}>Mensal</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Checklist Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Checklist ({selectedFreq.toUpperCase()})</Text>
          {getFilteredChecklist().length === 0 ? (
            <Text style={styles.emptyText}>Nenhum item configurado no checklist.</Text>
          ) : (
            getFilteredChecklist().map((item) => {
              const completedCount = getCompletedTodayCount(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, completedCount > 0 && styles.itemRowCompleted]}
                  onPress={() => handleCompleteItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemDesc, completedCount > 0 && styles.itemDescCompleted]}>
                      {item.descricao}
                    </Text>
                    <Text style={styles.itemArea}>Setor: {item.area}</Text>
                  </View>
                  <View style={[
                    styles.checkBadge,
                    completedCount > 0 ? styles.checkBadgeDone : styles.checkBadgePending
                  ]}>
                    <Text style={styles.checkBadgeText}>
                      {completedCount > 0 ? '✓ Feito' : 'Pendente'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Audit Log Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Histórico Recente de Limpeza</Text>
          {cleanings.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum registro de limpeza ainda.</Text>
          ) : (
            cleanings.slice(0, 15).map((c) => {
              const desc = checklist.find(i => i.id === c.checklistItemId)?.descricao || `Checklist #${c.checklistItemId}`;
              return (
                <View key={c.id} style={styles.logRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logTitle}>{desc}</Text>
                    <Text style={styles.logDate}>
                      Frequência: {c.frequencia.toUpperCase()} • Concluído às: {c.concluidoEm ? new Date(c.concluidoEm).toLocaleTimeString() : ''}
                    </Text>
                  </View>
                  <Text style={styles.logLabel}>Concluído</Text>
                </View>
              );
            })
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
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  filterBtnActive: {
    backgroundColor: '#E6F4FE',
    borderColor: '#0066CC',
  },
  filterText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  filterTextActive: {
    color: '#0066CC',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  itemRowCompleted: {
    backgroundColor: '#F9F9F9',
  },
  itemDesc: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  itemDescCompleted: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  itemArea: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  checkBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 10,
  },
  checkBadgeDone: {
    backgroundColor: '#E8F5E9',
  },
  checkBadgePending: {
    backgroundColor: '#FFF3E0',
  },
  checkBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  logTitle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  logDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  logLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    padding: 15,
  },
});
