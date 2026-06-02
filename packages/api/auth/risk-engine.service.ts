import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as geoip from 'geoip-lite';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

@Injectable()
export class RiskEngineService {
    constructor(
        @InjectRepository(RefreshTokenEntity) private refreshRepo: Repository<RefreshTokenEntity>,
    ) {}

    // Haversine formula to calculate distance between two coordinates in kilometers
    private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    async evaluateLoginRisk(userId: string, currentIp: string): Promise<{ highRisk: boolean; reason?: string }> {
        // 1. If IP is local/private, we can't geolocate it accurately or it's development.
        if (!currentIp || currentIp === '127.0.0.1' || currentIp === '::1' || currentIp.startsWith('192.168.') || currentIp.startsWith('10.')) {
            return { highRisk: false };
        }

        const currentGeo = geoip.lookup(currentIp);
        if (!currentGeo) {
            return { highRisk: false };
        }

        // 2. Find the most recent active session for this user from a DIFFERENT IP
        const recentSessions = await this.refreshRepo.find({
            where: { userId, isRevoked: false },
            order: { lastActiveAt: 'DESC' },
            take: 5
        });

        // Find the latest session that has a valid IP different from the current one
        const previousSession = recentSessions.find(s => 
            s.ipAddress && 
            s.ipAddress !== currentIp && 
            s.ipAddress !== '127.0.0.1' && 
            s.ipAddress !== '::1'
        );

        if (!previousSession) {
            return { highRisk: false };
        }

        const previousGeo = geoip.lookup(previousSession.ipAddress);
        if (!previousGeo) {
            return { highRisk: false };
        }

        // 3. Calculate Impossible Travel
        const timeDiffHours = (new Date().getTime() - previousSession.lastActiveAt.getTime()) / (1000 * 60 * 60);
        
        // If the last session was literally just now (e.g. < 1 minute), prevent division by zero or extremely small numbers
        const safeTimeDiff = Math.max(timeDiffHours, 0.016); // min 1 minute

        const distanceKm = this.calculateDistanceKm(
            currentGeo.ll[0], currentGeo.ll[1],
            previousGeo.ll[0], previousGeo.ll[1]
        );

        // Calculate speed in km/h required to travel between the two locations
        const requiredSpeedKmh = distanceKm / safeTimeDiff;

        // Commercial airplanes travel around 800-900 km/h. 
        // If the required speed is > 1000 km/h and distance is significant (> 50km), it's highly suspicious.
        if (requiredSpeedKmh > 1000 && distanceKm > 50) {
            return { 
                highRisk: true, 
                reason: `IMPOSSIBLE_TRAVEL (Distance: ${Math.round(distanceKm)}km, Time: ${Math.round(timeDiffHours * 60)}mins, Required Speed: ${Math.round(requiredSpeedKmh)}km/h)`
            };
        }

        return { highRisk: false };
    }
}
