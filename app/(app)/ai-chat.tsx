import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useRouter } from 'expo-router';
import { getChatSessions, createChatSession, sendMessage, ChatMessage, ChatSession } from '../../services/chat';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as SecureStore from 'expo-secure-store';

export default function AIChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const [fileAttachment, setFileAttachment] = useState<{
    name: string;
    content: any;
    uri?: string;
    mimeType?: string;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [language, setLanguage] = useState('en');

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

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();

    // Handle file attachment first
    if (fileAttachment && !messageText) {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        sessionId: sessionId || 'temp',
        content: `📎 Analyzing: ${fileAttachment.name}`,
        role: 'user',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);
      setFileAttachment(null);
      setIsTyping(true);

      try {
        const token = await SecureStore.getItemAsync('saathi_token') || 'test-token';
        const response = await fetch('https://saathiai.org/api/analyze-soil-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            soilData: fileAttachment.content,
            language: language,
            fileName: fileAttachment.name,
          }),
        });
        const data = await response.json();
        const aiMsg: ChatMessage = {
          id: Date.now().toString() + '-ai',
          sessionId: sessionId || 'temp',
          content: data.response || 'Analysis complete.',
          role: 'ai',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiMsg]);
        if (data.sessionId) setSessionId(data.sessionId);
      } catch (err: any) {
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '-err',
          sessionId: sessionId || 'temp',
          content: '❌ Could not analyze file. Please try again.',
          role: 'ai',
          timestamp: new Date().toISOString(),
        }]);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    if (!messageText || isTyping) return;
    setInputText('');
    setIsTyping(true);

    const tempUserId = Date.now().toString();
    const newMsg: ChatMessage = {
      id: tempUserId,
      sessionId: sessionId || 'temp',
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMsg]);

    try {
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const newSession = await createChatSession(
          messageText.substring(0, 30) + '...',
          'en'
        );
        activeSessionId = newSession.id;
        setSessionId(newSession.id);
      }

      const responseMsg = await sendMessage(activeSessionId, messageText);
      setMessages(prev => [...prev, responseMsg]);
      
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // ── Mic handler ──
  const handleVoiceInput = async () => {
    Speech.stop();

    if (isRecording) {
      try {
        setIsRecording(false);
        await recordingRef.current?.stopAndUnloadAsync();
        setInputText(prev => prev + (prev ? ' ' : '') + '[Voice recorded — tap send to ask your question]');
      } catch (err) {
        console.error('[Voice] Stop error:', err);
      }
      return;
    }

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Microphone Permission', 'Please enable microphone access in Settings to use voice input.', [{ text: 'OK' }]);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);

      setTimeout(async () => {
        if (isRecording) {
          await handleVoiceInput();
        }
      }, 10000);

    } catch (err: any) {
      console.error('[Voice] Start error:', err);
      Alert.alert('Voice Error', 'Could not start recording. Please check microphone permissions.');
    }
  };

  // ── File attach handler ──
  const handleFileAttach = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/csv', 'text/plain', 'application/pdf', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) return;

      let content: any = null;
      let displayText = `📎 ${file.name}`;

      try {
        const rawText = await FileSystem.readAsStringAsync(file.uri, {
          encoding: 'utf8',
        });
        try {
          content = JSON.parse(rawText);
          displayText = `📎 Attached soil data: ${file.name}`;
        } catch {
          content = rawText;
        }
      } catch (readErr) {
        content = { fileName: file.name, note: 'File content could not be read' };
      }

      setFileAttachment({
        name: file.name,
        content: content,
        uri: file.uri,
        mimeType: file.mimeType || 'unknown',
      });

    } catch (err: any) {
      if (err.code !== 'DOCUMENT_PICKER_CANCELED') {
        Alert.alert('Error', 'Could not open file. Please try again.');
      }
    }
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={{ marginRight: 16 }} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <TouchableOpacity style={styles.aiAvatarSmall} onPress={() => router.push('/(app)/dashboard')}>
              <Image source={require('../../assets/images/favicon.png')} style={{ width: 24, height: 24 }} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Saathi AI</Text>
              <Text style={styles.headerSubtitle}>● Online</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn}>
            <Ionicons name="language" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => Alert.alert('History', 'Chat history side panel coming soon!')}
          >
            <Ionicons name="menu" size={24} color={Colors.textPrimary} />
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
                <View style={[styles.messageAvatarAI, { backgroundColor: 'transparent' }]}>
                  <Image source={require('../../assets/images/favicon.png')} style={{ width: 24, height: 24 }} />
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
            <View style={[styles.messageAvatarAI, { backgroundColor: 'transparent' }]}>
              <Image source={require('../../assets/images/favicon.png')} style={{ width: 24, height: 24 }} />
            </View>
            <View style={[styles.messageBubble, styles.messageBubbleAI]}>
              <Text style={styles.messageTextAI}>...</Text>
            </View>
          </View>
        )}
        
        {/* Spacing for input bar */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {fileAttachment && (
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#E8F5EE', paddingHorizontal: 16, paddingVertical: 10,
          borderTopWidth: 1, borderTopColor: '#C8E6D0',
        }}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>📎</Text>
          <Text style={{ flex: 1, fontFamily: 'Sora_500Medium', fontSize: 13, color: '#1A5C35' }} numberOfLines={1}>
            {fileAttachment.name}
          </Text>
          <TouchableOpacity onPress={() => setFileAttachment(null)}>
            <Text style={{ fontSize: 18, color: '#6B8A72', padding: 4 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

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
          onSubmitEditing={() => handleSend()}
        />

        {inputText.trim() || fileAttachment ? (
          <TouchableOpacity
            style={[styles.sendBtn, isTyping && { opacity: 0.6 }]}
            onPress={() => handleSend()}
            disabled={isTyping}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.micBtn, isRecording && { backgroundColor: '#FFE0E0', borderWidth: 2, borderColor: '#E53935' }]} 
            onPress={handleVoiceInput}
          >
            <Text style={{ fontSize: 20 }}>{isRecording ? '⏹' : '🎤'}</Text>
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
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
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
