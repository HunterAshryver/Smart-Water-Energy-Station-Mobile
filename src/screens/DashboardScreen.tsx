import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { Atuador, ConsumoEletrico, Falha, Nivel, Vazao } from '../types';

type Secao = 'niveis' | 'vazoes' | 'consumo' | 'atuadores' | 'falhas';

type RegistroComData = { id?: number; dataHora?: string };

function ordenarMaisRecentes<T extends RegistroComData>(registros: T[]): T[] {
  return [...registros].sort((a, b) => {
    const dataA = a.dataHora ? new Date(a.dataHora).getTime() : 0;
    const dataB = b.dataHora ? new Date(b.dataHora).getTime() : 0;
    return dataB - dataA || (b.id ?? 0) - (a.id ?? 0);
  });
}

const aleatorio = (minimo: number, maximo: number) =>
  minimo + Math.random() * (maximo - minimo);

const limitar = (valor: number, minimo: number, maximo: number) =>
  Math.max(minimo, Math.min(maximo, valor));

const arredondar = (valor: number, casas = 2) =>
  Number(valor.toFixed(casas));

const formatarData = (value?: string) => {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
};

const percentualNivel = (nivel: Nivel) => {
  if (!nivel.capacidadeMaxima || nivel.capacidadeMaxima <= 0) return 0;
  return Math.max(0, Math.min(100, (nivel.nivelAtual / nivel.capacidadeMaxima) * 100));
};

const corSeveridade = (severidade: string) => {
  switch (severidade?.toUpperCase()) {
    case 'CRITICA': return '#F87171';
    case 'ALTA': return '#FB923C';
    case 'MEDIA': return '#FBBF24';
    default: return '#60A5FA';
  }
};

function CartaoVazio({ mensagem }: { mensagem: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{mensagem}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const [atuadores, setAtuadores] = useState<Atuador[]>([]);
  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [vazoes, setVazoes] = useState<Vazao[]>([]);
  const [consumos, setConsumos] = useState<ConsumoEletrico[]>([]);
  const [falhas, setFalhas] = useState<Falha[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState('');
  const [secao, setSecao] = useState<Secao>('niveis');
  const [atuadorEmAcao, setAtuadorEmAcao] = useState<number | null>(null);
  const [simulando, setSimulando] = useState(false);
  const [mensagemSimulacao, setMensagemSimulacao] = useState('');
  const [statusSimulacao, setStatusSimulacao] = useState<'success' | 'warning' | ''>('');

  const carregarDados = useCallback(async (): Promise<boolean> => {
    setErro('');
    try {
      const [atuadoresRes, niveisRes, vazoesRes, consumosRes, falhasRes] = await Promise.all([
        api.get<Atuador[]>('/api/atuadores'),
        api.get<Nivel[]>('/api/niveis'),
        api.get<Vazao[]>('/api/vazoes'),
        api.get<ConsumoEletrico[]>('/api/consumo'),
        api.get<Falha[]>('/api/falhas'),
      ]);

      setAtuadores(atuadoresRes.data);
      setNiveis(niveisRes.data);
      setVazoes(vazoesRes.data);
      setConsumos(consumosRes.data);
      setFalhas(falhasRes.data);
      return true;
    } catch (error: any) {
      const status = error?.response?.status;
      setErro(
        status
          ? `A API respondeu com erro ${status}. Confira o backend e os endpoints.`
          : 'Não foi possível conectar ao backend. Confira se ele está iniciado e se a URL da API está correta.',
      );
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const atualizar = () => {
    setRefreshing(true);
    carregarDados();
  };

  const totalAtuadoresLigados = useMemo(
    () => atuadores.filter((item) => item.ligado).length,
    [atuadores],
  );
  const falhasPendentes = useMemo(
    () => falhas.filter((item) => !item.resolvido).length,
    [falhas],
  );
  // O endpoint /api/niveis guarda leituras históricas. Para os cards de nível,
  // mostramos apenas a medição mais recente de cada reservatório.
  const niveisMaisRecentes = useMemo(() => {
    const porNome = new Map<string, Nivel>();
    ordenarMaisRecentes(niveis).forEach((item) => {
      const chave = item.nome.trim().toLocaleLowerCase();
      if (!porNome.has(chave)) porNome.set(chave, item);
    });
    return [...porNome.values()];
  }, [niveis]);

  const vazoesMaisRecentes = useMemo(
    () => ordenarMaisRecentes(vazoes).slice(0, 12),
    [vazoes],
  );
  const consumosMaisRecentes = useMemo(
    () => ordenarMaisRecentes(consumos).slice(0, 12),
    [consumos],
  );

  const mediaDosNiveis = useMemo(() => {
    if (!niveisMaisRecentes.length) return 0;
    return Math.round(
      niveisMaisRecentes.reduce((total, item) => total + percentualNivel(item), 0) /
        niveisMaisRecentes.length,
    );
  }, [niveisMaisRecentes]);
  const consumoTotal = useMemo(
    () => consumos.reduce((total, item) => total + (item.valorKwh || 0), 0),
    [consumos],
  );

  const simularColetas = async () => {
    if (simulando) return;

    setSimulando(true);
    setMensagemSimulacao('');
    setStatusSimulacao('');

    // Cada clique representa uma janela simulada de aproximadamente cinco minutos.
    // Os valores variam suavemente a partir da última leitura salva no backend.
    const tanquePrincipalAnterior = niveisMaisRecentes.find(
      (item) => item.nome === 'Reservatório Principal',
    );
    const tanqueSecundarioAnterior = niveisMaisRecentes.find(
      (item) => item.nome === 'Reservatório Secundário',
    );
    const vazaoEntradaAnterior = ordenarMaisRecentes(vazoes).find(
      (item) => item.pontoMedicao === 'Entrada principal',
    );
    const vazaoSaidaAnterior = ordenarMaisRecentes(vazoes).find(
      (item) => item.pontoMedicao === 'Saída da filtragem',
    );

    const fluxoEntrada = arredondar(
      limitar(aleatorio((vazaoEntradaAnterior?.valor ?? 24) - 1.4, (vazaoEntradaAnterior?.valor ?? 24) + 1.4), 17, 31),
    );
    const fluxoSaida = arredondar(
      limitar(aleatorio((vazaoSaidaAnterior?.valor ?? 21) - 1.2, (vazaoSaidaAnterior?.valor ?? 21) + 1.2), 15, 28),
    );

    const nivelPrincipalAnterior = tanquePrincipalAnterior?.nivelAtual ?? 7800;
    const nivelSecundarioAnterior = tanqueSecundarioAnterior?.nivelAtual ?? 3250;
    const nivelPrincipal = arredondar(
      limitar(
        nivelPrincipalAnterior + (fluxoEntrada - fluxoSaida) * 5 + aleatorio(-12, 12),
        500,
        9700,
      ),
    );
    const nivelSecundario = arredondar(
      limitar(nivelSecundarioAnterior + aleatorio(-32, 32), 300, 4800),
    );

    // Consumo por intervalo de coleta: bomba, filtragem e iluminação.
    const consumoBomba = arredondar(0.045 + fluxoEntrada * 0.00085 + aleatorio(-0.004, 0.004), 4);
    const consumoFiltragem = arredondar(0.012 + fluxoSaida * 0.00045 + aleatorio(-0.002, 0.002), 4);
    const consumoIluminacao = arredondar(0.0045 + aleatorio(-0.001, 0.001), 4);

    const requisicoes = [
      api.post('/api/niveis', {
        nome: 'Reservatório Principal',
        capacidadeMaxima: 10000,
        nivelAtual: nivelPrincipal,
        unidade: 'L',
        localizacao: 'Tanque de captação',
      }),
      api.post('/api/niveis', {
        nome: 'Reservatório Secundário',
        capacidadeMaxima: 5000,
        nivelAtual: nivelSecundario,
        unidade: 'L',
        localizacao: 'Área de armazenamento',
      }),
      api.post('/api/vazoes', {
        valor: fluxoEntrada,
        unidade: 'L/min',
        pontoMedicao: 'Entrada principal',
      }),
      api.post('/api/vazoes', {
        valor: fluxoSaida,
        unidade: 'L/min',
        pontoMedicao: 'Saída da filtragem',
      }),
      api.post('/api/consumo', { valorKwh: consumoBomba, setor: 'Bombas' }),
      api.post('/api/consumo', { valorKwh: consumoFiltragem, setor: 'Filtragem' }),
      api.post('/api/consumo', { valorKwh: consumoIluminacao, setor: 'Iluminação' }),
    ];

    try {
      const resultados = await Promise.allSettled(requisicoes);
      const falhasNaColeta = resultados.filter((item) => item.status === 'rejected').length;
      const leiturasSalvas = resultados.length - falhasNaColeta;
      const painelAtualizado = await carregarDados();

      if (falhasNaColeta === 0 && painelAtualizado) {
        setStatusSimulacao('success');
        setMensagemSimulacao(
          'Coleta concluída: 2 níveis, 2 vazões e 3 medições elétricas foram salvos no banco de dados.',
        );
      } else if (falhasNaColeta === 0) {
        setStatusSimulacao('warning');
        setMensagemSimulacao(
          'As 7 leituras foram enviadas, mas o painel não conseguiu atualizá-las. Verifique a conexão e atualize novamente.',
        );
      } else {
        setStatusSimulacao('warning');
        setMensagemSimulacao(
          `${leiturasSalvas} de 7 leituras foram salvas. ${falhasNaColeta} falharam; confira o backend e tente novamente.`,
        );
      }
    } catch (error) {
      console.error('Erro ao simular coletas:', error);
      setStatusSimulacao('warning');
      setMensagemSimulacao('Não foi possível concluir a simulação. Confira se o backend está ativo.');
    } finally {
      setSimulando(false);
    }
  };

  const alternarAtuador = async (id?: number) => {
    if (id === undefined) return;
    setAtuadorEmAcao(id);
    try {
      await api.post(`/api/atuadores/${id}/acionar`);
      await carregarDados();
    } catch {
      setErro('Não foi possível alterar o estado do atuador. Tente novamente.');
    } finally {
      setAtuadorEmAcao(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.brandMark}>SW</Text>
        <Text style={styles.loadingTitle}>SMART WATER</Text>
        <Text style={styles.loadingSubtitle}>Conectando à estação...</Text>
        <ActivityIndicator size="large" color="#38BDF8" style={{ marginTop: 22 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={atualizar} tintColor="#38BDF8" colors={['#38BDF8']} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>FIAP · ESTAÇÃO INTELIGENTE</Text>
            <Text style={styles.title}>Smart Water</Text>
            <Text style={styles.subtitle}>Monitoramento hídrico e energético</Text>
          </View>
          <View style={[styles.connectionBadge, !!erro && styles.connectionBadgeOffline]}>
            <View style={[styles.connectionDot, !!erro && styles.connectionDotOffline]} />
            <Text style={styles.connectionText}>{erro ? 'SEM CONEXÃO' : 'API CONECTADA'}</Text>
          </View>
        </View>

        {erro ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Falha de comunicação</Text>
            <Text style={styles.errorText}>{erro}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={atualizar}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statBlue]}>
            <Text style={styles.statValue}>{totalAtuadoresLigados}/{atuadores.length}</Text>
            <Text style={styles.statLabel}>Atuadores ligados</Text>
          </View>
          <View style={[styles.statCard, styles.statTeal]}>
            <Text style={styles.statValue}>{mediaDosNiveis}%</Text>
            <Text style={styles.statLabel}>Nível médio</Text>
          </View>
          <View style={[styles.statCard, styles.statPurple]}>
            <Text style={styles.statValue}>{consumoTotal.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Consumo acumulado · kWh</Text>
          </View>
          <View style={[styles.statCard, styles.statOrange]}>
            <Text style={styles.statValue}>{falhasPendentes}</Text>
            <Text style={styles.statLabel}>Falhas pendentes</Text>
          </View>
        </View>

        <View style={styles.simulationPanel}>
          <View style={styles.simulationTextBlock}>
            <Text style={styles.simulationTitle}>Simulador de sensores</Text>
            <Text style={styles.simulationDescription}>
              Gera uma coleta de 5 minutos e registra 7 leituras no backend.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.simulationButton, simulando && styles.simulationButtonDisabled]}
            onPress={simularColetas}
            disabled={simulando}
            activeOpacity={0.82}
          >
            {simulando ? (
              <ActivityIndicator size="small" color="#F0F9FF" />
            ) : (
              <Text style={styles.simulationButtonIcon}>▶</Text>
            )}
            <Text style={styles.simulationButtonText}>
              {simulando ? 'Coletando...' : 'Simular coletas'}
            </Text>
          </TouchableOpacity>
          {mensagemSimulacao ? (
            <Text
              style={[
                styles.simulationMessage,
                statusSimulacao === 'success' ? styles.simulationMessageSuccess : styles.simulationMessageWarning,
              ]}
            >
              {mensagemSimulacao}
            </Text>
          ) : null}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Dados da estação</Text>
          <Text style={styles.sectionHint}>Puxe para baixo para atualizar</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {([
            ['niveis', 'Níveis'],
            ['vazoes', 'Vazões'],
            ['consumo', 'Energia'],
            ['atuadores', 'Atuadores'],
            ['falhas', 'Falhas'],
          ] as [Secao, string][]).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, secao === key && styles.tabActive]}
              onPress={() => setSecao(key)}
            >
              <Text style={[styles.tabText, secao === key && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {secao === 'niveis' && (
          <View>
            {niveisMaisRecentes.length === 0 ? <CartaoVazio mensagem="Nenhum nível cadastrado." /> : niveisMaisRecentes.map((item) => {
              const pct = percentualNivel(item);
              const barColor = pct < 20 ? '#F87171' : pct < 50 ? '#FBBF24' : '#2DD4BF';
              return (
                <View style={styles.dataCard} key={item.id}>
                  <View style={styles.cardTopLine}>
                    <Text style={styles.cardTitle}>{item.nome}</Text>
                    <Text style={[styles.cardPercent, { color: barColor }]}>{pct.toFixed(0)}%</Text>
                  </View>
                  <Text style={styles.cardSecondary}>{item.nivelAtual} {item.unidade} de {item.capacidadeMaxima} {item.unidade}</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                  </View>
                  {item.localizacao ? <Text style={styles.cardFootnote}>{item.localizacao}</Text> : null}
                  <Text style={styles.cardFootnote}>{formatarData(item.dataHora)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {secao === 'vazoes' && (
          <View>
            {vazoes.length === 0 ? <CartaoVazio mensagem="Nenhuma medição de vazão cadastrada." /> : vazoesMaisRecentes.map((item) => (
              <View style={styles.dataCard} key={item.id}>
                <Text style={styles.cardTitle}>{item.pontoMedicao}</Text>
                <Text style={styles.metricValue}>{Number(item.valor).toFixed(2)} <Text style={styles.metricUnit}>{item.unidade}</Text></Text>
                <Text style={styles.cardFootnote}>{formatarData(item.dataHora)}</Text>
              </View>
            ))}
          </View>
        )}

        {secao === 'consumo' && (
          <View>
            {consumos.length === 0 ? <CartaoVazio mensagem="Nenhum registro de consumo elétrico cadastrado." /> : consumosMaisRecentes.map((item) => (
              <View style={styles.dataCard} key={item.id}>
                <Text style={styles.cardTitle}>{item.setor}</Text>
                <Text style={styles.metricValue}>{Number(item.valorKwh).toFixed(2)} <Text style={styles.metricUnit}>kWh</Text></Text>
                <Text style={styles.cardFootnote}>{formatarData(item.dataHora)}</Text>
              </View>
            ))}
          </View>
        )}

        {secao === 'atuadores' && (
          <View>
            {atuadores.length === 0 ? <CartaoVazio mensagem="Nenhum atuador cadastrado." /> : atuadores.map((item) => (
              <View style={styles.dataCard} key={item.id}>
                <View style={styles.cardTopLine}>
                  <Text style={styles.cardTitle}>{item.nome}</Text>
                  <View style={[styles.statusPill, item.ligado ? styles.statusOn : styles.statusOff]}>
                    <Text style={[styles.statusText, { color: item.ligado ? '#2DD4BF' : '#94A3B8' }]}>
                      {item.ligado ? 'LIGADO' : 'DESLIGADO'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardSecondary}>{item.tipo}{item.localizacao ? ` · ${item.localizacao}` : ''}</Text>
                <TouchableOpacity
                  style={[styles.actionButton, item.ligado ? styles.actionStop : styles.actionStart]}
                  onPress={() => alternarAtuador(item.id)}
                  disabled={atuadorEmAcao === item.id}
                >
                  <Text style={styles.actionButtonText}>
                    {atuadorEmAcao === item.id ? 'Enviando...' : item.ligado ? 'Desligar atuador' : 'Ligar atuador'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.cardFootnote}>Última ação: {formatarData(item.ultimaAcao)}</Text>
              </View>
            ))}
          </View>
        )}

        {secao === 'falhas' && (
          <View>
            {falhas.length === 0 ? <CartaoVazio mensagem="Nenhuma falha registrada." /> : falhas.map((item) => {
              const color = corSeveridade(item.severidade);
              return (
                <View style={[styles.dataCard, { borderLeftColor: color }]} key={item.id}>
                  <View style={styles.cardTopLine}>
                    <Text style={styles.cardTitle}>{item.titulo}</Text>
                    <Text style={[styles.severityText, { color }]}>{item.severidade}</Text>
                  </View>
                  <Text style={styles.cardSecondary}>{item.descricao}</Text>
                  <Text style={styles.cardFootnote}>{item.resolvido ? 'Resolvida' : 'Pendente'} · {formatarData(item.dataHora)}</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080F1C' },
  container: { flex: 1, backgroundColor: '#080F1C' },
  content: { paddingBottom: 22 },
  loadingContainer: { flex: 1, backgroundColor: '#080F1C', alignItems: 'center', justifyContent: 'center' },
  brandMark: { color: '#38BDF8', fontSize: 44, fontWeight: '900', letterSpacing: 3 },
  loadingTitle: { color: '#F1F5F9', fontSize: 17, fontWeight: '900', letterSpacing: 3, marginTop: 10 },
  loadingSubtitle: { color: '#718096', fontSize: 13, marginTop: 7 },
  header: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#38BDF8', fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#F8FAFC', fontSize: 29, fontWeight: '900', marginTop: 5 },
  subtitle: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  connectionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#12312F', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, gap: 6 },
  connectionBadgeOffline: { backgroundColor: '#3A1D25' },
  connectionDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: '#2DD4BF' },
  connectionDotOffline: { backgroundColor: '#F87171' },
  connectionText: { color: '#5EEAD4', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  errorBox: { marginHorizontal: 16, marginBottom: 14, padding: 14, borderRadius: 12, backgroundColor: '#3A1D25', borderWidth: 1, borderColor: '#7F1D1D' },
  errorTitle: { color: '#FCA5A5', fontWeight: '800', marginBottom: 5 },
  errorText: { color: '#FECACA', fontSize: 12, lineHeight: 18 },
  retryButton: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: '#7F1D1D', borderRadius: 8 },
  retryText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 9 },
  statCard: { width: '48%', minHeight: 88, borderRadius: 13, padding: 13, borderWidth: 1, backgroundColor: '#101C2E' },
  statBlue: { borderColor: '#1D4ED8' },
  statTeal: { borderColor: '#0F766E' },
  statPurple: { borderColor: '#6D28D9' },
  statOrange: { borderColor: '#9A3412' },
  statValue: { color: '#F8FAFC', fontSize: 23, fontWeight: '900' },
  statLabel: { color: '#94A3B8', fontSize: 10, marginTop: 6, fontWeight: '700' },
  simulationPanel: { marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 13, backgroundColor: '#0D2135', borderWidth: 1, borderColor: '#164E70' },
  simulationTextBlock: { marginBottom: 12 },
  simulationTitle: { color: '#E0F2FE', fontSize: 13, fontWeight: '900' },
  simulationDescription: { color: '#8FAFC6', fontSize: 10, lineHeight: 15, marginTop: 4 },
  simulationButton: { minHeight: 43, borderRadius: 9, backgroundColor: '#0369A1', paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  simulationButtonDisabled: { opacity: 0.6 },
  simulationButtonIcon: { color: '#F0F9FF', fontSize: 11, fontWeight: '900' },
  simulationButtonText: { color: '#F0F9FF', fontSize: 12, fontWeight: '900' },
  simulationMessage: { fontSize: 10, lineHeight: 15, marginTop: 10 },
  simulationMessageSuccess: { color: '#5EEAD4' },
  simulationMessageWarning: { color: '#FCD34D' },
  sectionHeading: { marginTop: 25, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { color: '#F1F5F9', fontSize: 17, fontWeight: '800' },
  sectionHint: { color: '#64748B', fontSize: 10 },
  tabs: { paddingHorizontal: 16, paddingVertical: 13, gap: 8 },
  tab: { backgroundColor: '#101C2E', borderWidth: 1, borderColor: '#24364F', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 9 },
  tabActive: { backgroundColor: '#123B55', borderColor: '#0EA5E9' },
  tabText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#BAE6FD' },
  dataCard: { marginHorizontal: 16, marginBottom: 10, padding: 15, borderRadius: 13, backgroundColor: '#101C2E', borderWidth: 1, borderColor: '#20334A', borderLeftWidth: 3, borderLeftColor: '#0EA5E9' },
  cardTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardTitle: { flex: 1, color: '#E2E8F0', fontSize: 14, fontWeight: '800' },
  cardPercent: { fontSize: 16, fontWeight: '900' },
  cardSecondary: { color: '#94A3B8', fontSize: 12, marginTop: 7, lineHeight: 18 },
  progressTrack: { height: 8, backgroundColor: '#26364A', borderRadius: 8, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 8 },
  cardFootnote: { color: '#64748B', fontSize: 10, marginTop: 8 },
  metricValue: { color: '#F8FAFC', fontSize: 25, fontWeight: '900', marginTop: 8 },
  metricUnit: { color: '#7DD3FC', fontSize: 13, fontWeight: '700' },
  statusPill: { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 9 },
  statusOn: { backgroundColor: '#123B34' },
  statusOff: { backgroundColor: '#263447' },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  actionButton: { alignSelf: 'flex-start', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 8, marginTop: 12 },
  actionStart: { backgroundColor: '#075985' },
  actionStop: { backgroundColor: '#7F1D1D' },
  actionButtonText: { color: '#F8FAFC', fontSize: 11, fontWeight: '800' },
  severityText: { fontSize: 10, fontWeight: '900' },
  emptyCard: { marginHorizontal: 16, padding: 22, backgroundColor: '#101C2E', borderWidth: 1, borderColor: '#20334A', borderRadius: 12, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 12, textAlign: 'center' },
  bottomSpace: { height: 20 },
});
