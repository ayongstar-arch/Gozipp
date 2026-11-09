import { Injectable, BadRequestException } from '@nestjs/common';

export interface FareEstimateRequest {
  pickupLat: number;
  pickupLng: number;
  destLat: number;
  destLng: number;
  serviceType?: string; // 'MOTO' | 'TAXI' | 'PUBLIC_TAXI' | 'PRIVATE_CAR_FOR_HIRE'
  distanceKm?: number;
  durationMins?: number;
}

export interface FareEstimateResult {
  serviceType: string;
  vehicleCategory?: string;
  distanceKm: number;
  durationMins: number;
  estimatedFare: number;
  currency: string;
  breakdown: Record<string, any>;
  isQuotationConfirmed: boolean;
  isTestingQuotation?: boolean;
  requiresPoints?: number;
  disclaimer?: string;
}

@Injectable()
export class FareEstimationService {
  /**
   * Estimates fare for MOTO and TAXI under strict dual mobility governance.
   * MOTO: Preserves 0% driver commission and fixed 2 THB system fee.
   * TAXI: Internal test simulation only; real payment capture is strictly prohibited.
   */
  estimateFare(dto: FareEstimateRequest): FareEstimateResult {
    // 1. Validate coordinates
    if (
      dto.pickupLat === undefined || dto.pickupLng === undefined ||
      dto.destLat === undefined || dto.destLng === undefined ||
      isNaN(dto.pickupLat) || isNaN(dto.pickupLng) ||
      isNaN(dto.destLat) || isNaN(dto.destLng)
    ) {
      throw new BadRequestException('พิกัดจุดรับหรือจุดส่งไม่ถูกต้อง');
    }

    if (
      dto.pickupLat < -90 || dto.pickupLat > 90 ||
      dto.destLat < -90 || dto.destLat > 90 ||
      dto.pickupLng < -180 || dto.pickupLng > 180 ||
      dto.destLng < -180 || dto.destLng > 180
    ) {
      throw new BadRequestException('พิกัดอยู่นอกขอบเขตที่รองรับ');
    }

    // 2. Compute or use provided distance
    let distanceKm = dto.distanceKm;
    if (distanceKm === undefined || distanceKm <= 0) {
      distanceKm = this.calculateHaversineDistance(
        dto.pickupLat,
        dto.pickupLng,
        dto.destLat,
        dto.destLng
      );
    }
    distanceKm = Math.round(distanceKm * 10) / 10; // Round to 1 decimal place

    let durationMins = dto.durationMins;
    if (durationMins === undefined || durationMins <= 0) {
      // Assume 25 km/h urban traffic speed
      durationMins = Math.max(3, Math.ceil((distanceKm / 25) * 60));
    }

    const rawService = (dto.serviceType || 'MOTO').toUpperCase();

    // 3. MOTO Estimation
    if (rawService === 'MOTO') {
      return {
        serviceType: 'MOTO',
        distanceKm,
        durationMins,
        estimatedFare: 2.0,
        currency: 'THB',
        breakdown: {
          driverCommissionRate: 0.0,
          passengerSystemFee: 2.0,
          description: '0% Driver Commission. 2 THB System Support Fee.',
        },
        isQuotationConfirmed: true,
        requiresPoints: 2,
      };
    }

    // 4. TAXI Estimation (PUBLIC_TAXI or PRIVATE_CAR_FOR_HIRE)
    const vehicleCategory = rawService === 'PRIVATE_CAR_FOR_HIRE' ? 'PRIVATE_CAR_FOR_HIRE' : 'PUBLIC_TAXI';
    
    // Staging simulation rate: Base 35 THB + 6.5 THB/km
    const baseFare = 35.0;
    const distanceFare = Math.round(distanceKm * 6.5);
    const totalEstimatedFare = baseFare + distanceFare;

    return {
      serviceType: 'TAXI',
      vehicleCategory,
      distanceKm,
      durationMins,
      estimatedFare: totalEstimatedFare,
      currency: 'THB',
      breakdown: {
        baseFare,
        distanceFare,
        note: 'Internal Staging Simulation — No Actual Charge',
      },
      isQuotationConfirmed: false,
      isTestingQuotation: true,
      disclaimer: 'GOZIPP TAXI is currently in staging certification. Public bookings will be activated soon.',
    };
  }

  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
