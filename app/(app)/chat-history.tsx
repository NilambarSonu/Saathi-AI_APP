import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useDarkModeTheme } from '@/context/ThemeContext';
import { api, ChatSession } from '@/services/api';

function safeDateLabel(value?: string | null): string {
  if (!value) return 'Recently';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently';

  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeSession(raw: ChatSession, index: number): ChatSession {
  return {
    id: String(raw?.id || `session-${index}`),
    title: raw?.title?.trim() || 'Untitled chat',
    createdAt: raw?.createdAt ?? null,
    updatedAt: raw?.updatedAt ?? null,
    lastMessageAt: raw?.lastMessageAt ?? raw?.updatedAt ?? raw?.createdAt ?? null,
    messageCount: Number(raw?.messageCount ?? 0),
    language: raw?.language?.trim() || 'en',
  };
}

function SessionCard({
  session,
  onDelete,
  onContinue,
}: {
  session: ChatSession;
  onDelete: () => void;
  onContinue: () => void;
}) {
  const { theme } = useDarkModeTheme();
  return (
    <Pressable
      style={({ pressed }) => [styles.sessionCard, { backgroundColor: theme.surface, borderColor: theme.border }, pressed && { opacity: 0.85 }]}
      onPress={onContinue}
    >
      <View style={styles.sessionIconRow}>
        <View style={[styles.sessionIcon, { backgroundColor: theme.surfaceAlt }]}>
          <Ionicons name="chatbubbles-outline" size={22} color={theme.primary} />
        </View>
        <View style={styles.sessionMeta}>
          <Text style={[styles.sessionTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {session.title || 'Untitled chat'}
          </Text>
          <View style={styles.sessionSubRow}>
            <Ionicons name="time-outline" size={12} color={theme.textMuted} />
            <Text style={[styles.sessionDate, { color: theme.textMuted }]}>{safeDateLabel(session.lastMessageAt)}</Text>
            <View style={[styles.dot, { backgroundColor: theme.textMuted }]} />
            <Ionicons name="chatbubble-outline" size={12} color={theme.textMuted} />
            <Text style={[styles.sessionDate, { color: theme.textMuted }]}>{Number(session.messageCount || 0)} msgs</Text>
            <View style={[styles.langBadge, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={[styles.langBadgeText, { color: theme.primary }]}>{(session.language || 'en').toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.sessionActions}>
        <Pressable style={[styles.continueBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]} onPress={onContinue}>
          <Ionicons name="arrow-forward-outline" size={14} color={theme.primary} />
          <Text style={[styles.continueBtnText, { color: theme.primary }]}>Continue</Text>
        </Pressable>
        <Pressable style={[styles.deleteBtn, { backgroundColor: theme.error + '15' }]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color={theme.error} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function ChatHistoryScreen() {
  const router = useRouter();
  const { theme, isDark } = useDarkModeTheme();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await api.getChatSessions();
      setSessions((Array.isArray(data) ? data : []).map(normalizeSession));
    } catch (error: any) {
      console.warn('ChatHistory: Failed to load sessions:', error?.message);
      setSessions([]);
      setLoadError(error?.message || 'Unable to load chat history right now.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleNewChat = async () => {
    setIsCreating(true);
    try {
      const newSession = normalizeSession(
        await api.createChatSession({
          title: `Chat ${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
          language: 'en',
        }),
        0
      );

      setSessions((prev) => [newSession, ...prev]);
      router.push({ pathname: '/(app)/ai-chat', params: { sessionId: newSession.id } });
    } catch {
      Alert.alert('Error', 'Failed to create a new chat session. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    Alert.alert('Delete Session', 'Are you sure you want to delete this chat session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteChatSession(sessionId);
            setSessions((prev) => prev.filter((session) => session.id !== sessionId));
          } catch {
            Alert.alert('Error', 'Could not delete the session. Please try again.');
          }
        },
      },
    ]);
  };

  const handleContinueSession = (session: ChatSession) => {
    router.push({
      pathname: '/(app)/ai-chat',
      params: { sessionId: session.id, sessionTitle: session.title || 'Untitled chat' },
    });
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sessions;

    return sessions.filter((session) => {
      const title = (session.title || '').toLowerCase();
      const language = (session.language || '').toLowerCase();
      return title.includes(query) || language.includes(query);
    });
  }, [search, sessions]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {isDark && (
        <LinearGradient
          colors={[theme.bg0, theme.bg1, theme.background]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Chat History</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Review and manage your AI conversations</Text>
        </View>
        <Pressable
          style={[styles.newChatBtn, { backgroundColor: theme.primary }, isCreating && { opacity: 0.7 }]}
          onPress={handleNewChat}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="add" size={20} color="#fff" />
          )}
          <Text style={styles.newChatBtnText}>{isCreating ? 'Creating...' : 'New Chat'}</Text>
        </Pressable>
      </View>

      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Search sessions..."
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

      {!!loadError && (
        <View style={[styles.errorBanner, { backgroundColor: isDark ? '#3D2B16' : '#FFFBEB', borderColor: isDark ? '#5F4D1E' : '#FDE68A' }]}>
          <Ionicons name="warning-outline" size={16} color={isDark ? theme.warning : "#92400E"} />
          <Text style={[styles.errorBannerText, { color: isDark ? theme.warning : "#92400E" }]}>{loadError}</Text>
        </View>
      )}

      {!isLoading && (
        <Text style={[styles.countLabel, { color: theme.textMuted }]}>
          {filtered.length} session{filtered.length !== 1 ? 's' : ''}{search ? ' found' : ''}
        </Text>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading sessions...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={64} color={theme.border} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{search ? 'No sessions found' : 'No chat sessions yet'}</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            {search
              ? 'Try a different search term.'
              : 'Start a conversation with Saathi AI to see your history here.'}
          </Text>
          {!search && (
            <Pressable style={[styles.startChatBtn, { backgroundColor: theme.primary }]} onPress={handleNewChat} disabled={isCreating}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.startChatBtnText}>Start New Chat</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onDelete={() => handleDeleteSession(item.id)}
              onContinue={() => handleContinueSession(item)}
            />
          )}
          ListFooterComponent={<View style={{ height: 120 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 26 },
  headerSub: { fontFamily: 'Sora_400Regular', fontSize: 13, marginTop: 4 },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 9,
    ...Spacing.shadows.sm,
  },
  newChatBtnText: { fontFamily: 'Sora_700Bold', fontSize: 13, color: '#fff' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    gap: 10,
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    ...Spacing.shadows.sm,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Spacing.radius.lg,
    borderWidth: 1,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: 'Sora_500Medium',
    fontSize: 12,
  },
  countLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    paddingHorizontal: Spacing.xl + 2,
    marginBottom: Spacing.sm,
  },
  list: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm },
  sessionCard: {
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    ...Spacing.shadows.sm,
  },
  sessionIconRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sessionMeta: { flex: 1 },
  sessionTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, marginBottom: 4 },
  sessionSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  sessionDate: { fontFamily: 'Sora_400Regular', fontSize: 11 },
  dot: { width: 3, height: 3, borderRadius: 2, marginHorizontal: 2 },
  langBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  langBadgeText: { fontFamily: 'Sora_700Bold', fontSize: 10 },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Spacing.radius.lg,
    borderWidth: 1,
  },
  continueBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: 13 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl * 2,
  },
  loadingText: { fontFamily: 'Sora_400Regular', fontSize: 14, marginTop: 12 },
  emptyTitle: { fontFamily: 'Sora_700Bold', fontSize: 18, marginTop: 16, textAlign: 'center' },
  emptyDesc: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  startChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Spacing.radius.xl,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
    ...Spacing.shadows.sm,
  },
  startChatBtnText: { fontFamily: 'Sora_700Bold', fontSize: 14, color: '#fff' },
});


