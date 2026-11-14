import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

type TipoCadastro = 'atuador' | 'nivel' | 'vazao' | 'consumo' | 'falha';

const OPCOES: { value: TipoCadastro; label: string }[] = [
  { value: 'atuador', label: 'Atuador' },
  { value: 'nivel', label: 'Nível' },
  { value: 'vazao', label: 'Vazão' },
  { value: 'consumo', label: 'Energia' },
  { value: 'falha', label: 'Falha' },
];

export default function CadastroScreen() {
  const [tipo, setTipo] = useState<TipoCadastro>('atuador');
  const [salvando, setSalvando] = useState(false);

  const [nomeAtuador, setNomeAtuador] = useState('');
  const [tipoAtuador, setTipoAtuador] = useState('BOMBA');
  const [localAtuador, setLocalAtuador] = useState('');

  const [nomeNivel, setNomeNivel] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [nivelAtual, setNivelAtual] = useState('');
  const [unidadeNivel, setUnidadeNivel] = useState('L');
  const [localNivel, setLocalNivel] = useState('');

  const [valorVazao, setValorVazao] = useState('');
  const [unidadeVazao, setUnidadeVazao] = useState('L/min');
  const [pontoMedicao, setPontoMedicao] = useState('');

  const [valorConsumo, setValorConsumo] = useState('');
  const [setor, setSetor] = useState('');

  const [tituloFalha, setTituloFalha] = useState('');
  const [descricaoFalha, setDescricaoFalha] = useState('');
  const [severidade, setSeveridade] = useState('MEDIA');

  const limparFormulario = () => {
    setNomeAtuador('');
    setTipoAtuador('BOMBA');
    setLocalAtuador('');
    setNomeNivel('');
    setCapacidade('');
    setNivelAtual('');
    setUnidadeNivel('L');
    setLocalNivel('');
    setValorVazao('');
    setUnidadeVazao('L/min');
    setPontoMedicao('');
    setValorConsumo('');
    setSetor('');
    setTituloFalha('');
    setDescricaoFalha('');
    setSeveridade('MEDIA');
  };

  const numeroValido = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;

  const cadastrar = async () => {
    try {
      setSalvando(true);

      if (tipo === 'atuador') {
        if (!nomeAtuador.trim() || !tipoAtuador.trim()) {
          Alert.alert('Campos obrigatórios', 'Informe o nome e o tipo do atuador.');
          return;
        }
        await api.post('/api/atuadores', {
          nome: nomeAtuador.trim(),
          tipo: tipoAtuador.trim().toUpperCase(),
          ligado: false,
          localizacao: localAtuador.trim(),
        });
      }

      if (tipo === 'nivel') {
        if (!nomeNivel.trim() || !numeroValido(capacidade) || !numeroValido(nivelAtual)) {
          Alert.alert('Dados inválidos', 'Informe o nome, a capacidade máxima e o nível atual com valores numéricos válidos.');
          return;
        }
        if (Number(nivelAtual) > Number(capacidade)) {
          Alert.alert('Nível inválido', 'O nível atual não pode ser maior que a capacidade máxima.');
          return;
        }
        await api.post('/api/niveis', {
          nome: nomeNivel.trim(),
          capacidadeMaxima: Number(capacidade),
          nivelAtual: Number(nivelAtual),
          unidade: unidadeNivel.trim() || 'L',
          localizacao: localNivel.trim(),
        });
      }

      if (tipo === 'vazao') {
        if (!numeroValido(valorVazao) || !pontoMedicao.trim()) {
          Alert.alert('Dados inválidos', 'Informe um valor de vazão válido e o ponto de medição.');
          return;
        }
        await api.post('/api/vazoes', {
          valor: Number(valorVazao),
          unidade: unidadeVazao.trim() || 'L/min',
          pontoMedicao: pontoMedicao.trim(),
        });
      }

      if (tipo === 'consumo') {
        if (!numeroValido(valorConsumo) || !setor.trim()) {
          Alert.alert('Dados inválidos', 'Informe o consumo em kWh e o setor correspondente.');
          return;
        }
        await api.post('/api/consumo', {
          valorKwh: Number(valorConsumo),
          setor: setor.trim(),
        });
      }

      if (tipo === 'falha') {
        if (!tituloFalha.trim() || !descricaoFalha.trim()) {
          Alert.alert('Campos obrigatórios', 'Informe o título e a descrição da falha.');
          return;
        }
        await api.post('/api/falhas', {
          titulo: tituloFalha.trim(),
          descricao: descricaoFalha.trim(),
          severidade,
          resolvido: false,
        });
      }

      limparFormulario();
      Alert.alert('Cadastro concluído', 'O registro foi enviado ao backend com sucesso.');
    } catch (error: any) {
      const message = error?.response?.data?.message;
      Alert.alert('Erro ao cadastrar', message || 'Não foi possível salvar. Verifique se o backend está ativo.');
      console.error('Erro de cadastro:', error);
    } finally {
      setSalvando(false);
    }
  };

  const Campo = ({
    label,
    value,
    onChangeText,
    placeholder,
    numeric = false,
    multiline = false,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    numeric?: boolean;
    multiline?: boolean;
  }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor="#64748B"
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCapitalize={numeric ? 'none' : 'sentences'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.eyebrow}>GESTÃO DA ESTAÇÃO</Text>
            <Text style={styles.title}>Novo registro</Text>
            <Text style={styles.subtitle}>Cadastre os dados que serão armazenados no backend.</Text>
          </View>

          <Text style={styles.sectionLabel}>TIPO DE REGISTRO</Text>
          <View style={styles.typeGrid}>
            {OPCOES.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.typeButton, tipo === option.value && styles.typeButtonActive]}
                onPress={() => setTipo(option.value)}
              >
                <Text style={[styles.typeButtonText, tipo === option.value && styles.typeButtonTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formCard}>
            {tipo === 'atuador' && (
              <>
                <Text style={styles.formTitle}>Cadastro de atuador</Text>
                <Campo label="Nome do atuador" value={nomeAtuador} onChangeText={setNomeAtuador} placeholder="Ex.: Bomba principal" />
                <Campo label="Tipo" value={tipoAtuador} onChangeText={setTipoAtuador} placeholder="BOMBA, VALVULA ou COMPORTA" />
                <Campo label="Localização" value={localAtuador} onChangeText={setLocalAtuador} placeholder="Ex.: Casa de máquinas" />
                <Text style={styles.helper}>O atuador será criado desligado. Você poderá acioná-lo pelo painel.</Text>
              </>
            )}

            {tipo === 'nivel' && (
              <>
                <Text style={styles.formTitle}>Cadastro de nível</Text>
                <Campo label="Nome do reservatório" value={nomeNivel} onChangeText={setNomeNivel} placeholder="Ex.: Tanque principal" />
                <Campo label="Capacidade máxima" value={capacidade} onChangeText={setCapacidade} numeric placeholder="Ex.: 5000" />
                <Campo label="Nível atual" value={nivelAtual} onChangeText={setNivelAtual} numeric placeholder="Ex.: 3200" />
                <Campo label="Unidade" value={unidadeNivel} onChangeText={setUnidadeNivel} placeholder="L" />
                <Campo label="Localização" value={localNivel} onChangeText={setLocalNivel} placeholder="Ex.: Área de armazenamento" />
              </>
            )}

            {tipo === 'vazao' && (
              <>
                <Text style={styles.formTitle}>Registro de vazão</Text>
                <Campo label="Valor medido" value={valorVazao} onChangeText={setValorVazao} numeric placeholder="Ex.: 12.5" />
                <Campo label="Unidade" value={unidadeVazao} onChangeText={setUnidadeVazao} placeholder="L/min" />
                <Campo label="Ponto de medição" value={pontoMedicao} onChangeText={setPontoMedicao} placeholder="Ex.: Entrada principal" />
              </>
            )}

            {tipo === 'consumo' && (
              <>
                <Text style={styles.formTitle}>Consumo elétrico</Text>
                <Campo label="Consumo (kWh)" value={valorConsumo} onChangeText={setValorConsumo} numeric placeholder="Ex.: 18.75" />
                <Campo label="Setor" value={setor} onChangeText={setSetor} placeholder="Ex.: Bombas, filtragem ou iluminação" />
              </>
            )}

            {tipo === 'falha' && (
              <>
                <Text style={styles.formTitle}>Registro de falha</Text>
                <Campo label="Título" value={tituloFalha} onChangeText={setTituloFalha} placeholder="Ex.: Nível abaixo do limite" />
                <Campo label="Descrição" value={descricaoFalha} onChangeText={setDescricaoFalha} multiline placeholder="Descreva o que aconteceu..." />
                <Text style={styles.label}>Severidade</Text>
                <View style={styles.severityOptions}>
                  {['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[styles.severityButton, severidade === item && styles.severityButtonActive]}
                      onPress={() => setSeveridade(item)}
                    >
                      <Text style={[styles.severityButtonText, severidade === item && styles.severityButtonTextActive]}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.helper}>A falha será criada como pendente.</Text>
              </>
            )}

            <TouchableOpacity style={[styles.saveButton, salvando && styles.saveButtonDisabled]} onPress={cadastrar} disabled={salvando}>
              <Text style={styles.saveButtonText}>{salvando ? 'Salvando...' : 'Salvar registro'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#080F1C' },
  container: { flex: 1, backgroundColor: '#080F1C' },
  content: { paddingBottom: 20 },
  header: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20 },
  eyebrow: { color: '#38BDF8', fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: '900', marginTop: 6 },
  subtitle: { color: '#94A3B8', fontSize: 12, lineHeight: 18, marginTop: 5 },
  sectionLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginHorizontal: 18, marginBottom: 9 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 8, marginBottom: 16 },
  typeButton: { backgroundColor: '#101C2E', borderWidth: 1, borderColor: '#24364F', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  typeButtonActive: { backgroundColor: '#123B55', borderColor: '#0EA5E9' },
  typeButtonText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
  typeButtonTextActive: { color: '#BAE6FD' },
  formCard: { marginHorizontal: 15, padding: 16, backgroundColor: '#101C2E', borderRadius: 14, borderWidth: 1, borderColor: '#20334A' },
  formTitle: { color: '#E2E8F0', fontSize: 16, fontWeight: '900', marginBottom: 17 },
  field: { marginBottom: 13 },
  label: { color: '#A9B8CA', fontSize: 11, fontWeight: '800', marginBottom: 7 },
  input: { minHeight: 46, backgroundColor: '#0A1423', borderRadius: 9, borderWidth: 1, borderColor: '#2A3D55', paddingHorizontal: 12, color: '#F8FAFC', fontSize: 13 },
  multiline: { height: 100, paddingTop: 12 },
  helper: { color: '#718096', fontSize: 10, lineHeight: 15, marginTop: 1, marginBottom: 10 },
  severityOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 13 },
  severityButton: { backgroundColor: '#0A1423', borderRadius: 8, borderWidth: 1, borderColor: '#2A3D55', paddingVertical: 9, paddingHorizontal: 10 },
  severityButtonActive: { backgroundColor: '#123B55', borderColor: '#0EA5E9' },
  severityButtonText: { color: '#94A3B8', fontSize: 9, fontWeight: '900' },
  severityButtonTextActive: { color: '#BAE6FD' },
  saveButton: { backgroundColor: '#0369A1', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 6 },
  saveButtonDisabled: { opacity: 0.55 },
  saveButtonText: { color: '#F0F9FF', fontSize: 13, fontWeight: '900' },
});
