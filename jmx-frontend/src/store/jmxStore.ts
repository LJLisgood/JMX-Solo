import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../config';

export interface ThreadGroup {
  name: string;
  type: string;
  enabled: boolean;
  num_threads: string;
  ramp_time: string;
  loops: string;
  
  // Stepping Thread Group Specific Properties
  initial_delay?: string;
  start_users_count?: string;
  start_users_count_burst?: string;
  start_users_period?: string;
  stop_users_count?: string;
  stop_users_period?: string;
  flight_time?: string;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
}

export interface CsvDataSet {
  name: string;
  filename: string;
  variableNames?: string;
  delimiter?: string;
  fileEncoding?: string;
}

export interface StorageItem {
  key: string;
  name: string;
  isFolder: boolean;
  size: number;
}

interface JmxState {
  fileId: string | null;
  filename: string | null;
  fileKey: string | null;
  threadGroups: ThreadGroup[];
  environmentVariables: EnvironmentVariable[];
  csvDataSets: CsvDataSet[];
  isLoading: boolean;
  error: string | null;

  // Storage state
  storageItems: StorageItem[];
  currentPath: string;
  
  uploadJmx: (file: File) => Promise<void>;
  uploadJmxToPath: (file: File, path: string) => Promise<string | null>;
  updateThreadGroup: (name: string, field: string, value: string | boolean) => void;
  saveThreadGroups: () => Promise<void>;
  
  addEnvVar: (key: string, value: string) => void;
  updateEnvVar: (index: number, key: string, value: string) => void;
  removeEnvVar: (index: number) => void;
  saveEnvironmentVariables: () => Promise<void>;

  updateCsvDataSet: (name: string, filename: string) => void;
  saveCsvDataSets: () => Promise<void>;

  downloadJmx: () => void;

  // Storage Actions
  fetchStorageItems: (prefix?: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  deleteStorageItem: (key: string) => Promise<void>;
  loadFromCloud: (key: string) => Promise<void>;
  setCurrentPath: (path: string) => void;
  downloadFromCloud: (key: string) => void;
}

export const useJmxStore = create<JmxState>((set, get) => ({
  fileId: null,
  filename: null,
  fileKey: null,
  threadGroups: [],
  environmentVariables: [],
  csvDataSets: [],
  isLoading: false,
  error: null,
  storageItems: [],
  currentPath: 'jmx/',

  uploadJmx: async (file: File) => {
    const { currentPath, fetchStorageItems } = get();
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', currentPath);
      
      const response = await axios.post(`${API_URL}/scripts/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const key = `${currentPath}${response.data.file_id}`;
      
      set({ 
        fileId: response.data.file_id, 
        filename: response.data.filename,
        fileKey: key,
        threadGroups: response.data.thread_groups,
        environmentVariables: response.data.environment_variables || [],
        csvDataSets: response.data.csv_data_sets || [],
        isLoading: false 
      });

      // Refresh storage list
      await fetchStorageItems(currentPath);
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to upload file', isLoading: false });
    }
  },

  uploadJmxToPath: async (file: File, path: string) => {
    const { fetchStorageItems } = get();
    set({ isLoading: true, error: null });
    try {
      const normalizedPath = path.endsWith('/') ? path : `${path}/`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', normalizedPath);

      const response = await axios.post(`${API_URL}/scripts/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const key = `${normalizedPath}${response.data.file_id}`;
      await fetchStorageItems(normalizedPath);
      set({ isLoading: false });
      return key;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to upload file', isLoading: false });
      return null;
    }
  },

  updateThreadGroup: (name, field, value) => {
    set((state) => ({
      threadGroups: state.threadGroups.map((tg) => 
        tg.name === name ? { ...tg, [field]: value } : tg
      )
    }));
  },

  saveThreadGroups: async () => {
    const { fileId, fileKey, threadGroups } = get();
    if (!fileId) return;
    
    set({ isLoading: true, error: null });
    try {
      await axios.put(`${API_URL}/scripts/${fileId}/thread-groups`, {
        updates: threadGroups
      }, {
        params: { key: fileKey || '' }
      });
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to save thread groups', isLoading: false });
    }
  },
  
  addEnvVar: (key, value) => {
    set((state) => ({
      environmentVariables: [...state.environmentVariables, { key, value }]
    }));
  },
  
  updateEnvVar: (index, key, value) => {
    set((state) => {
      const newVars = [...state.environmentVariables];
      newVars[index] = { key, value };
      return { environmentVariables: newVars };
    });
  },
  
  removeEnvVar: (index) => {
    set((state) => ({
      environmentVariables: state.environmentVariables.filter((_, i) => i !== index)
    }));
  },
  
  saveEnvironmentVariables: async () => {
    const { fileId, fileKey, environmentVariables } = get();
    if (!fileId) return;
    
    set({ isLoading: true, error: null });
    try {
      const variablesObj = environmentVariables.reduce((acc, curr) => {
        if (curr.key.trim()) acc[curr.key.trim()] = curr.value;
        return acc;
      }, {} as Record<string, string>);
      
      await axios.put(`${API_URL}/scripts/${fileId}/environment`, {
        variables: variablesObj
      }, {
        params: { key: fileKey || '' }
      });
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to save environment variables', isLoading: false });
    }
  },

  updateCsvDataSet: (name, filename) => {
    set((state) => ({
      csvDataSets: state.csvDataSets.map((ds) => (ds.name === name ? { ...ds, filename } : ds))
    }));
  },

  saveCsvDataSets: async () => {
    const { fileId, fileKey, csvDataSets } = get();
    if (!fileId) return;
    set({ isLoading: true, error: null });
    try {
      await axios.put(`${API_URL}/scripts/${fileId}/csv-data-sets`, {
        updates: csvDataSets.map(ds => ({ name: ds.name, filename: ds.filename }))
      }, {
        params: { key: fileKey || '' }
      });
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to save CSV data sets', isLoading: false });
    }
  },

  downloadJmx: () => {
    const { fileId } = get();
    if (!fileId) return;
    window.open(`${API_URL}/scripts/${fileId}/download`, '_blank');
  },

  // Storage Actions Implementation
  setCurrentPath: (path: string) => {
    set({ currentPath: path });
    get().fetchStorageItems(path);
  },

  downloadFromCloud: (key: string) => {
    window.open(`${API_URL}/storage/download?key=${encodeURIComponent(key)}`, '_blank');
  },

  fetchStorageItems: async (prefix?: string) => {
    const p = prefix || get().currentPath;
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/storage/list`, {
        params: { prefix: p }
      });
      set({ storageItems: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to fetch storage items', isLoading: false });
    }
  },

  createFolder: async (name: string) => {
    const { currentPath, fetchStorageItems } = get();
    set({ isLoading: true, error: null });
    try {
      const folderPath = `${currentPath}${name}/`;
      await axios.post(`${API_URL}/storage/folder`, { path: folderPath });
      await fetchStorageItems(currentPath);
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to create folder', isLoading: false });
    }
  },

  deleteStorageItem: async (key: string) => {
    const { currentPath, fetchStorageItems } = get();
    set({ isLoading: true, error: null });
    try {
      await axios.delete(`${API_URL}/storage/delete`, { params: { key } });
      await fetchStorageItems(currentPath);
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to delete item', isLoading: false });
    }
  },

  loadFromCloud: async (key: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/storage/load-cloud`, { key });
      set({ 
        fileId: response.data.file_id, 
        filename: response.data.filename,
        fileKey: key,
        threadGroups: response.data.thread_groups,
        environmentVariables: response.data.environment_variables || [],
        csvDataSets: response.data.csv_data_sets || [],
        isLoading: false 
      });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to load file from cloud', isLoading: false });
    }
  }
}));
