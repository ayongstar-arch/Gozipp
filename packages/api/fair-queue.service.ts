import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

// Weights config
const WEIGHTS = {
  IDLE: 0.5,
  RECENCY: 0.3,
  TRIPS: 0.15,
  RATING: 0.05
};

@Injectable()
export class FairQueueService {
  private readonly redis: Redis;
  private readonly logger = new Logger(FairQueueService.name);

  // Seeded station geofence coordinates
  private readonly stations = {
    'WIN-CENTRAL-01': { name: 'วินตลาดกลาง', lat: 13.7563, lng: 100.5018, radius: 100 },
    'WIN-TECH-PARK': { name: 'วินเทคพาร์ค', lat: 13.7663, lng: 100.5118, radius: 100 },
    'WIN-SUBURB-A': { name: 'วินหมู่บ้าน A', lat: 13.7200, lng: 100.5600, radius: 100 },
  };

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  private calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Main entry point: Driver enters the geofence of a Win
   * Uses LUA script to ensure atomicity of checks and score calculation
   */
  async joinQueue(winId: string, driverId: string, lat: number, lng: number) {
    // Proximity cheat check
    const station = this.stations[winId];
    if (lat !== 0 && lng !== 0 && station) {
      const distance = this.calculateDistanceMeters(lat, lng, station.lat, station.lng);
      if (distance > station.radius) {
        this.logger.warn(`Driver ${driverId} failed geofence check. Dist: ${distance.toFixed(1)}m > ${station.radius}m`);
        return 'FAILED_PROXIMITY_CHECK';
      }
    }

    // Define the LUA script for atomic score calculation and insertion
    const luaScript = `
      local winId = KEYS[1]
      local driverId = KEYS[2]
      local queueKey = "win:" .. winId .. ":queue"
      
      -- 1. Check if driver is already in queue
      if redis.call("ZSCORE", queueKey, driverId) then
        return "ALREADY_QUEUED"
      end

      -- 2. Fetch Driver Stats (Hash)
      local driverKey = "driver:" .. driverId .. ":stats"
      local stats = redis.call("HMGET", driverKey, "lastTripTime", "tripsToday", "rating", "status")
      
      local lastTripTime = tonumber(stats[1]) or 0
      local tripsToday = tonumber(stats[2]) or 0
      local rating = tonumber(stats[3]) or 5.0
      local status = stats[4]

      -- 3. Strict Status Check
      if status ~= "IDLE" then
        return "NOT_AVAILABLE"
      end

      -- 4. Calculate Score
      local currentTime = tonumber(ARGV[1])
      local timeSinceLast = (currentTime - lastTripTime) -- Seconds
      
      -- Avoid div by zero
      local tripsFactor = 1 / math.max(1, tripsToday)
      
      local fixedScore = (timeSinceLast * ${WEIGHTS.RECENCY}) + (tripsFactor * ${WEIGHTS.TRIPS}) + (rating * ${WEIGHTS.RATING})
      
      local entryTime = currentTime
      local finalZSetScore = fixedScore - (entryTime * ${WEIGHTS.IDLE})
      
      redis.call("ZADD", queueKey, finalZSetScore, driverId)
      redis.call("HSET", driverKey, "currentWin", winId, "joinedQueueAt", entryTime)
      
      return "OK"
    `;

    // Execute
    const nowSeconds = Math.floor(Date.now() / 1000);
    return this.redis.eval(luaScript, 2, winId, driverId, nowSeconds);
  }

  /**
   * Dispatch: Pop the best driver
   */
  async popBestDriver(winId: string): Promise<string | null> {
    const queueKey = `win:${winId}:queue`;
    
    // Get top driver (Highest Score)
    const result = await this.redis.zrevrange(queueKey, 0, 0);
    
    if (!result || result.length === 0) return null;
    
    const bestDriverId = result[0];
    
    // Atomic Pop: Verify they are still there and remove
    // (Prevent race condition where two requests pop same driver)
    const popped = await this.redis.zrem(queueKey, bestDriverId);
    
    if (popped === 1) {
       this.logger.log(`Dispatching Driver ${bestDriverId} from Win ${winId}`);
       return bestDriverId;
    } else {
       // Driver was stolen by another process in the ms between ZREVRANGE and ZREM
       return this.popBestDriver(winId); // Retry
    }
  }

  /**
   * Handle Timeout (Driver didn't accept)
   * Penalty: Re-insert but reset their "IdleTime" effectively pushing them back.
   */
  async handleTimeout(winId: string, driverId: string) {
      // Logic: Update their 'joinedQueueAt' to NOW.
      // This resets the (IdleTime * 0.5) component to 0.
      await this.joinQueue(winId, driverId, 0, 0);
      this.logger.warn(`Driver ${driverId} timed out. Re-queued with penalty.`);
  }
}
