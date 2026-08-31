import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useStore } from '../store/useStore';
import { Game, PriceRule } from '../types';
import { getPriceRulesFromDb, savePriceRulesInDb } from '../database/queries';

export default function PricingScreen() {
  const games = useStore((state) => state.games);
  const [selectedGameType, setSelectedGameType] = useState<'tempo' | 'jogo'>('tempo');
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  
  const [gameRules, setGameRules] = useState<{ [gameId: number]: PriceRule[] }>({});
  const [customMinutes, setCustomMinutes] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  // Load rules for all games when mounting or games list updates
  const loadRules = () => {
    const rulesMap: { [gameId: number]: PriceRule[] } = {};
    for (const game of games) {
      rulesMap[game.id] = getPriceRulesFromDb(game.id);
    }
    setGameRules(rulesMap);
  };

  useEffect(() => {
    loadRules();
  }, [games]);

  const handleUpdatePrice = (gameId: number, ruleId: number, text: string) => {
    const price = parseFloat(text) || 0;
    const currentRules = gameRules[gameId] || [];
    const updated = currentRules.map(r => r.id === ruleId ? { ...r, preco: price } : r);
    setGameRules({
      ...gameRules,
      [gameId]: updated
    });
  };

  const handleSavePrices = (gameId: number) => {
    const rules = gameRules[gameId] || [];
    try {
      savePriceRulesInDb(gameId, rules.map(r => ({
        gameId: r.gameId,
        duracaoMinutos: r.duracaoMinutos,
        preco: r.preco
      })));
      Alert.alert('Sucesso', 'Tabela de preços atualizada com sucesso!');
      loadRules();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar os preços no banco.');
      console.error(e);
    }
  };

  const handleAddCustomDuration = (gameId: number) => {
    const mins = parseInt(customMinutes);
    const price = parseFloat(customPrice);

    if (isNaN(mins) || mins <= 0) {
      Alert.alert('Erro', 'Informe uma duração válida em minutos.');
      return;
    }
    if (isNaN(price) || price < 0) {
      Alert.alert('Erro', 'Informe um preço válido.');
      return;
    }

    const currentRules = gameRules[gameId] || [];
    
    // Check duplicate duration
    if (currentRules.some(r => r.duracaoMinutos === mins)) {
      Alert.alert('Erro', 'Já existe uma regra de preço para esta duração.');
      return;
    }

    const newRule: PriceRule = {
      id: Date.now(), // temporary id
      gameId,
      duracaoMinutos: mins,
      preco: price
    };

    const updated = [...currentRules, newRule].sort((a, b) => a.duracaoMinutos - b.duracaoMinutos);
    
    try {
      savePriceRulesInDb(gameId, updated.map(r => ({
        gameId: r.gameId,
        duracaoMinutos: r.duracaoMinutos,
        preco: r.preco
      })));
      Alert.alert('Sucesso', `Duração de ${mins} minutos adicionada.`);
      setCustomMinutes('');
      setCustomPrice('');
      loadRules();
    } catch (e) {
      Alert.alert('Erro', 'Erro ao salvar regra no banco.');
      console.error(e);
    }
  };

  const handleDeleteRule = (gameId: number, ruleId: number) => {
    const currentRules = gameRules[gameId] || [];
    const updated = currentRules.filter(r => r.id !== ruleId);
    
    Alert.alert('Remover Preço', 'Deseja excluir este intervalo de preço?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          try {
            savePriceRulesInDb(gameId, updated.map(r => ({
              gameId: r.gameId,
              duracaoMinutos: r.duracaoMinutos,
              preco: r.preco
            })));
            loadRules();
          } catch (e) {
            Alert.alert('Erro', 'Não foi possível salvar.');
          }
        }
      }
    ]);
  };

  const handleUpdateFlatPrice = (gameId: number, text: string) => {
    const price = parseFloat(text) || 0;
    const currentRules = gameRules[gameId] || [];
    
    let updated: PriceRule[] = [];
    if (currentRules.length > 0) {
      updated = [{ ...currentRules[0], preco: price }];
    } else {
      updated = [{ id: Date.now(), gameId, duracaoMinutos: 0, preco: price }];
    }

    setGameRules({
      ...gameRules,
      [gameId]: updated
    });
  };

  const filteredGames = games.filter(g => g.tipoPagamento === selectedGameType);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tabela de Preços</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tipo de Pagamento */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Filtrar Tipo</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeButton, selectedGameType === 'tempo' && styles.selectedType]}
              onPress={() => {
                setSelectedGameType('tempo');
                setSelectedGameId(null);
              }}
            >
              <Text style={[styles.typeText, selectedGameType === 'tempo' && styles.selectedTypeText]}>⏱️ Por Tempo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, selectedGameType === 'jogo' && styles.selectedType]}
              onPress={() => {
                setSelectedGameType('jogo');
                setSelectedGameId(null);
              }}
            >
              <Text style={[styles.typeText, selectedGameType === 'jogo' && styles.selectedTypeText]}>🎮 Por Jogo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {filteredGames.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>Nenhum jogo cadastrado para esta categoria.</Text>
          </View>
        ) : (
          filteredGames.map((game) => {
            const rules = gameRules[game.id] || [];
            const isEditingCustom = selectedGameId === game.id;

            return (
              <View key={game.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.gameName}>{game.nome}</Text>
                  <Text style={styles.gameCat}>{game.categoria || 'Geral'}</Text>
                </View>

                {game.tipoPagamento === 'tempo' ? (
                  <View>
                    <View style={styles.priceTable}>
                      <View style={styles.tableHeader}>
                        <Text style={styles.tableHeaderText}>Duração</Text>
                        <Text style={styles.tableHeaderText}>Preço (Kz)</Text>
                        <Text style={styles.tableHeaderText}>Ações</Text>
                      </View>
                      
                      {rules.filter(r => r.duracaoMinutos > 0).map((rule) => (
                        <View key={rule.id} style={styles.tableRow}>
                          <Text style={styles.tableCell}>{rule.duracaoMinutos} min</Text>
                          <TextInput 
                            style={styles.priceInput}
                            value={rule.preco.toString()}
                            onChangeText={(text) => handleUpdatePrice(game.id, rule.id, text)}
                            keyboardType="numeric"
                          />
                          <TouchableOpacity 
                            style={styles.deleteRuleBtn}
                            onPress={() => handleDeleteRule(game.id, rule.id)}
                          >
                            <Text style={styles.deleteRuleText}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    {rules.filter(r => r.duracaoMinutos > 0).length > 0 && (
                      <TouchableOpacity 
                        style={styles.saveButton}
                        onPress={() => handleSavePrices(game.id)}
                      >
                        <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                      </TouchableOpacity>
                    )}

                    {/* Duração Personalizada */}
                    {!isEditingCustom ? (
                      <TouchableOpacity 
                        style={styles.addCustomToggle}
                        onPress={() => setSelectedGameId(game.id)}
                      >
                        <Text style={styles.addCustomToggleText}>+ Adicionar Intervalo</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.customDurationRow}>
                        <TextInput
                          style={[styles.customInput, { flex: 1 }]}
                          placeholder="Minutos"
                          value={customMinutes}
                          onChangeText={setCustomMinutes}
                          keyboardType="numeric"
                        />
                        <TextInput
                          style={[styles.customInput, { flex: 1.2 }]}
                          placeholder="Preço (Kz)"
                          value={customPrice}
                          onChangeText={setCustomPrice}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity 
                          style={styles.addRuleButton}
                          onPress={() => handleAddCustomDuration(game.id)}
                        >
                          <Text style={styles.addRuleText}>Salvar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.cancelRuleButton}
                          onPress={() => {
                            setSelectedGameId(null);
                            setCustomMinutes('');
                            setCustomPrice('');
                          }}
                        >
                          <Text style={styles.cancelRuleText}>X</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  // Por jogo
                  <View>
                    <View style={styles.gamePriceContainer}>
                      <Text style={styles.gamePriceLabel}>Preço da Partida:</Text>
                      <TextInput 
                        style={styles.gamePriceInput}
                        value={rules[0]?.preco.toString() || '50'}
                        onChangeText={(text) => handleUpdateFlatPrice(game.id, text)}
                        keyboardType="numeric"
                      />
                      <Text style={styles.gamePriceUnit}>Kz</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.saveButton}
                      onPress={() => handleSavePrices(game.id)}
                    >
                      <Text style={styles.saveButtonText}>Salvar Preço</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 8,
  },
  gameName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  gameCat: {
    fontSize: 12,
    color: '#888',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedType: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  typeText: {
    fontSize: 15,
    color: '#666',
    fontWeight: 'bold',
  },
  selectedTypeText: {
    color: '#fff',
  },
  priceTable: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 6,
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
  },
  deleteRuleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteRuleText: {
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addCustomToggle: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  addCustomToggleText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  customDurationRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  customInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#333',
  },
  addRuleButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addRuleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cancelRuleButton: {
    backgroundColor: '#EEE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  cancelRuleText: {
    color: '#666',
    fontWeight: 'bold',
  },
  gamePriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  gamePriceLabel: {
    fontSize: 15,
    color: '#666',
  },
  gamePriceInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  gamePriceUnit: {
    fontSize: 15,
    color: '#666',
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    padding: 10,
  },
});
