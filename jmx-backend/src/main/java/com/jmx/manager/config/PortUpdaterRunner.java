package com.jmx.manager.config;

import com.jmx.manager.model.JmeterNode;
import com.jmx.manager.repository.JmeterNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
@RequiredArgsConstructor
public class PortUpdaterRunner implements CommandLineRunner {

    private final JmeterNodeRepository repository;

    @Override
    public void run(String... args) throws Exception {
        List<JmeterNode> nodes = repository.findAll();
        for (JmeterNode node : nodes) {
            if (node.getPort() == 22) {
                node.setPort(9922);
                repository.save(node);
            }
        }
    }
}
