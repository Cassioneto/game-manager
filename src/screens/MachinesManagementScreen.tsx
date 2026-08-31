import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useStore } from '../store/useStore';
import { Machine } from '../types';

const STATUS_OPTIONS: { value: Machine['status']; label: string }[] = [
  { value: 'livre', label: 'Livre' },
  { value: 'ocupada', label: 'Ocupada' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'inativa', label: 'Inativa' },
];

export default function MachinesManagementScreen() {
  const machines = useStore((state) => state.machines);
  const addMachine = useStore((state) => state.addMachine);
  const updateMachine = useStore((state) => state.updateMachine);
  const removeMachine = useStore((state) => state.removeMachine);

  const [newNumero, setNewNumero] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newSetor, setNewSetor] = useState('');
  const [newDescricao, setNewDescricao] = useState('');

  const handleAddMachine = () => {
    const numero = newNumero.trim();
    const nome = newNome.trim();
    if (!numero || !nome) {
      Alert.alert('Erro', 'Preencha o número e o nome da máquina');
      return;
    }
    addMachine({
      numero,
      nome,
      setor: newSetor.trim() || undefined,
      descricao: newDescricao.trim() || undefined,
      status: 'livre',
    });
    setNewNumero('');
    setNewNome('');
    setNewSetor('');
    setNewDescricao('');
  };

  const handleRemoveMachine = (machine: Machine) => {
    Alert.alert('Remover Máquina', `Remover "${machine.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeMachine(machine.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Máquinas Cadastradas ({machines.length})
          </Text>

          {machines.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma máquina cadastrada ainda.</Text>
          ) : (
            machines.map((machine) => (
              <View key={machine.id} style={styles.machineRow}>
                <View style={styles.machineRowHeader}>
                  <Text style={styles.rowTitle}>Máquina #{machine.id}</Text>
                  <TouchableOpacity onPress={() => handleRemoveMachine(machine)}>
                    <Text style={styles.removeText}>Remover</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>Número</Text>
                <TextInput
                  style={styles.input}
                  value={machine.numero}
                  onChangeText={(text) => updateMachine(machine.id, { numero: text })}
                  placeholder="Ex: 01"
                />

                <Text style={styles.fieldLabel}>Nome</Text>
                <TextInput
                  style={styles.input}
                  value={machine.nome}
                  onChangeText={(text) => updateMachine(machine.id, { nome: text })}
                  placeholder="Ex: Máquina 01"
                />

                <Text style={styles.fieldLabel}>Setor</Text>
                <TextInput
                  style={styles.input}
                  value={machine.setor ?? ''}
                  onChangeText={(text) => updateMachine(machine.id, { setor: text })}
                  placeholder="Ex: Setor A"
                />

                <Text style={styles.fieldLabel}>Descrição</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={machine.descricao ?? ''}
                  onChangeText={(text) => updateMachine(machine.id, { descricao: text })}
                  placeholder="Observações sobre a máquina (opcional)"
                  multiline
                />

                <Text style={styles.fieldLabel}>Status</Text>
                <View style={styles.statusRow}>
                  {STATUS_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.statusButton,
                        machine.status === option.value && styles.statusButtonActive,
                      ]}
                      onPress={() => updateMachine(machine.id, { status: option.value })}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          machine.status === option.value && styles.statusButtonTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Adicionar Nova Máquina</Text>

          <Text style={styles.fieldLabel}>Número</Text>
          <TextInput
            style={styles.input}
            value={newNumero}
            onChangeText={setNewNumero}
            placeholder="Ex: 07"
          />

          <Text style={styles.fieldLabel}>Nome</Text>
          <TextInput
            style={styles.input}
            value={newNome}
            onChangeText={setNewNome}
            placeholder="Ex: Máquina 07"
          />

          <Text style={styles.fieldLabel}>Setor</Text>
          <TextInput
            style={styles.input}
            value={newSetor}
            onChangeText={setNewSetor}
            placeholder="Ex: Setor A"
          />

          <Text style={styles.fieldLabel}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={newDescricao}
            onChangeText={setNewDescricao}
            placeholder="Observações sobre a máquina (opcional)"
            multiline
          />

          <TouchableOpacity style={styles.addButton} onPress={handleAddMachine}>
            <Text style={styles.addButtonText}>+ Adicionar Máquina</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  machineRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    marginTop: 15,
  },
  machineRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  removeText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fieldLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
    marginTop: 8,
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
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#0066CC',
    borderRadius: 8,
    marginRight: 8,
    marginTop: 6,
  },
  statusButtonActive: {
    backgroundColor: '#0066CC',
  },
  statusButtonText: {
    color: '#0066CC',
    fontWeight: 'bold',
    fontSize: 12,
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#0066CC',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
