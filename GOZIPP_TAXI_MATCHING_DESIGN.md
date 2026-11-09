# GOZIPP Taxi Geospatial Matching & Progressive Radius Engine
**Document ID:** GOZIPP-TAXI-01  
**Project:** GOZIPP Dual Mobility Platform (MOTO + TAXI)  
**Stage:** STAGE 1 — Technical Contract Design  
**Status:** DRAFTED FOR APPROVAL  
**Algorithm:** Progressive Geospatial Radius Search (Decoupled from Win Queues)  
**Date:** 2026-11-08  

---

## 1. Architectural Independence from MOTO Fair Queue

GOZIPP maintains a strict architectural separation between **MOTO Win Queuing** and **TAXI Geospatial Matching**:

| Matching Dimension | GOZIPP MOTO (Motorcycle Taxi) | GOZIPP TAXI (Car Taxi) |
| :--- | :--- | :--- |
| **Matching Engine** | `FairQueueService` ([`fair-queue.service.ts`](file:///c:/Users/acer/Videos/Project/Gozipp/packages/api/fair-queue.service.ts)) | `TaxiMatchingService` (`packages/api/taxi-matching.service.ts`) |
| **Spatial Boundary** | Fixed **100-meter** geofence around physical Win stations | **Progressive Expansion Radius** (1.5 km $\rightarrow$ 3.0 km $\rightarrow$ 5.0 km) |
| **Storage Structure** | Redis Sorted Set: `win:<winId>:queue` | Redis Geospatial Index: `taxi:locations` |
| **Ranking Logic** | Waiting time (50%) + Trips today (15%) + Recency (30%) + Rating (5%) | Proximity / ETA (45%) + Driver Rating (25%) + Fairness/Trips (20%) + Vehicle Class Match (10%) |
| **Legal Scope** | DLT Motorcycle Win Regulations | DLT Public Metered Taxi & Electronic Ride-Hailing Regulations |

---

## 2. Progressive Search Radius Specification (Mandatory Correction F)

Rather than hardcoding a static 3–5 km radius, the Taxi Matching Engine uses a **Configurable Progressive Expansion Radius Model** to balance customer ETA with battery and mobile data efficiency:

```mermaid
flowchart TD
    Req[Passenger Requests TAXI] --> Step1[Step 1: Immediate Proximity (0 - 1.5 km)]
    Step1 --> Query1[Query Redis GEOSEARCH radius = 1.5 km]
    Query1 --> Found1{Available Verified Driver Found?}
    Found1 -->|Yes| Dispatch1[Dispatch RIDE_OFFER 15s Timer]
    Dispatch1 --> Accept1{Driver Accepts?}
    Accept1 -->|Yes| Commited[Commit Trip Assignment]

    Found1 -->|No / Timeout| Step2[Step 2: Mid-Range Zone (1.5 - 3.0 km)]
    Accept1 -->|No| Step2
    Step2 --> Query2[Query Redis GEOSEARCH radius = 3.0 km]
    Query2 --> Found2{Available Driver Found?}
    Found2 -->|Yes| Dispatch2[Dispatch RIDE_OFFER 15s Timer]
    Dispatch2 --> Accept2{Driver Accepts?}
    Accept2 -->|Yes| Commited

    Found2 -->|No / Timeout| Step3[Step 3: Extended Outer Zone (3.0 - 5.0 km / Max)]
    Accept2 -->|No| Step3
    Step3 --> Query3[Query Redis GEOSEARCH radius = 5.0 km]
    Query3 --> Found3{Available Driver Found?}
    Found3 -->|Yes| Dispatch3[Dispatch RIDE_OFFER 15s Timer]
    Dispatch3 --> Accept3{Driver Accepts?}
    Accept3 -->|Yes| Commited

    Found3 -->|No / Timeout| Timeout[Emit TIMEOUT_NO_DRIVER to Passenger]
    Accept3 -->|No| Timeout
```

### 2.1 Dynamic Configuration Parameters (Stored in Redis / DB)
The operations team can adjust radius steps per city or district via the Admin Configuration Center without redeploying code:

```json
{
  "taxi_dispatch_config": {
    "radius_steps_km": [1.5, 3.0, 5.0],
    "suburban_max_radius_km": 8.0,
    "offer_timeout_seconds": 15,
    "max_search_duration_seconds": 60,
    "candidate_pool_limit": 10
  }
}
```

---

## 3. Candidate Scoring & Selection Algorithm

When a geographic radius search yields multiple candidate car taxi drivers, the system ranks candidates using the following composite formula:

$$\text{CandidateScore} = (W_{\text{dist}} \times S_{\text{dist}}) + (W_{\text{rating}} \times S_{\text{rating}}) + (W_{\text{fairness}} \times S_{\text{fairness}})$$

Where:
* $S_{\text{dist}} = 1 - \left(\frac{\text{DistanceKm}}{\text{RadiusMaxKm}}\right)$ (Weight: 0.45 — Prioritizes closest vehicle).
* $S_{\text{rating}} = \frac{\text{DriverRating}}{5.0}$ (Weight: 0.25 — Prioritizes top-rated drivers).
* $S_{\text{fairness}} = \frac{1}{\max(1, N_{\text{tripsToday}})}$ (Weight: 0.20 — Distributes daily income fairly across active fleet).
* Vehicle Preference Match: +0.10 bonus if vehicle exactly matches passenger preference (`PUBLIC_TAXI` vs `PRIVATE_CAR_FOR_HIRE`).

---

## 4. `TaxiMatchingService` Technical Implementation Contract

```typescript
// packages/api/taxi-matching.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { DriverVehicleEntity } from './entities/driver-vehicle.entity';
import { DriverServiceProfileEntity } from './entities/driver-service-profile.entity';
import { DriverActiveAssignmentEntity } from './entities/driver-active-assignment.entity';

export interface DispatchCandidate {
  driverId: string;
  vehicleId: string;
  classification: string;
  distanceKm: number;
  score: number;
}

@Injectable()
export class TaxiMatchingService {
  private readonly redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  private readonly logger = new Logger(TaxiMatchingService.name);

  constructor(
    @InjectRepository(DriverVehicleEntity)
    private vehicleRepo: Repository<DriverVehicleEntity>,
    @InjectRepository(DriverServiceProfileEntity)
    private profileRepo: Repository<DriverServiceProfileEntity>,
    @InjectRepository(DriverActiveAssignmentEntity)
    private lockRepo: Repository<DriverActiveAssignmentEntity>,
  ) {}

  /**
   * Discovers the best taxi driver within a progressive radius step
   */
  async findCandidates(
    pickupLat: number,
    pickupLng: number,
    radiusKm: number,
    preference: 'ANY' | 'PUBLIC_TAXI' | 'PRIVATE_CAR_FOR_HIRE' = 'ANY'
  ): Promise<DispatchCandidate[]> {
    // 1. Redis Geospatial Search
    const rawResults = await (this.redis as any).geosearch(
      'taxi:locations',
      'FROMLONLAT', pickupLng, pickupLat,
      'BYRADIUS', radiusKm, 'KM',
      'WITHDIST',
      'ASC',
      'COUNT', 20
    );

    if (!rawResults || rawResults.length === 0) return [];

    const candidateDriverIds = rawResults.map((r: any) => r[0]);
    const distanceMap = new Map<string, number>(rawResults.map((r: any) => [r[0], parseFloat(r[1])]));

    // 2. Filter Active Global Locks (PostgreSQL & Redis)
    const activeLocks = await this.lockRepo
      .createQueryBuilder('lock')
      .where('lock.driver_id IN (:...ids)', { ids: candidateDriverIds })
      .getMany();
    const busyDriverIds = new Set(activeLocks.map(l => l.driver_id));

    // 3. Filter Eligibility & Verification
    const eligibleProfiles = await this.profileRepo
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.activeVehicle', 'vehicle')
      .innerJoinAndSelect('profile.driver', 'driver')
      .where('profile.driver_id IN (:...ids)', { ids: candidateDriverIds })
      .andWhere('profile.service_type = :serviceType', { serviceType: 'TAXI' })
      .andWhere('profile.is_enabled = true')
      .andWhere('profile.availability_status = :status', { status: 'ONLINE_IDLE' })
      .andWhere('vehicle.verification_status = :vStatus', { vStatus: 'VERIFIED' })
      .andWhere('vehicle.is_active = true')
      .getMany();

    // 4. Score and Rank Candidates
    const candidates: DispatchCandidate[] = [];
    for (const p of eligibleProfiles) {
      if (busyDriverIds.has(p.driver_id)) continue;

      if (preference !== 'ANY' && p.activeVehicle?.vehicle_classification !== preference) {
        continue;
      }

      const dist = distanceMap.get(p.driver_id) ?? radiusKm;
      const rating = Number(p.driver?.rating) || 5.0;
      const tripsToday = p.driver?.total_trips || 0;

      const distScore = 1 - Math.min(dist / radiusKm, 1);
      const ratingScore = rating / 5.0;
      const fairnessScore = 1 / Math.max(1, tripsToday);

      const totalScore = (distScore * 0.45) + (ratingScore * 0.25) + (fairnessScore * 0.20);

      candidates.push({
        driverId: p.driver_id,
        vehicleId: p.active_vehicle_id!,
        classification: p.activeVehicle!.vehicle_classification,
        distanceKm: dist,
        score: totalScore,
      });
    }

    return candidates.sort((a, b) => b.score - a.score);
  }
}
```

---

## 5. Fallback & Timeout Handling

1. **Progressive Step Transition:**
   * Step 1 (1.5 km): Candidate given 15 seconds to accept.
   * If unaccepted or rejected, engine immediately triggers Step 2 (3.0 km) with the next best candidate.
   * If unaccepted or rejected, engine triggers Step 3 (5.0 km).
2. **Total Timeout (`TIMEOUT_NO_DRIVER`):**
   * If after 60 seconds of progressive expansion no verified driver has accepted, the trip status updates to `TIMEOUT_NO_DRIVER`.
   * Passenger is notified immediately via Socket.IO event `TRIP_STATUS_UPDATE`.
   * Reserved wallet points are released automatically with zero penalty.
