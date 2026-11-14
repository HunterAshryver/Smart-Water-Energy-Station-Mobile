import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { Falha } from '../types';

const corSeveridade = (severidade: string) => {
  switch (severidade?.toUpperCase()) {
    case 'CRITICA': return '#F87171';
    case 'ALTA': return '#FB923C';
    case 'MEDIA': return '#FBBF24';
    default: return '#60A5FA';
  }
};

const dataFormatada = (value?: string) => {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
};

export default function FalhasScreen() {
  const [falhas, setFalhas] = useState<Falha[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resolvendoId, setResolvendoId] = useState<number | null>(null);
  const [erro, setErro] = useState('');

  const carregarFalhas = useCallback(async () => {
    setErro('');
    try {
      const response = await api.get<Falha[]>('/api/falhas');
      setFalhas(response.data);
    } catch (error: any) {
      setErro(error?.response?.status
        ? `Erro ${error.response.status} ao consultar /api/falhas.`
        : 'Não foi possível conectar ao backend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarFalhas();
  }, [carregarFalhas]);

  const atualizar = () => {
    setRefreshing(true);
    carregarFalhas();
  };

  const resolverFalha = async (falha: Falha) => {
    if (falha.id === undefined) return;
    setResolvendoId(falha.id);
    try {
      await api.put(`/api/falhas/${falha.id}/resolver`);
      await carregarFalhas();
    } catch (error) {
      Alert.alert('Não foi possível resolver', 'Confira a conexão com o backend e tente novamente.');
      console.error('Erro ao resolver falha:', error);
    } finally {
      setResolvendoId(null);
    }
  };

  const pendentes = falhas.filter((falha) => !falha.resolvido).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Carregando falhas...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={atualizar} tintColor="#38BDF8" colors={['#38BDF8']} />}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CENTRAL DE OCORRÊNCIAS</Text>
          <Text style={styles.title}>Falhas operacionais</Text>
          <Text style={styles.subtitle}>Acompanhe e marque como resolvidas as falhas registradas.</Text>
        </View>

        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryNumber}>{pendentes}</Text>
            <Text style={styles.summaryLabel}>Pendentes</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View>
            <Text style={styles.summaryNumber}>{falhas.length - pendentes}</Text>
            <Text style={styles.summaryLabel}>Resolvidas</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View>
            <Text style={styles.summaryNumber}>{falhas.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>

        {erro ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{erro}</Text>
            <TouchableOpacity onPress={atualizar} style={styles.retryButton}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {falhas.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyTitle}>Nenhuma falha registrada</Text>
            <Text style={styles.emptyText}>Quando uma falha for cadastrada, ela aparecerá nesta tela.</Text>
          </View>
        ) : falhas.map((falha) => {
          const color = corSeveridade(falha.severidade);
          return (
            <View key={falha.id} style={[styles.card, { borderLeftColor: color }]}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{falha.titulo}</Text>
                <View style={[styles.severityBadge, { backgroundColor: `${color}22`, borderColor: color }]}>
                  <Text style={[styles.severityText, { color }]}>{falha.severidade}</Text>
                </View>
              </View>
              <Text style={styles.description}>{falha.descricao}</Text>
              <View style={styles.cardBottom}>
                <Text style={[styles.statusText, { color: falha.resolvido ? '#2DD4BF' : '#FBBF24' }]}>
                  {falha.resolvido ? 'RESOLVIDA' : 'PENDENTE'}
                </Text>
                <Text style={styles.dateText}>{dataFormatada(falha.dataHora)}</Text>
              </View>
              {!falha.resolvido ? (
                <TouchableOpacity
                  style={styles.resolveButton}
                  onPress={() => resolverFalha(falha)}
                  disabled={resolvendoId === falha.id}
                >
                  <Text style={styles.resolveButtonText}>
                    {resolvendoId === falha.id ? 'Atualizando...' : 'Marcar como resolvida'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080F1C' },
  container: { flex: 1, backgroundColor: '#080F1C' },
  content: { paddingBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#080F1C' },
  loadingText: { color: '#94A3B8', fontSize: 12, marginTop: 12 },
  header: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18 },
  eyebrow: { color: '#38BDF8', fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: '#F8FAFC', fontSize: 27, fontWeight: '900', marginTop: 6 },
  subtitle: { color: '#94A3B8', fontSize: 12, lineHeight: 18, marginTop: 6 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginHorizontal: 16, marginBottom: 16, paddingVertical: 15, backgroundColor: '#101C2E', borderRadius: 13, borderWidth: 1, borderColor: '#20334A' },
  summaryNumber: { textAlign: 'center', color: '#F8FAFC', fontSize: 21, fontWeight: '900' },
  summaryLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  summaryDivider: { width: 1, height: 34, backgroundColor: '#2A3D55' },
  errorBox: { marginHorizontal: 16, marginBottom: 12, padding: 13, borderRadius: 10, backgroundColor: '#3A1D25', borderWidth: 1, borderColor: '#7F1D1D' },
  errorText: { color: '#FECACA', fontSize: 12 },
  retryButton: { alignSelf: 'flex-start', backgroundColor: '#7F1D1D', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 7, marginTop: 9 },
  retryText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  card: { marginHorizontal: 16, marginBottom: 10, padding: 15, borderRadius: 12, backgroundColor: '#101C2E', borderWidth: 1, borderColor: '#20334A', borderLeftWidth: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, color: '#E2E8F0', fontSize: 14, fontWeight: '800' },
  severityBadge: { borderWidth: 1, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 8 },
  severityText: { fontSize: 9, fontWeight: '900' },
  description: { color: '#A9B8CA', fontSize: 12, lineHeight: 18, marginTop: 10 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 8 },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  dateText: { color: '#64748B', fontSize: 9, textAlign: 'right', flex: 1 },
  resolveButton: { alignSelf: 'flex-start', backgroundColor: '#115E59', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, marginTop: 13 },
  resolveButtonText: { color: '#CCFBF1', fontSize: 10, fontWeight: '900' },
  emptyCard: { marginHorizontal: 16, padding: 27, backgroundColor: '#101C2E', borderRadius: 13, borderWidth: 1, borderColor: '#20334A', alignItems: 'center' },
  emptyIcon: { color: '#2DD4BF', fontSize: 38, fontWeight: '900' },
  emptyTitle: { color: '#E2E8F0', fontSize: 15, fontWeight: '900', marginTop: 10 },
  emptyText: { color: '#94A3B8', fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 7 },
});
