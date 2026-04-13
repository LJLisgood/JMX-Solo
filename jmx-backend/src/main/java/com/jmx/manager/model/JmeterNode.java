package com.jmx.manager.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "jmeter_nodes")
public class JmeterNode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String ip;

    @Column(nullable = false)
    private Integer port = 9922;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(name = "jmx_dir")
    private String jmxDir = "/root/jmx";

    @Column(name = "csv_dir")
    private String csvDir = "/root/csv";

    @Column(name = "jtl_dir")
    private String jtlDir = "/root/jtl";

    @Column(name = "report_dir")
    private String reportDir = "/root/report";

    @Column(name = "script_path")
    private String scriptPath = "/root/run_jmeter.sh";

    @Column(nullable = false)
    private String status = "UNKNOWN";

    @Column(nullable = false)
    private Boolean active = true;
}
