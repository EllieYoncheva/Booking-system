/**
 * Shapes match `booking_system.sql` column names (camelCase). mysql2 result rows
 * use these keys when selecting without aliases.
 *
 * @typedef {'admin'|'client'} UserRole
 */

/**
 * @typedef {'pending'|'confirmed'|'cancelled_by_user'|'cancelled_by_admin'|'no_show'} ReservationStatus
 */

/**
 * @typedef {'email'|'sms'|'push'} NotificationChannel
 */

/**
 * @typedef {'created'|'confirmed'|'cancelled'|'reminder'|'waitlist_promoted'|'admin_pending_action'|'reservation_rejected'} NotificationType
 */

/**
 * @typedef {'pending'|'sent'|'failed'} NotificationDeliveryStatus
 */

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string|null} phone
 * @property {string|null} keycloakSub
 * @property {string|null} passwordHash
 * @property {UserRole} role
 * @property {Date|string} createdAt
 * @property {Date|string} updatedAt
 * @property {Date|string|null} deletedAt
 * @property {string|null} notes admin-editable client notes
 * @property {string|null} internalNotes staff-only notes
 */

/**
 * @typedef {Object} Studio
 * @property {number} id
 * @property {string} name
 * @property {string|null} country
 * @property {string|null} city
 * @property {string|null} address
 * @property {string|null} phone
 * @property {string|null} email
 * @property {Date|string} createdAt
 * @property {Date|string} updatedAt
 * @property {Date|string|null} deletedAt
 */

/**
 * @typedef {Object} Service
 * @property {number} id
 * @property {string} name
 * @property {string|null} description
 * @property {number} duration duration in minutes
 * @property {Date|string} createdAt
 * @property {Date|string} updatedAt
 * @property {Date|string|null} deletedAt
 */

/**
 * @typedef {Object} Instructor
 * @property {number} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string|null} phone
 * @property {string|null} email
 * @property {Date|string} createdAt
 * @property {Date|string} updatedAt
 * @property {Date|string|null} deletedAt
 */

/**
 * Maps to table `Classes` (scheduled session).
 * @typedef {Object} ScheduledClass
 * @property {number} id
 * @property {string|null} name
 * @property {string|null} description
 * @property {Date|string} startsAt
 * @property {Date|string} endsAt
 * @property {string|number|null} price
 * @property {number} capacity
 * @property {number} serviceId
 * @property {number} studioId
 * @property {number} instructorId
 * @property {number|null} scheduleId
 * @property {string|null} cancellationReason
 */

/**
 * Recurring schedule that generates concrete Classes from a template class.
 * @typedef {Object} Schedule
 * @property {number} id
 * @property {number} classId
 * @property {string} recurrenceRule
 * @property {string|Date} startDate
 * @property {string|Date|null} endDate
 * @property {number[]|string|null} daysOfWeek
 * @property {string} startTime
 */

/**
 * @typedef {Object} Reservation
 * @property {number} id
 * @property {Date|string} createdAt
 * @property {Date|string|null} cancelledAt
 * @property {ReservationStatus} status
 * @property {number} userId
 * @property {number} classId
 * @property {string|null} adminCancelReason reason when admin declined
 */

/**
 * @typedef {Object} WaitlistEntry
 * @property {number} id
 * @property {number|null} position
 * @property {Date|string|null} notifiedAt
 * @property {number} userId
 * @property {number} classId
 * @property {'waiting'|'promoted'|'removed'} [status]
 * @property {Date|string} [createdAt]
 */

/**
 * @typedef {Object} Notification
 * @property {number} id
 * @property {NotificationChannel} channel
 * @property {NotificationType} type
 * @property {NotificationDeliveryStatus} status
 * @property {Date|string|null} sentAt
 * @property {Date|string} createdAt
 * @property {number} userId
 * @property {number|null} reservationId
 * @property {number|null} classId
 */

/**
 * @typedef {Object} Subscription
 * @property {number} id
 * @property {number|null} totalVisits
 * @property {number|null} remaining
 * @property {string|null} validUntil
 * @property {number} userId
 */

export {};
