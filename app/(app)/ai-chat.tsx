import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import LottieView from 'lottie-react-native';
import { useRouter } from 'expo-router';
import { getChatSessions, createChatSession, sendMessage, ChatMessage, ChatSession } from '../../services/chat';

export default function AIChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load latest chat session on mount
  useEffect(() => {
    loadLatestSession();
  }, []);

  const loadLatestSession = async () => {
    try {
      setIsLoadingHistory(true);
      const sessions = await getChatSessions();
      if (sessions && sessions.length > 0) {
        // Load the most recent session
        const latest = sessions[0];
        setSessionId(latest.id);
        if (latest.messages) {
          setMessages(latest.messages.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          ));
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const userText = inputText.trim();
    setInputText('');
    setIsTyping(true);

    // Optimistically add user message to UI
    const tempUserId = Date.now().toString();
    const newMsg: ChatMessage = {
      id: tempUserId,
      sessionId: sessionId || 'temp',
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMsg]);

    try {
      let activeSessionId = sessionId;

      // Create a session if one doesn't exist
      if (!activeSessionId) {
        const newSession = await createChatSession(
          userText.substring(0, 30) + '...',
          'en'
        );
        activeSessionId = newSession.id;
        setSessionId(newSession.id);
      }

      // Send message to backend
      const responseMsg = await sendMessage(activeSessionId, userText);
      
      // Add real AI response
      setMessages(prev => [...prev, responseMsg]);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // Optional: Add error message to UI
    } finally {
      setIsTyping(false);
    }
  };

  // ── Mic handler ──
  const handleVoiceInput = () => {
    Alert.alert(
      '🎤 Voice Input',
      'Voice input will be available in the next update. Please type your question.',
      [{ text: 'OK' }]
    );
  };

  // ── File attach handler ──
  const handleFileAttach = async () => {
    Alert.alert(
      '📎 Attach File',
      'File attachment (JSON, CSV, PDF) will be available in the next update.\n\nFor now, you can describe your soil test data in the chat.',
      [{ text: 'OK' }]
    );
  };

  const QuickAction = ({ icon, title }: { icon: string, title: string }) => (
    <Pressable 
      style={styles.quickActionTile}
      onPress={() => setInputText(`Tell me about ${title.toLowerCase()}`)}
    >
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionTitle}>{title}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.aiAvatarSmall}>
            <Text style={{ fontSize: 20 }}>🌱</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Saathi AI</Text>
            <Text style={styles.headerSubtitle}>● Online · Agricultural Expert</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn}>
            <Text style={{ fontSize: 20 }}>🌐</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => router.push('/(app)/chat-history')}
          >
            <Text style={{ fontSize: 20 }}>📋</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatContainer} 
        contentContainerStyle={styles.chatScroll}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {isLoadingHistory ? (
          <View style={styles.welcomeState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.welcomeSubtitle, { marginTop: 16 }]}>Loading farm history...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.welcomeState}>
            <LottieView
              source={require('../../animations/chatbot.json')}
              autoPlay
              loop
              style={{ width: 220, height: 220, marginBottom: Spacing.xl }}
            />
            <Text style={styles.welcomeTitle}>Namaste! 🙏</Text>
            <Text style={styles.welcomeSubtitle}>How can Saathi AI help your farm today?</Text>

            <View style={styles.quickActionsGrid}>
              <View style={styles.quickActionsRow}>
                <QuickAction icon="💧" title="Fertilizer Plan" />
                <QuickAction icon="🐛" title="Pest Diagnosis" />
              </View>
              <View style={styles.quickActionsRow}>
                <QuickAction icon="🌾" title="Crop Suitability" />
                <QuickAction icon="🌤️" title="Weather Advisory" />
              </View>
            </View>
          </View>
        ) : (
          messages.map((msg, index) => (
            <View 
              key={msg.id ? `${msg.id}-${index}` : index.toString()} 
              style={[
                styles.messageRow,
                msg.role === 'user' ? styles.messageRowUser : styles.messageRowAI
              ]}
            >
              {msg.role === 'ai' && (
                <View style={styles.messageAvatarAI}>
                  <Text style={{ fontSize: 16 }}>🌱</Text>
                </View>
              )}
              
              <View 
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAI
                ]}
              >
                <Text 
                  style={[
                    styles.messageText,
                    msg.role === 'user' ? styles.messageTextUser : styles.messageTextAI
                  ]}
                >
                  {msg.content}
                </Text>
              </View>

              {msg.role === 'user' && (
                <View style={styles.messageAvatarUser}>
                  <Text style={{ fontSize: 16 }}>👨‍🌾</Text>
                </View>
              )}
            </View>
          ))
        )}

        {isTyping && (
          <View style={[styles.messageRow, styles.messageRowAI]}>
            <View style={styles.messageAvatarAI}>
              <Text style={{ fontSize: 16 }}>🌱</Text>
            </View>
            <View style={[styles.messageBubble, styles.messageBubbleAI]}>
              <Text style={styles.messageTextAI}>...</Text>
            </View>
          </View>
        )}
        
        {/* Spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Input Bar — always visible, never conditional */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachBtn} onPress={handleFileAttach}>
          <Text style={{ fontSize: 20 }}>📎</Text>
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          placeholder="Type your farming question..."
          placeholderTextColor={Colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />

        {inputText.trim() ? (
          <TouchableOpacity
            style={[styles.sendBtn, isTyping && { opacity: 0.6 }]}
            onPress={handleSend}
            disabled={isTyping}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.micBtn} onPress={handleVoiceInput}>
            <Text style={{ fontSize: 20 }}>🎤</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  aiAvatarSmall: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerTitle: { fontFamily: 'Sora_700Bold', fontSize: 15, color: Colors.textPrimary },
  headerSubtitle: { fontFamily: 'Sora_600SemiBold', fontSize: 11, color: Colors.primary },
  headerActions: { flexDirection: 'row', gap: Spacing.md },
  headerActionBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  
  chatContainer: { flex: 1 },
  chatScroll: { padding: Spacing.xl },
  
  welcomeState: { alignItems: 'center', justifyContent: 'center', paddingTop: 20 },
  welcomeTitle: {
    fontFamily: 'Sora_800ExtraBold', // Using Sora instead of DM Serif for consistency if not loaded
    fontSize: 28,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  welcomeSubtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxxl,
    textAlign: 'center',
  },
  
  quickActionsGrid: { width: '100%', gap: Spacing.sm },
  quickActionsRow: { flexDirection: 'row', gap: Spacing.sm },
  quickActionTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: Spacing.radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  quickActionIcon: { fontSize: 24, marginBottom: Spacing.xs },
  quickActionTitle: { fontFamily: 'Sora_600SemiBold', fontSize: 12, color: Colors.textPrimary, textAlign: 'center' },

  messageRow: { flexDirection: 'row', marginBottom: Spacing.lg, maxWidth: '85%' },
  messageRowUser: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  messageRowAI: { alignSelf: 'flex-start' },
  
  messageAvatarAI: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.sm, alignSelf: 'flex-end',
  },
  messageAvatarUser: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FFF3E0',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: Spacing.sm, alignSelf: 'flex-end',
  },
  
  messageBubble: { padding: Spacing.md, ...Spacing.shadows.sm },
  messageBubbleAI: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.borderLight,
    borderTopLeftRadius: 4, borderTopRightRadius: 16,
    borderBottomRightRadius: 16, borderBottomLeftRadius: 16,
  },
  messageBubbleUser: {
    backgroundColor: Colors.primaryLight,
    borderTopLeftRadius: 16, borderTopRightRadius: 4,
    borderBottomRightRadius: 16, borderBottomLeftRadius: 16,
  },
  
  messageText: { fontFamily: 'Sora_400Regular', fontSize: 13, lineHeight: 20 },
  messageTextAI: { color: Colors.textPrimary },
  messageTextUser: { color: '#FFF' },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    // Must clear the floating tab bar (height ~68 + bottom ~24 = ~92px)
    paddingBottom: Platform.OS === 'ios' ? 90 : 100,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  attachBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 44, maxHeight: 100,
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Spacing.radius.xl,
    paddingHorizontal: Spacing.md,
    paddingTop: 12, paddingBottom: 12,
    fontFamily: 'Sora_400Regular', fontSize: 14,
    marginHorizontal: Spacing.sm,
  },
  micBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendIcon: { color: '#FFF', fontSize: 18, marginLeft: 4 }
});
