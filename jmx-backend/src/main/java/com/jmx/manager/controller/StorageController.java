package com.jmx.manager.controller;

import com.jmx.manager.dto.JmxFileResponse;
import com.jmx.manager.dto.StorageItem;
import com.jmx.manager.service.CloudflareR2Service;
import com.jmx.manager.service.JmxService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/storage")
@CrossOrigin(origins = "*")
public class StorageController {

    private final CloudflareR2Service r2Service;
    private final JmxService jmxService;
    private final String UPLOAD_DIR = "uploads/jmx/";

    @Autowired
    public StorageController(CloudflareR2Service r2Service, JmxService jmxService) {
        this.r2Service = r2Service;
        this.jmxService = jmxService;
    }

    @GetMapping("/list")
    public ResponseEntity<List<StorageItem>> listFiles(@RequestParam(defaultValue = "jmx/") String prefix) {
        return ResponseEntity.ok(r2Service.listObjects(prefix));
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file, 
                                        @RequestParam(value = "path", defaultValue = "") String path) {
        if (file.isEmpty() || file.getOriginalFilename() == null) {
            return ResponseEntity.badRequest().body(Map.of("detail", "File is empty"));
        }
        
        try {
            Files.createDirectories(Paths.get(System.getProperty("user.dir") + "/" + UPLOAD_DIR));
            String fileId = UUID.randomUUID().toString() + "-" + file.getOriginalFilename();
            File destFile = new File(System.getProperty("user.dir") + "/" + UPLOAD_DIR + fileId);
            file.transferTo(destFile);

            String fullPath = path;
            if (!fullPath.isEmpty() && !fullPath.endsWith("/")) fullPath += "/";
            fullPath += fileId;
            
            String r2Url = r2Service.uploadFile(destFile, fullPath);
            return ResponseEntity.ok(Map.of("message", "Uploaded successfully", "key", fullPath, "url", r2Url));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("detail", "Failed to upload file: " + e.getMessage()));
        }
    }

    @PostMapping("/folder")
    public ResponseEntity<?> createFolder(@RequestBody Map<String, String> request) {
        String path = request.get("path");
        if (path == null || path.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("detail", "Path is required"));
        }
        r2Service.createFolder(path);
        return ResponseEntity.ok(Map.of("message", "Folder created successfully"));
    }

    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteObject(@RequestParam String key) {
        r2Service.deleteObject(key);
        return ResponseEntity.ok(Map.of("message", "Deleted successfully"));
    }

    @PostMapping("/load-cloud")
    public ResponseEntity<?> loadFromCloud(@RequestBody Map<String, String> request) {
        String key = request.get("key");
        if (key == null || key.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("detail", "Key is required"));
        }
        
        try {
            Files.createDirectories(Paths.get(System.getProperty("user.dir") + "/" + UPLOAD_DIR));
            File localFile = r2Service.downloadToLocal(key, System.getProperty("user.dir") + "/" + UPLOAD_DIR);
            
            JmxFileResponse response = new JmxFileResponse();
            response.setFileId(localFile.getName());
            response.setFilename(localFile.getName());
            response.setThreadGroups(jmxService.getThreadGroups(localFile));
            response.setEnvironmentVariables(jmxService.getUserDefinedVariables(localFile));
            response.setCsvDataSets(jmxService.getCsvDataSets(localFile));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("detail", "Failed to load from cloud: " + e.getMessage()));
        }
    }

    @GetMapping("/download")
    public ResponseEntity<org.springframework.core.io.Resource> downloadFromCloud(@RequestParam String key) {
        try {
            Files.createDirectories(Paths.get(System.getProperty("user.dir") + "/" + UPLOAD_DIR));
            File localFile = r2Service.downloadToLocal(key, System.getProperty("user.dir") + "/" + UPLOAD_DIR);
            if (!localFile.exists()) {
                return ResponseEntity.notFound().build();
            }
            org.springframework.core.io.Resource resource = new org.springframework.core.io.FileSystemResource(localFile);
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + localFile.getName() + "\"")
                    .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "application/xml")
                    .body(resource);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}
