package com.jmx.manager.dto;

import lombok.Data;

@Data
public class CsvDataSetInfo {
    private String name;
    private String filename;
    private String variableNames;
    private String delimiter;
    private String fileEncoding;
}
