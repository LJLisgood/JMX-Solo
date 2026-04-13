package com.jmx.manager.dto;

import lombok.Data;
import java.util.List;

@Data
public class ExecuteRequest {
    private List<Long> nodeIds;
    private String jmxKey; // The R2 key of the JMX file
    private String scriptName; // The .sh script selected to run
}
