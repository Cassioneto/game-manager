import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useStore } from '../store/useStore';
import { Session, PriceRule } from '../types';
import { updateSessionInDb, insertCashMovementInDb, getPriceRulesFromDb } from '../database/queries';
import { scheduleSessionEndNotifications, cancelSessionEndNotifications } from '../notifications';

export default function SessionScreen({ route, navigation }: any) {
  const { machineId, machineName, gameId, gameName, paymentType: routePaymentType, sessionId } = route.params || {};
  
  const activeSessions = useStore((state) => state.activeSessions);
  const openCashRegister = useStore((state) => state.openCashRegister);
  const games = useStore((state) => state.games);

  const [session, setSession] = useState<Session | null>(null);
  // The session's persisted tipoPagamento is the source of truth; the route
  // param is only a fallback for the brief moment before `session` loads.
  const paymentType = session?.tipoPagamento || routePaymentType;
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds for tempo livre
  const [gameCount, setGameCount] = useState(1);
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [alert5MinTriggered, setAlert5MinTriggered] = useState(false);
  const [alertExpiredTriggered, setAlertExpiredTriggered] = useState(false);

  // Sync session state from Zustand
  useEffect(() => {
    const activeSess = activeSessions.find(s => s.id === sessionId);
    if (activeSess) {
      setSession(activeSess);
      if (paymentType === 'jogo') {
        // Count games by dividing total charged by flat rate
        const rules = getPriceRulesFromDb(gameId);
        setPriceRules(rules);
        const flatRule = rules.find(r => r.gameId === gameId);
        const flatPrice = flatRule ? flatRule.preco : 50;
        const count = Math.max(1, Math.round(activeSess.valorCobrado / flatPrice));
        setGameCount(count);
      } else {
        const rules = getPriceRulesFromDb(gameId);
        setPriceRules(rules);
      }
    }
  }, [activeSessions, sessionId]);

  // Tick Timer Loop
  useEffect(() => {
    if (!session || paymentType === 'jogo') return;

    const timer = setInterval(() => {
      const now = Date.now();
      if (session.fimPrevisto) {
        // Countdown
        const remaining = Math.max(0, Math.round((session.fimPrevisto - now) / 1000));
        setTimeLeft(remaining);

        // Alertas de tempo
        if (remaining <= 300 && remaining > 298 && !alert5MinTriggered) {
          setAlert5MinTriggered(true);
          Alert.alert('Tempo Quase Expirado', `Restam apenas 5 minutos na ${machineName}!`);
        }
        if (remaining === 0 && !alertExpiredTriggered) {
          setAlertExpiredTriggered(true);
          Alert.alert('Tempo Expirado', `O tempo de jogo na ${machineName} acabou.`);
        }
      } else {
        // Progressive timer (tempo livre)
        const elapsed = Math.round((now - session.inicio) / 1000);
        setElapsedTime(elapsed);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session, alert5MinTriggered, alertExpiredTriggered]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTempoLivreCost = (totalSeconds: number) => {
    const elapsedMinutes = Math.max(1, Math.ceil(totalSeconds / 60));
    if (priceRules.length === 0) {
      return elapsedMinutes * 1; // 1 Kz per minute default
    }
    const sortedRules = [...priceRules].filter(r => r.duracaoMinutos > 0).sort((a, b) => a.duracaoMinutos - b.duracaoMinutos);
    if (sortedRules.length === 0) {
      return elapsedMinutes * 1;
    }
    
    // Find largest fitting rule
    for (let i = sortedRules.length - 1; i >= 0; i--) {
      if (elapsedMinutes >= sortedRules[i].duracaoMinutos) {
        const baseRule = sortedRules[i];
        const excess = elapsedMinutes - baseRule.duracaoMinutos;
        const rate = baseRule.preco / baseRule.duracaoMinutos;
        return Math.round(baseRule.preco + (excess * rate));
      }
    }
    // Prorate based on smallest rule
    const smallest = sortedRules[0];
    const rate = smallest.preco / smallest.duracaoMinutos;
    return Math.round(Math.max(15, elapsedMinutes * rate)); // Min 15 Kz
  };

  const handleExtendSession = () => {
    if (!session || !openCashRegister) {
      Alert.alert('Aviso', 'Não é possível estender tempo com o caixa fechado.');
      return;
    }

    if (paymentType === 'jogo') {
      const flatRule = priceRules.find(r => r.gameId === gameId);
      const flatPrice = flatRule ? flatRule.preco : 50;

      // Update in DB and Zustand
      const nextGameCount = gameCount + 1;
      const newTotal = nextGameCount * flatPrice;
      
      useStore.getState().updateActiveSession(session.id, {
        valorCobrado: newTotal
      });
      setGameCount(nextGameCount);

      // Record cash movement
      insertCashMovementInDb({
        cashRegisterId: openCashRegister.id,
        tipo: 'sessao',
        valor: flatPrice,
        motivo: `Jogo adicional na máquina ${machineName} - Jogo: ${gameName}`,
        timestamp: Date.now()
      });

      Alert.alert('Sucesso', 'Mais um jogo adicionado');
    } else {
      // Tempo
      // Extend by 30 mins
      const rule30 = priceRules.find(r => r.duracaoMinutos === 30);
      const priceFor30 = rule30 ? rule30.preco : 30; // fallback to 30 Kz

      const now = Date.now();
      const currentEnd = session.fimPrevisto || now;
      const nextEnd = currentEnd + 30 * 60 * 1000;
      const nextDuration = session.duracaoMinutos + 30;
      const nextTotal = session.valorCobrado + priceFor30;

      useStore.getState().updateActiveSession(session.id, {
        fimPrevisto: nextEnd,
        duracaoMinutos: nextDuration,
        valorCobrado: nextTotal
      });

      // Record cash movement
      insertCashMovementInDb({
        cashRegisterId: openCashRegister.id,
        tipo: 'sessao',
        valor: priceFor30,
        motivo: `Extensão de 30 min na máquina ${machineName} - Jogo: ${gameName}`,
        timestamp: now
      });

      // Reset alert triggers
      setAlert5MinTriggered(false);
      setAlertExpiredTriggered(false);

      // Reschedule background/locked-screen alerts for the new end time
      scheduleSessionEndNotifications(session.id, machineName || `Máquina ${machineId}`, nextEnd);

      Alert.alert('Sucesso', 'Tempo estendido em 30 minutos');
    }
  };

  const handleEndSession = () => {
    if (!session) return;

    let finalCost = session.valorCobrado;
    if (paymentType === 'tempo' && !session.fimPrevisto) {
      // Tempo Livre: Calculate final cost
      finalCost = getTempoLivreCost(elapsedTime);
    }

    const confirmEnd = () => {
      const now = Date.now();
      
      // Update session in DB
      useStore.getState().updateActiveSession(session.id, {
        status: 'concluida',
        fimReal: now,
        valorCobrado: finalCost
      });

      // Update machine status back to libre
      useStore.getState().updateMachine(machineId, { status: 'livre' });

      // Remove from Zustand activeSessions
      useStore.getState().removeActiveSession(session.id);

      // Cancel any pending "time left" / "time's up" alerts for this session
      cancelSessionEndNotifications(session.id);

      // If Tempo Livre, charge now
      if (paymentType === 'tempo' && !session.fimPrevisto && finalCost > 0 && openCashRegister) {
        insertCashMovementInDb({
          cashRegisterId: openCashRegister.id,
          tipo: 'sessao',
          valor: finalCost,
          motivo: `Fechamento de Tempo Livre máquina ${machineName} - Jogo: ${gameName}`,
          timestamp: now
        });
      }

      navigation.goBack();
    };

    if (paymentType === 'tempo' && !session.fimPrevisto) {
      Alert.alert(
        'Encerrar Tempo Livre',
        `Tempo jogado: ${formatTime(elapsedTime)}\nValor a cobrar: ${finalCost} Kz\n\nConfirmar encerramento?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cobrar e Encerrar', onPress: confirmEnd }
        ]
      );
    } else {
      Alert.alert(
        'Encerrar Sessão',
        'Deseja encerrar esta sessão de jogo agora?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Encerrar', onPress: confirmEnd }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sessão Ativa</Text>
      </View>

      <View style={styles.content}>
        {paymentType === 'jogo' ? (
          <View style={styles.timerCard}>
            <Text style={styles.timerLabel}>Pagamento por Jogo</Text>
            <Text style={styles.timerValue}>{gameCount} Jogo{gameCount > 1 ? 's' : ''}</Text>
          </View>
        ) : session?.fimPrevisto ? (
          <View style={[
            styles.timerCard,
            timeLeft <= 300 && styles.timerCardLow
          ]}>
            <Text style={styles.timerLabel}>Tempo Restante</Text>
            <Text style={[
              styles.timerValue,
              timeLeft <= 300 && styles.timerValueLow
            ]}>{formatTime(timeLeft)}</Text>
          </View>
        ) : (
          <View style={styles.timerCard}>
            <Text style={styles.timerLabel}>Tempo Decorrido (Tempo Livre)</Text>
            <Text style={styles.timerValue}>{formatTime(elapsedTime)}</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Máquina</Text>
          <Text style={styles.infoValue}>{machineName || `Máquina ${machineId}`}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Jogo</Text>
          <Text style={styles.infoValue}>{gameName || 'N/A'}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Tipo de Pagamento</Text>
          <Text style={styles.infoValue}>{paymentType === 'jogo' ? 'Por Jogo' : 'Por Tempo'}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Valor Cobrado</Text>
          <Text style={styles.infoValue}>
            {paymentType === 'tempo' && !session?.fimPrevisto
              ? `${getTempoLivreCost(elapsedTime)} Kz`
              : `${session?.valorCobrado || 0} Kz`}
          </Text>
        </View>

        <TouchableOpacity style={styles.extendButton} onPress={handleExtendSession}>
          <Text style={styles.buttonText}>{paymentType === 'jogo' ? '+ Adicionar Jogo' : '+30 Min'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
          <Text style={styles.buttonText}>Encerrar Sessão</Text>
        </TouchableOpacity>
      </View>
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
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  timerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerCardLow: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 1,
  },
  timerLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  timerValueLow: {
    color: '#F44336',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  extendButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  endButton: {
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
});
