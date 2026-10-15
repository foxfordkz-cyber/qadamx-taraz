from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings
from app.errors import APIError

bearer = HTTPBearer(auto_error=False)


class TokenVerifier:
    def __init__(self, settings: Settings):
        self.issuer = settings.jwt_issuer
        self.audience = settings.jwt_audience
        self.jwks = jwt.PyJWKClient(settings.jwks_url(), lifespan=300, timeout=5)

    def verify(self, token: str) -> UUID:
        try:
            header = jwt.get_unverified_header(token)
            # Never use token-supplied jku/x5u URLs or let the token choose our algorithm set.
            if header.get("alg") not in {"RS256", "ES256"} or not header.get("kid"):
                raise jwt.InvalidTokenError()
            signing_key = self.jwks.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"],
                issuer=self.issuer,
                audience=self.audience,
                options={"require": ["exp", "iat", "iss", "aud", "sub", "role"]},
            )
            if claims["role"] != "authenticated" or claims.get("is_anonymous", False):
                raise jwt.InvalidTokenError()
            subject = UUID(claims["sub"])
            if subject.int == 0:
                raise jwt.InvalidTokenError()
            return subject
        except jwt.PyJWKClientConnectionError as exc:
            raise APIError(503, "AUTH_UNAVAILABLE", "Authentication service unavailable") from exc
        except (jwt.PyJWTError, ValueError, TypeError, KeyError) as exc:
            raise APIError(401, "AUTH_REQUIRED", "Valid authentication required") from exc


def current_user(
    request: Request, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]
) -> UUID:
    if credentials is None:
        raise APIError(401, "AUTH_REQUIRED", "Authentication required")
    if request.app.state.verifier is None:
        raise APIError(503, "AUTH_UNAVAILABLE", "Authentication is not configured")
    return request.app.state.verifier.verify(credentials.credentials)
