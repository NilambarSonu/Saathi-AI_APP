import api from '@/api/axiosConfig';
import { login, verifyOtp } from '../auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock the API instance
jest.mock('@/api/axiosConfig', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
  BASE_URL: 'https://test.com',
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should call /auth/login with correct parameters', async () => {
      const mockResponse = { data: { success: true, token: 'test-token' } };
      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await login('testuser', 'password123');

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        usernameOrEmail: 'testuser',
        password: 'password123',
        client: 'mobile',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('verifyOtp', () => {
    it('should call /auth/verify-otp with correct parameters', async () => {
      const mockResponse = { data: { success: true, token: 'test-token', user: { id: '1' } } };
      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await verifyOtp('123456', 'test@example.com');

      expect(api.post).toHaveBeenCalledWith('/auth/verify-otp', {
        otp: '123456',
        email: 'test@example.com',
        client: 'mobile',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });
});
