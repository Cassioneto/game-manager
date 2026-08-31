import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { format as formatDate } from 'date-fns';
import {
  exportAllTablesAsJson,
  restoreAllTablesFromJson,
  insertBackupLogInDb,
  getBackupLogsFromDb,
} from '../database/queries';
import { useStore } from '../store/useStore';

// Fixed filename so "Restaurar Último Backup Local" can read it back without
// needing a native file picker.
const LOCAL_BACKUP_URI = FileSystem.documentDirectory + 'gamemanager_backup.json';

export default function BackupScreen() {
  const [backupLogs, setBackupLogs] = useState<ReturnType<typeof getBackupLogsFromDb>>([]);
  const [localBackupExists, setLocalBackupExists] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'backing_up' | 'restoring'>('idle');
  const hydrateStore = useStore((state) => state.hydrateStore);

  const refresh = useCallback(async () => {
    setBackupLogs(getBackupLogsFromDb());
    const info = await FileSystem.getInfoAsync(LOCAL_BACKUP_URI);
    setLocalBackupExists(info.exists);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const lastBackup = backupLogs[0];
  const daysSince = lastBackup
    ? Math.floor((Date.now() - lastBackup.dataHora) / (1000 * 60 * 60 * 24))
    : null;
  const needsBackup = daysSince === null || daysSince > 1;

  const handleBackup = async () => {
    setBackupStatus('backing_up');
    try {
      const json = exportAllTablesAsJson();
      await FileSystem.writeAsStringAsync(LOCAL_BACKUP_URI, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      insertBackupLogInDb('manual', 'sucesso', 'local');
      await refresh();

      // Hand the file to the OS share sheet so the person can save a copy to
      // Google Drive, email it to themselves, etc. — this app has no Google
      // OAuth configured, so it can't upload to Drive silently on its own.
      if (await Sharing.isAvailableAsync()) {
        Alert.alert('Backup criado', 'Deseja partilhar uma cópia agora (ex: Google Drive, Email)?', [
          { text: 'Agora não', style: 'cancel' },
          {
            text: 'Partilhar',
            onPress: () => Sharing.shareAsync(LOCAL_BACKUP_URI, { mimeType: 'application/json', dialogTitle: 'Guardar backup' }),
          },
        ]);
      } else {
        Alert.alert('Sucesso', 'Backup local criado com sucesso.');
      }
    } catch (error) {
      insertBackupLogInDb('manual', 'falha', 'local');
      await refresh();
      Alert.alert('Erro', 'Falha ao criar backup.');
      console.error(error);
    } finally {
      setBackupStatus('idle');
    }
  };

  const handleRestore = () => {
    if (!localBackupExists) {
      Alert.alert('Nenhum backup encontrado', 'Ainda não existe um backup local neste dispositivo. Toque em "Backup Manual" primeiro.');
      return;
    }
    Alert.alert(
      'Restaurar Backup',
      'Isso substituirá TODOS os dados atuais pelo conteúdo do último backup local. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            setBackupStatus('restoring');
            try {
              const json = await FileSystem.readAsStringAsync(LOCAL_BACKUP_URI, {
                encoding: FileSystem.EncodingType.UTF8,
              });
              restoreAllTablesFromJson(json);
              insertBackupLogInDb('restauracao', 'sucesso', 'local');
              hydrateStore();
              await refresh();
              Alert.alert('Sucesso', 'Backup restaurado com sucesso!');
            } catch (error) {
              insertBackupLogInDb('restauracao', 'falha', 'local');
              await refresh();
              Alert.alert('Erro', 'Falha ao restaurar backup. O arquivo pode estar corrompido.');
              console.error(error);
            } finally {
              setBackupStatus('idle');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sucesso': return '#4CAF50';
      case 'falha': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Backup</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Status do Backup */}
        <View style={[styles.card, needsBackup && styles.warningCard]}>
          <Text style={styles.cardTitle}>Status do Backup</Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Último backup:</Text>
            <Text style={styles.statusValue}>
              {lastBackup ? formatDate(new Date(lastBackup.dataHora), 'dd/MM/yyyy HH:mm') : 'Nunca realizado'}
            </Text>
          </View>

          {daysSince !== null && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Dias desde:</Text>
              <Text style={[styles.statusValue, daysSince > 1 && styles.warningText]}>
                {daysSince} dia{daysSince !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {needsBackup && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>⚠️ Backup recomendado</Text>
            </View>
          )}
        </View>

        {/* Ações de Backup */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ações</Text>

          <TouchableOpacity
            style={[styles.actionButton, backupStatus === 'backing_up' && styles.disabledButton]}
            onPress={handleBackup}
            disabled={backupStatus !== 'idle'}
          >
            <Text style={styles.actionButtonText}>
              {backupStatus === 'backing_up' ? 'Fazendo backup...' : '📤 Backup Manual'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.restoreButton, backupStatus === 'restoring' && styles.disabledButton]}
            onPress={handleRestore}
            disabled={backupStatus !== 'idle'}
          >
            <Text style={styles.actionButtonText}>
              {backupStatus === 'restoring' ? 'Restaurando...' : '📥 Restaurar Último Backup Local'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Histórico de Backups */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Histórico de Backups</Text>
          {backupLogs.length === 0 && (
            <Text style={styles.statusValue}>Nenhum backup realizado ainda.</Text>
          )}
          {backupLogs.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <Text style={styles.logType}>{log.tipo.toUpperCase()}</Text>
                <View style={[styles.logStatus, { backgroundColor: getStatusColor(log.status) }]}>
                  <Text style={styles.logStatusText}>{log.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.logDate}>{formatDate(new Date(log.dataHora), 'dd/MM/yyyy HH:mm')}</Text>
              <Text style={styles.logDestino}>📁 {log.destino.replace('_', ' ')}</Text>
            </View>
          ))}
        </View>

        {/* Informações */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Sobre o Backup</Text>
          <Text style={styles.infoText}>
            • O backup fica guardado localmente neste dispositivo
          </Text>
          <Text style={styles.infoText}>
            • Use "Partilhar" após o backup para enviar uma cópia ao Google Drive, Email, etc.
          </Text>
          <Text style={styles.infoText}>
            • Restaurar substitui todos os dados atuais pelos do backup
          </Text>
          <Text style={styles.infoText}>
            • Faça backups regulares, especialmente antes de fechar o caixa
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#4CAF50', padding: 20, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  content: { padding: 20 },
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
  warningCard: { borderWidth: 2, borderColor: '#FF9800' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statusLabel: { fontSize: 14, color: '#666' },
  statusValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  warningText: { color: '#FF9800' },
  warningBanner: { backgroundColor: '#FFF3E0', padding: 10, borderRadius: 6, marginTop: 10 },
  actionButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  restoreButton: { backgroundColor: '#2196F3' },
  disabledButton: { backgroundColor: '#BDBDBD' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logItem: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 15, marginBottom: 10 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  logType: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  logStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  logStatusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  logDate: { fontSize: 14, color: '#333' },
  logDestino: { fontSize: 12, color: '#666', marginTop: 2 },
  infoCard: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 20, marginBottom: 15 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10 },
  infoText: { fontSize: 14, color: '#424242', marginBottom: 5 },
});
