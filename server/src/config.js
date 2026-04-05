import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  keycloak: {
    url: process.env.KEYCLOAK_URL || "http://localhost:8080",
    realm: process.env.KEYCLOAK_REALM || "booking-system",
    issuer: process.env.KEYCLOAK_ISSUER || "",
    jwksUri:
      process.env.KEYCLOAK_JWKS_URI ||
      `${process.env.KEYCLOAK_URL || "http://localhost:8080"}/realms/${process.env.KEYCLOAK_REALM || "booking-system"}/protocol/openid-connect/certs`,
    adminClientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || "",
    adminClientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || "",
  },
};
