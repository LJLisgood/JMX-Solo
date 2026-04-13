package com.jmx.manager.controller;

import com.jmx.manager.dto.DeployCsvRequest;
import com.jmx.manager.dto.DeployRequest;
import com.jmx.manager.dto.DeployResult;
import com.jmx.manager.dto.ExecuteRequest;
import com.jmx.manager.model.JmeterNode;
import com.jmx.manager.service.JmeterNodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/nodes")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class JmeterNodeController {

    private final JmeterNodeService jmeterNodeService;

    @GetMapping
    public ResponseEntity<List<JmeterNode>> getAllNodes() {
        return ResponseEntity.ok(jmeterNodeService.getAllNodes());
    }

    @PostMapping
    public ResponseEntity<JmeterNode> addNode(@RequestBody JmeterNode node) {
        return ResponseEntity.ok(jmeterNodeService.addOrUpdateNode(node));
    }

    @PutMapping("/{id}")
    public ResponseEntity<JmeterNode> updateNode(@PathVariable Long id, @RequestBody JmeterNode node) {
        node.setId(id);
        return ResponseEntity.ok(jmeterNodeService.addOrUpdateNode(node));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNode(@PathVariable Long id) {
        jmeterNodeService.deleteNode(id);
        return ResponseEntity.ok(Map.of("message", "Node deleted successfully"));
    }

    @PostMapping("/{id}/test-connection")
    public ResponseEntity<?> testConnection(@PathVariable Long id) {
        boolean success = jmeterNodeService.testSshConnection(id);
        if (success) {
            return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "SSH connection successful"));
        } else {
            return ResponseEntity.status(500).body(Map.of("status", "FAILED", "message", "SSH connection failed"));
        }
    }

    @PostMapping("/execute")
    public ResponseEntity<?> executeJmx(@RequestBody ExecuteRequest request) {
        if (request.getNodeIds() == null || request.getNodeIds().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("detail", "No nodes selected"));
        }
        if (request.getJmxKey() == null || request.getJmxKey().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("detail", "No JMX file key provided"));
        }
        if (request.getScriptName() == null || request.getScriptName().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("detail", "No script name provided"));
        }

        for (Long nodeId : request.getNodeIds()) {
            jmeterNodeService.executeJmxOnNode(nodeId, request.getJmxKey(), request.getScriptName());
        }

        return ResponseEntity.ok(Map.of("message", "Execution started on selected nodes"));
    }

    @PostMapping("/deploy")
    public ResponseEntity<?> deployJmx(@RequestBody DeployRequest request) {
        if (request.getNodeIds() == null || request.getNodeIds().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("detail", "No nodes selected"));
        }
        if (request.getJmxKey() == null || request.getJmxKey().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("detail", "No JMX file key provided"));
        }
        if (request.getScriptName() == null || request.getScriptName().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("detail", "No script name provided"));
        }

        List<DeployResult> results = jmeterNodeService.deployJmxToNodes(
                request.getNodeIds(),
                request.getJmxKey(),
                request.getScriptName()
        );
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{id}/scripts")
    public ResponseEntity<?> getAvailableScripts(@PathVariable Long id) {
        try {
            List<String> scripts = jmeterNodeService.getAvailableScripts(id);
            return ResponseEntity.ok(scripts);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("detail", "Failed to get scripts: " + e.getMessage()));
        }
    }

    @PostMapping("/deploy-csv")
    public ResponseEntity<?> deployCsv(@RequestBody DeployCsvRequest request) {
        if (request.getNodeIds() == null || request.getNodeIds().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("detail", "No nodes selected"));
        }
        if (request.getCsvKeys() == null || request.getCsvKeys().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("detail", "No CSV files provided"));
        }

        List<DeployResult> results = jmeterNodeService.deployCsvToNodes(request.getNodeIds(), request.getCsvKeys());
        return ResponseEntity.ok(results);
    }

    @PutMapping("/{id}/csv-dir")
    public ResponseEntity<?> updateCsvDir(@PathVariable Long id, @RequestBody Map<String, String> request) {
        String csvDir = request.get("csvDir");
        if (csvDir == null || csvDir.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("detail", "csvDir is required"));
        }
        JmeterNode updated = jmeterNodeService.updateCsvDir(id, csvDir);
        return ResponseEntity.ok(updated);
    }
}
