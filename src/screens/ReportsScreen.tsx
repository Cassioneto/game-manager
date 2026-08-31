import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { getDb } from '../database/db';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export default function ReportsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [loading, setLoading] = useState(false);

  const getPeriodRange = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    if (selectedPeriod === 'hoje') {
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      return { start: startOfToday, end: endOfToday, label: 'Hoje' };
    } else if (selectedPeriod === 'semana') {
      const day = now.getDay();
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day).getTime();
      return { start: startOfWeek, end: now.getTime(), label: 'Esta Semana' };
    } else {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return { start: startOfMonth, end: now.getTime(), label: 'Este Mês' };
    }
  };

  const getStatisticsData = () => {
    const db = getDb();
    const range = getPeriodRange();

    // 1. Faturamento Jogos
    const sessionsRow = db.getFirstSync<any>(
      "SELECT SUM(valor_cobrado) as total, AVG(duracao_minutos) as avg_time FROM sessions WHERE status = 'concluida' AND inicio >= ? AND inicio <= ?",
      range.start,
      range.end
    );
    const fatJogos = sessionsRow?.total || 0;
    const avgTime = sessionsRow?.avg_time ? Math.round(sessionsRow.avg_time) : 0;

    // 2. Faturamento Produtos
    const salesRow = db.getFirstSync<any>(
      "SELECT SUM(valor_total) as total FROM sales WHERE timestamp >= ? AND timestamp <= ?",
      range.start,
      range.end
    );
    const fatProdutos = salesRow?.total || 0;

    // 3. Ranking de Máquinas
    const machinesRanking = db.getAllSync<any>(
      `SELECT m.nome, COUNT(s.id) as total_sessions, SUM(s.valor_cobrado) as total_value 
       FROM sessions s 
       JOIN machines m ON s.machine_id = m.id 
       WHERE s.status = 'concluida' AND s.inicio >= ? AND s.inicio <= ? 
       GROUP BY s.machine_id 
       ORDER BY total_sessions DESC LIMIT 5`,
      range.start,
      range.end
    );

    // 4. Ranking de Jogos
    const gamesRanking = db.getAllSync<any>(
      `SELECT g.nome, COUNT(s.id) as total_sessions, SUM(s.valor_cobrado) as total_value 
       FROM sessions s 
       JOIN games g ON s.game_id = g.id 
       WHERE s.status = 'concluida' AND s.inicio >= ? AND s.inicio <= ? 
       GROUP BY s.game_id 
       ORDER BY total_sessions DESC LIMIT 5`,
      range.start,
      range.end
    );

    // 5. Produtos mais vendidos
    const productsRanking = db.getAllSync<any>(
      `SELECT p.nome, SUM(s.quantidade) as total_qty, SUM(s.valor_total) as total_value 
       FROM sales s 
       JOIN products p ON s.product_id = p.id 
       WHERE s.timestamp >= ? AND s.timestamp <= ? 
       GROUP BY s.product_id 
       ORDER BY total_qty DESC LIMIT 5`,
      range.start,
      range.end
    );

    // 6. Histórico de caixas
    const cashHistory = db.getAllSync<any>(
      "SELECT * FROM cash_registers WHERE data_abertura >= ? AND data_abertura <= ? ORDER BY data_abertura DESC",
      range.start,
      range.end
    );

    return {
      fatJogos,
      fatProdutos,
      totalFaturamento: fatJogos + fatProdutos,
      avgTime,
      machinesRanking,
      gamesRanking,
      productsRanking,
      cashHistory,
      rangeLabel: range.label
    };
  };

  const getActivitiesData = () => {
    const db = getDb();
    const range = getPeriodRange();

    // 1. Manutenções
    const maintenances = db.getAllSync<any>(
      `SELECT m.*, mac.nome as machine_name 
       FROM maintenances m 
       JOIN machines mac ON m.machine_id = mac.id 
       WHERE m.agendado_para >= ? AND m.agendado_para <= ? 
       ORDER BY m.agendado_para DESC`,
      range.start,
      range.end
    );

    // 2. Limpezas
    const cleanings = db.getAllSync<any>(
      `SELECT c.*, i.descricao as item_desc 
       FROM cleanings c 
       JOIN cleaning_checklist_items i ON c.checklist_item_id = i.id 
       WHERE c.concluido_em >= ? AND c.concluido_em <= ? 
       ORDER BY c.concluido_em DESC`,
      range.start,
      range.end
    );

    return {
      maintenances,
      cleanings,
      rangeLabel: range.label
    };
  };

  const handleGenerateStatsPdf = async () => {
    setLoading(true);
    try {
      const data = getStatisticsData();
      
      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 25px; color: #333; }
              h1 { color: #0066CC; margin-bottom: 5px; }
              .header-sub { font-size: 14px; color: #666; margin-bottom: 25px; }
              .summary-box { background-color: #F4F8FC; padding: 15px; border-radius: 8px; border-left: 5px solid #0066CC; margin-bottom: 25px; }
              .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px; }
              .summary-total { font-size: 18px; font-weight: bold; color: #0066CC; border-top: 1px dashed #CCC; padding-top: 8px; margin-top: 8px; }
              h2 { color: #333; font-size: 18px; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #EEE; padding-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #E0E0E0; padding: 10px; text-align: left; font-size: 14px; }
              th { background-color: #F5F5F5; color: #555; font-weight: bold; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
            </style>
          </head>
          <body>
            <h1>Relatório de Estatísticas</h1>
            <div class="header-sub">Período: ${data.rangeLabel} | Gerado em: ${new Date().toLocaleString()}</div>
            
            <div class="summary-box">
              <div class="summary-row"><span>Faturamento de Jogos:</span> <strong>${data.fatJogos} Kz</strong></div>
              <div class="summary-row"><span>Faturamento de Produtos:</span> <strong>${data.fatProdutos} Kz</strong></div>
              <div class="summary-row"><span>Tempo Médio por Sessão:</span> <strong>${data.avgTime} min</strong></div>
              <div class="summary-row summary-total"><span>Faturamento Total:</span> <span>${data.totalFaturamento} Kz</span></div>
            </div>

            <h2>Top 5 Máquinas Mais Usadas</h2>
            <table>
              <thead>
                <tr>
                  <th>Máquina</th>
                  <th class="text-center">Sessões Realizadas</th>
                  <th class="text-right">Valor Total Gerado</th>
                </tr>
              </thead>
              <tbody>
                ${data.machinesRanking.length === 0 ? '<tr><td colspan="3" class="text-center">Nenhum dado registrado</td></tr>' : 
                  data.machinesRanking.map((m: any) => `
                    <tr>
                      <td>${m.nome}</td>
                      <td class="text-center">${m.total_sessions}</td>
                      <td class="text-right">${m.total_value} Kz</td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>

            <h2>Top 5 Jogos Mais Jogados</h2>
            <table>
              <thead>
                <tr>
                  <th>Jogo</th>
                  <th class="text-center">Vezes Jogado</th>
                  <th class="text-right">Valor Total Gerado</th>
                </tr>
              </thead>
              <tbody>
                ${data.gamesRanking.length === 0 ? '<tr><td colspan="3" class="text-center">Nenhum dado registrado</td></tr>' : 
                  data.gamesRanking.map((g: any) => `
                    <tr>
                      <td>${g.nome}</td>
                      <td class="text-center">${g.total_sessions}</td>
                      <td class="text-right">${g.total_value} Kz</td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>

            <h2>Top 5 Produtos Mais Vendidos</h2>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th class="text-center">Quantidade Vendida</th>
                  <th class="text-right">Total Faturado</th>
                </tr>
              </thead>
              <tbody>
                ${data.productsRanking.length === 0 ? '<tr><td colspan="3" class="text-center">Nenhum dado registrado</td></tr>' : 
                  data.productsRanking.map((p: any) => `
                    <tr>
                      <td>${p.nome}</td>
                      <td class="text-center">${p.total_qty}</td>
                      <td class="text-right">${p.total_value} Kz</td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>

            <h2>Histórico do Caixa no Período</h2>
            <table>
              <thead>
                <tr>
                  <th>Abertura</th>
                  <th>Fechamento</th>
                  <th class="text-right">Inicial</th>
                  <th class="text-right">Final</th>
                  <th class="text-right">Diferença</th>
                </tr>
              </thead>
              <tbody>
                ${data.cashHistory.length === 0 ? '<tr><td colspan="5" class="text-center">Nenhum caixa aberto neste período</td></tr>' : 
                  data.cashHistory.map((c: any) => `
                    <tr>
                      <td>${new Date(c.data_abertura).toLocaleString()}</td>
                      <td>${c.data_fecho ? new Date(c.data_fecho).toLocaleString() : 'Em aberto'}</td>
                      <td class="text-right">${c.valor_inicial} Kz</td>
                      <td class="text-right">${c.valor_contado_final !== null ? `${c.valor_contado_final} Kz` : '-'}</td>
                      <td class="text-right" style="color: ${c.diferenca < 0 ? 'red' : 'green'}">${c.diferenca !== null ? `${c.diferenca} Kz` : '-'}</td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF de estatísticas.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateActivitiesPdf = async () => {
    setLoading(true);
    try {
      const data = getActivitiesData();

      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 25px; color: #333; }
              h1 { color: #4CAF50; margin-bottom: 5px; }
              .header-sub { font-size: 14px; color: #666; margin-bottom: 25px; }
              h2 { color: #333; font-size: 18px; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #EEE; padding-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #E0E0E0; padding: 10px; text-align: left; font-size: 14px; }
              th { background-color: #F5F5F5; color: #555; font-weight: bold; }
              .status-done { color: green; font-weight: bold; }
              .status-pending { color: orange; font-weight: bold; }
              .text-center { text-align: center; }
            </style>
          </head>
          <body>
            <h1>Relatório de Atividades</h1>
            <div class="header-sub">Período: ${data.rangeLabel} | Gerado em: ${new Date().toLocaleString()}</div>
            
            <h2>Manutenções Realizadas / Agendadas</h2>
            <table>
              <thead>
                <tr>
                  <th>Máquina</th>
                  <th>Tipo</th>
                  <th>Atividade</th>
                  <th>Status</th>
                  <th>Conclusão</th>
                </tr>
              </thead>
              <tbody>
                ${data.maintenances.length === 0 ? '<tr><td colspan="5" class="text-center">Nenhuma manutenção registrada</td></tr>' : 
                  data.maintenances.map((m: any) => `
                    <tr>
                      <td>${m.machine_name}</td>
                      <td>${m.tipo.toUpperCase()}</td>
                      <td>${m.atividade}</td>
                      <td class="${m.status === 'concluida' ? 'status-done' : 'status-pending'}">${m.status.toUpperCase()}</td>
                      <td>${m.concluido_em ? new Date(m.concluido_em).toLocaleDateString() : '-'}</td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>

            <h2>Limpezas do Espaço Realizadas</h2>
            <table>
              <thead>
                <tr>
                  <th>Setor / Área</th>
                  <th>Atividade Realizada</th>
                  <th>Frequência</th>
                  <th>Conclusão</th>
                </tr>
              </thead>
              <tbody>
                ${data.cleanings.length === 0 ? '<tr><td colspan="4" class="text-center">Nenhuma rotina de limpeza realizada</td></tr>' : 
                  data.cleanings.map((c: any) => `
                    <tr>
                      <td>${c.area}</td>
                      <td>${c.item_desc}</td>
                      <td>${c.frequencia.toUpperCase()}</td>
                      <td>${c.concluido_em ? new Date(c.concluido_em).toLocaleString() : '-'}</td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF de atividades.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportStatsCsv = async () => {
    setLoading(true);
    try {
      const data = getStatisticsData();
      
      let csvContent = '\uFEFF'; // Excel UTF-8 BOM
      csvContent += 'RESUMO FINANCEIRO\n';
      csvContent += `Faturamento de Jogos,${data.fatJogos} Kz\n`;
      csvContent += `Faturamento de Produtos,${data.fatProdutos} Kz\n`;
      csvContent += `Tempo Medio por Sessao,${data.avgTime} min\n`;
      csvContent += `Faturamento Total,${data.totalFaturamento} Kz\n\n`;

      csvContent += 'TOP 5 MAQUINAS MAIS USADAS\n';
      csvContent += 'Maquina,Sessoes Realizadas,Valor Gerado\n';
      data.machinesRanking.forEach((m: any) => {
        csvContent += `"${m.nome}",${m.total_sessions},${m.total_value} Kz\n`;
      });
      csvContent += '\n';

      csvContent += 'TOP 5 JOGOS MAIS JOGADOS\n';
      csvContent += 'Jogo,Vezes Jogado,Valor Gerado\n';
      data.gamesRanking.forEach((g: any) => {
        csvContent += `"${g.nome}",${g.total_sessions},${g.total_value} Kz\n`;
      });
      csvContent += '\n';

      csvContent += 'HISTORICO DE CAIXAS\n';
      csvContent += 'Abertura,Fechamento,Inicial,Final,Diferenca\n';
      data.cashHistory.forEach((c: any) => {
        const openStr = new Date(c.data_abertura).toISOString().replace(',', ' ');
        const closeStr = c.data_fecho ? new Date(c.data_fecho).toISOString().replace(',', ' ') : 'Em aberto';
        csvContent += `${openStr},${closeStr},${c.valor_inicial} Kz,${c.valor_contado_final !== null ? `${c.valor_contado_final} Kz` : '-'},${c.diferenca !== null ? `${c.diferenca} Kz` : '-'}\n`;
      });

      const fileUri = FileSystem.cacheDirectory + 'estatisticas_gamemanager.csv';
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível exportar em CSV.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportActivitiesCsv = async () => {
    setLoading(true);
    try {
      const data = getActivitiesData();
      
      let csvContent = '\uFEFF'; // Excel UTF-8 BOM
      csvContent += 'MANUTENCOES REALIZADAS / AGENDADAS\n';
      csvContent += 'Maquina,Tipo,Atividade,Status,Conclusao\n';
      data.maintenances.forEach((m: any) => {
        const conc = m.concluido_em ? new Date(m.concluido_em).toLocaleDateString() : '-';
        csvContent += `"${m.machine_name}",${m.tipo.toUpperCase()},"${m.atividade}",${m.status.toUpperCase()},${conc}\n`;
      });
      csvContent += '\n';

      csvContent += 'LIMPEZAS DO ESPACO REALIZADAS\n';
      csvContent += 'Setor,Atividade,Frequencia,Conclusao\n';
      data.cleanings.forEach((c: any) => {
        const conc = c.concluido_em ? new Date(c.concluido_em).toLocaleString().replace(',', ' ') : '-';
        csvContent += `"${c.area}","${c.item_desc}",${c.frequencia.toUpperCase()},${conc}\n`;
      });

      const fileUri = FileSystem.cacheDirectory + 'atividades_gamemanager.csv';
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível exportar em CSV.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Relatórios</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Filtro de Período</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity 
              style={[styles.filterButton, selectedPeriod === 'hoje' && styles.filterButtonActive]}
              onPress={() => setSelectedPeriod('hoje')}
            >
              <Text style={[styles.filterButtonText, selectedPeriod === 'hoje' && styles.filterButtonTextActive]}>Hoje</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, selectedPeriod === 'semana' && styles.filterButtonActive]}
              onPress={() => setSelectedPeriod('semana')}
            >
              <Text style={[styles.filterButtonText, selectedPeriod === 'semana' && styles.filterButtonTextActive]}>Esta Semana</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterButton, selectedPeriod === 'mes' && styles.filterButtonActive]}
              onPress={() => setSelectedPeriod('mes')}
            >
              <Text style={[styles.filterButtonText, selectedPeriod === 'mes' && styles.filterButtonTextActive]}>Este Mês</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={[styles.card, { padding: 40, alignItems: 'center' }]}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={{ marginTop: 10, color: '#666' }}>Compilando dados do SQLite...</Text>
          </View>
        ) : (
          <>
            {/* Stats Report Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Relatório de Estatísticas</Text>
              <Text style={styles.cardSubtitle}>Faturamento consolidado, rankings de uso e histórico de movimentações financeiras de caixa.</Text>
              
              <TouchableOpacity style={styles.button} onPress={handleGenerateStatsPdf}>
                <Text style={styles.buttonText}>📄 Gerar Relatório PDF</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton} onPress={handleExportStatsCsv}>
                <Text style={styles.secondaryButtonText}>📊 Exportar Excel/CSV</Text>
              </TouchableOpacity>
            </View>

            {/* Activities Report Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Relatório de Atividades</Text>
              <Text style={styles.cardSubtitle}>Registro de manutenções preventivas/corretivas e checklists de limpezas realizadas.</Text>
              
              <TouchableOpacity style={[styles.button, { backgroundColor: '#4CAF50' }]} onPress={handleGenerateActivitiesPdf}>
                <Text style={styles.buttonText}>📄 Gerar Relatório PDF</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: '#E8F5E9' }]} onPress={handleExportActivitiesCsv}>
                <Text style={[styles.secondaryButtonText, { color: '#4CAF50' }]}>📊 Exportar Excel/CSV</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 18,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#0066CC',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#E6F4FE',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0066CC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  filterButtonActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  filterButtonText: {
    color: '#666',
    fontSize: 13,
    fontWeight: 'bold',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
});
