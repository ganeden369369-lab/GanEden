import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, Bubble, Button, Card, Choice, Composer, Field, Icon, NumberBadge, QuoteCard, Screen, StarterChip, Text, tokens } from '../../src/ui';
import { setLanguage } from '../../src/lib/i18n';

export default function Gallery() {
  const { i18n } = useTranslation();
  const [composerValue, setComposerValue] = useState('');
  if (!__DEV__) return null;
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
      <View style={{ height: tokens.space.xl }} />
      <Text variant="heading" style={{ marginBottom: tokens.space.md }}>Chat</Text>
      <Bubble role="assistant" text="I see a lot of Life Path 7 energy here — steady, private, always thinking." />
      <Bubble role="user" text="That feels right, actually." />
      <Bubble role="assistant" text="Still writing" streaming showAvatar={false} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: tokens.space.lg }}>
        <StarterChip label="What does my life path mean?" onPress={() => {}} />
        <StarterChip label="Can we continue from last time?" onPress={() => {}} />
      </View>
      <Composer value={composerValue} onChangeText={setComposerValue} onSend={() => setComposerValue('')} placeholder="Message Eden…" />
    </Screen>
  );
}
