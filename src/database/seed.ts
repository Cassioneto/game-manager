import { getDb } from './db';

// Runs in a single transaction so seeding is all-or-nothing: the launch check
// only looks at the machines table, so a partially seeded database would be
// skipped (and stay broken) on every following launch.
export function seedDatabase() {
  const db = getDb();

  db.withTransactionSync(() => {
    // Seed default single user (app has no login/PIN — this row only exists to
    // satisfy the "responsavel" foreign keys used for audit trails)
    db.execSync(`
      INSERT OR IGNORE INTO users (id, nome, perfil) VALUES
      (1, 'Administrador', 'gerente');
    `);

    // Seed Machines
    db.execSync(`
      INSERT OR IGNORE INTO machines (id, numero, nome, setor, status) VALUES
      (1, '01', 'Máquina 01', 'Setor A', 'livre'),
      (2, '02', 'Máquina 02', 'Setor A', 'livre'),
      (3, '03', 'Máquina 03', 'Setor B', 'livre'),
      (4, '04', 'Máquina 04', 'Setor B', 'livre'),
      (5, '05', 'Máquina 05', 'Setor C', 'livre'),
      (6, '06', 'Máquina 06', 'Setor C', 'livre');
    `);

    // Seed Games
    db.execSync(`
      INSERT OR IGNORE INTO games (id, nome, categoria, tipo_pagamento) VALUES
      (1, 'Naruto Shippuden', 'Luta', 'jogo'),
      (2, 'FIFA 24', 'Esportes', 'tempo'),
      (3, 'Mortal Kombat', 'Luta', 'jogo'),
      (4, 'PES 24', 'Esportes', 'tempo'),
      (5, 'Tekken 8', 'Luta', 'jogo'),
      (6, 'Need for Speed', 'Corrida', 'jogo');
    `);

    // Seed Price Rules
    db.execSync(`
      INSERT OR IGNORE INTO price_rules (id, game_id, duracao_minutos, preco, tipo) VALUES
      -- Naruto (por jogo)
      (1, 1, NULL, 50, 'jogo'),
      -- FIFA (por tempo)
      (2, 2, 10, 15, 'tempo'),
      (3, 2, 30, 30, 'tempo'),
      (4, 2, 60, 55, 'tempo'),
      (5, 2, 120, 100, 'tempo'),
      -- Mortal Kombat (por jogo)
      (6, 3, NULL, 50, 'jogo'),
      -- PES (por tempo)
      (7, 4, 10, 15, 'tempo'),
      (8, 4, 30, 30, 'tempo'),
      (9, 4, 60, 55, 'tempo'),
      (10, 4, 120, 100, 'tempo'),
      -- Tekken (por jogo)
      (11, 5, NULL, 50, 'jogo'),
      -- Need for Speed (por jogo)
      (12, 6, NULL, 50, 'jogo');
    `);

    // Seed Products
    db.execSync(`
      INSERT OR IGNORE INTO products (id, nome, categoria, preco, estoque_atual, estoque_minimo) VALUES
      (1, 'Água 500ml', 'Bebidas', 50, 50, 10),
      (2, 'Refrigerante 350ml', 'Bebidas', 150, 30, 5),
      (3, 'Pipoca Pequena', 'Snacks', 100, 20, 5),
      (4, 'Pipoca Grande', 'Snacks', 150, 15, 3),
      (5, 'Chocolate', 'Doces', 75, 25, 5),
      (6, 'Salgado', 'Snacks', 200, 10, 3);
    `);

    // Seed Cleaning Checklist Items
    db.execSync(`
      INSERT OR IGNORE INTO cleaning_checklist_items (id, descricao, area) VALUES
      (1, 'Limpeza de telas/monitores', 'Geral'),
      (2, 'Limpeza e desinfeção de controles', 'Geral'),
      (3, 'Limpeza e desinfeção de cadeiras', 'Geral'),
      (4, 'Varrer o chão', 'Geral'),
      (5, 'Esvaziar lixeiras', 'Geral'),
      (6, 'Limpeza de balcão/caixa', 'Recepção'),
      (7, 'Reposição de produtos', 'Recepção'),
      (8, 'Limpeza profunda de estofados', 'Geral'),
      (9, 'Limpeza de vidros e espelhos', 'Geral'),
      (10, 'Organização de cabos', 'Geral');
    `);
  });
}
