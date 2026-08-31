import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { getDb } from '../database/db';
import { useStore } from '../store/useStore';

export default function HappyHourScreen() {
  const games = useStore((state) => state.games);
  
  const [rules, setRules] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1); // Monday default
  const [startHour, setStartHour] = useState('');
  const [endHour, setEndHour] = useState('');
  const [durMin, setDurMin] = useState('60');
  const [promoPrice, setPromoPrice] = useState('');

  const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const loadRules = () => {
    try {
      const db = getDb();
      const list = db.getAllSync<any>(
        `SELECT h.*, g.nome as game_name 
         FROM happy_hour_rules h
         JOIN games g ON h.game_id = g.id`
      );
      setRules(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const toggleRule = (id: number, currentVal: number) => {
    try {
      const db = getDb();
      const nextVal = currentVal === 1 ? 0 : 1;
      db.runSync('UPDATE happy_hour_rules SET ativo = ? WHERE id = ?', nextVal, id);
      loadRules();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível atualizar a regra.');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Excluir Regra',
      'Deseja excluir esta regra de promoção?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: () => {
            try {
              const db = getDb();
              db.runSync('DELETE FROM happy_hour_rules WHERE id = ?', id);
              loadRules();
            } catch (e) {
              Alert.alert('Erro', 'Não foi possível excluir a regra.');
            }
          } 
        },
      ]
    );
  };

  const isActiveNow = (rule: any) => {
    if (rule.ativo === 0) return false;
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = rule.hora_inicio.split(':').map(Number);
    const [endH, endM] = rule.hora_fim.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    return currentDay === rule.dia_semana && currentTime >= startMinutes && currentTime <= endMinutes;
  };

  const handleCreateRule = () => {
    if (!selectedGameId) {
      Alert.alert('Erro', 'Por favor, selecione um jogo.');
      return;
    }
    if (!startHour || !endHour) {
      Alert.alert('Erro', 'Preencha a hora de início e de fim.');
      return;
    }
    const mins = parseInt(durMin);
    const price = parseFloat(promoPrice);

    if (isNaN(mins) || mins <= 0) {
      Alert.alert('Erro', 'Informe a duração válida.');
      return;
    }
    if (isNaN(price) || price < 0) {
      Alert.alert('Erro', 'Informe o preço promocional.');
      return;
    }

    try {
      const db = getDb();
      db.runSync(
        'INSERT INTO happy_hour_rules (game_id, dia_semana, hora_inicio, hora_fim, duracao_minutos, preco_promo, ativo) VALUES (?, ?, ?, ?, ?, ?, ?)',
        selectedGameId,
        selectedDay,
        startHour,
        endHour,
        mins,
        price,
        1
      );

      setSelectedGameId(null);
      setStartHour('');
      setEndHour('');
      setPromoPrice('');
      loadRules();
      Alert.alert('Sucesso', 'Regra de Happy Hour criada!');
    } catch (e) {
      Alert.alert('Erro', 'Erro ao salvar no banco.');
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Happy Hour</Text>
        <Text style={styles.subtitle}>Promoções por Horário</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Promos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔥 Promoções Ativas Agora</Text>
          {rules.filter(isActiveNow).length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma promoção ativa no momento</Text>
          ) : (
            rules.filter(isActiveNow).map((rule) => (
              <View key={rule.id} style={styles.activePromo}>
                <Text style={styles.activePromoGame}>{rule.game_name}</Text>
                <Text style={styles.activePromoPrice}>{rule.preco_promo} Kz</Text>
                <Text style={styles.activePromoTime}>
                  {daysOfWeek[rule.dia_semana]} • {rule.hora_inicio} - {rule.hora_fim}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Rules List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Regras de Promoção</Text>
          {rules.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma regra cadastrada ainda.</Text>
          ) : (
            rules.map((rule) => (
              <View key={rule.id} style={styles.ruleItem}>
                <View style={styles.ruleHeader}>
                  <Text style={styles.ruleGame}>{rule.game_name}</Text>
                  <Switch
                    value={rule.ativo === 1}
                    onValueChange={() => toggleRule(rule.id, rule.ativo)}
                    trackColor={{ false: '#767577', true: '#FF9800' }}
                  />
                </View>
                
                <View style={styles.ruleDetails}>
                  <Text style={styles.ruleDetail}>📅 {daysOfWeek[rule.dia_semana]}</Text>
                  <Text style={styles.ruleDetail}>⏰ {rule.hora_inicio} - {rule.hora_fim}</Text>
                  <Text style={styles.ruleDetail}>⏱️ {rule.duracao_minutos} min</Text>
                  <Text style={styles.ruleDetail}>💰 {rule.preco_promo} Kz (promoção)</Text>
                </View>

                {isActiveNow(rule) && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>ATIVO AGORA</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(rule.id)}>
                  <Text style={styles.deleteButtonText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* New Rule Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nova Regra de Promoção</Text>
          
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

          <Text style={styles.label}>Dia da Semana</Text>
          <ScrollView horizontal style={styles.horizontalScroll}>
            {daysOfWeek.map((day, index) => {
              const isSel = selectedDay === index;
              return (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.chip, isSel && styles.selectedChip]}
                  onPress={() => setSelectedDay(index)}
                >
                  <Text style={[styles.chipText, isSel && styles.selectedChipText]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Hora Início (HH:MM)</Text>
              <TextInput 
                style={styles.input} 
                value={startHour}
                onChangeText={setStartHour}
                placeholder="Ex: 14:00" 
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Hora Fim (HH:MM)</Text>
              <TextInput 
                style={styles.input} 
                value={endHour}
                onChangeText={setEndHour}
                placeholder="Ex: 18:00" 
              />
            </View>
          </View>

          <Text style={styles.label}>Duração (minutos)</Text>
          <TextInput 
            style={styles.input} 
            value={durMin}
            onChangeText={setDurMin}
            keyboardType="numeric" 
          />

          <Text style={styles.label}>Preço Promocional (Kz)</Text>
          <TextInput 
            style={styles.input} 
            value={promoPrice}
            onChangeText={setPromoPrice}
            keyboardType="numeric"
            placeholder="Ex: 35"
          />

          <TouchableOpacity style={styles.button} onPress={handleCreateRule}>
            <Text style={styles.buttonText}>Criar Regra</Text>
          </TouchableOpacity>
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
    backgroundColor: '#FF9800',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFF3E0',
    marginTop: 5,
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
  emptyText: {
    color: '#999',
    textAlign: 'center',
    padding: 15,
  },
  activePromo: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  activePromoGame: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  activePromoPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 5,
  },
  activePromoTime: {
    fontSize: 13,
    color: '#666',
    marginTop: 5,
  },
  ruleItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ruleGame: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ruleDetails: {
    marginTop: 5,
  },
  ruleDetail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 8,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  deleteButton: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 13,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginTop: 12,
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
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
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
  button: {
    backgroundColor: '#FF9800',
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
});
