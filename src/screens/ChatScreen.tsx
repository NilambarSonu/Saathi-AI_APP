import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useChat } from '../../src/features/ai_assistant/hooks/useChat';
import { api } from '../../src/core/services/api';
import { useNavigationStore } from '../store/navigationStore';

export default function AIChatScreen() {
  const params = useLocalSearchParams<{ sessionId?: string; sessionTitle?: string }>();
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : undefined;
  const sessionTitle =
    typeof params.sessionTitle === 'string' && params.sessionTitle.trim().length > 0
      ? params.sessionTitle
      : 'Saathi Intelligence';

  const { messages, isLoading, isLoadingHistory, loadingText, error, sendMessage, clearChat } =
    useChat(sessionId);

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
        // Ignore failed stop attempts.
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
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                Haptics.selectionAsync();
                useNavigationStore.getState().setCurrentIndex(0);
              }}
            >
              <Ionicons name="chevron-back" size={24} color="#0D1F12" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <View style={styles.botAvatarOuter}>
                <Image source={require('../../assets/images/favicon.png')} style={styles.botAvatarInner} />
                <View style={[styles.onlineDot, error ? { backgroundColor: '#EF4444' } : {}]} />
              </View>
              <View>
                <Text style={styles.headerTitle}>{sessionTitle}</Text>
                <Text style={[styles.headerSubtitle, error ? { color: '#EF4444' } : {}]}>
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
            <TouchableOpacity style={styles.actionBtn} onPress={clearChat}>
              <Feather name="trash-2" size={20} color="#6B8A72" />
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
              <ActivityIndicator size="large" color="#22C55E" />
              <Text style={styles.welcomeSubtitle}>Loading saved conversation...</Text>
            </Animated.View>
          ) : messages.length === 0 ? (
            <Animated.View entering={FadeIn.duration(800)} style={styles.welcomeState}>
              <View style={styles.lottieWrapper}>
                <LottieView source={require('../../animations/chatbot.json')} autoPlay loop style={styles.lottieRobot} />
              </View>
              <Text style={styles.welcomeTitle}>Namaste, Farmer! 🙏</Text>
              <Text style={styles.welcomeSubtitle}>How can Saathi AI assist your farm today?</Text>

              <View style={styles.quickActionsGrid}>
                <View style={styles.quickActionsRow}>
                  {quickActions.slice(0, 2).map((item, index) => (
                    <QuickActionItem
                      key={item.title}
                      emoji={item.emoji}
                      title={item.title}
                      index={index + 1}
                      onPress={() => handleSend(item.title)}
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
                    />
                  ))}
                </View>
              </View>
            </Animated.View>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <Animated.View
                  key={msg.id}
                  entering={FadeInUp.springify().damping(18).stiffness(150)}
                  layout={Layout.springify()}
                  style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAI]}
                >
                  {!isUser && (
                    <View style={styles.msgAvatarAI}>
                      <Image source={require('../../assets/images/favicon.png')} style={{ width: 18, height: 18 }} />
                    </View>
                  )}
                  <View
                    style={[
                      styles.msgBubble,
                      isUser ? styles.msgBubbleUser : styles.msgBubbleAI,
                      msg.id.includes('-err') && styles.msgBubbleError,
                    ]}
                  >
                    <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAI]}>
                      {msg.content}
                    </Text>
                    <Text style={[styles.msgTime, isUser ? styles.msgTimeUser : styles.msgTimeAI]}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </Animated.View>
              );
            })
          )}

          {isLoading && (
            <Animated.View entering={FadeInUp} style={[styles.messageRow, styles.messageRowAI]}>
              <View style={styles.msgAvatarAI}>
                <Image source={require('../../assets/images/favicon.png')} style={{ width: 18, height: 18 }} />
              </View>
              <View style={[styles.msgBubble, styles.messageBubbleTyping]}>
                <ActivityIndicator size="small" color="#7B2CBF" style={{ marginRight: 8 }} />
                <Text style={styles.loadingTextPhrase}>{loadingText || 'Thinking...'}</Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {fileAttachment && (
          <Animated.View entering={FadeInDown} style={styles.attachmentBanner}>
            <View style={styles.attachmentPill}>
              <MaterialCommunityIcons
                name={fileAttachment.type === 'image' ? 'image-outline' : 'file-document-outline'}
                size={20}
                color="#7B2CBF"
              />
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {fileAttachment.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFileAttachment(null)} style={styles.attachmentRemove}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <BlurView intensity={60} tint="light" style={[styles.inputGlass, keyboardVisible && styles.inputGlassKeyboard]}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => handleAttachDocument(['image/*'], 'image')}>
              <Ionicons name="image-outline" size={22} color="#6B8A72" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => handleAttachDocument(['application/json', 'text/csv', 'application/pdf'], 'file')}
            >
              <Feather name="paperclip" size={20} color="#6B8A72" />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder="Ask Saathi AI..."
              placeholderTextColor="#A8BFB0"
              value={inputText}
              onChangeText={setInputText}
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
                <LinearGradient colors={['#C77DEF', '#7B2CBF']} style={styles.sendBtnGradient}>
                  <Ionicons name="arrow-up" size={18} color="#FFF" style={{ marginLeft: 1 }} />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.micBtn, isRecording && styles.micBtnRecording]} onPress={handleVoiceInput}>
                {isRecording ? (
                  <MaterialCommunityIcons name="stop" size={22} color="#EF4444" />
                ) : (
                  <Feather name="mic" size={20} color="#6B8A72" />
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
}: {
  emoji: string;
  title: string;
  index: number;
  onPress: () => void;
}) => (
  <Animated.View entering={FadeInDown.delay(index * 100).springify()} style={styles.quickActionWrapper}>
    <Pressable style={({ pressed }) => [styles.quickActionTile, pressed && styles.quickActionTilePressed]} onPress={onPress}>
      <Text style={styles.quickActionIcon}>{emoji}</Text>
      <Text style={styles.quickActionTitle}>{title}</Text>
    </Pressable>
  </Animated.View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0FBF4' },
  container: { flex: 1, position: 'relative' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 40,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F7ED',
    zIndex: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  botAvatarOuter: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#E8F5EE',
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
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerTitle: { fontFamily: 'Sora_700Bold', fontSize: 16, color: '#0D1F12', maxWidth: 180 },
  headerSubtitle: { fontFamily: 'Sora_500Medium', fontSize: 11, color: '#22C55E', marginTop: 2 },
  headerActions: { flexDirection: 'row' },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatContainer: { flex: 1 },
  chatScroll: { padding: 20 },
  welcomeState: { alignItems: 'center', justifyContent: 'center', paddingTop: 10 },
  lottieWrapper: { width: 220, height: 220, marginBottom: 10 },
  lottieRobot: { width: '100%', height: '100%' },
  welcomeTitle: { fontFamily: 'Sora_800ExtraBold', fontSize: 26, color: '#0D1F12', marginBottom: 8 },
  welcomeSubtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: '#6B8A72',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  quickActionsGrid: { width: '100%', gap: 12 },
  quickActionsRow: { flexDirection: 'row', gap: 12 },
  quickActionWrapper: { flex: 1 },
  quickActionTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    borderWidth: 1,
    borderColor: '#E8F7ED',
  },
  quickActionTilePressed: { backgroundColor: '#F0FBF4', transform: [{ scale: 0.98 }] },
  quickActionIcon: { fontSize: 32, marginBottom: 10 },
  quickActionTitle: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: '#0D1F12', textAlign: 'center' },
  messageRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end', maxWidth: '85%' },
  messageRowUser: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  messageRowAI: { alignSelf: 'flex-start' },
  msgAvatarAI: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  msgBubble: { paddingHorizontal: 16, paddingVertical: 12, minWidth: 80 },
  msgBubbleAI: {
    backgroundColor: '#FFFFFF',
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
  msgBubbleError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1 },
  messageBubbleTyping: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  msgText: { fontFamily: 'Sora_400Regular', fontSize: 15, lineHeight: 22 },
  msgTextAI: { color: '#0D1F12' },
  msgTextUser: { color: '#FFFFFF' },
  loadingTextPhrase: { fontFamily: 'Sora_500Medium', fontSize: 13, color: '#7B2CBF' },
  msgTime: { fontFamily: 'Sora_500Medium', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  msgTimeAI: { color: '#9CA3AF' },
  msgTimeUser: { color: 'rgba(255,255,255,0.7)' },
  attachmentBanner: { position: 'absolute', bottom: 100, left: 16, right: 16, zIndex: 20 },
  attachmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8F7ED',
  },
  attachmentName: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: '#0D1F12' },
  attachmentRemove: { padding: 4 },
  inputGlass: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  inputGlassKeyboard: { bottom: 10 },
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
    color: '#0D1F12',
    textAlignVertical: 'center',
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22 },
  sendBtnGradient: { width: '100%', height: '100%', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.6 },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnRecording: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
});
