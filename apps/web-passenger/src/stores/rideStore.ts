import { create } from 'zustand';
import { Location } from '@/types';

interface Driver {
  id: string;
  name: string;
  plate: string;
  phone: string;
  rating?: number;
}

interface RideEstimate {
  tripId: string;
  fare: number;
  distance: string;
  eta: string;
}

interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
}

interface RideState {
  isSearching: boolean;
  activeDriver: Driver | null;
  stationId: string;
  myLocation: Location | null;
  currentTripId: string | null;
  rideStatus: string | null;
  estimate: RideEstimate | null;
  driverLocation: DriverLocation | null;
  
  setIsSearching: (isSearching: boolean) => void;
  setActiveDriver: (driver: Driver | null) => void;
  setStationId: (id: string) => void;
  setMyLocation: (loc: Location | null) => void;
  setCurrentTripId: (id: string | null) => void;
  setRideStatus: (status: string | null) => void;
  setEstimate: (estimate: RideEstimate | null) => void;
  setDriverLocation: (location: DriverLocation | null) => void;
  resetRide: () => void;
}

export const useRideStore = create<RideState>((set) => ({
  isSearching: false,
  activeDriver: null,
  stationId: '',
  myLocation: null,
  currentTripId: null,
  rideStatus: null,
  estimate: null,
  driverLocation: null,

  setIsSearching: (isSearching) => set({ isSearching }),
  setActiveDriver: (activeDriver) => set({ activeDriver }),
  setStationId: (stationId) => set({ stationId }),
  setMyLocation: (myLocation) => set({ myLocation }),
  setCurrentTripId: (currentTripId) => set({ currentTripId }),
  setRideStatus: (rideStatus) => set({ rideStatus }),
  setEstimate: (estimate) => set({ estimate }),
  setDriverLocation: (driverLocation) => set({ driverLocation }),
  resetRide: () => set({
    isSearching: false,
    activeDriver: null,
    currentTripId: null,
    rideStatus: null,
    estimate: null,
    driverLocation: null,
  }),
}));
