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

  const carregarDados = useCallback(async () => {
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
    } catch (error: any) {
      const status = error?.response?.status;
      setErro(
        status
          ? `A API respondeu com erro ${status}. Confira o backend e os endpoints.`
          : 'Não foi possível conectar ao backend. Confira se ele está iniciado e se a URL da API está correta.',
      );
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
  const mediaDosNiveis = useMemo(() => {
    if (!niveis.length) return 0;
    return Math.round(niveis.reduce((total, item) => total + percentualNivel(item), 0) / niveis.length);
  }, [niveis]);
  const consumoTotal = useMemo(
    () => consumos.reduce((total, item) => total + (item.valorKwh || 0), 0),
    [consumos],
  );

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
            {niveis.length === 0 ? <CartaoVazio mensagem="Nenhum nível cadastrado." /> : niveis.map((item) => {
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
            {vazoes.length === 0 ? <CartaoVazio mensagem="Nenhuma medição de vazão cadastrada." /> : vazoes.map((item) => (
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
            {consumos.length === 0 ? <CartaoVazio mensagem="Nenhum registro de consumo elétrico cadastrado." /> : consumos.map((item) => (
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
