package com.jmx.manager.controller;

import com.jmx.manager.dto.*;
import com.jmx.manager.service.CloudflareR2Service;
import com.jmx.manager.service.JmxService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/scripts")
@CrossOrigin(origins = "*") // Allow frontend access
public class ScriptController {

    private final JmxService jmxService;
    private final CloudflareR2Service r2Service;
    private final String UPLOAD_DIR = "uploads/jmx/";

    @Autowired
    public ScriptController(JmxService jmxService, CloudflareR2Service r2Service) {
        this.jmxService = jmxService;
        this.r2Service = r2Service;
        try {
            Files.createDirectories(Paths.get(System.getProperty("user.dir") + "/" + UPLOAD_DIR));
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadScript(@RequestParam("file") MultipartFile file, 
                                          @RequestParam(value = "path", defaultValue = "jmx/") String path) {
        if (file.isEmpty() || file.getOriginalFilename() == null || !file.getOriginalFilename().endsWith(".jmx")) {
            return ResponseEntity.badRequest().body(Map.of("detail", "Only .jmx files are allowed"));
        }

        String fileId = UUID.randomUUID().toString() + "-" + file.getOriginalFilename();
        File destFile = new File(System.getProperty("user.dir") + "/" + UPLOAD_DIR + fileId);

        try {
            file.transferTo(destFile);

            // Upload to Cloudflare R2
            try {
                String fullPath = path;
                if (!fullPath.endsWith("/")) fullPath += "/";
                fullPath += fileId;
                
                String r2Url = r2Service.uploadFile(destFile, fullPath);
                System.out.println("Uploaded to R2 successfully: " + r2Url);
            } catch (Exception e) {
                System.out.println("Skipped R2 upload: " + e.getMessage());
            }

            List<ThreadGroupInfo> tgs = jmxService.getThreadGroups(destFile);
            List<EnvVarInfo> envs = jmxService.getUserDefinedVariables(destFile);
            List<CsvDataSetInfo> csvs = jmxService.getCsvDataSets(destFile);

            JmxFileResponse response = new JmxFileResponse();
            response.setFileId(fileId);
            response.setFilename(file.getOriginalFilename());
            response.setThreadGroups(tgs);
            response.setEnvironmentVariables(envs);
            response.setCsvDataSets(csvs);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("detail", "Error uploading file"));
        }
    }

    @GetMapping("/{fileId}/thread-groups")
    public ResponseEntity<?> getThreadGroups(@PathVariable String fileId) {
        File file = new File(System.getProperty("user.dir") + "/" + UPLOAD_DIR + fileId);
        if (!file.exists()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("detail", "Script not found"));
        }

        try {
            List<ThreadGroupInfo> tgs = jmxService.getThreadGroups(file);
            return ResponseEntity.ok(tgs);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("detail", "Error parsing file"));
        }
    }

    @PutMapping("/{fileId}/thread-groups")
    public ResponseEntity<?> updateThreadGroups(
            @PathVariable String fileId,
            @RequestBody ThreadGroupsUpdateRequest request,
            @RequestParam(value = "key", required = false) String key
    ) {
        File file = new File(System.getProperty("user.dir") + "/" + UPLOAD_DIR + fileId);
        if (!file.exists()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("detail", "Script not found"));
        }

        boolean success = jmxService.updateThreadGroups(file, request.getUpdates());
        if (success) {
            if (key != null && !key.isBlank()) {
                r2Service.uploadFile(file, key);
            }
            return ResponseEntity.ok(Map.of("message", "Thread groups updated successfully"));
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("detail", "Failed to update thread groups"));
        }
    }

    @PutMapping("/{fileId}/environment")
    public ResponseEntity<?> updateEnvironment(
            @PathVariable String fileId,
            @RequestBody EnvironmentVariablesRequest request,
            @RequestParam(value = "key", required = false) String key
    ) {
        File file = new File(System.getProperty("user.dir") + "/" + UPLOAD_DIR + fileId);
        if (!file.exists()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("detail", "Script not found"));
        }

        boolean success = jmxService.updateUserDefinedVariables(file, request.getVariables());
        if (success) {
            if (key != null && !key.isBlank()) {
                r2Service.uploadFile(file, key);
            }
            return ResponseEntity.ok(Map.of("message", "Environment variables applied successfully"));
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("detail", "Failed to update environment variables"));
        }
    }

    @PutMapping("/{fileId}/csv-data-sets")
    public ResponseEntity<?> updateCsvDataSets(@PathVariable String fileId, @RequestParam(required = false) String key, @RequestBody CsvDataSetsUpdateRequest request) {
        File file = new File(System.getProperty("user.dir") + "/" + UPLOAD_DIR + fileId);
        if (!file.exists()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("detail", "Script not found"));
        }

        boolean success = jmxService.updateCsvDataSets(file, request.getUpdates());
        if (success) {
            // Upload to R2 to sync changes
            if (key != null && !key.isEmpty()) {
                try {
                    r2Service.uploadFile(file, key);
                } catch (Exception e) {
                    System.out.println("Failed to sync CSV Data Sets to R2: " + e.getMessage());
                }
            }
            return ResponseEntity.ok(Map.of("message", "CSV Data Sets updated successfully"));
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("detail", "Failed to update CSV Data Sets"));
        }
    }

    @GetMapping("/{fileId}/download")
    public ResponseEntity<Resource> downloadScript(@PathVariable String fileId) {
        File file = new File(System.getProperty("user.dir") + "/" + UPLOAD_DIR + fileId);
        if (!file.exists()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getName() + "\"")
                .header(HttpHeaders.CONTENT_TYPE, "application/xml")
                .body(resource);
    }
}
