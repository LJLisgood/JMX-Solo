package com.jmx.manager.dto;

import lombok.Data;
import java.util.Map;

@Data
public class EnvironmentVariablesRequest {
    private Map<String, String> variables;
}
