/** Table names as in booking_system.sql */
export const TABLES = {
  users: "Users",
  studios: "Studios",
  services: "Services",
  instructors: "Instructors",
  classes: "Classes",
  reservations: "Reservations",
  waitlist: "Waitlist",
  notifications: "Notifications",
  subscription: "Subscription",
};

export const USER_ROLES = /** @type {const} */ (["admin", "client"]);


export const RESERVATION_STATUS = /** @type {const} */ ([
  "pending",
  "confirmed",
  "cancelled_by_user",
  "cancelled_by_admin",
  "no_show",
]);

export const NOTIFICATION_CHANNEL = /** @type {const} */ ([
  "email",
  "sms",
  "push",
]);

export const NOTIFICATION_TYPE = /** @type {const} */ ([
  "created",
  "confirmed",
  "cancelled",
  "reminder",
]);

export const NOTIFICATION_STATUS = /** @type {const} */ ([
  "pending",
  "sent",
  "failed",
]);
