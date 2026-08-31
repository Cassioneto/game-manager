import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { getDb } from '../database/db';
import { Customer } from '../types';
import { getCustomersFromDb, insertCustomerInDb, updateCustomerPointsInDb } from '../database/queries';

export default function LoyaltyScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Add Customer Form
  const [newNome, setNewNome] = useState('');
  const [newContacto, setNewContacto] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const rewardOptions = [
    { id: 1, nome: '30 min grátis', pontos: 100 },
    { id: 2, nome: '1 hora grátis', pontos: 200 },
    { id: 3, nome: 'Água 500ml', pontos: 50 },
    { id: 4, nome: 'Pipoca', pontos: 100 },
  ];

  const loadCustomers = () => {
    try {
      const list = getCustomersFromDb();
      setCustomers(list);
      
      // Update selected customer if already chosen
      if (selectedCustomer) {
        const updatedSelected = list.find(c => c.id === selectedCustomer.id);
        if (updatedSelected) {
          setSelectedCustomer(updatedSelected);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadTransactions = (customerId: number) => {
    try {
      const db = getDb();
      const list = db.getAllSync<any>(
        'SELECT * FROM loyalty_transactions WHERE customer_id = ? ORDER BY timestamp DESC',
        customerId
      );
      setTransactions(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadTransactions(selectedCustomer.id);
    } else {
      setTransactions([]);
    }
  }, [selectedCustomer]);

  const handleCreateCustomer = () => {
    const nome = newNome.trim();
    const contacto = newContacto.trim();
    if (!nome) {
      Alert.alert('Erro', 'Por favor, insira o nome do cliente.');
      return;
    }

    try {
      insertCustomerInDb({
        nome,
        contacto: contacto || undefined
      });
      setNewNome('');
      setNewContacto('');
      setShowAddForm(false);
      loadCustomers();
      Alert.alert('Sucesso', 'Cliente cadastrado com sucesso!');
    } catch (e) {
      Alert.alert('Erro', 'Erro ao cadastrar cliente.');
      console.error(e);
    }
  };

  const handleRedeem = (reward: any) => {
    if (!selectedCustomer) {
      Alert.alert('Erro', 'Selecione um cliente primeiro.');
      return;
    }
    if (selectedCustomer.pontosSaldo < reward.pontos) {
      Alert.alert('Erro', 'Pontos insuficientes para este resgate.');
      return;
    }

    Alert.alert(
      'Confirmar Resgate',
      `Resgatar "${reward.nome}" por ${reward.pontos} pontos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: () => {
            try {
              const db = getDb();
              const now = Date.now();
              const nextPoints = selectedCustomer.pontosSaldo - reward.pontos;

              // 1. Deduct points
              updateCustomerPointsInDb(selectedCustomer.id, nextPoints);

              // 2. Insert transaction
              db.runSync(
                'INSERT INTO loyalty_transactions (customer_id, pontos, tipo, origem, data) VALUES (?, ?, ?, ?, ?)',
                selectedCustomer.id,
                -reward.pontos,
                'resgate',
                'resgate_produto',
                new Date(now).toLocaleString()
              );

              loadCustomers();
              Alert.alert('Sucesso', 'Resgate efetuado com sucesso!');
            } catch (e) {
              Alert.alert('Erro', 'Não foi possível salvar o resgate no banco.');
              console.error(e);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sistema de Fidelidade</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Toggle add customer */}
        <TouchableOpacity style={[styles.addButton, { marginBottom: 15 }]} onPress={() => setShowAddForm(!showAddForm)}>
          <Text style={styles.addButtonText}>
            {showAddForm ? 'Fechar Formulário' : '+ Cadastrar Novo Cliente'}
          </Text>
        </TouchableOpacity>

        {/* Add Customer Form */}
        {showAddForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Novo Cliente</Text>
            
            <Text style={styles.fieldLabel}>Nome do Cliente</Text>
            <TextInput
              style={styles.input}
              value={newNome}
              onChangeText={setNewNome}
              placeholder="Ex: João da Silva"
            />

            <Text style={styles.fieldLabel}>Contacto (Telemóvel)</Text>
            <TextInput
              style={styles.input}
              value={newContacto}
              onChangeText={setNewContacto}
              keyboardType="phone-pad"
              placeholder="Ex: 923456789"
            />

            <TouchableOpacity style={[styles.addButton, { backgroundColor: '#4CAF50', marginTop: 10 }]} onPress={handleCreateCustomer}>
              <Text style={styles.addButtonText}>Salvar Cliente</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Customer Select List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selecionar Cliente</Text>
          {customers.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum cliente cadastrado ainda.</Text>
          ) : (
            customers.map((customer) => (
              <TouchableOpacity
                key={customer.id}
                style={[
                  styles.customerItem,
                  selectedCustomer?.id === customer.id && styles.selectedCustomer
                ]}
                onPress={() => setSelectedCustomer(customer)}
              >
                <View>
                  <Text style={styles.customerName}>{customer.nome}</Text>
                  {customer.contacto ? (
                    <Text style={styles.customerContact}>{customer.contacto}</Text>
                  ) : null}
                </View>
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsText}>{customer.pontosSaldo} pts</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Redeem Reward Section */}
        {selectedCustomer && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resgatar Prêmios</Text>
            <Text style={styles.cardSubtitle}>Saldo atual: {selectedCustomer.pontosSaldo} pontos</Text>
            
            {rewardOptions.map((reward) => (
              <TouchableOpacity
                key={reward.id}
                style={styles.rewardItem}
                onPress={() => handleRedeem(reward)}
                activeOpacity={0.7}
              >
                <Text style={styles.rewardName}>{reward.nome}</Text>
                <Text style={styles.rewardPoints}>{reward.pontos} pts</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Customer Extract Log */}
        {selectedCustomer && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Extrato de Pontos</Text>
            {transactions.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma movimentação registrada.</Text>
            ) : (
              transactions.map((t) => (
                <View key={t.id} style={styles.transactionItem}>
                  <View>
                    <Text style={[
                      styles.transactionType,
                      { color: t.pontos < 0 ? '#F44336' : '#4CAF50' }
                    ]}>
                      {t.pontos > 0 ? '+' : ''}{t.pontos} pts
                    </Text>
                    <Text style={styles.transactionOrigin}>
                      Origem: {t.origem.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.transactionDate}>{t.data}</Text>
                </View>
              ))
            )}
          </View>
        )}
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
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
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
    padding: 12,
    fontSize: 15,
    marginBottom: 10,
    color: '#333',
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCustomer: {
    borderColor: '#0066CC',
    backgroundColor: '#E6F4FE',
  },
  customerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  customerContact: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  pointsBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pointsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  rewardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 10,
  },
  rewardName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  rewardPoints: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  transactionType: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  transactionOrigin: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: '#999',
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
  emptyText: {
    color: '#999',
    textAlign: 'center',
    padding: 15,
  },
});
