package tech.lemnova.continuum.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tech.lemnova.continuum.application.exception.NotFoundException;
import java.util.Set;
import tech.lemnova.continuum.application.service.EntityIndexService;
import tech.lemnova.continuum.controller.dto.vault.VaultFileDTO;
import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.security.CustomUserDetails;
import tech.lemnova.continuum.infra.vault.VaultStorageService;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/vault")
public class VaultController {

    private final EntityIndexService entityIndexService;
    private final VaultStorageService vaultStorageService;
    private final PlanConfiguration planConfig;
    private final UserRepository userRepo;

    public VaultController(EntityIndexService entityIndexService, VaultStorageService vaultStorageService,
                           PlanConfiguration planConfig, UserRepository userRepo) {
        this.entityIndexService = entityIndexService;
        this.vaultStorageService = vaultStorageService;
        this.planConfig = planConfig;
        this.userRepo = userRepo;
    }

    @GetMapping(value = "/entity-index", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getEntityIndex(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userRepo.findById(userDetails.getUserId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        return ResponseEntity.ok(entityIndexService.loadIndex(user.getVaultId()));
    }

    @GetMapping(value = "/files", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<VaultFileDTO>> listFiles(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userRepo.findById(userDetails.getUserId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        List<VaultStorageService.VaultFileDescriptor> files = vaultStorageService.listFiles(user.getVaultId());
        return ResponseEntity.ok(files.stream().map(this::toDto).toList());
    }

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
            "audio/mpeg",
            "audio/mp4",
            "audio/x-m4a",
            "audio/m4a"
    );

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg",
            "jpeg",
            "png",
            "webp",
            "pdf",
            "mp3",
            "m4a"
    );

    @PostMapping(value = "/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VaultFileDTO> uploadFile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam("file") MultipartFile file) {
        User user = userRepo.findById(userDetails.getUserId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String contentType = file.getContentType();
        String originalFilename = file.getOriginalFilename();
        if (!isAllowedUpload(originalFilename, contentType)) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).build();
        }

        long fileSizeBytes = file.getSize();
        long currentSizeBytes = getCurrentVaultSizeBytes(user.getVaultId());
        int maxVaultSizeMB = planConfig.getLimits(user.getPlan()).maxVaultSizeMB();

        if (maxVaultSizeMB != -1 && currentSizeBytes + fileSizeBytes > maxVaultSizeMB * 1024L * 1024L) {
            return ResponseEntity.badRequest().body(null);
        }

        String fileId = buildFileId(originalFilename);
        try {
            vaultStorageService.saveFile(user.getVaultId(), fileId, file.getBytes(), contentType != null ? contentType : "application/octet-stream");
            VaultStorageService.VaultFileDescriptor saved = new VaultStorageService.VaultFileDescriptor(
                    fileId,
                    originalFilename != null ? originalFilename : fileId,
                    contentType != null ? contentType : "application/octet-stream",
                    fileSizeBytes,
                    java.time.Instant.now());
            return ResponseEntity.ok(toDto(saved));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private boolean isAllowedUpload(String filename, String contentType) {
        if (contentType != null && ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            return true;
        }
        if (filename == null) {
            return false;
        }
        String lowercase = filename.toLowerCase();
        int dotIndex = lowercase.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == lowercase.length() - 1) {
            return false;
        }
        String extension = lowercase.substring(dotIndex + 1);
        return ALLOWED_EXTENSIONS.contains(extension);
    }

    private VaultFileDTO toDto(VaultStorageService.VaultFileDescriptor source) {
        return new VaultFileDTO(
                source.fileId(),
                source.fileName(),
                source.contentType(),
                source.size(),
                source.createdAt()
        );
    }

    private long getCurrentVaultSizeBytes(String vaultId) {
        return vaultStorageService.listFiles(vaultId).stream()
                .mapToLong(VaultStorageService.VaultFileDescriptor::size)
                .sum();
    }

    private String buildFileId(String originalFilename) {
        String safeFilename = originalFilename == null ? "file" : URLEncoder.encode(originalFilename, StandardCharsets.UTF_8);
        return UUID.randomUUID() + "_" + safeFilename;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────
