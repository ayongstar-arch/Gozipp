import { create } from 'zustand';
import { Location } from '@/types';

interface Driver {
  id: string;
  name: string;
  plate: string;
  phone: string;
  rating?: number;
}

interface RideState {
  isSearching: boolean;
  activeDriver: Driver | null;
  stationId: string;
  myLocation: Location | null;
  currentTripId: string | null;
  
  setIsSearching: (isSearching: boolean) => void;
  setActiveDriver: (driver: Driver | null) => void;
  setStationId: (id: string) => void;
  setMyLocation: (loc: Location | null) => void;
  setCurrentTripId: (id: string | null) => void;
  resetRide: () => void;
}

export const useRideStore = create<RideState>((set) => ({
  isSearching: false,
  activeDriver: null,
  stationId: '',
  myLocation: null,
  currentTripId: null,

  setIsSearching: (isSearching) => set({ isSearching }),
  setActiveDriver: (activeDriver) => set({ activeDriver }),
  setStationId: (stationId) => set({ stationId }),
  setMyLocation: (myLocation) => set({ myLocation }),
  setCurrentTripId: (currentTripId) => set({ currentTripId }),
  resetRide: () => set({ isSearching: false, activeDriver: null, currentTripId: null }),
}));
