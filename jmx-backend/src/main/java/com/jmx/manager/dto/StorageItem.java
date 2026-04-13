package com.jmx.manager.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StorageItem {
    private String key;
    private String name;
    
    @JsonProperty("isFolder")
    private boolean isFolder;
    
    private long size;
}
