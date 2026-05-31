-- MYWIN PRODUCTION SECURITY MIGRATION (PHASE 1)

-- 1. Audit Logs Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` char(36) NOT NULL,
  `actorId` varchar(255) DEFAULT NULL,
  `actorRole` varchar(255) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `resourceType` varchar(255) DEFAULT NULL,
  `resourceId` varchar(255) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `ipAddress` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Refresh Tokens Table
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` char(36) NOT NULL,
  `userId` varchar(255) NOT NULL,
  `userRole` varchar(255) NOT NULL,
  `tokenHash` varchar(512) NOT NULL,
  `expiresAt` datetime NOT NULL,
  `isRevoked` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_refresh_tokens_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Performance Indexes
ALTER TABLE `passengers` ADD INDEX IF NOT EXISTS `idx_passengers_phone` (`phone`);
ALTER TABLE `drivers` ADD INDEX IF NOT EXISTS `idx_drivers_phone` (`phone`);
ALTER TABLE `trips` ADD INDEX IF NOT EXISTS `idx_trips_status` (`status`);

-- 4. Clean up dangling data (Optional but recommended for fresh security state)
-- DELETE FROM `refresh_tokens` WHERE `expiresAt` < NOW();
