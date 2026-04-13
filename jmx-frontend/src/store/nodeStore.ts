import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../config';

export interface JmeterNode {
  id: number;
  ip: string;
  port: number;
  username: string;
  jmxDir: string;
  csvDir: string;
  jtlDir: string;
  reportDir: string;
  scriptPath: string;
  status: string;
  active: boolean;
}

export interface DeployResult {
  nodeId: number;
  ip: string;
  remote_jmx_path: string;
  command: string;
}

interface NodeState {
  nodes: JmeterNode[];
  selectedNodeIds: number[];
  deployResults: DeployResult[];
  csvDeployResults: DeployResult[];
  isLoading: boolean;
  error: string | null;
  fetchNodes: () => Promise<void>;
  testConnection: (id: number) => Promise<void>;
  toggleNodeSelection: (id: number) => void;
  selectAllNodes: () => void;
  deselectAllNodes: () => void;
  availableScripts: string[];
  fetchScripts: (nodeId: number) => Promise<void>;
  deployJob: (jmxKey: string, scriptName: string) => Promise<DeployResult[]>;
  updateCsvDirForSelected: (csvDir: string) => Promise<void>;
  deployCsv: (csvKeys: string[], csvDirOverride?: string) => Promise<DeployResult[]>;
}

export const useNodeStore = create<NodeState>((set, get) => ({
  nodes: [],
  selectedNodeIds: [],
  availableScripts: [],
  deployResults: [],
  csvDeployResults: [],
  isLoading: false,
  error: null,
  
  fetchNodes: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/nodes`);
      set({ nodes: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch nodes', isLoading: false });
    }
  },

  testConnection: async (id: number) => {
    const currentNodes = get().nodes;
    set({
      nodes: currentNodes.map(node => 
        node.id === id ? { ...node, status: 'TESTING' } : node
      )
    });

    try {
      await axios.post(`${API_URL}/nodes/${id}/test-connection`);
    } catch (err) {
      console.error("Connection failed", err);
    } finally {
      await get().fetchNodes();
    }
  },

  toggleNodeSelection: (id: number) => {
    const { selectedNodeIds } = get();
    if (selectedNodeIds.includes(id)) {
      set({ selectedNodeIds: selectedNodeIds.filter(nodeId => nodeId !== id) });
    } else {
      set({ selectedNodeIds: [...selectedNodeIds, id] });
    }
  },

  selectAllNodes: () => {
    const onlineNodeIds = get().nodes.filter(n => n.status === 'ONLINE').map(n => n.id);
    set({ selectedNodeIds: onlineNodeIds });
  },

  deselectAllNodes: () => {
    set({ selectedNodeIds: [] });
  },

  fetchScripts: async (nodeId: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/nodes/${nodeId}/scripts`);
      set({ availableScripts: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch scripts', isLoading: false });
    }
  },

  deployJob: async (jmxKey: string, scriptName: string) => {
    const { selectedNodeIds } = get();
    if (selectedNodeIds.length === 0) {
      set({ error: "Please select at least one node to execute" });
      return [];
    }
    set({ isLoading: true, error: null, deployResults: [] });
    try {
      const response = await axios.post(`${API_URL}/nodes/deploy`, {
        nodeIds: selectedNodeIds,
        jmxKey: jmxKey,
        scriptName: scriptName
      });
      set({ isLoading: false, deployResults: response.data });
      return response.data;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to execute job', isLoading: false });
      return [];
    }
  }
  ,

  updateCsvDirForSelected: async (csvDir: string) => {
    const { selectedNodeIds } = get();
    if (selectedNodeIds.length === 0) return;
    set({ isLoading: true, error: null });
    try {
      await Promise.all(
        selectedNodeIds.map((id) => axios.put(`${API_URL}/nodes/${id}/csv-dir`, { csvDir }))
      );
      await get().fetchNodes();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to update CSV dir', isLoading: false });
    }
  },

  deployCsv: async (csvKeys: string[], csvDirOverride?: string) => {
    const { selectedNodeIds } = get();
    if (selectedNodeIds.length === 0) {
      set({ error: "Please select at least one node to deploy CSV" });
      return [];
    }
    if (!csvKeys || csvKeys.length === 0) {
      set({ error: "Please select at least one CSV file" });
      return [];
    }

    set({ isLoading: true, error: null, csvDeployResults: [] });
    try {
      if (csvDirOverride && csvDirOverride.trim()) {
        await Promise.all(
          selectedNodeIds.map((id) => axios.put(`${API_URL}/nodes/${id}/csv-dir`, { csvDir: csvDirOverride.trim() }))
        );
      }

      const response = await axios.post(`${API_URL}/nodes/deploy-csv`, {
        nodeIds: selectedNodeIds,
        csvKeys
      });
      set({ isLoading: false, csvDeployResults: response.data });
      await get().fetchNodes();
      return response.data;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to deploy CSV', isLoading: false });
      return [];
    }
  }
}));
