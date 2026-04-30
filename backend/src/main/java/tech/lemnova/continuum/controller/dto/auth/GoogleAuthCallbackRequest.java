package tech.lemnova.continuum.controller.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record GoogleAuthCallbackRequest(
        @NotBlank(message = "code is required") String code,
        @NotBlank(message = "state is required") String state
) {
}
