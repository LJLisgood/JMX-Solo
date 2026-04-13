package com.jmx.manager.service;

import com.jmx.manager.dto.*;
import org.dom4j.Document;
import org.dom4j.DocumentException;
import org.dom4j.Element;
import org.dom4j.Node;
import org.dom4j.io.OutputFormat;
import org.dom4j.io.SAXReader;
import org.dom4j.io.XMLWriter;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class JmxService {

    public List<ThreadGroupInfo> getThreadGroups(File file) throws DocumentException {
        SAXReader reader = new SAXReader();
        Document document = reader.read(file);
        List<ThreadGroupInfo> threadGroups = new ArrayList<>();

        // Find all ThreadGroup elements (contains 'ThreadGroup' in tag name)
        List<Node> nodes = document.selectNodes("//*[contains(local-name(), 'ThreadGroup')]");
        for (Node node : nodes) {
            Element tg = (Element) node;
            String name = tg.attributeValue("testname", "Unknown");
            boolean enabled = !"false".equals(tg.attributeValue("enabled"));

            ThreadGroupInfo info = new ThreadGroupInfo();
            info.setName(name);
            info.setType(tg.getName());
            info.setEnabled(enabled);

            info.setNumThreads(getText(tg, "*[@name='ThreadGroup.num_threads']", "*[@name='TargetLevel']", "1"));
            info.setRampTime(getText(tg, "*[@name='ThreadGroup.ramp_time']", "*[@name='rampUp']", "*[@name='RampUp']", "1"));
            info.setLoops(getText(tg, ".//*[@name='LoopController.loops']", "*[@name='Iterations']", "1"));

            info.setInitialDelay(getText(tg, "*[@name='Threads initial delay']"));
            info.setStartUsersCount(getText(tg, "*[@name='Start users count']"));
            info.setStartUsersCountBurst(getText(tg, "*[@name='Start users count burst']"));
            info.setStartUsersPeriod(getText(tg, "*[@name='Start users period']"));
            info.setStopUsersCount(getText(tg, "*[@name='Stop users count']"));
            info.setStopUsersPeriod(getText(tg, "*[@name='Stop users period']"));
            info.setFlightTime(getText(tg, "*[@name='flighttime']"));

            threadGroups.add(info);
        }
        return threadGroups;
    }

    public List<EnvVarInfo> getUserDefinedVariables(File file) throws DocumentException {
        SAXReader reader = new SAXReader();
        Document document = reader.read(file);
        List<EnvVarInfo> variables = new ArrayList<>();

        List<Node> argsNodes = document.selectNodes("//TestPlan/elementProp[@name='TestPlan.user_defined_variables']/collectionProp[@name='Arguments.arguments']/elementProp");
        for (Node node : argsNodes) {
            Element arg = (Element) node;
            Node nameNode = arg.selectSingleNode("*[@name='Argument.name']");
            Node valueNode = arg.selectSingleNode("*[@name='Argument.value']");

            if (nameNode != null) {
                EnvVarInfo info = new EnvVarInfo();
                info.setKey(nameNode.getText());
                info.setValue(valueNode != null ? valueNode.getText() : "");
                variables.add(info);
            }
        }
        return variables;
    }

    public boolean updateThreadGroups(File file, List<ThreadGroupUpdate> updates) {
        try {
            SAXReader reader = new SAXReader();
            Document document = reader.read(file);
            boolean modified = false;

            for (ThreadGroupUpdate update : updates) {
                String tgName = update.getName();
                List<Node> tgNodes = document.selectNodes("//*[contains(local-name(), 'ThreadGroup') and @testname='" + tgName + "']");

                for (Node node : tgNodes) {
                    Element tg = (Element) node;
                    
                    if (update.getEnabled() != null) {
                        tg.addAttribute("enabled", update.getEnabled() ? "true" : "false");
                        modified = true;
                    }
                    if (update.getNumThreads() != null) {
                        modified |= updateText(tg, update.getNumThreads(), "*[@name='ThreadGroup.num_threads']", "*[@name='TargetLevel']");
                    }
                    if (update.getRampTime() != null) {
                        modified |= updateText(tg, update.getRampTime(), "*[@name='ThreadGroup.ramp_time']", "*[@name='rampUp']", "*[@name='RampUp']");
                    }
                    if (update.getLoops() != null) {
                        modified |= updateText(tg, update.getLoops(), ".//*[@name='LoopController.loops']", "*[@name='Iterations']");
                    }

                    // Stepping thread group properties
                    if (update.getInitialDelay() != null) modified |= updateText(tg, update.getInitialDelay(), "*[@name='Threads initial delay']");
                    if (update.getStartUsersCount() != null) modified |= updateText(tg, update.getStartUsersCount(), "*[@name='Start users count']");
                    if (update.getStartUsersCountBurst() != null) modified |= updateText(tg, update.getStartUsersCountBurst(), "*[@name='Start users count burst']");
                    if (update.getStartUsersPeriod() != null) modified |= updateText(tg, update.getStartUsersPeriod(), "*[@name='Start users period']");
                    if (update.getStopUsersCount() != null) modified |= updateText(tg, update.getStopUsersCount(), "*[@name='Stop users count']");
                    if (update.getStopUsersPeriod() != null) modified |= updateText(tg, update.getStopUsersPeriod(), "*[@name='Stop users period']");
                    if (update.getFlightTime() != null) modified |= updateText(tg, update.getFlightTime(), "*[@name='flighttime']");
                }
            }

            if (modified) {
                saveDocument(document, file);
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean updateUserDefinedVariables(File file, Map<String, String> envVars) {
        try {
            SAXReader reader = new SAXReader();
            Document document = reader.read(file);
            boolean modified = false;

            Node testPlanArgsNode = document.selectSingleNode("//TestPlan/elementProp[@name='TestPlan.user_defined_variables']/collectionProp[@name='Arguments.arguments']");
            
            if (testPlanArgsNode != null) {
                Element argsNode = (Element) testPlanArgsNode;
                for (Map.Entry<String, String> entry : envVars.entrySet()) {
                    String key = entry.getKey();
                    String value = entry.getValue();

                    Node existingArg = argsNode.selectSingleNode("elementProp[@name='" + key + "']");
                    if (existingArg != null) {
                        Node valNode = existingArg.selectSingleNode("*[@name='Argument.value']");
                        if (valNode != null) {
                            valNode.setText(value);
                            modified = true;
                        }
                    } else {
                        // Create new
                        Element newArg = argsNode.addElement("elementProp");
                        newArg.addAttribute("name", key);
                        newArg.addAttribute("elementType", "Argument");

                        Element nameProp = newArg.addElement("stringProp");
                        nameProp.addAttribute("name", "Argument.name");
                        nameProp.setText(key);

                        Element valProp = newArg.addElement("stringProp");
                        valProp.addAttribute("name", "Argument.value");
                        valProp.setText(value);

                        Element metaProp = newArg.addElement("stringProp");
                        metaProp.addAttribute("name", "Argument.metadata");
                        metaProp.setText("=");
                        
                        modified = true;
                    }
                }
            }

            if (modified) {
                saveDocument(document, file);
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public List<CsvDataSetInfo> getCsvDataSets(File file) throws DocumentException {
        SAXReader reader = new SAXReader();
        Document document = reader.read(file);
        List<CsvDataSetInfo> csvDataSets = new ArrayList<>();

        List<Node> nodes = document.selectNodes("//CSVDataSet");
        for (Node node : nodes) {
            Element csv = (Element) node;
            CsvDataSetInfo info = new CsvDataSetInfo();
            info.setName(csv.attributeValue("testname", "CSV Data Set Config"));
            info.setFilename(getText(csv, "*[@name='filename']"));
            info.setVariableNames(getText(csv, "*[@name='variableNames']"));
            info.setDelimiter(getText(csv, "*[@name='delimiter']"));
            info.setFileEncoding(getText(csv, "*[@name='fileEncoding']"));
            csvDataSets.add(info);
        }
        return csvDataSets;
    }

    public boolean updateCsvDataSets(File file, List<CsvDataSetUpdate> updates) {
        try {
            SAXReader reader = new SAXReader();
            Document document = reader.read(file);
            boolean modified = false;

            for (CsvDataSetUpdate update : updates) {
                String name = update.getName();
                List<Node> nodes = document.selectNodes("//CSVDataSet[@testname='" + name + "']");

                for (Node node : nodes) {
                    Element csv = (Element) node;
                    if (update.getFilename() != null) {
                        modified |= updateText(csv, update.getFilename(), "*[@name='filename']");
                    }
                }
            }

            if (modified) {
                saveDocument(document, file);
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private String getText(Element element, String... xpaths) {
        for (int i = 0; i < xpaths.length; i++) {
            String xpath = xpaths[i];
            if (i == xpaths.length - 1 && !xpath.startsWith("*") && !xpath.startsWith(".")) {
                // If it's the last element and not an xpath, it's the default value
                return xpath;
            }
            Node node = element.selectSingleNode(xpath);
            if (node != null) {
                return node.getText();
            }
        }
        return null;
    }

    private boolean updateText(Element element, String newValue, String... xpaths) {
        for (String xpath : xpaths) {
            Node node = element.selectSingleNode(xpath);
            if (node != null) {
                node.setText(newValue);
                return true;
            }
        }
        return false;
    }

    private void saveDocument(Document document, File file) throws Exception {
        OutputFormat format = OutputFormat.createPrettyPrint();
        format.setEncoding("UTF-8");
        XMLWriter writer = new XMLWriter(new OutputStreamWriter(new FileOutputStream(file), "UTF-8"), format);
        writer.write(document);
        writer.close();
    }
}
