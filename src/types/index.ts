export interface Atuador {
  id?: number;
  nome: string;
  tipo: string;
  ligado: boolean;
  localizacao?: string;
  ultimaAcao?: string;
}

export interface Nivel {
  id?: number;
  nome: string;
  capacidadeMaxima: number;
  nivelAtual: number;
  unidade: string;
  localizacao?: string;
  dataHora?: string;
}

export interface Vazao {
  id?: number;
  valor: number;
  unidade: string;
  pontoMedicao: string;
  dataHora?: string;
}

export interface ConsumoEletrico {
  id?: number;
  valorKwh: number;
  setor: string;
  dataHora?: string;
}

export interface Falha {
  id?: number;
  titulo: string;
  descricao: string;
  severidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA' | string;
  resolvido: boolean;
  dataHora?: string;
}
