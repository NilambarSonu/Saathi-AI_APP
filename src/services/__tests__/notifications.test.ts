import * as Notifications from 'expo-notifications';
import { 
  notifyUser, 
  scheduleSoilAlert, 
  scheduleSmartInsight,
  NotificationData 
} from '../notifications';

// Mock react-native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: jest.fn(objs => objs.android || objs.default),
  },
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: {
    MAX: 4,
  },
  AndroidNotificationPriority: {
    MAX: 4,
  },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
  },
}));

// Mock other expo modules
jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      eas: {
        projectId: 'test-project-id',
      },
    },
  },
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

// Mock API calls
jest.mock('../api', () => ({
  apiCall: jest.fn(),
}));

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyUser', () => {
    it('should schedule a notification with correct parameters', async () => {
      const title = 'Test Title';
      const body = 'Test Body';
      const data: NotificationData = { screen: 'test-screen', type: 'system' };

      await notifyUser(title, body, data);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          title,
          body,
          data,
          sound: true,
          priority: 4, // AndroidNotificationPriority.MAX
        }),
        trigger: null,
      });
    });
  });

  describe('scheduleSoilAlert', () => {
    it('should schedule a soil alert with specific field ID', async () => {
      const fieldId = 'field_123';
      const message = 'pH level is high';

      await scheduleSoilAlert(fieldId, message);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Soil Parameter Alert 🔴',
            body: message,
            data: expect.objectContaining({
              screen: 'history',
              fieldId,
              type: 'alert',
            }),
          }),
        })
      );
    });
  });

  describe('scheduleSmartInsight', () => {
    it('should schedule an AI insight notification', async () => {
      const message = 'Your soil health is improving!';

      await scheduleSmartInsight(message);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'AI Insight 🧠',
            body: message,
            data: expect.objectContaining({
              screen: 'ai-chat',
              type: 'insight',
            }),
          }),
        })
      );
    });
  });
});
