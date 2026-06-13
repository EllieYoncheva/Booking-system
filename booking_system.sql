-- Schema: booking_system
-- Column identifiers use camelCase (backticked) to match application objects from mysql2.
-- PK is `id` on every table; FKs use camelCase (userId, classId, serviceId, …).

CREATE SCHEMA IF NOT EXISTS `booking_system` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `booking_system`;

SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `Subscription`;
DROP TABLE IF EXISTS `AppSettings`;
DROP TABLE IF EXISTS `Notifications`;
DROP TABLE IF EXISTS `Waitlist`;
DROP TABLE IF EXISTS `Reservations`;
DROP TABLE IF EXISTS `Schedules`;
DROP TABLE IF EXISTS `Classes`;
DROP TABLE IF EXISTS `Instructors`;
DROP TABLE IF EXISTS `Services`;
DROP TABLE IF EXISTS `Studios`;
DROP TABLE IF EXISTS `Users`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `Users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `firstName` VARCHAR(100) NOT NULL,
  `lastName` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(32) NULL,
  `keycloakSub` VARCHAR(255) NULL COMMENT 'OIDC sub from Keycloak; unique when set',
  `passwordHash` VARCHAR(255) NULL COMMENT 'Hash only (bcrypt/argon2); NULL if not set yet',
  `role` ENUM('admin', 'client') NOT NULL DEFAULT 'client',
  `notes` TEXT NULL COMMENT 'Admin-editable client notes',
  `internalNotes` TEXT NULL COMMENT 'Staff-only notes',
  `onlineBookingBlocked` TINYINT(1) NOT NULL DEFAULT 0,
  `bookingBlockedAt` DATETIME(6) NULL,
  `bookingBlockedSource` ENUM('auto_no_show', 'admin_manual') NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_Users_email` (`email`),
  UNIQUE KEY `uq_Users_phone` (`phone`),
  UNIQUE KEY `uq_Users_keycloakSub` (`keycloakSub`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Studios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(160) NOT NULL,
  `country` VARCHAR(100) NULL,
  `city` VARCHAR(120) NULL,
  `address` VARCHAR(500) NULL,
  `phone` VARCHAR(32) NULL,
  `email` VARCHAR(255) NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` DATETIME(6) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Services` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(160) NOT NULL,
  `description` VARCHAR(500) NULL,
  `duration` INT NOT NULL DEFAULT 60,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_Services_duration` CHECK (`duration` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Instructors` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `firstName` VARCHAR(100) NOT NULL,
  `lastName` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(32) NULL,
  `email` VARCHAR(255) NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` DATETIME(6) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Classes = concrete scheduled occurrences (not template-only duration)
CREATE TABLE `Classes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(160) NULL,
  `description` VARCHAR(500) NULL,
  `startsAt` DATETIME(6) NOT NULL,
  `endsAt` DATETIME(6) NOT NULL,
  `price` DECIMAL(10, 2) NULL,
  `capacity` INT NOT NULL,
  `serviceId` INT NOT NULL,
  `studioId` INT NOT NULL,
  `instructorId` INT NOT NULL,
  `scheduleId` INT NULL,
  `cancellationReason` VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  KEY `fk_Classes_Services_idx` (`serviceId`),
  KEY `fk_Classes_Studios_idx` (`studioId`, `startsAt`),
  KEY `idx_Classes_startsAt` (`startsAt`),
  KEY `fk_Classes_Instructors_idx` (`instructorId`),
  KEY `fk_Classes_Schedules_idx` (`scheduleId`),
  UNIQUE KEY `uq_Classes_schedule_start` (`scheduleId`, `startsAt`),
  CONSTRAINT `fk_Classes_Services`
    FOREIGN KEY (`serviceId`)
    REFERENCES `Services` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Classes_Studios`
    FOREIGN KEY (`studioId`)
    REFERENCES `Studios` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Classes_Instructors`
    FOREIGN KEY (`instructorId`)
    REFERENCES `Instructors` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `chk_Classes_time` CHECK (`endsAt` > `startsAt`),
  CONSTRAINT `chk_Classes_capacity` CHECK (`capacity` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Schedules` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `classId` INT NOT NULL,
  `recurrenceRule` VARCHAR(255) NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NULL,
  `daysOfWeek` JSON NULL,
  `startTime` TIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_Schedules_Classes_idx` (`classId`),
  CONSTRAINT `fk_Schedules_Classes`
    FOREIGN KEY (`classId`)
    REFERENCES `Classes` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `Classes`
  ADD CONSTRAINT `fk_Classes_Schedules`
  FOREIGN KEY (`scheduleId`)
  REFERENCES `Schedules` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Reservations: at most one active (pending or confirmed) row per user per class (see activeSlot + UNIQUE).
CREATE TABLE `Reservations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `cancelledAt` DATETIME(6) NULL,
  `status` ENUM('pending', 'confirmed', 'cancelled_by_user', 'cancelled_by_admin', 'no_show') NOT NULL DEFAULT 'pending',
  `userId` INT NOT NULL,
  `classId` INT NOT NULL,
  `adminCancelReason` VARCHAR(500) NULL COMMENT 'When status is cancelled_by_admin',
  `cancelReason` VARCHAR(500) NULL COMMENT 'When status is cancelled_by_user',
  `activeSlot` TINYINT UNSIGNED GENERATED ALWAYS AS (
    CASE WHEN `status` IN ('pending', 'confirmed') THEN 1 ELSE NULL END
  ) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_Reservations_user_class_active` (`userId`, `classId`, `activeSlot`),
  KEY `fk_Reservations_Users_idx` (`userId`),
  KEY `fk_Reservations_Classes_idx` (`classId`),
  KEY `idx_Reservations_user_status` (`userId`, `status`),
  KEY `idx_Reservations_class_status` (`classId`, `status`),
  CONSTRAINT `fk_Reservations_Users`
    FOREIGN KEY (`userId`)
    REFERENCES `Users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Reservations_Classes`
    FOREIGN KEY (`classId`)
    REFERENCES `Classes` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Waitlist` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `position` INT NULL,
  `notifiedAt` DATETIME(6) NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `status` ENUM('waiting', 'promoted', 'removed') NOT NULL DEFAULT 'waiting',
  `userId` INT NOT NULL,
  `classId` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_Waitlist_class_user` (`classId`, `userId`),
  KEY `fk_Waitlist_Users_idx` (`userId`),
  KEY `fk_Waitlist_Classes_idx` (`classId`),
  CONSTRAINT `fk_Waitlist_Users`
    FOREIGN KEY (`userId`)
    REFERENCES `Users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Waitlist_Classes`
    FOREIGN KEY (`classId`)
    REFERENCES `Classes` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Notifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `channel` ENUM('email', 'sms', 'push') NOT NULL DEFAULT 'email',
  `type` ENUM('created', 'confirmed', 'cancelled', 'reminder', 'waitlist_promoted', 'admin_pending_action', 'reservation_rejected') NOT NULL,
  `status` ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  `sentAt` DATETIME(6) NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `userId` INT NOT NULL,
  `reservationId` INT NULL,
  `classId` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_Notifications_user_reservation_type` (`userId`, `reservationId`, `type`),
  KEY `fk_Notifications_Users_idx` (`userId`),
  KEY `fk_Notifications_Reservations_idx` (`reservationId`),
  KEY `fk_Notifications_Classes_idx` (`classId`),
  CONSTRAINT `fk_Notifications_Users`
    FOREIGN KEY (`userId`)
    REFERENCES `Users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Notifications_Reservations`
    FOREIGN KEY (`reservationId`)
    REFERENCES `Reservations` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Notifications_Classes`
    FOREIGN KEY (`classId`)
    REFERENCES `Classes` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AppSettings` (
  `key` VARCHAR(64) NOT NULL,
  `value` TEXT NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `AppSettings` (`key`, `value`) VALUES ('booking.autoConfirm', 'false')
  ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

CREATE TABLE `Subscription` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `totalVisits` INT NULL,
  `remaining` INT NULL,
  `validUntil` DATE NULL,
  `userId` INT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_Subscription_Users_idx` (`userId`),
  CONSTRAINT `fk_Subscription_Users`
    FOREIGN KEY (`userId`)
    REFERENCES `Users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
