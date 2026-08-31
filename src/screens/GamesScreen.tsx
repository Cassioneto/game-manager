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
import { Game } from '../types';

export default function GamesScreen() {
  const games = useStore((state) => state.games);
  const addGame = useStore((state) => state.addGame);
  const updateGame = useStore((state) => state.updateGame);
  const removeGame = useStore((state) => state.removeGame);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPaymentType, setNewPaymentType] = useState<Game['tipoPagamento']>('tempo');

  const handleAddGame = () => {
    const nome = newName.trim();
    if (!nome) {
      Alert.alert('Erro', 'Digite o nome do jogo');
      return;
    }
    addGame({ nome, categoria: newCategory.trim() || undefined, tipoPagamento: newPaymentType });
    setNewName('');
    setNewCategory('');
    setNewPaymentType('tempo');
  };

  const handleRemoveGame = (game: Game) => {
    Alert.alert('Remover Jogo', `Remover "${game.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeGame(game.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Jogos Cadastrados</Text>

          {games.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum jogo cadastrado ainda.</Text>
          ) : (
            games.map((game) => (
              <View key={game.id} style={styles.gameRow}>
                <View style={styles.gameRowHeader}>
                  <Text style={styles.gameLabel}>Nome</Text>
                  <TouchableOpacity onPress={() => handleRemoveGame(game)}>
                    <Text style={styles.removeText}>Remover</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  value={game.nome}
                  onChangeText={(text) => updateGame(game.id, { nome: text })}
                  placeholder="Nome do jogo"
                />

                <Text style={styles.gameLabel}>Categoria</Text>
                <TextInput
                  style={styles.input}
                  value={game.categoria ?? ''}
                  onChangeText={(text) => updateGame(game.id, { categoria: text })}
                  placeholder="Categoria (opcional)"
                />

                <Text style={styles.gameLabel}>Tipo de Pagamento</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      game.tipoPagamento === 'tempo' && styles.toggleButtonActive,
                    ]}
                    onPress={() => updateGame(game.id, { tipoPagamento: 'tempo' })}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        game.tipoPagamento === 'tempo' && styles.toggleButtonTextActive,
                      ]}
                    >
                      Por Tempo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      game.tipoPagamento === 'jogo' && styles.toggleButtonActive,
                    ]}
                    onPress={() => updateGame(game.id, { tipoPagamento: 'jogo' })}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        game.tipoPagamento === 'jogo' && styles.toggleButtonTextActive,
                      ]}
                    >
                      Por Jogo
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Adicionar Novo Jogo</Text>

          <Text style={styles.gameLabel}>Nome</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Ex: Street Fighter 6"
          />

          <Text style={styles.gameLabel}>Categoria</Text>
          <TextInput
            style={styles.input}
            value={newCategory}
            onChangeText={setNewCategory}
            placeholder="Ex: Luta"
          />

          <Text style={styles.gameLabel}>Tipo de Pagamento</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleButton, newPaymentType === 'tempo' && styles.toggleButtonActive]}
              onPress={() => setNewPaymentType('tempo')}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  newPaymentType === 'tempo' && styles.toggleButtonTextActive,
                ]}
              >
                Por Tempo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, newPaymentType === 'jogo' && styles.toggleButtonActive]}
              onPress={() => setNewPaymentType('jogo')}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  newPaymentType === 'jogo' && styles.toggleButtonTextActive,
                ]}
              >
                Por Jogo
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={handleAddGame}>
            <Text style={styles.addButtonText}>+ Adicionar Jogo</Text>
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
  gameRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    marginTop: 15,
  },
  gameRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
    marginTop: 8,
  },
  removeText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: 'bold',
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
  toggleRow: {
    flexDirection: 'row',
    marginTop: 5,
  },
  toggleButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#0066CC',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#0066CC',
  },
  toggleButtonText: {
    color: '#0066CC',
    fontWeight: 'bold',
    fontSize: 13,
  },
  toggleButtonTextActive: {
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
