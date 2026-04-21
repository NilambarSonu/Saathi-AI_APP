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
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { api, ChatSession } from '../../src/core/services/api';

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
  return (
    <Pressable
      style={({ pressed }) => [styles.sessionCard, pressed && { opacity: 0.85 }]}
      onPress={onContinue}
    >
      <View style={styles.sessionIconRow}>
        <View style={styles.sessionIcon}>
          <Ionicons name="chatbubbles-outline" size={22} color={Colors.primary} />
        </View>
        <View style={styles.sessionMeta}>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {session.title || 'Untitled chat'}
          </Text>
          <View style={styles.sessionSubRow}>
            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.sessionDate}>{safeDateLabel(session.lastMessageAt)}</Text>
            <View style={styles.dot} />
            <Ionicons name="chatbubble-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.sessionDate}>{Number(session.messageCount || 0)} msgs</Text>
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>{(session.language || 'en').toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.sessionActions}>
        <Pressable style={styles.continueBtn} onPress={onContinue}>
          <Ionicons name="arrow-forward-outline" size={14} color={Colors.primary} />
          <Text style={styles.continueBtnText}>Continue</Text>
        </Pressable>
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function ChatHistoryScreen() {
  const router = useRouter();
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Chat History</Text>
          <Text style={styles.headerSub}>Review and manage your AI conversations</Text>
        </View>
        <Pressable
          style={[styles.newChatBtn, isCreating && { opacity: 0.7 }]}
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

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sessions..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      {!!loadError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color="#92400E" />
          <Text style={styles.errorBannerText}>{loadError}</Text>
        </View>
      )}

      {!isLoading && (
        <Text style={styles.countLabel}>
          {filtered.length} session{filtered.length !== 1 ? 's' : ''}{search ? ' found' : ''}
        </Text>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.borderLight} />
          <Text style={styles.emptyTitle}>{search ? 'No sessions found' : 'No chat sessions yet'}</Text>
          <Text style={styles.emptyDesc}>
            {search
              ? 'Try a different search term.'
              : 'Start a conversation with Saathi AI to see your history here.'}
          </Text>
          {!search && (
            <Pressable style={styles.startChatBtn} onPress={handleNewChat} disabled={isCreating}>
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 26, color: Colors.textPrimary },
  headerSub: { fontFamily: 'Sora_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Spacing.shadows.sm,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: Spacing.radius.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  errorBannerText: {
    flex: 1,
    fontFamily: 'Sora_500Medium',
    fontSize: 12,
    color: '#92400E',
  },
  countLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.xl + 2,
    marginBottom: Spacing.sm,
  },
  list: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm },
  sessionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Spacing.shadows.sm,
  },
  sessionIconRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sessionMeta: { flex: 1 },
  sessionTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: Colors.textPrimary, marginBottom: 4 },
  sessionSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  sessionDate: { fontFamily: 'Sora_400Regular', fontSize: 11, color: Colors.textMuted },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.textMuted, marginHorizontal: 2 },
  langBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  langBadgeText: { fontFamily: 'Sora_700Bold', fontSize: 10, color: Colors.primary },
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
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Spacing.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  continueBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: Colors.primary },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl * 2,
  },
  loadingText: { fontFamily: 'Sora_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 12 },
  emptyTitle: { fontFamily: 'Sora_700Bold', fontSize: 18, color: Colors.textPrimary, marginTop: 16, textAlign: 'center' },
  emptyDesc: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  startChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Spacing.radius.xl,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
    ...Spacing.shadows.sm,
  },
  startChatBtnText: { fontFamily: 'Sora_700Bold', fontSize: 14, color: '#fff' },
});
