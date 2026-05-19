import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useChat, ChatMessage as BaseChatMessage } from '@/features/ai_assistant/hooks/useChat';
import { api } from '@/services/api';
import { useNavigationStore } from '@/store/navigationStore';
import { useTheme } from '@/context/ThemeContext';

export interface ChatMessage extends BaseChatMessage {
  type?: 'text' | 'file_attachment';
  filename?: string;
  soilData?: any;
}

export default function AIChatScreen() {
  const { theme, isDark } = useTheme();
  const params = useLocalSearchParams<{ 
    sessionId?: string; 
    sessionTitle?: string;
    soilFileAttachment?: string; // Passed as JSON string from navigation
  }>();

  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : undefined;
  const sessionTitle =
    typeof params.sessionTitle === 'string' && params.sessionTitle.trim().length > 0
      ? params.sessionTitle
      : 'Saathi Intelligence';
  
  const { messages: baseMessages, isLoading, isLoadingHistory, loadingText, error, sendMessage, clearChat } =
    useChat(sessionId);

  // Local state to handle both base messages and our new file attachment messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [fileAttachment, setFileAttachment] = useState<{
    name: string;
    content: any;
    uri?: string;
    mimeType?: string;
    type: 'image' | 'file';
  } | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const textInputRef = useRef<TextInput>(null);
  const attachmentTriggeredRef = useRef(false);

  // Sync with base messages from hook and handle persistent local messages
  useEffect(() => {
    setMessages(prev => {
      // Keep all 'file_attachment' messages
      const localAttachments = prev.filter(m => m.type === 'file_attachment');
      
      // Filter baseMessages to remove our hidden technical prompts
      const filteredBase = (baseMessages as ChatMessage[]).filter(m => 
        !(m.role === 'user' && m.content.startsWith('Analyze this soil test report from'))
      );

      // Merge baseMessages with localAttachments
      const merged = [...filteredBase];
      localAttachments.forEach(att => {
        if (!merged.find(m => m.id === att.id)) {
          merged.push(att);
        }
      });

      // Sort by timestamp to keep chronological order
      return merged.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
  }, [baseMessages]);

  const buildSoilAnalysisPrompt = (filename: string, data: any): string => {
    const p = data.parameters || data;
    const ph = p.ph_value ?? p.pH ?? p.ph ?? 'N/A';
    const nitrogen = p.nitrogen ?? p.N ?? 'N/A';
    const phosphorus = p.phosphorus ?? p.P ?? 'N/A';
    const potassium = p.potassium ?? p.K ?? 'N/A';
    const moisture = p.moisture ?? 'N/A';
    const temperature = p.temperature ?? 'N/A';
    const ec = p.conductivity ?? p.EC ?? p.ec ?? 'N/A';
    const location = data.location;
    const timestamp = data.timestamp ?? data.date_ist ?? '';

    return `Analyze this soil test report from ${filename}:

Soil Parameters:
- pH: ${ph}
- Nitrogen (N): ${nitrogen} mg/kg  
- Phosphorus (P): ${phosphorus} mg/kg
- Potassium (K): ${potassium} mg/kg
- Moisture: ${moisture}%
- Temperature: ${temperature}°C
- Electrical Conductivity: ${ec} dS/m
${location ? `- GPS: ${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}` : ''}
${timestamp ? `- Test Date: ${timestamp}` : ''}

Please provide:
1. Overall soil health assessment
2. Key issues or deficiencies found
3. Specific fertilizer recommendations (type and quantity per acre)
4. Best crops suitable for these conditions
5. Actionable next steps for the farmer`;
  };

  useEffect(() => {
    if (params.soilFileAttachment && !attachmentTriggeredRef.current && !isLoading && !isLoadingHistory) {
      attachmentTriggeredRef.current = true;
      try {
        const attachment = JSON.parse(params.soilFileAttachment);
        
        // Add a "user message" that renders as a file card
        const userMessage: ChatMessage = {
          id: `file-att-${Date.now()}`,
          role: 'user',
          type: 'file_attachment',
          filename: attachment.filename,
          content: '',
          soilData: attachment.data,
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        const aiPrompt = buildSoilAnalysisPrompt(attachment.filename, attachment.data);
        sendMessage(aiPrompt);
      } catch (e) {
        console.error('Error parsing soil attachment', e);
      }
    }
  }, [params.soilFileAttachment, isLoading, isLoadingHistory, sendMessage]);

  const quickActions = [
    { icon: 'Fertilizer', emoji: '💧', title: 'Fertilizer Plan' },
    { icon: 'Pest', emoji: '🐛', title: 'Pest Diagnosis' },
    { icon: 'Crop', emoji: '🌾', title: 'Crop Suitability' },
    { icon: 'Weather', emoji: '🌤️', title: 'Weather Advisory' },
  ];

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();

    if (fileAttachment && !messageText) {
      const payload = {
        data: fileAttachment.content,
        language: 'en',
        fileName: fileAttachment.name,
        type: fileAttachment.type,
      };

      setFileAttachment(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        await api.uploadSoil(payload);
        await sendMessage(`Analyze attached ${fileAttachment.type}: ${fileAttachment.name}`);
      } catch {
        Alert.alert('Upload Error', 'Failed to upload attachment.');
      }
      return;
    }

    if (!messageText || isLoading) return;
    setInputText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await sendMessage(messageText);
  };

  const handleVoiceInput = async () => {
    Speech.stop();

    if (isRecording) {
      try {
        setIsRecording(false);
        await recordingRef.current?.stopAndUnloadAsync();
        setInputText((prev) => (prev ? `${prev} [Voice Recorded]` : '[Voice Recorded]'));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
      }
      return;
    }

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Microphone Permission', 'Please enable microphone access to use voice typing.');
        return;
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      Alert.alert('Voice Input Error', 'Unable to start recording right now.');
    }
  };

  const handleAttachDocument = async (
    typeFilter: string[] = ['*/*'],
    typeState: 'image' | 'file' = 'file'
  ) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: typeFilter,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      let content: any = null;

      if (typeState === 'file') {
        try {
          const rawText = await FileSystem.readAsStringAsync(file.uri, { encoding: 'utf8' });
          try {
            content = JSON.parse(rawText);
          } catch {
            content = rawText;
          }
        } catch {
          content = 'Unreadable content';
        }
      } else {
        content = file.uri;
      }

      setFileAttachment({
        name: file.name,
        content,
        uri: file.uri,
        mimeType: file.mimeType || 'unknown',
        type: typeState,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Attachment Error', 'Unable to attach this file.');
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.sep1 }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: theme.surfaceAlt }]}
              onPress={() => {
                Haptics.selectionAsync();
                useNavigationStore.getState().setCurrentIndex(0);
              }}
            >
              <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <View style={[styles.botAvatarOuter, { backgroundColor: theme.fillGreen }]}>
                <Image source={require('assets/images/favicon.png')} style={styles.botAvatarInner} />
                <View style={[styles.onlineDot, error ? { backgroundColor: theme.error } : { backgroundColor: theme.success }, { borderColor: theme.surface }]} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{sessionTitle}</Text>
                <Text style={[styles.headerSubtitle, error ? { color: theme.error } : { color: theme.success }]}>
                  {error
                    ? 'Offline / Error'
                    : sessionId
                      ? 'Session restored from history'
                      : 'Thinking fast, acting smart'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surfaceAlt }]} onPress={clearChat}>
              <Feather name="trash-2" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={[styles.chatScroll, { paddingBottom: 150 }]}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isLoadingHistory ? (
            <Animated.View entering={FadeIn.duration(400)} style={styles.welcomeState}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>Loading saved conversation...</Text>
            </Animated.View>
          ) : messages.length === 0 ? (
            <Animated.View entering={FadeIn.duration(800)} style={styles.welcomeState}>
              <View style={styles.lottieWrapper}>
                <LottieView source={require('assets/animations/chatbot.json')} autoPlay loop style={styles.lottieRobot} />
              </View>
              <Text style={[styles.welcomeTitle, { color: theme.textPrimary }]}>Namaste, Farmer! 🙏</Text>
              <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>How can Saathi AI assist your farm today?</Text>

              <View style={styles.quickActionsGrid}>
                <View style={styles.quickActionsRow}>
                  {quickActions.slice(0, 2).map((item, index) => (
                    <QuickActionItem
                      key={item.title}
                      emoji={item.emoji}
                      title={item.title}
                      index={index + 1}
                      onPress={() => handleSend(item.title)}
                      theme={theme}
                    />
                  ))}
                </View>
                <View style={styles.quickActionsRow}>
                  {quickActions.slice(2).map((item, index) => (
                    <QuickActionItem
                      key={item.title}
                      emoji={item.emoji}
                      title={item.title}
                      index={index + 3}
                      onPress={() => handleSend(item.title)}
                      theme={theme}
                    />
                  ))}
                </View>
              </View>
            </Animated.View>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              
              if (msg.type === 'file_attachment') {
                return (
                  <Animated.View
                    key={msg.id}
                    entering={FadeInUp.springify().damping(18).stiffness(150)}
                    style={[styles.messageRow, styles.messageRowUser]}
                  >
                    <View style={styles.fileAttachmentBubble}>
                      <View style={[styles.fileCard, { backgroundColor: theme.primary }]}>
                        <Feather name="file-text" size={20} color="#FFFFFF" />
                        <Text style={styles.fileCardName} numberOfLines={1}>
                          {msg.filename}
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                );
              }

              // Hide messages that are purely AI prompts for soil analysis
              if (isUser && msg.content.startsWith('Analyze this soil test report from')) {
                return null;
              }

              return (
                <Animated.View
                  key={msg.id}
                  entering={FadeInUp.springify().damping(18).stiffness(150)}
                  style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAI]}
                >
                  {!isUser && (
                    <View style={[styles.msgAvatarAI, { backgroundColor: theme.fillGreen }]}>
                      <Image source={require('assets/images/favicon.png')} style={{ width: 18, height: 18 }} />
                    </View>
                  )}
                  <View
                    style={[
                      styles.msgBubble,
                      isUser ? styles.msgBubbleUser : [styles.msgBubbleAI, { backgroundColor: theme.surface }],
                      msg.id.includes('-err') && [styles.msgBubbleError, { borderColor: theme.error }],
                    ]}
                  >
                    <Text style={[styles.msgText, isUser ? styles.msgTextUser : [styles.msgTextAI, { color: theme.textPrimary }]]}>
                      {msg.content}
                    </Text>
                    <Text style={[styles.msgTime, isUser ? styles.msgTimeUser : [styles.msgTimeAI, { color: theme.textMuted }]]}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </Animated.View>
              );
            })
          )}

          {isLoading && (
            <Animated.View entering={FadeInUp} style={[styles.messageRow, styles.messageRowAI]}>
              <View style={[styles.msgAvatarAI, { backgroundColor: theme.fillGreen }]}>
                <Image source={require('assets/images/favicon.png')} style={{ width: 18, height: 18 }} />
              </View>
              <View style={[styles.msgBubble, styles.messageBubbleTyping, { backgroundColor: theme.surface }]}>
                <ActivityIndicator size="small" color={theme.purple} style={{ marginRight: 8 }} />
                <Text style={[styles.loadingTextPhrase, { color: theme.purple }]}>{loadingText || 'Thinking...'}</Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {fileAttachment && (
          <Animated.View entering={FadeInDown} style={styles.attachmentBanner}>
            <View style={[styles.attachmentPill, { backgroundColor: theme.surface, borderColor: theme.sep1 }]}>
              <MaterialCommunityIcons
                name={fileAttachment.type === 'image' ? 'image-outline' : 'file-document-outline'}
                size={20}
                color={theme.purple}
              />
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <Text style={[styles.attachmentName, { color: theme.textPrimary }]} numberOfLines={1}>
                  {fileAttachment.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFileAttachment(null)} style={styles.attachmentRemove}>
                <Ionicons name="close-circle" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <BlurView 
          intensity={isDark ? 40 : 60} 
          tint={isDark ? "dark" : "light"} 
          style={[
            styles.inputGlass, 
            keyboardVisible && styles.inputGlassKeyboard,
            { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)' }
          ]}
        >
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => handleAttachDocument(['image/*'], 'image')}>
              <Ionicons name="image-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => handleAttachDocument(['application/json', 'text/csv', 'application/pdf'], 'file')}
            >
              <Feather name="paperclip" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <TextInput
              ref={textInputRef}
              style={[styles.textInput, { color: theme.textPrimary }]}
              placeholder="Ask Saathi AI..."
              placeholderTextColor={theme.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 200);
              }}
              multiline
              maxLength={500}
            />

            {inputText.trim() || fileAttachment ? (
              <TouchableOpacity
                style={[styles.sendBtn, isLoading && styles.sendBtnDisabled]}
                onPress={() => handleSend()}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient colors={[theme.purple, theme.premium]} style={styles.sendBtnGradient}>
                  <Ionicons name="arrow-up" size={18} color="#FFF" style={{ marginLeft: 1 }} />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.micBtn, isRecording && styles.micBtnRecording, { backgroundColor: theme.surfaceAlt }]} onPress={handleVoiceInput}>
                {isRecording ? (
                  <MaterialCommunityIcons name="stop" size={22} color={theme.error} />
                ) : (
                  <Feather name="mic" size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const QuickActionItem = ({
  emoji,
  title,
  index,
  onPress,
  theme,
}: {
  emoji: string;
  title: string;
  index: number;
  onPress: () => void;
  theme: any;
}) => (
  <Animated.View entering={FadeInDown.delay(index * 100).springify()} style={styles.quickActionWrapper}>
    <Pressable 
      style={({ pressed }) => [
        styles.quickActionTile, 
        { backgroundColor: theme.surface, borderColor: theme.sep1 },
        pressed && [styles.quickActionTilePressed, { backgroundColor: theme.surfaceAlt }]
      ]} 
      onPress={onPress}
    >
      <Text style={styles.quickActionIcon}>{emoji}</Text>
      <Text style={[styles.quickActionTitle, { color: theme.textPrimary }]}>{title}</Text>
    </Pressable>
  </Animated.View>
);

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, position: 'relative' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: 16,
    zIndex: 10,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  botAvatarOuter: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  botAvatarInner: { width: 20, height: 20 },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  headerTitle: { fontFamily: 'Sora_700Bold', fontSize: 16, maxWidth: 180 },
  headerSubtitle: { fontFamily: 'Sora_500Medium', fontSize: 11, marginTop: 2 },
  headerActions: { flexDirection: 'row' },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatContainer: { flex: 1 },
  chatScroll: { padding: 20 },
  welcomeState: { alignItems: 'center', justifyContent: 'center', paddingTop: 10 },
  lottieWrapper: { width: 220, height: 220, marginBottom: 10 },
  lottieRobot: { width: '100%', height: '100%' },
  welcomeTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 26, marginBottom: 8 },
  welcomeSubtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  quickActionsGrid: { width: '100%', gap: 12 },
  quickActionsRow: { flexDirection: 'row', gap: 12 },
  quickActionWrapper: { flex: 1 },
  quickActionTile: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    borderWidth: 1,
  },
  quickActionTilePressed: { transform: [{ scale: 0.98 }] },
  quickActionIcon: { fontSize: 32, marginBottom: 10 },
  quickActionTitle: { fontFamily: 'Sora_600SemiBold', fontSize: 13, textAlign: 'center' },
  messageRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end', maxWidth: '85%' },
  messageRowUser: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  messageRowAI: { alignSelf: 'flex-start' },
  msgAvatarAI: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  msgBubble: { paddingHorizontal: 16, paddingVertical: 12, minWidth: 80 },
  msgBubbleAI: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 4,
  },
  msgBubbleUser: {
    backgroundColor: '#1E3A8A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 20,
  },
  msgBubbleError: { borderWidth: 1 },
  messageBubbleTyping: {
    flexDirection: 'row',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  msgText: { fontFamily: 'Sora_400Regular', fontSize: 15, lineHeight: 22 },
  msgTextAI: {},
  msgTextUser: { color: '#FFFFFF' },
  loadingTextPhrase: { fontFamily: 'Sora_500Medium', fontSize: 13 },
  msgTime: { fontFamily: 'Sora_500Medium', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  msgTimeAI: {},
  msgTimeUser: { color: 'rgba(255,255,255,0.7)' },
  attachmentBanner: { position: 'absolute', bottom: 100, left: 16, right: 16, zIndex: 20 },
  attachmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  attachmentName: { fontFamily: 'Sora_600SemiBold', fontSize: 13 },
  attachmentRemove: { padding: 4 },
  inputGlass: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inputGlassKeyboard: { bottom: Platform.OS === 'android' ? 0 : 0 },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', padding: 6 },
  iconBtn: { width: 40, height: 44, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 14,
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    textAlignVertical: 'center',
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22 },
  sendBtnGradient: { width: '100%', height: '100%', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.6 },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnRecording: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },

  // New styles for file attachment
  fileAttachmentBubble: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  fileCardName: {
    fontFamily: 'Sora_600SemiBold',
    color: '#FFFFFF',
    fontSize: 14,
    flexShrink: 1,
  },
});
