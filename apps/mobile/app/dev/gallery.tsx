import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, Card, Choice, Field, Icon, NumberBadge, QuoteCard, Screen, Text, tokens } from '../../src/ui';
import { setLanguage } from '../../src/lib/i18n';

export default function Gallery() {
  if (!__DEV__) return null;
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const row = { flexDirection: 'row' as const, gap: tokens.space.md, alignItems: 'center' as const, marginBottom: tokens.space.lg };
  return (
    <Screen>
      <View style={row}>
        <Button title="HE" variant={lang === 'he' ? 'primary' : 'secondary'} size="md" onPress={() => setLanguage('he')} />
        <Button title="EN" variant={lang === 'en' ? 'primary' : 'secondary'} size="md" onPress={() => setLanguage('en')} />
      </View>
      <Text variant="display" tone="accent">Display 40</Text>
      <Text variant="title" tone="accent">Title 28</Text>
      <Text variant="heading">Heading 20</Text>
      <Text>Body 16 — בחזרה לגן העדן הפנימי שלך</Text>
      <Text variant="caption" tone="muted">Caption 13</Text>
      <View style={{ height: tokens.space.xl }} />
      <View style={row}><Button title="Primary" onPress={() => {}} /><Button title="Secondary" variant="secondary" onPress={() => {}} /><Button title="Ghost" variant="ghost" onPress={() => {}} /></View>
      <View style={row}><Button title="Loading" loading onPress={() => {}} /><Button title="Disabled" disabled onPress={() => {}} /></View>
      <Field label="Label" placeholder="Placeholder" />
      <Field label="With error" value="x" error="Something is wrong" />
      <Choice label="Unselected" selected={false} onPress={() => {}} />
      <Choice label="Selected" selected onPress={() => {}} />
      <View style={row}><NumberBadge value={7} /><NumberBadge value={11} size="sm" /><Avatar size="lg" /><Avatar /><Icon name="chevron-forward" flipInRtl /></View>
      <Card><Text variant="heading">Card</Text><Text tone="muted">Raised surface with 24 radius.</Text></Card>
      <View style={{ height: tokens.space.xl }} />
      <QuoteCard text="You were never too much. You were waiting for someone who could hold all of you." name="Maya" date="27.8" />
    </Screen>
  );
}
