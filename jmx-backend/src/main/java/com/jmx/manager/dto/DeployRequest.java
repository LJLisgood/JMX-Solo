package com.jmx.manager.dto;

import lombok.Data;

import java.util.List;

@Data
public class DeployRequest {
    private List<Long> nodeIds;
    private String jmxKey;
    private String scriptName;
}

