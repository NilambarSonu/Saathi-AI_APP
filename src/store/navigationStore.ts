import { create } from 'zustand';

interface NavigationState {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentIndex: 0,
  setCurrentIndex: (index) => set({ currentIndex: index }),
}));


