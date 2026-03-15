import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, Alert, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { apiCall } from '../../services/api';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  language: string;
}

function SessionCard({ session, onPress, onDelete, onContinue }: {
  session: ChatSession;
  onPress: () => void;
  onDelete: () => void;
  onContinue: () => void;
}) {
  const lastMsg = new Date(session.lastMessageAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.sessionCard, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <View style={styles.sessionIconRow}>
        <View style={styles.sessionIcon}>
          <Ionicons name="chatbubbles-outline" size={22} color={Colors.primary} />
        </View>
        <View style={styles.sessionMeta}>
          <Text style={styles.sessionTitle} numberOfLines={1}>{session.title}</Text>
          <View style={styles.sessionSubRow}>
            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.sessionDate}>{lastMsg}</Text>
            <View style={styles.dot} />
            <Ionicons name="chatbubble-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.sessionDate}>{session.messageCount} msgs</Text>
            <View style={[styles.langBadge]}>
              <Text style={styles.langBadgeText}>{session.language.toUpperCase()}</Text>
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

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiCall<ChatSession[]>('/api/chat/sessions');
      setSessions(data || []);
    } catch (e: any) {
      console.warn('ChatHistory: Failed to load sessions:', e.message);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleNewChat = async () => {
    setIsCreating(true);
    try {
      const newSession = await apiCall<ChatSession>('/api/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title: `Chat ${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
          language: 'en',
        }),
      });
      setSessions(prev => [newSession, ...prev]);
      // Navigate to AI Chat with the new session ID
      router.push({ pathname: '/(app)/ai-chat', params: { sessionId: newSession.id } });
    } catch (e: any) {
      Alert.alert('Error', 'Failed to create a new chat session. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this chat session? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await apiCall(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
              setSessions(prev => prev.filter(s => s.id !== sessionId));
            } catch {
              Alert.alert('Error', 'Could not delete the session. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleContinueSession = (session: ChatSession) => {
    router.push({ pathname: '/(app)/ai-chat', params: { sessionId: session.id, sessionTitle: session.title } });
  };

  const filtered = sessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.language.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
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

      {/* Search Bar */}
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

      {/* Session Count */}
      {!isLoading && (
        <Text style={styles.countLabel}>
          {filtered.length} session{filtered.length !== 1 ? 's' : ''}{search ? ' found' : ''}
        </Text>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading sessions…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.borderLight} />
          <Text style={styles.emptyTitle}>
            {search ? 'No sessions found' : 'No chat sessions yet'}
          </Text>
          <Text style={styles.emptyDesc}>
            {search
              ? 'Try a different search term'
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
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onPress={() => handleContinueSession(item)}
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
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  headerTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 26, color: Colors.textPrimary },
  headerSub: { fontFamily: 'Sora_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  newChatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: 14, paddingVertical: 9,
    ...Spacing.shadows.sm,
  },
  newChatBtnText: { fontFamily: 'Sora_700Bold', fontSize: 13, color: '#fff' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.xl, gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.borderLight,
    ...Spacing.shadows.sm,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1, fontFamily: 'Sora_400Regular',
    fontSize: 14, color: Colors.textPrimary,
  },
  countLabel: {
    fontFamily: 'Sora_400Regular', fontSize: 12,
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
    borderWidth: 1, borderColor: Colors.borderLight,
    ...Spacing.shadows.sm,
  },
  sessionIconRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sessionIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  sessionMeta: { flex: 1 },
  sessionTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: Colors.textPrimary, marginBottom: 4 },
  sessionSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionDate: { fontFamily: 'Sora_400Regular', fontSize: 11, color: Colors.textMuted },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.textMuted, marginHorizontal: 2 },
  langBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, marginLeft: 4,
  },
  langBadgeText: { fontFamily: 'Sora_700Bold', fontSize: 10, color: Colors.primary },

  sessionActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    marginTop: 12, gap: 8,
  },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Spacing.radius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  continueBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: Colors.primary },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.error + '15',
    alignItems: 'center', justifyContent: 'center',
  },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl * 2 },
  loadingText: { fontFamily: 'Sora_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 12 },
  emptyTitle: { fontFamily: 'Sora_700Bold', fontSize: 18, color: Colors.textPrimary, marginTop: 16, textAlign: 'center' },
  emptyDesc: { fontFamily: 'Sora_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  startChatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Spacing.radius.xl,
    paddingHorizontal: 20, paddingVertical: 12,
    marginTop: 20, ...Spacing.shadows.sm,
  },
  startChatBtnText: { fontFamily: 'Sora_700Bold', fontSize: 14, color: '#fff' },
});
