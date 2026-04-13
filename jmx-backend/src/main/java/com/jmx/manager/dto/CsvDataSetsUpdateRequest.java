package com.jmx.manager.dto;

import lombok.Data;
import java.util.List;

@Data
public class CsvDataSetsUpdateRequest {
    private List<CsvDataSetUpdate> updates;
}
