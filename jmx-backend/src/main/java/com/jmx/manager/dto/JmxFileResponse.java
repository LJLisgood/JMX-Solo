package com.jmx.manager.dto;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@Data
public class JmxFileResponse {
    @JsonProperty("file_id")
    private String fileId;
    
    private String filename;
    
    @JsonProperty("thread_groups")
    private List<ThreadGroupInfo> threadGroups;
    
    @JsonProperty("environment_variables")
    private List<EnvVarInfo> environmentVariables;

    private List<CsvDataSetInfo> csvDataSets;

    @JsonProperty("csv_data_sets")
    public List<CsvDataSetInfo> getCsvDataSets() {
        return csvDataSets;
    }

    @JsonProperty("csv_data_sets")
    public void setCsvDataSets(List<CsvDataSetInfo> csvDataSets) {
        this.csvDataSets = csvDataSets;
    }
}
