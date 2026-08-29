import { ActivityIndicator, Pressable, View } from 'react-native';
import { Icon, Screen, Text, tokens } from '../../../src/ui';
import { useT } from '../../../src/lib/i18n';
import { useDeleteMemoryFact, useMemoryFacts, type MemoryFactRow } from '../../../src/features/chat/useMemoryFacts';

const CATEGORY_ORDER = ['person', 'situation', 'preference'] as const;
const CATEGORY_LABEL_KEY: Record<(typeof CATEGORY_ORDER)[number], 'memory.people' | 'memory.situations' | 'memory.preferences'> = {
  person: 'memory.people',
  situation: 'memory.situations',
  preference: 'memory.preferences',
};

export default function Memory() {
  const t = useT();
  const { data: facts, isLoading } = useMemoryFacts();
  const deleteFact = useDeleteMemoryFact();

  const isEmpty = !isLoading && (!facts || facts.length === 0);

  return (
    <Screen>
      <Text variant="title" tone="accent" style={{ marginBottom: tokens.space.sm }}>
        {t('memory.title')}
      </Text>
      <Text tone="muted" style={{ marginBottom: tokens.space.xl }}>
        {t('memory.hint')}
      </Text>
      {isLoading ? (
        <ActivityIndicator color={tokens.color.accent} />
      ) : isEmpty ? (
        <Text tone="muted">{t('memory.empty')}</Text>
      ) : (
        CATEGORY_ORDER.map((category) => {
          const items = (facts ?? []).filter((f: MemoryFactRow) => f.category === category);
          if (items.length === 0) return null;
          return (
            <View key={category} style={{ marginBottom: tokens.space.xl }}>
              <Text variant="caption" tone="muted" style={{ marginBottom: tokens.space.sm, textTransform: 'uppercase' }}>
                {t(CATEGORY_LABEL_KEY[category])}
              </Text>
              {items.map((item: MemoryFactRow) => {
                const isDeleting = deleteFact.isPending && deleteFact.variables === item.id;
                return (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: tokens.space.md,
                      paddingVertical: tokens.space.sm,
                      opacity: isDeleting ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ flex: 1 }}>{item.text}</Text>
                    <Pressable
                      testID="memory-delete"
                      accessibilityLabel={t('memory.delete')}
                      disabled={isDeleting}
                      onPress={() => deleteFact.mutate(item.id)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: tokens.radius.pill,
                        borderWidth: 1,
                        borderColor: tokens.color.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="close" size={16} color={tokens.color.textMuted} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          );
        })
      )}
    </Screen>
  );
}
