import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { format as formatDate } from 'date-fns';
import { getSessionsForExport, getSalesForExport } from '../database/queries';
import { getDb } from '../database/db';

export default function ExportScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('hoje');

  const periods = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'semana', label: 'Esta Semana' },
    { id: 'mes', label: 'Este Mês' },
  ];

  const reportTypes = [
    { id: 'estatisticas', label: 'Estatísticas Financeiras' },
    { id: 'atividades', label: 'Registo de Atividades' },
    { id: 'sessoes', label: 'Sessões de Jogo' },
    { id: 'vendas', label: 'Vendas de Produtos' },
  ];

  // Same period-range logic used in ReportsScreen, kept local here so this
  // screen has no hidden dependency on another screen's internals.
  const getPeriodRange = (): { start: number; end: number } => {
    const now = new Date();
    const end = now.getTime();
    const start = new Date(now);
    if (selectedPeriod === 'hoje') {
      start.setHours(0, 0, 0, 0);
    } else if (selectedPeriod === 'semana') {
      start.setDate(start.getDate() - 7);
    } else {
      start.setMonth(start.getMonth() - 1);
    }
    return { start: start.getTime(), end };
  };

  const escapeCsv = (value: string | number) => {
    const str = String(value ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const rowsToCsv = (rows: (string | number)[][]) =>
    rows.map((row) => row.map(escapeCsv).join(',')).join('\n');

  const buildReportRows = (reportType: string): (string | number)[][] => {
    const { start, end } = getPeriodRange();
    const db = getDb();

    if (reportType === 'sessoes') {
      const sessions = getSessionsForExport(start, end);
      const rows: (string | number)[][] = [
        ['ID', 'Máquina', 'Jogo', 'Início', 'Fim', 'Duração (min)', 'Tipo', 'Valor (Kz)', 'Status'],
      ];
      for (const s of sessions) {
        rows.push([
          s.id,
          s.maquina,
          s.jogo,
          formatDate(new Date(s.inicio), 'dd/MM/yyyy HH:mm'),
          s.fim_real ? formatDate(new Date(s.fim_real), 'dd/MM/yyyy HH:mm') : '-',
          s.duracao_minutos ?? 0,
          s.tipo_pagamento === 'jogo' ? 'Por Jogo' : 'Por Tempo',
          s.valor_cobrado,
          s.status,
        ]);
      }
      return rows;
    }

    if (reportType === 'vendas') {
      const sales = getSalesForExport(start, end);
      const rows: (string | number)[][] = [['ID', 'Produto', 'Quantidade', 'Valor Total (Kz)', 'Data']];
      for (const s of sales) {
        rows.push([s.id, s.produto, s.quantidade, s.valor_total, formatDate(new Date(s.timestamp), 'dd/MM/yyyy HH:mm')]);
      }
      return rows;
    }

    if (reportType === 'estatisticas') {
      const sessionTotal = db.getFirstSync<any>(
        'SELECT COALESCE(SUM(valor_cobrado), 0) as total FROM sessions WHERE inicio >= ? AND inicio <= ?',
        start,
        end
      );
      const salesTotal = db.getFirstSync<any>(
        'SELECT COALESCE(SUM(valor_total), 0) as total FROM sales WHERE timestamp >= ? AND timestamp <= ?',
        start,
        end
      );
      const jogos = sessionTotal?.total || 0;
      const produtos = salesTotal?.total || 0;
      return [
        ['Categoria', 'Valor (Kz)'],
        ['Jogos', jogos],
        ['Produtos', produtos],
        ['Total', jogos + produtos],
      ];
    }

    // atividades (maintenance + cleaning activity log)
    const maintenances = db.getAllSync<any>(
      `SELECT m.id, mac.nome as maquina, m.tipo, m.atividade, m.status, m.agendado_para, m.concluido_em
       FROM maintenances m JOIN machines mac ON m.machine_id = mac.id
       WHERE m.agendado_para >= ? AND m.agendado_para <= ? ORDER BY m.agendado_para DESC`,
      start,
      end
    );
    const cleanings = db.getAllSync<any>(
      `SELECT c.id, i.descricao, c.area, c.agendado_para, c.concluido_em
       FROM cleanings c LEFT JOIN cleaning_checklist_items i ON c.checklist_item_id = i.id
       WHERE c.agendado_para >= ? AND c.agendado_para <= ? ORDER BY c.agendado_para DESC`,
      start,
      end
    );
    const rows: (string | number)[][] = [['Data', 'Tipo', 'Descrição', 'Status']];
    for (const m of maintenances) {
      rows.push([
        formatDate(new Date(m.agendado_para), 'dd/MM/yyyy HH:mm'),
        `Manutenção (${m.tipo})`,
        `${m.atividade} - ${m.maquina}`,
        m.status,
      ]);
    }
    for (const c of cleanings) {
      rows.push([
        formatDate(new Date(c.agendado_para), 'dd/MM/yyyy HH:mm'),
        'Limpeza',
        `${c.descricao || c.area} - ${c.area}`,
        c.concluido_em ? 'Concluída' : 'Pendente',
      ]);
    }
    return rows;
  };

  const handleExport = async (reportType: string) => {
    try {
      const rows = buildReportRows(reportType);
      if (rows.length <= 1) {
        Alert.alert('Sem dados', 'Não há dados para o período selecionado.');
        return;
      }
      const csvContent = rowsToCsv(rows);
      const filename = `gamemanager_${reportType}_${selectedPeriod}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Exportar ${filename}`,
        });
      } else {
        Alert.alert('Sucesso', `Arquivo salvo em: ${fileUri}`);
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao exportar arquivo');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Exportação de Dados</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Período */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Período</Text>
          <View style={styles.chipContainer}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.id}
                style={[
                  styles.chip,
                  selectedPeriod === period.id && styles.selectedChip
                ]}
                onPress={() => setSelectedPeriod(period.id)}
              >
                <Text style={[
                  styles.chipText,
                  selectedPeriod === period.id && styles.selectedChipText
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tipos de Relatório */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tipo de Relatório</Text>
          {reportTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={styles.reportItem}
              onPress={() => handleExport(type.id)}
            >
              <Text style={styles.reportLabel}>{type.label}</Text>
              <Text style={styles.reportAction}>Exportar →</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Informações */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Informações</Text>
          <Text style={styles.infoText}>
            • Arquivos são salvos localmente no dispositivo, em formato CSV
          </Text>
          <Text style={styles.infoText}>
            • Pode ser partilhado via WhatsApp, Email, Google Drive, etc.
          </Text>
          <Text style={styles.infoText}>
            • Formato CSV compatível com Excel, Google Sheets
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#2196F3', padding: 20, paddingTop: 40 },
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
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedChip: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  chipText: { fontSize: 14, color: '#666' },
  selectedChipText: { color: '#fff' },
  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 10,
  },
  reportLabel: { fontSize: 16, color: '#333' },
  reportAction: { fontSize: 16, color: '#2196F3', fontWeight: 'bold' },
  infoCard: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 20, marginBottom: 15 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#1976D2', marginBottom: 10 },
  infoText: { fontSize: 14, color: '#424242', marginBottom: 5 },
});
