package com.jmx.manager.dto;

import lombok.Data;
import java.util.List;

@Data
public class DeployCsvRequest {
    private List<Long> nodeIds;
    private List<String> csvKeys;
}
