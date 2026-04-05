import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import { config } from "../config.js";

function createJwksClient() {
  return jwksRsa({
    jwksUri: config.keycloak.jwksUri,
    cache: true,
    rateLimit: true,
  });
}

let jwksClient;

function getKey(header, callback) {
  if (!jwksClient) jwksClient = createJwksClient();
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export function verifyKeycloakJwt(required = true) {
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      if (!required) return next();
      return res.status(401).json({ error: "Missing Bearer token" });
    }

    const token = auth.slice(7);
    const issuer = config.keycloak.issuer || undefined;

    jwt.verify(
      token,
      getKey,
      {
        algorithms: ["RS256"],
        ...(issuer ? { issuer } : {}),
      },
      (err, decoded) => {
        if (err) {
          if (!required) return next();
          return res.status(401).json({ error: "Invalid or expired token" });
        }

        const realmAccess = decoded.realm_access;
        const roles = Array.isArray(realmAccess?.roles) ? realmAccess.roles : [];

        req.user = {
          sub: decoded.sub,
          preferredUsername: decoded.preferred_username,
          email: decoded.email,
          givenName: decoded.given_name,
          familyName: decoded.family_name,
          roles,
          authorities: roles.map((r) => `ROLE_${r}`),
          token,
        };
        next();
      }
    );
  };
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user?.roles?.length) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const ok = allowedRoles.some((r) => req.user.roles.includes(r));
    if (!ok) return res.status(403).json({ error: "Insufficient role" });
    next();
  };
}
