package com.jmx.manager.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DeployResult {
    private Long nodeId;
    private String ip;

    @JsonProperty("remote_jmx_path")
    private String remoteJmxPath;

    private String command;
}
