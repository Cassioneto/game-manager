import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useStore } from '../store/useStore';
import { Game, PriceRule } from '../types';
import { getPriceRulesFromDb, insertSessionInDb, insertCashMovementInDb } from '../database/queries';
import { scheduleSessionEndNotifications } from '../notifications';

export default function StartSessionScreen({ route, navigation }: any) {
  const { machineId, machineName } = route.params || {};
  const games = useStore((state) => state.games);
  const openCashRegister = useStore((state) => state.openCashRegister);

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'jogo' | 'tempo' | null>(null);
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<PriceRule | null>(null);
  const [isTempoLivre, setIsTempoLivre] = useState(false);

  // Load rules when game is selected
  useEffect(() => {
    if (selectedGame) {
      const rules = getPriceRulesFromDb(selectedGame.id);
      setPriceRules(rules);
      setSelectedRule(null);
      setIsTempoLivre(false);
    } else {
      setPriceRules([]);
    }
  }, [selectedGame]);

  const handleSelectGame = (game: Game) => {
    setSelectedGame(game);
    setSelectedPaymentType(game.tipoPagamento);
  };

  const handleStart = () => {
    if (!openCashRegister) {
      Alert.alert('Caixa Fechado', 'Por favor, abra o caixa antes de iniciar uma sessão.');
      return;
    }
    if (!selectedGame) {
      Alert.alert('Atenção', 'Por favor selecione um jogo.');
      return;
    }
    if (!selectedPaymentType) {
      Alert.alert('Atenção', 'Por favor selecione o tipo de pagamento.');
      return;
    }

    let duration = 0;
    let price = 0;

    if (selectedPaymentType === 'jogo') {
      const rule = priceRules.find(r => r.gameId === selectedGame.id);
      price = rule ? rule.preco : 50;
      duration = 0; // "jogo" payment type doesn't have duration limits
    } else {
      // tempo
      if (!isTempoLivre && !selectedRule) {
        Alert.alert('Atenção', 'Por favor selecione uma duração ou escolha Tempo Livre.');
        return;
      }
      if (isTempoLivre) {
        duration = 0;
        price = 0;
      } else if (selectedRule) {
        duration = selectedRule.duracaoMinutos;
        price = selectedRule.preco;
      }
    }

    const now = Date.now();
    const fimPrevisto = duration > 0 ? now + duration * 60 * 1000 : null;

    try {
      // 1. Insert session in SQLite
      const newSession = insertSessionInDb({
        machineId,
        gameId: selectedGame.id,
        inicio: now,
        fimPrevisto: fimPrevisto || undefined,
        duracaoMinutos: duration,
        valorCobrado: price,
        status: 'ativa',
        tipoPagamento: selectedPaymentType,
        cashRegisterId: openCashRegister.id
      });

      // 2. Update machine status to occupied in SQLite and Zustand
      useStore.getState().updateMachine(machineId, { status: 'ocupada' });

      // 3. Insert cash movement in SQLite
      if (price > 0) {
        insertCashMovementInDb({
          cashRegisterId: openCashRegister.id,
          tipo: 'sessao',
          valor: price,
          motivo: `Sessão da máquina ${machineName || machineId} - Jogo: ${selectedGame.nome}`,
          timestamp: now
        });
      }

      // 4. Add active session to Zustand
      useStore.getState().addActiveSession(newSession);

      // 5. Schedule "5 min left" / "time's up" alerts (fires even backgrounded/locked)
      if (newSession.fimPrevisto) {
        scheduleSessionEndNotifications(newSession.id, machineName || `Máquina ${machineId}`, newSession.fimPrevisto);
      }

      // 5. Replace screen with Session details
      navigation.replace('Session', {
        machineId,
        machineName,
        gameId: selectedGame.id,
        gameName: selectedGame.nome,
        paymentType: selectedPaymentType,
        sessionId: newSession.id,
      });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível iniciar a sessão no banco de dados.');
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Iniciar Sessão</Text>
        <Text style={styles.subtitle}>{machineName || `Máquina ${machineId}`}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Secção: Escolher Jogo */}
        <Text style={styles.sectionTitle}>Escolher Jogo</Text>

        {games.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Nenhum jogo cadastrado. Vá a Configurações {'>'} Jogos para adicionar.
            </Text>
          </View>
        ) : (
          games.map((game) => {
            const isSelected = selectedGame?.id === game.id;
            return (
              <TouchableOpacity
                key={game.id}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => handleSelectGame(game)}
                activeOpacity={0.8}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <View>
                    <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                      {game.nome}
                    </Text>
                    {game.categoria ? (
                      <Text style={styles.optionSub}>{game.categoria}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={[
                  styles.badge,
                  game.tipoPagamento === 'jogo' ? styles.badgeJogo : styles.badgeTempo,
                ]}>
                  <Text style={styles.badgeText}>
                    {game.tipoPagamento === 'jogo' ? 'Por Jogo' : 'Por Tempo'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Secção: Tipo de Pagamento */}
        {selectedGame && (
          <>
            <Text style={styles.sectionTitle}>Tipo de Pagamento</Text>
            <Text style={styles.sectionHint}>
              Pode escolher qualquer tipo de pagamento, independentemente do padrão do jogo.
            </Text>

            <View style={styles.paymentRow}>
              {/* Por Jogo */}
              <TouchableOpacity
                style={[
                  styles.paymentCard,
                  selectedPaymentType === 'jogo' && styles.paymentCardSelected,
                ]}
                onPress={() => {
                  setSelectedPaymentType('jogo');
                  setSelectedRule(null);
                  setIsTempoLivre(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.paymentIcon}>🎮</Text>
                <Text style={[
                  styles.paymentLabel,
                  selectedPaymentType === 'jogo' && styles.paymentLabelSelected,
                ]}>
                  Por Jogo
                </Text>
                <Text style={[
                  styles.paymentDesc,
                  selectedPaymentType === 'jogo' && styles.paymentDescSelected,
                ]}>
                  Cobra por cada partida jogada
                </Text>
              </TouchableOpacity>

              {/* Por Tempo */}
              <TouchableOpacity
                style={[
                  styles.paymentCard,
                  selectedPaymentType === 'tempo' && styles.paymentCardSelected,
                ]}
                onPress={() => setSelectedPaymentType('tempo')}
                activeOpacity={0.8}
              >
                <Text style={styles.paymentIcon}>⏱️</Text>
                <Text style={[
                  styles.paymentLabel,
                  selectedPaymentType === 'tempo' && styles.paymentLabelSelected,
                ]}>
                  Por Tempo
                </Text>
                <Text style={[
                  styles.paymentDesc,
                  selectedPaymentType === 'tempo' && styles.paymentDescSelected,
                ]}>
                  Cobra por minutos de uso
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Secção: Duração (apenas se for por Tempo) */}
        {selectedGame && selectedPaymentType === 'tempo' && (
          <>
            <Text style={styles.sectionTitle}>Selecione a Duração</Text>
            {priceRules.filter(r => r.duracaoMinutos > 0).map((rule) => {
              const isRuleSelected = selectedRule?.id === rule.id && !isTempoLivre;
              return (
                <TouchableOpacity
                  key={rule.id}
                  style={[styles.optionCard, isRuleSelected && styles.optionCardSelected]}
                  onPress={() => {
                    setSelectedRule(rule);
                    setIsTempoLivre(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.radio, isRuleSelected && styles.radioSelected]}>
                      {isRuleSelected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.optionTitle, isRuleSelected && styles.optionTitleSelected]}>
                      {rule.duracaoMinutos} Minutos
                    </Text>
                  </View>
                  <Text style={styles.priceLabel}>{rule.preco} Kz</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.optionCard, isTempoLivre && styles.optionCardSelected]}
              onPress={() => {
                setIsTempoLivre(true);
                setSelectedRule(null);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.radio, isTempoLivre && styles.radioSelected]}>
                  {isTempoLivre && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.optionTitle, isTempoLivre && styles.optionTitleSelected]}>
                  Tempo Livre (Cobrado no encerramento)
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Resumo */}
        {selectedGame && selectedPaymentType && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Resumo da Sessão</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Máquina</Text>
              <Text style={styles.summaryValue}>{machineName || `Máquina ${machineId}`}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Jogo</Text>
              <Text style={styles.summaryValue}>{selectedGame.nome}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pagamento</Text>
              <Text style={styles.summaryValue}>
                {selectedPaymentType === 'jogo' ? 'Por Jogo' : 'Por Tempo'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Preço inicial</Text>
              <Text style={styles.summaryValue}>
                {selectedPaymentType === 'jogo'
                  ? `${priceRules.find(r => r.gameId === selectedGame.id)?.preco || 50} Kz`
                  : isTempoLivre
                  ? 'Calculado ao encerrar'
                  : `${selectedRule?.preco || 0} Kz`}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.startButton,
            (!selectedGame || !selectedPaymentType || (selectedPaymentType === 'tempo' && !selectedRule && !isTempoLivre)) && styles.startButtonDisabled,
          ]}
          onPress={handleStart}
          disabled={!selectedGame || !selectedPaymentType || (selectedPaymentType === 'tempo' && !selectedRule && !isTempoLivre)}
          activeOpacity={0.85}
        >
          <Text style={styles.startButtonText}>▶ Iniciar Sessão</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const PRIMARY = '#0066CC';
const PRIMARY_LIGHT = '#E8F0FB';
const SUCCESS = '#4CAF50';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: PRIMARY,
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginTop: 20,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 14,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: PRIMARY,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionTitleSelected: {
    color: PRIMARY,
  },
  optionSub: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
  },
  badgeJogo: {
    backgroundColor: '#E3F2FD',
  },
  badgeTempo: {
    backgroundColor: '#FFF3E0',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIMARY,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  paymentCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  paymentCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  paymentIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  paymentLabelSelected: {
    color: PRIMARY,
  },
  paymentDesc: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  paymentDescSelected: {
    color: '#0055AA',
  },
  summaryBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginTop: 10,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: SUCCESS,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: SUCCESS,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  startButton: {
    backgroundColor: SUCCESS,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  startButtonDisabled: {
    backgroundColor: '#ccc',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bottomSpacer: {
    height: 30,
  },
});
