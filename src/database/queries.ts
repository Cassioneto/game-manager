import { getDb } from './db';
import { Machine, Game, PriceRule, Session, CashRegister, CashMovement, Product, Sale, Maintenance, Cleaning, CleaningChecklistItem, Customer } from '../types';

// ==========================================
// MÁQUINAS (MACHINES)
// ==========================================

export function getMachinesFromDb(): Machine[] {
  const db = getDb();
  return db.getAllSync<any>('SELECT id, numero, nome, setor, descricao, status FROM machines')
    .map(row => ({
      id: row.id,
      numero: row.numero,
      nome: row.nome,
      setor: row.setor || undefined,
      descricao: row.descricao || undefined,
      status: row.status as Machine['status']
    }));
}

export function insertMachineInDb(machine: Omit<Machine, 'id'>): Machine {
  const db = getDb();
  // NOTE: `setor` is NOT NULL on devices that installed the app before this
  // column became optional, so an empty string (not null) is used here to
  // stay compatible with both old and new schemas.
  const res = db.runSync(
    'INSERT INTO machines (numero, nome, setor, descricao, status) VALUES (?, ?, ?, ?, ?)',
    machine.numero,
    machine.nome,
    machine.setor || '',
    machine.descricao || null,
    machine.status
  );
  return {
    ...machine,
    id: res.lastInsertRowId
  };
}

export function updateMachineInDb(id: number, updates: Partial<Omit<Machine, 'id'>>) {
  const db = getDb();
  const keys = Object.keys(updates);
  if (keys.length === 0) return;

  const sets = keys.map(k => `${k === 'setor' ? 'setor' : k} = ?`).join(', ');
  const values = keys.map(k => (updates as any)[k] === undefined ? null : (updates as any)[k]);
  
  db.runSync(
    `UPDATE machines SET ${sets} WHERE id = ?`,
    ...values,
    id
  );
}

export function deleteMachineFromDb(id: number) {
  const db = getDb();
  db.runSync('DELETE FROM machines WHERE id = ?', id);
}

// ==========================================
// JOGOS E PREÇOS (GAMES & PRICING)
// ==========================================

export function getGamesFromDb(): Game[] {
  const db = getDb();
  return db.getAllSync<any>('SELECT id, nome, categoria, tipo_pagamento FROM games')
    .map(row => ({
      id: row.id,
      nome: row.nome,
      categoria: row.categoria || undefined,
      tipoPagamento: (row.tipo_pagamento || 'tempo') as Game['tipoPagamento']
    }));
}

export function insertGameInDb(game: Omit<Game, 'id'>): Game {
  const db = getDb();
  const res = db.runSync(
    'INSERT INTO games (nome, categoria, tipo_pagamento) VALUES (?, ?, ?)',
    game.nome,
    game.categoria || '',
    game.tipoPagamento || 'tempo'
  );
  return {
    ...game,
    id: res.lastInsertRowId
  };
}

export function updateGameInDb(id: number, updates: Partial<Omit<Game, 'id'>>) {
  const db = getDb();
  const keys = Object.keys(updates);
  if (keys.length === 0) return;

  const sets = keys.map(k => `${k === 'tipoPagamento' ? 'tipo_pagamento' : k} = ?`).join(', ');
  const values = keys.map(k => {
    const val = (updates as any)[k];
    return val === undefined ? null : val;
  });
  
  db.runSync(
    `UPDATE games SET ${sets} WHERE id = ?`,
    ...values,
    id
  );
}

export function deleteGameFromDb(id: number) {
  const db = getDb();
  db.runSync('DELETE FROM price_rules WHERE game_id = ?', id);
  db.runSync('DELETE FROM games WHERE id = ?', id);
}

export function getPriceRulesFromDb(gameId: number): PriceRule[] {
  const db = getDb();
  return db.getAllSync<any>('SELECT id, game_id, duracao_minutos, preco FROM price_rules WHERE game_id = ?', gameId)
    .map(row => ({
      id: row.id,
      gameId: row.game_id,
      duracaoMinutos: row.duracao_minutos || 0,
      preco: row.preco
    }));
}

export function getAllPriceRulesFromDb(): PriceRule[] {
  const db = getDb();
  return db.getAllSync<any>('SELECT id, game_id, duracao_minutos, preco FROM price_rules')
    .map(row => ({
      id: row.id,
      gameId: row.game_id,
      duracaoMinutos: row.duracao_minutos || 0,
      preco: row.preco
    }));
}

export function savePriceRulesInDb(gameId: number, rules: Omit<PriceRule, 'id'>[]) {
  const db = getDb();
  // Clear existing
  db.runSync('DELETE FROM price_rules WHERE game_id = ?', gameId);
  // Insert new
  for (const rule of rules) {
    db.runSync(
      'INSERT INTO price_rules (game_id, duracao_minutos, preco) VALUES (?, ?, ?)',
      gameId,
      rule.duracaoMinutos || null,
      rule.preco
    );
  }
}

// ==========================================
// CAIXA (CASH REGISTERS & MOVEMENTS)
// ==========================================

export function getOpenCashRegisterFromDb(): CashRegister | null {
  const db = getDb();
  const row = db.getFirstSync<any>("SELECT * FROM cash_registers WHERE status = 'aberto'");
  if (!row) return null;
  return {
    id: row.id,
    dataAbertura: row.data_abertura,
    dataFecho: row.data_fecho || undefined,
    responsavelAbertura: row.responsavel_abertura || undefined,
    responsavelFecho: row.responsavel_fecho || undefined,
    valorInicial: row.valor_inicial,
    valorContadoFinal: row.valor_contado_final || undefined,
    valorEsperadoFinal: row.valor_esperado_final || undefined,
    diferenca: row.diferenca || undefined,
    status: 'aberto'
  };
}

export function openCashRegisterInDb(valorInicial: number): CashRegister {
  const db = getDb();
  const now = Date.now();
  const res = db.runSync(
    'INSERT INTO cash_registers (data_abertura, responsavel_abertura, valor_inicial, status) VALUES (?, ?, ?, ?)',
    now,
    1, // default single user ID
    valorInicial,
    'aberto'
  );
  return {
    id: res.lastInsertRowId,
    dataAbertura: now,
    responsavelAbertura: 1,
    valorInicial,
    status: 'aberto'
  };
}

export function closeCashRegisterInDb(id: number, valorContadoFinal: number, valorEsperadoFinal: number): CashRegister {
  const db = getDb();
  const now = Date.now();
  const diferenca = valorContadoFinal - valorEsperadoFinal;
  db.runSync(
    'UPDATE cash_registers SET data_fecho = ?, responsavel_fecho = ?, valor_contado_final = ?, valor_esperado_final = ?, diferenca = ?, status = ? WHERE id = ?',
    now,
    1, // default single user ID
    valorContadoFinal,
    valorEsperadoFinal,
    diferenca,
    'fechado',
    id
  );
  return {
    id,
    dataAbertura: now, // dummy / not relevant for return info
    dataFecho: now,
    responsavelAbertura: 1,
    responsavelFecho: 1,
    valorInicial: 0,
    valorContadoFinal,
    valorEsperadoFinal,
    diferenca,
    status: 'fechado'
  };
}

export function getCashMovementsFromDb(cashRegisterId: number): CashMovement[] {
  const db = getDb();
  return db.getAllSync<any>('SELECT * FROM cash_movements WHERE cash_register_id = ? ORDER BY timestamp DESC', cashRegisterId)
    .map(row => ({
      id: row.id,
      cashRegisterId: row.cash_register_id,
      tipo: row.tipo as CashMovement['tipo'],
      valor: row.valor,
      motivo: row.motivo || undefined,
      timestamp: row.timestamp
    }));
}

export function insertCashMovementInDb(movement: Omit<CashMovement, 'id'>): CashMovement {
  const db = getDb();
  const res = db.runSync(
    'INSERT INTO cash_movements (cash_register_id, tipo, valor, motivo, timestamp) VALUES (?, ?, ?, ?, ?)',
    movement.cashRegisterId,
    movement.tipo,
    movement.valor,
    movement.motivo || null,
    movement.timestamp
  );
  return {
    ...movement,
    id: res.lastInsertRowId
  };
}

// ==========================================
// SESSÕES (SESSIONS)
// ==========================================

export function getActiveSessionsFromDb(): Session[] {
  const db = getDb();
  return db.getAllSync<any>("SELECT * FROM sessions WHERE status = 'ativa'")
    .map(row => ({
      id: row.id,
      machineId: row.machine_id,
      gameId: row.game_id,
      operadorId: row.operador_id || undefined,
      inicio: row.inicio,
      fimPrevisto: row.fim_previsto || undefined,
      fimReal: row.fim_real || undefined,
      duracaoMinutos: row.duracao_minutos,
      valorCobrado: row.valor_cobrado,
      status: row.status as Session['status'],
      // Fall back to the old duration-based guess only for rows that somehow
      // still have no tipo_pagamento (shouldn't happen after migration v2).
      tipoPagamento: (row.tipo_pagamento || (row.duracao_minutos === 0 ? 'jogo' : 'tempo')) as Session['tipoPagamento'],
      cashRegisterId: row.cash_register_id || undefined
    }));
}

export function insertSessionInDb(session: Omit<Session, 'id'>): Session {
  const db = getDb();
  const res = db.runSync(
    'INSERT INTO sessions (machine_id, game_id, operador_id, inicio, fim_previsto, duracao_minutos, valor_cobrado, status, tipo_pagamento, cash_register_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    session.machineId,
    session.gameId,
    1, // default single user
    session.inicio,
    session.fimPrevisto || null,
    session.duracaoMinutos,
    session.valorCobrado,
    session.status,
    session.tipoPagamento || 'tempo',
    session.cashRegisterId || null
  );
  return {
    ...session,
    id: res.lastInsertRowId
  };
}

export function updateSessionInDb(id: number, updates: Partial<Omit<Session, 'id'>>) {
  const db = getDb();
  const keys = Object.keys(updates);
  if (keys.length === 0) return;

  const sets = keys.map(k => {
    if (k === 'machineId') return 'machine_id = ?';
    if (k === 'gameId') return 'game_id = ?';
    if (k === 'operadorId') return 'operador_id = ?';
    if (k === 'fimPrevisto') return 'fim_previsto = ?';
    if (k === 'fimReal') return 'fim_real = ?';
    if (k === 'duracaoMinutos') return 'duracao_minutos = ?';
    if (k === 'valorCobrado') return 'valor_cobrado = ?';
    if (k === 'tipoPagamento') return 'tipo_pagamento = ?';
    if (k === 'cashRegisterId') return 'cash_register_id = ?';
    return `${k} = ?`;
  }).join(', ');

  const values = keys.map(k => (updates as any)[k] === undefined ? null : (updates as any)[k]);
  
  db.runSync(
    `UPDATE sessions SET ${sets} WHERE id = ?`,
    ...values,
    id
  );
}

// ==========================================
// PRODUTOS E VENDAS (PRODUCTS & SALES)
// ==========================================

export function getProductsFromDb(): Product[] {
  const db = getDb();
  return db.getAllSync<any>('SELECT * FROM products')
    .map(row => ({
      id: row.id,
      nome: row.nome,
      categoria: row.categoria || undefined,
      preco: row.preco,
      estoqueAtual: row.estoque_atual,
      estoqueMinimo: row.estoque_minimo
    }));
}

export function insertProductInDb(product: Omit<Product, 'id'>): Product {
  const db = getDb();
  const res = db.runSync(
    'INSERT INTO products (nome, categoria, preco, estoque_atual, estoque_minimo) VALUES (?, ?, ?, ?, ?)',
    product.nome,
    product.categoria || '',
    product.preco,
    product.estoqueAtual,
    product.estoqueMinimo
  );
  return {
    ...product,
    id: res.lastInsertRowId
  };
}

export function updateProductStockInDb(id: number, newStock: number) {
  const db = getDb();
  db.runSync('UPDATE products SET estoque_atual = ? WHERE id = ?', newStock, id);
}

export function insertSaleInDb(sale: Omit<Sale, 'id'>): Sale {
  const db = getDb();
  const res = db.runSync(
    'INSERT INTO sales (product_id, quantidade, valor_total, session_id, cash_register_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    sale.productId,
    sale.quantidade,
    sale.valorTotal,
    sale.sessionId || null,
    sale.cashRegisterId,
    sale.timestamp
  );
  return {
    ...sale,
    id: res.lastInsertRowId
  };
}

export function getSalesFromDb(): Sale[] {
  const db = getDb();
  return db.getAllSync<any>('SELECT * FROM sales')
    .map(row => ({
      id: row.id,
      productId: row.product_id,
      quantidade: row.quantidade,
      valorTotal: row.valor_total,
      sessionId: row.session_id || undefined,
      cashRegisterId: row.cash_register_id,
      timestamp: row.timestamp
    }));
}

// ==========================================
// MANUTENÇÃO E LIMPEZA
// ==========================================

export function getMaintenancesFromDb(): Maintenance[] {
  const db = getDb();
  return db.getAllSync<any>('SELECT * FROM maintenances')
    .map(row => ({
      id: row.id,
      machineId: row.machine_id,
      tipo: row.tipo as Maintenance['tipo'],
      atividade: row.atividade,
      agendadoPara: row.agendado_para,
      concluidoEm: row.concluido_em || undefined,
      responsavelId: row.responsavel_id || undefined,
      observacoes: row.observacoes || undefined,
      status: row.status as Maintenance['status']
    }));
}

export function insertMaintenanceInDb(m: Omit<Maintenance, 'id'>): Maintenance {
  const db = getDb();
  const res = db.runSync(
    'INSERT INTO maintenances (machine_id, tipo, atividade, agendado_para, status) VALUES (?, ?, ?, ?, ?)',
    m.machineId,
    m.tipo,
    m.atividade,
    m.agendadoPara,
    m.status
  );
  return {
    ...m,
    id: res.lastInsertRowId
  };
}

export function updateMaintenanceStatusInDb(id: number, status: Maintenance['status'], concluidoEm?: number, observacoes?: string) {
  const db = getDb();
  db.runSync(
    'UPDATE maintenances SET status = ?, concluido_em = ?, observacoes = ? WHERE id = ?',
    status,
    concluidoEm || null,
    observacoes || null,
    id
  );
}

export function getCleaningsFromDb(): Cleaning[] {
  const db = getDb();
  return db.getAllSync<any>('SELECT * FROM cleanings')
    .map(row => ({
      id: row.id,
      area: row.area,
      checklistItemId: row.checklist_item_id || undefined,
      frequencia: row.frequencia as Cleaning['frequencia'],
      agendadoPara: row.agendado_para,
      concluidoEm: row.concluido_em || undefined,
      responsavelId: row.responsavel_id || undefined,
      fotoEvidencia: row.foto_evidencia || undefined
    }));
}

export function insertCleaningInDb(c: Omit<Cleaning, 'id'>): Cleaning {
  const db = getDb();
  const res = db.runSync(
    'INSERT INTO cleanings (area, checklist_item_id, frequencia, agendado_para, concluido_em, responsavel_id) VALUES (?, ?, ?, ?, ?, ?)',
    c.area,
    c.checklistItemId || null,
    c.frequencia,
    c.agendadoPara,
    c.concluidoEm || null,
    1 // default single user
  );
  return {
    ...c,
    id: res.lastInsertRowId
  };
}

export function getCleaningChecklistItemsFromDb(): CleaningChecklistItem[] {
  const db = getDb();
  return db.getAllSync<any>('SELECT * FROM cleaning_checklist_items')
    .map(row => ({
      id: row.id,
      descricao: row.descricao,
      area: row.area
    }));
}

// ==========================================
// CLIENTES (CUSTOMERS)
// ==========================================

export function getCustomersFromDb(): Customer[] {
  const db = getDb();
  return db.getAllSync<any>('SELECT * FROM customers')
    .map(row => ({
      id: row.id,
      nome: row.nome,
      contacto: row.contacto || undefined,
      dataNascimento: row.data_nascimento || undefined,
      pontosSaldo: row.pontos_saldo,
      criadoEm: row.criado_em
    }));
}

export function insertCustomerInDb(c: Omit<Customer, 'id' | 'pontosSaldo' | 'criadoEm'>): Customer {
  const db = getDb();
  const now = Date.now();
  const res = db.runSync(
    'INSERT INTO customers (nome, contacto, data_nascimento, pontos_saldo, criado_em) VALUES (?, ?, ?, ?, ?)',
    c.nome,
    c.contacto || null,
    c.dataNascimento || null,
    0,
    now
  );
  return {
    ...c,
    id: res.lastInsertRowId,
    pontosSaldo: 0,
    criadoEm: now
  };
}

export function updateCustomerPointsInDb(id: number, newPoints: number) {
  const db = getDb();
  db.runSync('UPDATE customers SET pontos_saldo = ? WHERE id = ?', newPoints, id);
}

// ==========================================
// EXPORTAÇÃO (relatórios em CSV usam dados reais do SQLite)
// ==========================================

export function getSessionsForExport(start: number, end: number) {
  const db = getDb();
  return db.getAllSync<any>(
    `SELECT s.id, mac.nome as maquina, g.nome as jogo, s.inicio, s.fim_real, s.duracao_minutos,
            s.valor_cobrado, s.tipo_pagamento, s.status
     FROM sessions s
     JOIN machines mac ON s.machine_id = mac.id
     JOIN games g ON s.game_id = g.id
     WHERE s.inicio >= ? AND s.inicio <= ?
     ORDER BY s.inicio DESC`,
    start,
    end
  );
}

export function getSalesForExport(start: number, end: number) {
  const db = getDb();
  return db.getAllSync<any>(
    `SELECT sa.id, p.nome as produto, sa.quantidade, sa.valor_total, sa.timestamp
     FROM sales sa
     JOIN products p ON sa.product_id = p.id
     WHERE sa.timestamp >= ? AND sa.timestamp <= ?
     ORDER BY sa.timestamp DESC`,
    start,
    end
  );
}

// ==========================================
// BACKUP LOCAL
// ==========================================

// Tables listed in dependency order (parents before children) so a restore
// can safely delete-and-reinsert without violating foreign keys.
export const BACKUP_TABLES = [
  'users', 'machines', 'games', 'price_rules', 'cash_registers', 'sessions',
  'cash_movements', 'products', 'sales', 'maintenances',
  'cleaning_checklist_items', 'cleanings', 'customers', 'loyalty_transactions',
  'reservations', 'happy_hour_rules', 'tournaments', 'tournament_entries',
  'backup_logs',
];

export function exportAllTablesAsJson(): string {
  const db = getDb();
  const tables: Record<string, any[]> = {};
  for (const table of BACKUP_TABLES) {
    tables[table] = db.getAllSync<any>(`SELECT * FROM ${table}`);
  }
  return JSON.stringify({ version: 1, exportedAt: Date.now(), tables });
}

export function restoreAllTablesFromJson(json: string) {
  const parsed = JSON.parse(json) as { tables: Record<string, any[]> };
  const db = getDb();
  db.execSync('PRAGMA foreign_keys = OFF;');
  db.withTransactionSync(() => {
    // Delete children first, in reverse dependency order.
    for (const table of [...BACKUP_TABLES].reverse()) {
      db.runSync(`DELETE FROM ${table}`);
    }
    // Insert parents first, in forward dependency order.
    for (const table of BACKUP_TABLES) {
      const rows = parsed.tables[table] || [];
      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(', ');
        db.runSync(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
          ...cols.map(c => row[c])
        );
      }
    }
  });
  db.execSync('PRAGMA foreign_keys = ON;');
}

export function insertBackupLogInDb(tipo: string, status: string, destino: string) {
  const db = getDb();
  const now = Date.now();
  db.runSync(
    'INSERT INTO backup_logs (tipo, data_hora, status, destino) VALUES (?, ?, ?, ?)',
    tipo,
    now,
    status,
    destino
  );
  return now;
}

export function getBackupLogsFromDb(): { id: number; tipo: string; dataHora: number; status: string; destino: string }[] {
  const db = getDb();
  return db.getAllSync<any>('SELECT * FROM backup_logs ORDER BY data_hora DESC')
    .map(row => ({
      id: row.id,
      tipo: row.tipo,
      dataHora: row.data_hora,
      status: row.status,
      destino: row.destino,
    }));
}
