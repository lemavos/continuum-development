package tech.lemnova.continuum.infra.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tech.lemnova.continuum.application.exception.BadRequestException;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.UUID;

@Service
public class OAuthStateService {

    private static final long STATE_EXPIRATION_MS = 5 * 60 * 1000L; // 5 minutos
    private static final String STATE_TYPE = "oauth_state";
    private static final String CALLBACK_PATH = "/auth/google/callback";

    private final Key stateKey;
    private final String frontendCallbackUrl;

    public OAuthStateService(@Value("${jwt.secret}") String jwtSecret,
                             @Value("${frontend.url:http://localhost:5173}") String frontendUrl) {
        this.stateKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        this.frontendCallbackUrl = frontendUrl.endsWith("/")
                ? frontendUrl.substring(0, frontendUrl.length() - 1) + CALLBACK_PATH
                : frontendUrl + CALLBACK_PATH;
    }

    public OAuthState createState() {
        String nonce = UUID.randomUUID().toString();
        String stateToken = Jwts.builder()
                .setSubject("google-oauth")
                .claim("type", STATE_TYPE)
                .claim("nonce", nonce)
                .claim("redirectUri", frontendCallbackUrl)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + STATE_EXPIRATION_MS))
                .signWith(stateKey, SignatureAlgorithm.HS256)
                .compact();
        return new OAuthState(stateToken, nonce, frontendCallbackUrl);
    }

    public OAuthState parseState(String stateToken) {
        try {
            Jws<Claims> jws = Jwts.parserBuilder()
                    .setSigningKey(stateKey)
                    .build()
                    .parseClaimsJws(stateToken);

            Claims claims = jws.getBody();
            if (!STATE_TYPE.equals(claims.get("type", String.class))) {
                throw new BadRequestException("Invalid OAuth state token");
            }

            String nonce = claims.get("nonce", String.class);
            String redirectUri = claims.get("redirectUri", String.class);
            if (nonce == null || nonce.isBlank() || redirectUri == null || redirectUri.isBlank()) {
                throw new BadRequestException("Invalid OAuth state payload");
            }

            return new OAuthState(stateToken, nonce, redirectUri);
        } catch (Exception ex) {
            throw new BadRequestException("Google OAuth state validation failed: " + ex.getMessage());
        }
    }

    public String getFrontendCallbackUrl() {
        return frontendCallbackUrl;
    }

    public static record OAuthState(String signedState, String nonce, String redirectUri) {}
}
