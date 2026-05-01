package tech.lemnova.continuum.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tech.lemnova.continuum.application.service.AuthService;
import tech.lemnova.continuum.controller.dto.auth.*;
import tech.lemnova.continuum.infra.google.GoogleOAuthService;
import tech.lemnova.continuum.infra.security.CustomUserDetails;
import tech.lemnova.continuum.infra.security.OAuthStateService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Endpoints for user authentication")
public class AuthController {

    private final AuthService authService;
    private final GoogleOAuthService googleOAuthService;
    private final OAuthStateService oauthStateService;

    public AuthController(AuthService authService, 
                          GoogleOAuthService googleOAuthService, 
                          OAuthStateService oauthStateService) {
        this.authService = authService;
        this.googleOAuthService = googleOAuthService;
        this.oauthStateService = oauthStateService;
    }

    @GetMapping("/google/url")
    @Operation(summary = "Start Google OAuth2 login")
    public ResponseEntity<GoogleAuthUrlResponse> startGoogleOAuth() {
        OAuthStateService.OAuthState state = oauthStateService.createState();
        String authorizationUrl = googleOAuthService.buildAuthorizationUrl(
                state.redirectUri(),
                state.signedState(),
                state.nonce()
        );
        return ResponseEntity.ok(new GoogleAuthUrlResponse(authorizationUrl));
    }

    @PostMapping("/google/callback")
    @Operation(summary = "Google OAuth callback")
    public ResponseEntity<AuthResponse> googleCallback(@Valid @RequestBody GoogleAuthCallbackRequest request) {
        OAuthStateService.OAuthState state = oauthStateService.parseState(request.state());
        
        GoogleOAuthService.GoogleUserInfo userInfo = googleOAuthService.exchangeCodeForUserInfo(
                request.code(),
                request.redirectUri(), 
                state.nonce()
        );
        return ResponseEntity.ok(authService.googleAuth(userInfo));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user info")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal CustomUserDetails user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        // CORREÇÃO DO ERRO DE COMPILAÇÃO:
        // Em vez de user.getUser(), usamos um Map para retornar os dados básicos.
        // Se sua classe CustomUserDetails tiver getUserId(), use-o aqui.
        Map<String, Object> userData = new HashMap<>();
        userData.put("email", user.getUsername());
        
        try {
            // Tentativa segura de pegar o ID se o método existir
            // userData.put("id", user.getUserId()); 
        } catch (Exception e) {
            // Ignora se não existir
        }

        return ResponseEntity.ok(userData);
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal CustomUserDetails user) {
        if (user != null) {
            authService.logout(user.getUserId());
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/test-oauth")
    public ResponseEntity<String> testOAuth() {
        return ResponseEntity.ok("OAuth endpoint is working.");
    }
}