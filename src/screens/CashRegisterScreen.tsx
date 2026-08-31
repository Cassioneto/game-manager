import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useStore } from '../store/useStore';
import { CashRegister, CashMovement } from '../types';
import { 
  getOpenCashRegisterFromDb, 
  openCashRegisterInDb, 
  closeCashRegisterInDb, 
  getCashMovementsFromDb, 
  insertCashMovementInDb 
} from '../database/queries';

export default function CashRegisterScreen() {
  const openCashRegister = useStore((state) => state.openCashRegister);
  const setOpenCashRegister = useStore((state) => state.setOpenCashRegister);
  const activeSessions = useStore((state) => state.activeSessions);

  const [initialAmount, setInitialAmount] = useState('');
  const [countedAmount, setCountedAmount] = useState('');
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [expectedAmount, setExpectedAmount] = useState(0);

  // Movement Form
  const [movType, setMovType] = useState<'reforco' | 'sangria'>('reforco');
  const [movValue, setMovValue] = useState('');
  const [movMotivo, setMovMotivo] = useState('');

  // Load movements when register is open
  useEffect(() => {
    if (openCashRegister) {
      const list = getCashMovementsFromDb(openCashRegister.id);
      setMovements(list);
      
      // Calculate expected value
      const sum = list.reduce((acc, m) => acc + (m.tipo === 'sangria' ? -m.valor : m.valor), 0);
      setExpectedAmount(openCashRegister.valorInicial + sum);
    } else {
      setMovements([]);
      setExpectedAmount(0);
    }
  }, [openCashRegister]);

  const reloadMovements = () => {
    if (openCashRegister) {
      const list = getCashMovementsFromDb(openCashRegister.id);
      setMovements(list);
      const sum = list.reduce((acc, m) => acc + (m.tipo === 'sangria' ? -m.valor : m.valor), 0);
      setExpectedAmount(openCashRegister.valorInicial + sum);
    }
  };

  const handleOpenCashRegister = () => {
    const val = parseFloat(initialAmount);
    if (isNaN(val) || val < 0) {
      Alert.alert('Erro', 'Por favor, insira um valor inicial válido.');
      return;
    }

    try {
      const reg = openCashRegisterInDb(val);
      setOpenCashRegister(reg);
      setInitialAmount('');
      Alert.alert('Sucesso', 'Caixa aberto com sucesso!');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível abrir o caixa no banco de dados.');
      console.error(e);
    }
  };

  const handleCloseCashRegister = () => {
    if (!openCashRegister) return;
    
    // Check RN-04: Cannot close cash register with active sessions
    if (activeSessions.length > 0) {
      Alert.alert(
        'Aviso',
        `Não é possível fechar o caixa com ${activeSessions.length} sessão(ões) ativa(s) em andamento. Encerre todas as sessões primeiro.`
      );
      return;
    }

    const counted = parseFloat(countedAmount);
    if (isNaN(counted) || counted < 0) {
      Alert.alert('Erro', 'Por favor, insira um valor contado válido.');
      return;
    }

    const difference = counted - expectedAmount;

    Alert.alert(
      'Confirmar Fecho de Caixa',
      `Esperado: ${expectedAmount} Kz\nContado: ${counted} Kz\nDiferença: ${difference} Kz\n\nDeseja realmente fechar o caixa?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Fechar Caixa', 
          onPress: () => {
            try {
              closeCashRegisterInDb(openCashRegister.id, counted, expectedAmount);
              setOpenCashRegister(null);
              setCountedAmount('');
              Alert.alert('Sucesso', 'Caixa fechado com sucesso!');
            } catch (e) {
              Alert.alert('Erro', 'Não foi possível fechar o caixa no banco.');
              console.error(e);
            }
          }
        },
      ]
    );
  };

  const handleAddMovement = () => {
    if (!openCashRegister) return;
    const val = parseFloat(movValue);
    const motivo = movMotivo.trim();

    if (isNaN(val) || val <= 0) {
      Alert.alert('Erro', 'Insira um valor de movimento válido.');
      return;
    }
    if (!motivo) {
      Alert.alert('Erro', 'Insira um motivo para a movimentação.');
      return;
    }

    try {
      insertCashMovementInDb({
        cashRegisterId: openCashRegister.id,
        tipo: movType,
        valor: val,
        motivo,
        timestamp: Date.now()
      });
      
      setMovValue('');
      setMovMotivo('');
      reloadMovements();
      Alert.alert('Sucesso', `Movimento de ${movType === 'reforco' ? 'Reforço' : 'Sangria'} registrado.`);
    } catch (e) {
      Alert.alert('Erro', 'Erro ao gravar movimento no banco.');
      console.error(e);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Caixa</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!openCashRegister ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Abrir Caixa Diário</Text>
              <Text style={styles.cardSubtitle}>Informe o valor em dinheiro disponível para fundo de troco.</Text>
              
              <TextInput
                style={styles.input}
                value={initialAmount}
                onChangeText={setInitialAmount}
                keyboardType="numeric"
                placeholder="0.00 Kz"
              />
              
              <TouchableOpacity style={styles.button} onPress={handleOpenCashRegister}>
                <Text style={styles.buttonText}>Abrir Caixa</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Resumo do Caixa */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Status do Caixa</Text>
                
                <View style={styles.row}>
                  <Text style={styles.infoLabel}>Abertura:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(openCashRegister.dataAbertura).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.infoLabel}>Fundo de Troco:</Text>
                  <Text style={styles.infoValue}>{openCashRegister.valorInicial} Kz</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.infoLabel}>Total Estimado (Fundo + Entradas):</Text>
                  <Text style={[styles.infoValue, { color: '#0066CC', fontSize: 20 }]}>
                    {expectedAmount} Kz
                  </Text>
                </View>
              </View>

              {/* Lançar Sangria / Reforço */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Adicionar Movimento Manual</Text>
                
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[styles.typeButton, movType === 'reforco' && styles.typeButtonActive]}
                    onPress={() => setMovType('reforco')}
                  >
                    <Text style={[styles.typeButtonText, movType === 'reforco' && styles.typeButtonTextActive]}>
                      📥 Reforço (+ Entrada)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.typeButton, movType === 'sangria' && styles.typeButtonActive, { borderColor: '#F44336' }]}
                    onPress={() => setMovType('sangria')}
                  >
                    <Text style={[styles.typeButtonText, movType === 'sangria' && styles.typeButtonTextActive, movType === 'sangria' && { backgroundColor: '#F44336' }]}>
                      📤 Sangria (- Saída)
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>Valor (Kz)</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={movValue}
                  onChangeText={setMovValue}
                  keyboardType="numeric"
                  placeholder="0.00 Kz"
                />

                <Text style={styles.fieldLabel}>Motivo / Justificativa</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={movMotivo}
                  onChangeText={setMovMotivo}
                  placeholder="Ex: Reforço de troco ou Compra de copos descartáveis"
                />

                <TouchableOpacity 
                  style={[styles.button, movType === 'sangria' && { backgroundColor: '#F44336' }]} 
                  onPress={handleAddMovement}
                >
                  <Text style={styles.buttonText}>Registrar Movimento</Text>
                </TouchableOpacity>
              </View>

              {/* Movimentos do Dia */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Histórico de Movimentos</Text>
                {movements.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhum movimento registrado neste turno.</Text>
                ) : (
                  movements.map((m) => (
                    <View key={m.id} style={styles.movementRow}>
                      <View>
                        <Text style={styles.movementMotivo}>{m.motivo || m.tipo.toUpperCase()}</Text>
                        <Text style={styles.movementDate}>
                          {new Date(m.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                      <Text style={[
                        styles.movementValue,
                        { color: m.tipo === 'sangria' ? '#F44336' : '#4CAF50' }
                      ]}>
                        {m.tipo === 'sangria' ? '-' : '+'}{m.valor} Kz
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {/* Fechar Caixa */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Fechar Caixa Diário</Text>
                <Text style={styles.cardSubtitle}>Conte as cédulas físicas da gaveta e informe o valor abaixo.</Text>
                
                <TextInput
                  style={styles.input}
                  value={countedAmount}
                  onChangeText={setCountedAmount}
                  keyboardType="numeric"
                  placeholder="0.00 Kz"
                />
                
                <TouchableOpacity style={styles.closeButton} onPress={handleCloseCashRegister}>
                  <Text style={styles.buttonText}>Fechar Caixa</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: 10,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  fieldLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    marginBottom: 15,
    color: '#333',
  },
  inputSmall: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    marginBottom: 12,
    color: '#333',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#E8F5E9',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  typeButtonTextActive: {
    color: '#1B5E20',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButton: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    padding: 15,
  },
  movementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  movementMotivo: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  movementDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  movementValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
