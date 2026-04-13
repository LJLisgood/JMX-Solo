package com.jmx.manager.dto;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class ThreadGroupInfo {
    private String name;
    private String type;
    private boolean enabled;
    
    @JsonProperty("num_threads")
    private String numThreads;
    
    @JsonProperty("ramp_time")
    private String rampTime;
    
    private String loops;

    // Stepping Thread Group Specific
    @JsonProperty("initial_delay")
    private String initialDelay;
    
    @JsonProperty("start_users_count")
    private String startUsersCount;
    
    @JsonProperty("start_users_count_burst")
    private String startUsersCountBurst;
    
    @JsonProperty("start_users_period")
    private String startUsersPeriod;
    
    @JsonProperty("stop_users_count")
    private String stopUsersCount;
    
    @JsonProperty("stop_users_period")
    private String stopUsersPeriod;
    
    @JsonProperty("flight_time")
    private String flightTime;
}
