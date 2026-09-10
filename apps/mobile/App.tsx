import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { validateAlias } from './src/policy';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [requested, setRequested] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [alias, setAlias] = useState('');
  const [aliasError, setAliasError] = useState('');
  const dark = theme === 'dark';
  const colors = dark
    ? {
        bg: '#0A0A0C',
        panel: '#121217',
        line: '#24242A',
        text: '#FFFFFF',
        muted: '#92929D',
        cyan: '#00F0FF',
      }
    : {
        bg: '#F5F7F8',
        panel: '#FFFFFF',
        line: '#D9DEE4',
        text: '#12151A',
        muted: '#69727D',
        cyan: '#007C8A',
      };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.welcome}>
        <View style={styles.themeRow}>
          <Text style={[styles.eyebrow, { color: colors.muted }]}>SECURE CLIENT</Text>
          <Switch
            value={dark}
            onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
            trackColor={{ false: colors.line, true: colors.cyan }}
          />
        </View>
        <View style={[styles.lock, { borderColor: colors.cyan, shadowColor: colors.cyan }]}>
          <Text style={{ color: colors.cyan, fontSize: 32 }}>⌑</Text>
        </View>
        <Text style={[styles.brand, { color: colors.text }]}>
          ANONIM<Text style={{ color: colors.cyan }}>.</Text>
        </Text>
        <Text style={[styles.slogan, { color: colors.text }]}>
          Kimliğin Senin.{`\n`}Mesajların Senin.
        </Text>
        <Text style={[styles.centerCopy, { color: colors.muted }]}>
          Merkeziyetsiz. Şifreli. Gerçekten özel.
        </Text>
        <View style={{ flex: 1, minHeight: 120 }} />
        {identityOpen ? <View style={{ gap: 12 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Kimliğini oluştur</Text>
          <Text style={[styles.copy, { color: colors.muted }]}>Takma adın cihazında doğrulanır. Sunucuya gerçek kimlik gönderilmez.</Text>
          <TextInput value={alias} onChangeText={setAlias} autoCapitalize="none" placeholder="ornek-kullanici" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.line, backgroundColor: colors.panel }]} />
          {aliasError ? <Text style={[styles.error, { color: '#FF7A90' }]}>{aliasError}</Text> : null}
          <Pressable style={[styles.button, { backgroundColor: colors.cyan }]} onPress={() => { const result = validateAlias(alias); if (!result.ok) setAliasError(result.reason); else setRequested(true); }}><Text style={styles.buttonText}>Kimliği yerel olarak doğrula</Text></Pressable>
          <Pressable style={[styles.secondary, { borderColor: colors.line }]} onPress={() => setIdentityOpen(false)}><Text style={[styles.secondaryText, { color: colors.text }]}>Geri dön</Text></Pressable>
        </View> : <Pressable
          style={[styles.button, { backgroundColor: colors.cyan }]}
          onPress={() => setIdentityOpen(true)}
        >
          <Text style={styles.buttonText}>＋ Kimlik Oluştur</Text>
        </Pressable>}
        <Pressable
          style={[styles.secondary, { borderColor: colors.line }]}
          onPress={() => setRequested(true)}
        >
          <Text style={[styles.secondaryText, { color: colors.text }]}>↳ Kurtarma ile Giriş</Text>
        </Pressable>
        <Text style={[styles.footer, { color: colors.muted }]}>
          Anahtarların yalnızca cihazında tutulur
        </Text>
        <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Yerel test durumu</Text>
          <StatusRow label="E2EE sağlayıcısı" value="Bekleniyor" warning />
          <StatusRow label="Ağ taşıması" value="Kapalı" />
          {requested && (
            <Text style={[styles.footer, { color: colors.cyan }]}>
              Kurtarma akışı hazır olduğunda etkinleşecek.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusRow({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={warning ? styles.warning : styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: '#090b0d', flex: 1 },
  welcome: { flexGrow: 1, minHeight: 874, padding: 28, paddingBottom: 34 },
  themeRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  lock: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 28,
    borderWidth: 2,
    height: 86,
    justifyContent: 'center',
    marginTop: 88,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    width: 86,
  },
  brand: { alignSelf: 'center', fontSize: 27, fontWeight: '800', letterSpacing: 3, marginTop: 28 },
  slogan: {
    alignSelf: 'center',
    fontSize: 23,
    fontWeight: '700',
    lineHeight: 31,
    marginTop: 18,
    textAlign: 'center',
  },
  centerCopy: { alignSelf: 'center', fontSize: 13, marginTop: 14, textAlign: 'center' },
  secondary: { alignItems: 'center', borderRadius: 12, borderWidth: 1, marginTop: 10, padding: 15 },
  secondaryText: { fontSize: 14, fontWeight: '600' },
  container: { gap: 18, padding: 24, paddingBottom: 48 },
  eyebrow: { color: '#75e6ba', fontSize: 11, letterSpacing: 1.2 },
  title: { color: '#f4f7f6', fontSize: 34, fontWeight: '700', marginTop: 6 },
  copy: { color: '#aeb8b5', fontSize: 15, lineHeight: 23 },
  card: {
    backgroundColor: '#111619',
    borderColor: '#263136',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardTitle: { color: '#f4f7f6', fontSize: 18, fontWeight: '600' },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: '#98a5a2', fontSize: 13 },
  value: { color: '#d9e4e0', fontSize: 13 },
  warning: { color: '#f0c477', fontSize: 13 },
  label: { color: '#98a5a2', fontSize: 13 },
  input: {
    backgroundColor: '#090b0d',
    borderColor: '#344247',
    borderRadius: 10,
    borderWidth: 1,
    color: '#f4f7f6',
    fontSize: 16,
    padding: 13,
  },
  hint: { color: '#84928f', fontSize: 12, lineHeight: 18 },
  error: { color: '#ef8c8c', fontSize: 12, lineHeight: 18 },
  button: { alignItems: 'center', backgroundColor: '#75e6ba', borderRadius: 10, padding: 14 },
  buttonMuted: { opacity: 0.4 },
  buttonText: { color: '#07110d', fontSize: 14, fontWeight: '700' },
  notice: { color: '#f0c477', fontSize: 12, lineHeight: 18 },
  footer: { color: '#687078', fontSize: 11, textAlign: 'center' },
});
