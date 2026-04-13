package com.jmx.manager.service;

import com.jcraft.jsch.*;
import com.jmx.manager.model.JmeterNode;
import com.jmx.manager.repository.JmeterNodeRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.*;
import java.util.ArrayList;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class JmeterNodeService {

    private final JmeterNodeRepository jmeterNodeRepository;
    private final CloudflareR2Service r2Service;

    @PostConstruct
    public void initDefaultNodes() {
        if (jmeterNodeRepository.count() == 0) {
            // Replace with your actual default JMeter node IPs
            String[] ips = {
                "192.168.1.101", "192.168.1.102"
            };

            for (String ip : ips) {
                JmeterNode node = new JmeterNode();
                node.setIp(ip);
                node.setPort(22); // Replace with your SSH port
                node.setUsername("root"); // Replace with your SSH username
                node.setPassword("your_ssh_password"); // Replace with your SSH password
                node.setJmxDir("/root/jmx");
                node.setCsvDir("/root/csv");
                node.setJtlDir("/root/jtl");
                node.setReportDir("/root/report"); 
                node.setScriptPath("/root/run_jmeter.sh");
                node.setStatus("OFFLINE");
                node.setActive(true);
                jmeterNodeRepository.save(node);
            }
        }
    }

    public List<com.jmx.manager.dto.DeployResult> deployCsvToNodes(List<Long> nodeIds, List<String> csvKeys) {
        List<com.jmx.manager.dto.DeployResult> results = new ArrayList<>();
        String localDir = System.getProperty("user.dir") + "/uploads/temp";
        try { Files.createDirectories(Paths.get(localDir)); } catch(Exception e) {}

        // Download all CSVs to local first
        List<File> localCsvFiles = new ArrayList<>();
        for (String key : csvKeys) {
            try {
                localCsvFiles.add(r2Service.downloadToLocal(key, localDir));
            } catch (Exception e) {
                log.error("Failed to download CSV from R2: " + key, e);
            }
        }

        for (Long nodeId : nodeIds) {
            JmeterNode node = jmeterNodeRepository.findById(nodeId).orElse(null);
            if (node == null) continue;

            JSch jsch = new JSch();
            Session session = null;
            ChannelSftp sftpChannel = null;
            try {
                session = jsch.getSession(node.getUsername(), node.getIp(), node.getPort());
                session.setPassword(node.getPassword());
                session.setConfig("StrictHostKeyChecking", "no");
                session.connect(10000);
                
                sftpChannel = (ChannelSftp) session.openChannel("sftp");
                sftpChannel.connect();
                
                String remoteCsvDir = node.getCsvDir();
                try { sftpChannel.mkdir(remoteCsvDir); } catch(Exception ignored) {}
                
                for (File csvFile : localCsvFiles) {
                    // Extract original filename without UUID if possible, or just use the name
                    String filename = stripUuidPrefix(csvFile.getName());
                    String remoteCsvPath = remoteCsvDir + "/" + filename;
                    sftpChannel.put(new FileInputStream(csvFile), remoteCsvPath);
                }

                results.add(new com.jmx.manager.dto.DeployResult(nodeId, node.getIp(), "", "Success"));
            } catch (Exception e) {
                log.error("Failed to deploy CSV to node " + node.getIp(), e);
                results.add(new com.jmx.manager.dto.DeployResult(nodeId, node.getIp(), "", "Failed: " + e.getMessage()));
            } finally {
                if (sftpChannel != null && sftpChannel.isConnected()) sftpChannel.disconnect();
                if (session != null && session.isConnected()) session.disconnect();
            }
        }
        
        for (File f : localCsvFiles) {
            f.delete();
        }
        
        return results;
    }

    public List<JmeterNode> getAllNodes() {
        return jmeterNodeRepository.findAll();
    }

    public JmeterNode addOrUpdateNode(JmeterNode node) {
        return jmeterNodeRepository.save(node);
    }

    public void deleteNode(Long id) {
        jmeterNodeRepository.deleteById(id);
    }

    public JmeterNode updateCsvDir(Long id, String csvDir) {
        JmeterNode node = jmeterNodeRepository.findById(id).orElseThrow(() -> new RuntimeException("Node not found"));
        node.setCsvDir(csvDir);
        return jmeterNodeRepository.save(node);
    }

    public boolean testSshConnection(Long id) {
        JmeterNode node = jmeterNodeRepository.findById(id).orElse(null);
        if (node == null) {
            return false;
        }

        JSch jsch = new JSch();
        Session session = null;
        try {
            session = jsch.getSession(node.getUsername(), node.getIp(), node.getPort());
            session.setPassword(node.getPassword());
            session.setConfig("StrictHostKeyChecking", "no");
            session.connect(5000); // 5s timeout
            
            // If connected successfully, update status
            node.setStatus("ONLINE");
            jmeterNodeRepository.save(node);
            return true;
        } catch (Exception e) {
            log.error("SSH connection failed for node {}: {}", node.getIp(), e.getMessage());
            node.setStatus("OFFLINE");
            jmeterNodeRepository.save(node);
            return false;
        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    public List<String> getAvailableScripts(Long nodeId) throws Exception {
        JmeterNode node = jmeterNodeRepository.findById(nodeId).orElseThrow(() -> new RuntimeException("Node not found"));
        List<String> scripts = new ArrayList<>();
        
        JSch jsch = new JSch();
        Session session = null;
        ChannelExec execChannel = null;
        
        try {
            session = jsch.getSession(node.getUsername(), node.getIp(), node.getPort());
            session.setPassword(node.getPassword());
            session.setConfig("StrictHostKeyChecking", "no");
            session.connect(5000);
            
            execChannel = (ChannelExec) session.openChannel("exec");
            // Assuming scripts are in /root/ directory based on your path configuration
            execChannel.setCommand("find /root -maxdepth 1 -name '*.sh'");
            
            InputStream in = execChannel.getInputStream();
            execChannel.connect();
            
            BufferedReader reader = new BufferedReader(new InputStreamReader(in));
            String line;
            while ((line = reader.readLine()) != null) {
                // Extract just the script name
                scripts.add(new File(line).getName());
            }
            return scripts;
        } finally {
            if (execChannel != null && execChannel.isConnected()) execChannel.disconnect();
            if (session != null && session.isConnected()) session.disconnect();
        }
    }

    public List<com.jmx.manager.dto.DeployResult> deployJmxToNodes(List<Long> nodeIds, String jmxKey, String scriptName) {
        List<com.jmx.manager.dto.DeployResult> results = new ArrayList<>();
        for (Long nodeId : nodeIds) {
            results.add(deployJmxToNode(nodeId, jmxKey, scriptName));
        }
        return results;
    }

    public com.jmx.manager.dto.DeployResult deployJmxToNode(Long nodeId, String jmxKey, String scriptName) {
        JmeterNode node = jmeterNodeRepository.findById(nodeId).orElseThrow(() -> new RuntimeException("Node not found"));

        JSch jsch = new JSch();
        Session session = null;
        ChannelSftp sftpChannel = null;
        File localJmxFile = null;

        try {
            String localDir = System.getProperty("user.dir") + "/uploads/temp";
            Files.createDirectories(Paths.get(localDir));
            localJmxFile = r2Service.downloadToLocal(jmxKey, localDir);

            String originalName = stripUuidPrefix(localJmxFile.getName());
            String remoteJmxPath = node.getJmxDir() + "/" + originalName;

            session = jsch.getSession(node.getUsername(), node.getIp(), node.getPort());
            session.setPassword(node.getPassword());
            session.setConfig("StrictHostKeyChecking", "no");
            session.connect(10000);

            sftpChannel = (ChannelSftp) session.openChannel("sftp");
            sftpChannel.connect();

            try {
                sftpChannel.mkdir(node.getJmxDir());
            } catch (Exception ignored) {
            }

            sftpChannel.put(new FileInputStream(localJmxFile), remoteJmxPath);

            String remoteScriptPath = scriptName.startsWith("/") ? scriptName : "/root/" + scriptName;
            String command = remoteScriptPath + " " + remoteJmxPath;
            return new com.jmx.manager.dto.DeployResult(node.getId(), node.getIp(), remoteJmxPath, command);
        } catch (Exception e) {
            log.error("[{}] Deploy failed: {}", node.getIp(), e.getMessage(), e);
            return new com.jmx.manager.dto.DeployResult(node.getId(), node.getIp(), "", "DEPLOY_FAILED: " + e.getMessage());
        } finally {
            if (sftpChannel != null && sftpChannel.isConnected()) sftpChannel.disconnect();
            if (session != null && session.isConnected()) session.disconnect();
            if (localJmxFile != null && localJmxFile.exists()) localJmxFile.delete();
        }
    }

    private static final Pattern UUID_PREFIX = Pattern.compile("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-");

    private String stripUuidPrefix(String filename) {
        return UUID_PREFIX.matcher(filename).replaceFirst("");
    }

    @Async
    public void executeJmxOnNode(Long nodeId, String jmxKey, String scriptName) {
        JmeterNode node = jmeterNodeRepository.findById(nodeId).orElse(null);
        if (node == null) return;

        JSch jsch = new JSch();
        Session session = null;
        ChannelSftp sftpChannel = null;
        ChannelExec execChannel = null;
        File localJmxFile = null;
        File localReportFile = null;

        try {
            log.info("[{}] Starting JMX execution job for key: {}", node.getIp(), jmxKey);
            
            // 1. Download JMX from R2
            String localDir = System.getProperty("user.dir") + "/uploads/temp";
            Files.createDirectories(Paths.get(localDir));
            localJmxFile = r2Service.downloadToLocal(jmxKey, localDir);
            String jmxFilename = localJmxFile.getName();
            
            // 2. Connect SSH
            session = jsch.getSession(node.getUsername(), node.getIp(), node.getPort());
            session.setPassword(node.getPassword());
            session.setConfig("StrictHostKeyChecking", "no");
            session.connect(10000);

            // 3. SFTP Put JMX to Node
            log.info("[{}] Uploading JMX file to node...", node.getIp());
            sftpChannel = (ChannelSftp) session.openChannel("sftp");
            sftpChannel.connect();
            
            String remoteJmxDir = node.getJmxDir();
            try { sftpChannel.mkdir(remoteJmxDir); } catch(Exception ignored) {}
            
            String remoteJmxPath = remoteJmxDir + "/" + jmxFilename;
            sftpChannel.put(new FileInputStream(localJmxFile), remoteJmxPath);
            log.info("[{}] JMX uploaded to {}", node.getIp(), remoteJmxPath);

            // 4. Exec shell script
            // 每次执行前，确保我们把最新的 run_jmeter_with_r2.sh 传到服务器，覆盖可能旧的版本
            if ("run_jmeter_with_r2.sh".equals(scriptName)) {
                String localScriptPath = System.getProperty("user.dir") + "/run_jmeter_with_r2.sh";
                File scriptFile = new File(localScriptPath);
                if (scriptFile.exists()) {
                    sftpChannel.put(new FileInputStream(scriptFile), "/root/run_jmeter_with_r2.sh");
                    sftpChannel.chmod(0755, "/root/run_jmeter_with_r2.sh");
                }
            }

            // Use the dynamically selected script
            String scriptPath = "/root/" + scriptName;
            // 确保加载完整的环境配置
            String command = "source /etc/profile 2>/dev/null; source ~/.bash_profile 2>/dev/null; bash " + scriptPath + " " + remoteJmxPath;
            
            log.info("[{}] Executing command: {}", node.getIp(), command);
            execChannel = (ChannelExec) session.openChannel("exec");
            execChannel.setCommand(command);
            
            InputStream in = execChannel.getInputStream();
            InputStream err = execChannel.getErrStream();
            execChannel.connect();

            BufferedReader reader = new BufferedReader(new InputStreamReader(in));
            BufferedReader errReader = new BufferedReader(new InputStreamReader(err));
            
            String line;
            String remoteReportArchive = null;
            
            while ((line = reader.readLine()) != null) {
                log.info("[{}] STDOUT: {}", node.getIp(), line);
                if (line.startsWith("REPORT_ARCHIVE=")) {
                    remoteReportArchive = line.split("=")[1];
                }
            }
            
            while ((line = errReader.readLine()) != null) {
                log.error("[{}] STDERR: {}", node.getIp(), line);
            }

            // 5. Download report via SFTP
            if (remoteReportArchive != null) {
                log.info("[{}] Downloading report archive from node: {}", node.getIp(), remoteReportArchive);
                String archiveName = new File(remoteReportArchive).getName();
                localReportFile = new File(localDir, archiveName);
                
                try (FileOutputStream fos = new FileOutputStream(localReportFile)) {
                    sftpChannel.get(remoteReportArchive, fos);
                }
                
                // 6. Upload report to R2
                String r2ReportKey = "jerry/report/" + archiveName;
                log.info("[{}] Uploading report to R2: {}", node.getIp(), r2ReportKey);
                r2Service.uploadFile(localReportFile, r2ReportKey);
                log.info("[{}] Job completed successfully!", node.getIp());
            } else {
                log.error("[{}] Failed to find REPORT_ARCHIVE in script output.", node.getIp());
            }

        } catch (Exception e) {
            log.error("[{}] Error executing JMX task: {}", node.getIp(), e.getMessage(), e);
        } finally {
            if (sftpChannel != null && sftpChannel.isConnected()) sftpChannel.disconnect();
            if (execChannel != null && execChannel.isConnected()) execChannel.disconnect();
            if (session != null && session.isConnected()) session.disconnect();
            
            // Clean up local temp files
            if (localJmxFile != null && localJmxFile.exists()) localJmxFile.delete();
            if (localReportFile != null && localReportFile.exists()) localReportFile.delete();
        }
    }
}
