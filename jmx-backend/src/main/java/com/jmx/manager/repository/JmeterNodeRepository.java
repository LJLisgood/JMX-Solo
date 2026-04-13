package com.jmx.manager.repository;

import com.jmx.manager.model.JmeterNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JmeterNodeRepository extends JpaRepository<JmeterNode, Long> {
    List<JmeterNode> findByActiveTrue();
}
