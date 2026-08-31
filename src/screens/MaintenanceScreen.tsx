import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useStore } from '../store/useStore';
import { Maintenance } from '../types';
import { 
  getMaintenancesFromDb, 
  insertMaintenanceInDb, 
  updateMaintenanceStatusInDb 
} from '../database/queries';

export default function MaintenanceScreen() {
  const machines = useStore((state) => state.machines);
  const updateMachine = useStore((state) => state.updateMachine);

  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Maintenance Form
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const [type, setType] = useState<'preventiva' | 'corretiva'>('preventiva');
  const [activity, setActivity] = useState('');

  // Complete Maintenance Modal
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [obs, setObs] = useState('');

  const activities = [
    'Limpeza interna de poeira (ventoinhas, gabinete)',
    'Verificação e limpeza de controles/joysticks/botões',
    'Verificação de cabos e conexões',
    'Teste de imagem/som (TV/monitor)',
    'Atualização de software/firmware',
    'Substituição de peças desgastadas'
  ];

  const loadMaintenances = () => {
    try {
      const list = getMaintenancesFromDb();
      setMaintenances(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadMaintenances();
  }, []);

  const handleScheduleMaintenance = () => {
    if (!selectedMachineId) {
      Alert.alert('Erro', 'Por favor, selecione uma máquina.');
      return;
    }
    const act = activity.trim();
    if (!act) {
      Alert.alert('Erro', 'Por favor, selecione ou digite a atividade.');
      return;
    }

    try {
      const now = Date.now();
      const m = insertMaintenanceInDb({
        machineId: selectedMachineId,
        tipo: type,
        atividade: act,
        agendadoPara: now,
        status: 'agendada'
      });

      // Update machine status to maintenance
      updateMachine(selectedMachineId, { status: 'manutencao' });

      setActivity('');
      setSelectedMachineId(null);
      setShowAddForm(false);
      loadMaintenances();
      Alert.alert('Sucesso', 'Manutenção agendada e máquina colocada em manutenção.');
    } catch (e) {
      Alert.alert('Erro', 'Erro ao agendar no banco.');
      console.error(e);
    }
  };

  const handleCompleteMaintenance = () => {
    if (!selectedMaintenance) return;

    try {
      updateMaintenanceStatusInDb(selectedMaintenance.id, 'concluida', Date.now(), obs.trim());
      
      // Update machine status back to libre
      updateMachine(selectedMaintenance.machineId, { status: 'livre' });

      setSelectedMaintenance(null);
      setObs('');
      loadMaintenances();
      Alert.alert('Sucesso', 'Manutenção concluída e máquina liberada.');
    } catch (e) {
      Alert.alert('Erro', 'Erro ao atualizar manutenção.');
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manutenção</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Toggle Form Button */}
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(!showAddForm)}>
          <Text style={styles.addButtonText}>
            {showAddForm ? 'Fechar Formuário' : '+ Agendar Manutenção'}
          </Text>
        </TouchableOpacity>

        {/* Schedule Form */}
        {showAddForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Agendar Nova Manutenção</Text>
            
            <Text style={styles.fieldLabel}>Selecionar Máquina</Text>
            <ScrollView horizontal style={styles.horizontalScroll}>
              {machines.map((machine) => {
                const isSelected = selectedMachineId === machine.id;
                return (
                  <TouchableOpacity
                    key={machine.id}
                    style={[styles.chip, isSelected && styles.selectedChip]}
                    onPress={() => setSelectedMachineId(machine.id)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                      {machine.nome} ({machine.status})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>Tipo de Manutenção</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'preventiva' && styles.typeBtnActive]}
                onPress={() => setType('preventiva')}
              >
                <Text style={[styles.typeBtnText, type === 'preventiva' && styles.typeBtnTextActive]}>
                  🔧 Preventiva
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'corretiva' && styles.typeBtnActive, { borderColor: '#F44336' }]}
                onPress={() => setType('corretiva')}
              >
                <Text style={[styles.typeBtnText, type === 'corretiva' && styles.typeBtnTextActive, type === 'corretiva' && { backgroundColor: '#F44336', color: '#fff' }]}>
                  🚨 Corretiva
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Atividade (Selecione ou digite abaixo)</Text>
            <ScrollView horizontal style={styles.horizontalScroll}>
              {activities.map((act, index) => {
                const isSelected = activity === act;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.chip, isSelected && styles.selectedChip]}
                    onPress={() => setActivity(act)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                      {act.substring(0, 20)}...
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              style={styles.input}
              value={activity}
              onChangeText={setActivity}
              placeholder="Digite a atividade detalhada"
            />

            <TouchableOpacity style={[styles.addButton, { backgroundColor: '#4CAF50', marginTop: 10 }]} onPress={handleScheduleMaintenance}>
              <Text style={styles.addButtonText}>Salvar Agendamento</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* List of Scheduled/Active Maintenances */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Manutenções em Aberto</Text>
          {maintenances.filter(m => m.status !== 'concluida').length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma manutenção agendada no momento.</Text>
          ) : (
            maintenances.filter(m => m.status !== 'concluida').map((m) => {
              const machName = machines.find(mac => mac.id === m.machineId)?.nome || `Máquina ${m.machineId}`;
              return (
                <TouchableOpacity 
                  key={m.id} 
                  style={styles.item}
                  onPress={() => setSelectedMaintenance(m)}
                >
                  <Text style={styles.itemTitle}>{machName}</Text>
                  <Text style={styles.itemSubtitle}>{m.atividade}</Text>
                  <Text style={styles.itemDate}>
                    Agendada para: {new Date(m.agendadoPara).toLocaleDateString()}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: m.tipo === 'corretiva' ? '#F44336' : '#FF9800' }
                  ]}>
                    <Text style={styles.statusText}>{m.tipo.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* History of Completed Maintenances */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Histórico de Concluídas</Text>
          {maintenances.filter(m => m.status === 'concluida').length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma manutenção concluída ainda.</Text>
          ) : (
            maintenances.filter(m => m.status === 'concluida').map((m) => {
              const machName = machines.find(mac => mac.id === m.machineId)?.nome || `Máquina ${m.machineId}`;
              return (
                <View key={m.id} style={styles.itemCompleted}>
                  <Text style={styles.itemTitleCompleted}>{machName}</Text>
                  <Text style={styles.itemSubtitleCompleted}>{m.atividade}</Text>
                  {m.observacoes && (
                    <Text style={styles.itemObs}>Obs: {m.observacoes}</Text>
                  )}
                  <Text style={styles.itemDateCompleted}>
                    Concluída em: {m.concluidoEm ? new Date(m.concluidoEm).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              );
            })
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Complete Maintenance Modal */}
      {selectedMaintenance && (
        <Modal
          transparent
          animationType="fade"
          visible={selectedMaintenance !== null}
          onRequestClose={() => setSelectedMaintenance(null)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Concluir Manutenção</Text>
              <Text style={styles.modalSubtitle}>
                Máquina: {machines.find(mac => mac.id === selectedMaintenance.machineId)?.nome || `Máquina ${selectedMaintenance.machineId}`}
              </Text>
              
              <Text style={styles.fieldLabel}>Observações / Peças Trocadas</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={obs}
                onChangeText={setObs}
                placeholder="Descreva o que foi feito..."
                multiline
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: '#EEE', borderColor: '#DDD', borderWidth: 1 }]}
                  onPress={() => {
                    setSelectedMaintenance(null);
                    setObs('');
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: '#666' }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: '#4CAF50' }]}
                  onPress={handleCompleteMaintenance}
                >
                  <Text style={styles.modalBtnText}>Concluir</Text>
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
  fieldLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  chip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  selectedChip: {
    backgroundColor: '#E6F4FE',
    borderColor: '#0066CC',
  },
  chipText: {
    fontSize: 13,
    color: '#666',
  },
  selectedChipText: {
    color: '#0066CC',
    fontWeight: 'bold',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 5,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#0066CC',
    borderRadius: 8,
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#E6F4FE',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  typeBtnTextActive: {
    color: '#0066CC',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    marginTop: 8,
  },
  item: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0066CC',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  itemDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  itemCompleted: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  itemTitleCompleted: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  itemSubtitleCompleted: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  itemObs: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#333',
    backgroundColor: '#EEE',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  itemDateCompleted: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
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
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
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
