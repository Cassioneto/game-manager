export type User = {
  id: number;
  nome: string;
  perfil: "gerente" | "operador" | "tecnico" | "limpeza";
};

export type Machine = {
  id: number;
  numero: string;
  nome: string;
  setor?: string;
  descricao?: string;
  status: "livre" | "ocupada" | "manutencao" | "inativa";
};

export type Game = {
  id: number;
  nome: string;
  categoria?: string;
  tipoPagamento: "tempo" | "jogo";
};

export type PriceRule = {
  id: number;
  gameId: number;
  duracaoMinutos: number;
  preco: number;
};

export type Session = {
  id: number;
  machineId: number;
  gameId: number;
  operadorId?: number;
  inicio: number;
  fimPrevisto?: number;
  fimReal?: number;
  duracaoMinutos: number;
  valorCobrado: number;
  status: "ativa" | "concluida" | "cancelada";
  tipoPagamento: "tempo" | "jogo";
  cashRegisterId?: number;
};

export type CashRegister = {
  id: number;
  dataAbertura: number;
  dataFecho?: number;
  responsavelAbertura?: number;
  responsavelFecho?: number;
  valorInicial: number;
  valorContadoFinal?: number;
  valorEsperadoFinal?: number;
  diferenca?: number;
  status: "aberto" | "fechado";
};

export type CashMovement = {
  id: number;
  cashRegisterId: number;
  tipo: "sangria" | "reforco" | "venda" | "sessao";
  valor: number;
  motivo?: string;
  timestamp: number;
};

export type Product = {
  id: number;
  nome: string;
  categoria?: string;
  preco: number;
  estoqueAtual: number;
  estoqueMinimo: number;
};

export type Sale = {
  id: number;
  productId: number;
  quantidade: number;
  valorTotal: number;
  sessionId?: number;
  cashRegisterId: number;
  timestamp: number;
};

export type Maintenance = {
  id: number;
  machineId: number;
  tipo: "preventiva" | "corretiva";
  atividade: string;
  agendadoPara: number;
  concluidoEm?: number;
  responsavelId?: number;
  observacoes?: string;
  status: "agendada" | "em_curso" | "concluida" | "atrasada";
};

export type Cleaning = {
  id: number;
  area: string;
  checklistItemId?: number;
  frequencia: "diaria" | "semanal" | "mensal";
  agendadoPara: number;
  concluidoEm?: number;
  responsavelId?: number;
  fotoEvidencia?: string;
};

export type CleaningChecklistItem = {
  id: number;
  descricao: string;
  area: string;
};

export type Customer = {
  id: number;
  nome: string;
  contacto?: string;
  dataNascimento?: number;
  pontosSaldo: number;
  criadoEm: number;
};

export type LoyaltyTransaction = {
  id: number;
  customerId: number;
  tipo: "ganho" | "resgate";
  pontos: number;
  origem: "sessao" | "resgate_tempo" | "resgate_produto";
  referenciaId?: number;
  timestamp: number;
};

export type Reservation = {
  id: number;
  customerId: number;
  machineId?: number;
  gameId: number;
  horarioReservado: number;
  janelaBloqueioMin: number;
  status: "pendente" | "confirmada" | "expirada" | "cancelada" | "concluida";
};

export type HappyHourRule = {
  id: number;
  gameId: number;
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  duracaoMinutos: number;
  precoPromocional: number;
  ativo: boolean;
};

export type Tournament = {
  id: number;
  gameId: number;
  dataHora: number;
  vagasMaximas: number;
  taxaInscricao: number;
  premio?: string;
  status: "aberto" | "em_curso" | "concluido" | "cancelado";
};

export type TournamentEntry = {
  id: number;
  tournamentId: number;
  customerId: number;
  posicaoFinal?: number;
  inscritoEm: number;
};

export type BackupLog = {
  id: number;
  tipo: "automatico" | "manual";
  dataHora: number;
  status: "sucesso" | "falha";
  destino: string;
};
