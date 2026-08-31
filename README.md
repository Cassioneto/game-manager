# Game Room Manager

Sistema de Gestão para Casa de Jogos (React Native)

## Visão Geral

Aplicativo React Native para gestão operacional de uma casa de jogos (gaming house / cyber gaming). Permite controlar o tempo de uso de máquinas/postos, gerenciar caixa diário, agendar manutenção e limpeza, vender produtos, gerar relatórios e muito mais.

## Funcionalidades Implementadas (Completo)

### ✅ Core Features (MVP)
- **Gestão de Máquinas** - Mapa visual com status (livre, ocupada, manutenção, inativa)
- **Sessões de Jogo** - Início/fim de sessão com cronômetro regressivo
- **Caixa Diário** - Abertura/fecho com conciliação de valores
- **Vendas de Produtos** - Registro de vendas avulsas e controle de estoque
- **Manutenção** - Agendamento e tracking de manutenções preventivas/corretivas
- **Limpeza** - Checklists diários/semanais/mensais
- **Relatórios** - Interface para geração de PDF e exportação CSV/Excel
- **Tabela de Preços** - Configuração de preços por jogo e duração
- **Pagamento Flexível** - Suporte para pagamento por tempo ou por jogo

### ✅ Funcionalidades Avançadas (Fases 5-6)
- **Sistema de Fidelidade** - Acúmulo de pontos por tempo jogado, resgate por tempo grátis ou produtos
- **Reservas de Máquinas** - Agendamento antecipado com bloqueio automático
- **Happy Hour** - Promoções por horário/dia da semana com preços especiais
- **Torneios** - Criação de competições, inscrições e registro de resultados
- **Exportação CSV/Excel** - Exportação de dados para análise externa
- **Backup Google Drive** - Backup automático diário e restauração de dados

### 📱 Screens
- **Splash** - Tela inicial com informações do criador
- **Dashboard** - Visão geral do dia, caixa atual, máquinas em uso
- **Máquinas** - Grid visual com status por cor
- **Sessão Ativa** - Cronômetro, opções de estender/encerrar
- **Caixa** - Abertura, movimentos, fecho
- **Produtos** - Vendas avulsas e estoque
- **Manutenção** - Lista, agenda, checklist
- **Limpeza** - Checklists diários/semanais
- **Relatórios** - Seleção de período, geração/partilha
- **Configurações** - Gestão de máquinas, jogos, preços
- **Fidelidade** - Gestão de pontos e clientes
- **Reservas** - Agendamento de máquinas
- **Happy Hour** - Configuração de promoções
- **Torneios** - Gestão de competições
- **Exportação** - Exportação CSV/Excel
- **Backup** - Backup e restauração

## Stack Técnica

- **Framework**: React Native (Expo SDK 57)
- **Navegação**: React Navigation (Native Stack + Bottom Tabs)
- **Estado**: Zustand
- **Banco de Dados**: SQLite (expo-sqlite), com migrações versionadas próprias
- **Geração de PDF**: expo-print + expo-sharing
- **Notificações**: expo-notifications
- **Data/Time**: date-fns
- **Compartilhamento**: expo-sharing
- **Sistema de Arquivos**: expo-file-system
- **Linguagem**: TypeScript

## Estrutura do Projeto

```
game-room-manager/
├── src/
│   ├── database/
│   │   ├── db.ts           # Conexão + schema + migrações versionadas
│   │   ├── queries.ts      # Todas as queries SQL
│   │   └── seed.ts         # Dados iniciais
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── screens/
│   │   ├── DashboardScreen.tsx
│   │   ├── MachinesScreen.tsx
│   │   ├── SessionScreen.tsx
│   │   ├── CashRegisterScreen.tsx
│   │   ├── ProductsScreen.tsx
│   │   ├── MaintenanceScreen.tsx
│   │   ├── CleaningScreen.tsx
│   │   ├── ReportsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── PricingScreen.tsx
│   │   ├── LoyaltyScreen.tsx
│   │   ├── ReservationsScreen.tsx
│   │   ├── HappyHourScreen.tsx
│   │   ├── TournamentsScreen.tsx
│   │   ├── ExportScreen.tsx
│   │   └── BackupScreen.tsx
│   ├── notifications.ts    # Alertas locais de sessão (background/tela bloqueada)
│   ├── store/
│   │   └── useStore.ts     # Zustand store
│   └── types/
│       └── index.ts        # TypeScript types
├── App.tsx
├── package.json
└── tsconfig.json
```

> App de operador único: não há tela de login nem PIN — o app abre direto no Dashboard.

## Instalação

```bash
# Instalar dependências
npm install

# Iniciar o app
npm start

# Rodar no Android
npm run android

# Rodar no iOS
npm run ios
```

## Banco de Dados

O app utiliza SQLite local (expo-sqlite) com queries SQL diretas e um sistema de migrações versionadas (`PRAGMA user_version`) para evoluir o schema com segurança em dispositivos que já têm dados salvos. O schema inclui 19 tabelas:

- machines, games, price_rules
- sessions, cash_registers, cash_movements
- products, sales
- maintenances, cleanings, cleaning_checklist_items
- users, customers, loyalty_transactions
- reservations, happy_hour_rules
- tournaments, tournament_entries
- backup_logs

## Detalhes das Funcionalidades

### Sistema de Fidelidade
- Clientes acumulam pontos por tempo jogado (configurável)
- Resgate de pontos por tempo grátis ou produtos
- Extrato completo de transações de pontos
- Cadastro de clientes com histórico

### Reservas de Máquinas
- Agendamento antecipado de máquinas específicas ou "qualquer livre"
- Bloqueio automático X minutos antes do horário
- Expiração automática se cliente não comparecer
- Gestão de cancelamentos e reagendamentos

### Happy Hour
- Configuração de janelas de horário por dia da semana
- Preços promocionais por jogo e duração
- Indicação visual quando promoção está ativa
- Ativação/desativação rápida de regras

### Torneios
- Criação de torneios com vagas limitadas
- Inscrição de participantes com taxa
- Registro de resultados/colocações
- Histórico de torneios realizados

### Exportação de Dados
- Exportação em formato CSV
- Exportação em formato Excel (.xlsx)
- Filtros por período (hoje, semana, mês, personalizado)
- Múltiplos tipos de relatório (estatísticas, atividades, sessões, vendas)
- Compartilhamento via WhatsApp, Email, etc.

### Backup
- Backup automático diário configurável
- Backup manual sob demanda
- Restauração de backups
- Histórico de backups realizados
- Integração com Google Drive (configurável)

## Especificação

Veja `spec.md` para a especificação completa do sistema, incluindo todos os requisitos funcionais (RF) e não funcionais (RNF).

## Licença

MIT
