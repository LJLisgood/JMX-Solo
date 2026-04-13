import React, { useEffect, useState, useRef } from 'react';
import { Server, Activity, Terminal, RefreshCw, CheckCircle2, XCircle, PlayCircle, HardDrive, Cpu, AlertCircle, UploadCloud, X, Folder, ChevronRight } from 'lucide-react';
import { useNodeStore, JmeterNode } from '../store/nodeStore';
import { useJmxStore } from '../store/jmxStore';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../config';

type StorageItem = {
  key: string;
  name: string;
  isFolder: boolean;
};

export function ClusterManager() {
  const { nodes, isLoading, error, fetchNodes, testConnection, selectedNodeIds, toggleNodeSelection, selectAllNodes, deselectAllNodes, deployJob, fetchScripts, availableScripts, deployCsv, csvDeployResults } = useNodeStore();
  const { storageItems, fetchStorageItems, uploadJmxToPath, currentPath } = useJmxStore();
  
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [selectedJmxKey, setSelectedJmxKey] = useState<string>('');
  const [selectedScript, setSelectedScript] = useState<string>('');
  const [browsePath, setBrowsePath] = useState<string>('jmx/');
  const [csvBrowsePath, setCsvBrowsePath] = useState<string>('csv/');
  const [csvItems, setCsvItems] = useState<StorageItem[]>([]);
  const [selectedCsvKeys, setSelectedCsvKeys] = useState<string[]>([]);
  const [csvDirOverride, setCsvDirOverride] = useState<string>('');
  const [isCsvLoading, setIsCsvLoading] = useState(false);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [deployResults, setDeployResults] = useState<{ ip: string; command: string; remote_jmx_path: string; nodeId: number }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNodes();
    fetchStorageItems('jmx/');
  }, [fetchNodes, fetchStorageItems]);

  const handleDeployClick = async () => {
    if (selectedNodeIds.length === 0) {
      alert("请至少选择一个在线的压测节点！(Select at least one node)");
      return;
    }
    await fetchScripts(selectedNodeIds[0]);
    setBrowsePath(currentPath);
    await fetchStorageItems(currentPath);
    setCsvBrowsePath('csv/');
    await fetchCsvItems('csv/');
    setSelectedJmxKey('');
    setSelectedScript('');
    setDeployResults([]);
    setSelectedCsvKeys([]);
    const first = nodes.find(n => n.id === selectedNodeIds[0]);
    setCsvDirOverride(first?.csvDir || '/root/csv');
    setIsDeployModalOpen(true);
  };

  const handleGenerateCommand = async () => {
    if (!selectedJmxKey) {
      alert("请选择一个 JMX 脚本！(Select a JMX script)");
      return;
    }
    if (!selectedScript) {
      alert("请选择一个执行脚本！(Select an execution script)");
      return;
    }
    setIsGenerating(true);
    const results = await deployJob(selectedJmxKey, selectedScript);
    setDeployResults(results);
    setIsGenerating(false);
  };

  const handleNewFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const key = await uploadJmxToPath(file, browsePath);
      if (key) {
        setSelectedJmxKey(key);
      }
    }
  };

  const navigateUp = async () => {
    if (browsePath === 'jmx/') return;
    const parts = browsePath.split('/');
    parts.pop();
    parts.pop();
    const newPath = parts.join('/') + '/';
    setBrowsePath(newPath);
    await fetchStorageItems(newPath);
  };

  const enterFolder = async (key: string) => {
    setBrowsePath(key);
    await fetchStorageItems(key);
  };

  const fetchCsvItems = async (prefix: string) => {
    setIsCsvLoading(true);
    try {
      const response = await axios.get(`${API_URL}/storage/list`, { params: { prefix } });
      setCsvItems(response.data);
    } finally {
      setIsCsvLoading(false);
    }
  };

  const navigateCsvUp = async () => {
    if (csvBrowsePath === 'csv/') return;
    const parts = csvBrowsePath.split('/');
    parts.pop();
    parts.pop();
    const newPath = parts.join('/') + '/';
    setCsvBrowsePath(newPath);
    await fetchCsvItems(newPath);
  };

  const enterCsvFolder = async (key: string) => {
    setCsvBrowsePath(key);
    await fetchCsvItems(key);
  };

  const toggleCsvSelection = (key: string) => {
    setSelectedCsvKeys((prev) => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  const uploadCsvToR2 = async (file: File) => {
    setIsCsvUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('path', csvBrowsePath);
      const res = await axios.post(`${API_URL}/storage/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchCsvItems(csvBrowsePath);
      if (res.data?.key) {
        setSelectedCsvKeys((prev) => (prev.includes(res.data.key) ? prev : [...prev, res.data.key]));
      }
    } finally {
      setIsCsvUploading(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadCsvToR2(file);
    }
  };

  const handleDeployCsv = async () => {
    if (selectedCsvKeys.length === 0) {
      alert('请至少选择一个 CSV 文件');
      return;
    }
    await deployCsv(selectedCsvKeys, csvDirOverride);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return (
          <span className="flex items-center text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/30 text-xs font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            已在线 (ONLINE)
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="flex items-center text-red-400 bg-red-400/10 px-2 py-1 rounded-full border border-red-400/30 text-xs font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-400 mr-2 shadow-[0_0_8px_rgba(248,113,113,0.8)]"></span>
            已离线 (OFFLINE)
          </span>
        );
      case 'TESTING':
        return (
          <span className="flex items-center text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-full border border-cyan-400/30 text-xs font-bold tracking-wider">
            <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
            测试中 (TESTING...)
          </span>
        );
      default:
        return (
          <span className="flex items-center text-slate-400 bg-slate-400/10 px-2 py-1 rounded-full border border-slate-400/30 text-xs font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-slate-400 mr-2"></span>
            未知 (UNKNOWN)
          </span>
        );
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Actions */}
      <div className="flex items-center justify-between glass-panel p-6 rounded-xl border border-emerald-500/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-cyan-500"></div>
        <div className="pl-4">
          <h2 className="text-lg font-bold text-slate-200 uppercase tracking-widest flex items-center">
            <Cpu className="w-5 h-5 mr-3 text-emerald-400" />
            分布式压测集群 (CLUSTER FLEET)
          </h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 mr-2"></span>
            Active Nodes: {nodes.filter(n => n.status === 'ONLINE').length} / {nodes.length}
          </p>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={() => fetchNodes()}
            className="flex items-center text-slate-400 hover:text-cyan-400 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-md text-xs font-bold transition-all"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新集群状态
          </button>
          <button 
            onClick={handleDeployClick}
            className="flex items-center text-emerald-400 hover:text-emerald-300 px-4 py-2 bg-emerald-900/30 border border-emerald-500/50 hover:bg-emerald-800/50 hover:shadow-[0_0_15px_rgba(52,211,153,0.2)] rounded-md text-xs font-bold uppercase tracking-wider transition-all"
            disabled={selectedNodeIds.length === 0}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            一键下发执行 (DEPLOY & RUN)
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-lg flex items-center text-sm">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      {/* Selection Controls */}
      <div className="flex items-center space-x-3 px-2">
        <button onClick={selectAllNodes} className="text-xs text-cyan-400 hover:text-cyan-300 uppercase tracking-wider font-bold">
          [ 全选在线节点 Select All Online ]
        </button>
        <span className="text-slate-600">|</span>
        <button onClick={deselectAllNodes} className="text-xs text-slate-400 hover:text-slate-300 uppercase tracking-wider font-bold">
          [ 取消全选 Deselect All ]
        </button>
        <span className="text-xs text-emerald-400 ml-4 font-mono">
          Selected: {selectedNodeIds.length} node(s)
        </span>
      </div>

      {/* Node Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {nodes.map((node) => (
          <motion.div 
            key={node.id}
            variants={itemVariants}
            className={`glass-panel p-5 rounded-xl border relative overflow-hidden transition-all duration-300 cursor-pointer ${
              selectedNodeIds.includes(node.id)
                ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-cyan-900/10'
                : node.status === 'ONLINE' 
                ? 'border-emerald-500/20 hover:border-emerald-500/40' 
                : node.status === 'OFFLINE'
                ? 'border-red-500/20 opacity-80'
                : 'border-slate-700/50'
            }`}
            onClick={() => {
              if (node.status === 'ONLINE') {
                toggleNodeSelection(node.id);
              }
            }}
          >
            {/* Selection Checkbox indicator */}
            {node.status === 'ONLINE' && (
              <div className={`absolute top-4 right-4 w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                selectedNodeIds.includes(node.id) ? 'bg-cyan-500 border-cyan-400' : 'border-slate-600 bg-slate-800'
              }`}>
                {selectedNodeIds.includes(node.id) && <CheckCircle2 className="w-3 h-3 text-slate-900" />}
              </div>
            )}

            {/* Top Bar */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg mr-3 ${node.status === 'ONLINE' ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>
                  <Server className={`w-6 h-6 ${node.status === 'ONLINE' ? 'text-emerald-400' : 'text-slate-500'}`} />
                </div>
                <div>
                  <h3 className="font-mono text-lg font-bold text-slate-200 tracking-tight">{node.ip}</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Port: {node.port} • {node.username}</p>
                </div>
              </div>
            </div>

            {/* Status & Action */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/5">
              {getStatusBadge(node.status)}
              <button
                onClick={() => testConnection(node.id)}
                disabled={node.status === 'TESTING'}
                className="text-[10px] bg-slate-800 hover:bg-cyan-900/40 text-cyan-400 border border-cyan-800/50 hover:border-cyan-500/50 px-3 py-1.5 rounded transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {node.status === 'TESTING' ? 'CONNECTING...' : 'TEST SSH'}
              </button>
            </div>

            {/* Paths */}
            <div className="space-y-3">
              <PathItem icon={<HardDrive />} label="JMX 目录" value={node.jmxDir} />
              <PathItem icon={<Terminal />} label="CSV 目录" value={node.csvDir} />
              <PathItem icon={<Activity />} label="JTL 目录" value={node.jtlDir} />
              <PathItem icon={<CheckCircle2 />} label="报告目录" value={node.reportDir} />
              <div className="mt-4 pt-3 border-t border-slate-800/50">
                <PathItem icon={<PlayCircle />} label="执行脚本" value={node.scriptPath} highlight />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Deploy Modal */}
      <AnimatePresence>
        {isDeployModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setIsDeployModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-3xl bg-slate-900 border border-emerald-500/30 rounded-xl shadow-2xl p-6 overflow-hidden max-h-[85vh] overflow-y-auto custom-scrollbar"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-cyan-500"></div>
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-200 flex items-center">
                  <PlayCircle className="w-5 h-5 text-emerald-400 mr-2" />
                  选择并下发压测任务
                </h3>
                <button onClick={() => setIsDeployModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">已选压测机 (Selected Nodes)</label>
                  <div className="flex flex-wrap gap-2">
                    {nodes.filter(n => selectedNodeIds.includes(n.id)).map(n => (
                      <span key={n.id} className="text-xs bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded font-mono">
                        {n.ip}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">步骤 0: 选择目录 / 浏览目录 (Browse Folder)</label>
                  <div className="flex items-center text-[10px] font-mono text-slate-500 mb-3 bg-slate-900/50 p-2 rounded border border-slate-800">
                    {browsePath !== 'jmx/' && (
                      <button onClick={navigateUp} className="hover:text-cyan-400 mr-1 flex items-center">
                        .. <ChevronRight className="w-3 h-3 inline" />
                      </button>
                    )}
                    <span className="truncate text-cyan-500">{browsePath}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto custom-scrollbar pr-1">
                    {storageItems.filter(i => i.isFolder).map((folder) => (
                      <button
                        key={folder.key}
                        onClick={() => enterFolder(folder.key)}
                        className="flex items-center text-xs text-slate-300 hover:text-cyan-300 bg-slate-900/30 hover:bg-cyan-900/20 border border-white/5 hover:border-cyan-500/20 px-3 py-2 rounded-lg transition-colors"
                      >
                        <Folder className="w-4 h-4 mr-2 text-emerald-400/80" />
                        <span className="truncate max-w-[260px]">{folder.name}</span>
                      </button>
                    ))}
                    {storageItems.filter(i => i.isFolder).length === 0 && (
                      <div className="text-xs text-slate-600 border border-dashed border-slate-800 rounded-lg px-3 py-2">
                        当前目录无子文件夹
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">步骤 1: 从云端仓库选择 JMX (Select from R2)</label>
                  <select 
                    value={selectedJmxKey} 
                    onChange={(e) => setSelectedJmxKey(e.target.value)}
                    className="w-full tech-input mb-3"
                  >
                    <option value="">-- 请选择要执行的 JMX 脚本 --</option>
                    {storageItems
                      .filter(item => !item.isFolder && item.name.endsWith('.jmx'))
                      .filter(item => item.key.startsWith(browsePath))
                      .map(item => (
                      <option key={item.key} value={item.key}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {selectedJmxKey && storageItems.find(i => i.key === selectedJmxKey) && (
                    <div className="mt-3 p-3 bg-emerald-900/10 border border-emerald-500/20 rounded-lg">
                      <p className="text-xs text-emerald-400 flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        当前选中脚本: {storageItems.find(i => i.key === selectedJmxKey)?.name}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center">
                  <div className="flex-grow border-t border-slate-700"></div>
                  <span className="flex-shrink-0 mx-4 text-xs text-slate-500 uppercase tracking-widest">OR</span>
                  <div className="flex-grow border-t border-slate-700"></div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">步骤 2: 上传新的 JMX 脚本 (Upload New)</label>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 border border-dashed border-cyan-500/50 bg-cyan-900/10 hover:bg-cyan-900/30 rounded-lg text-cyan-400 text-sm flex items-center justify-center transition-colors"
                  >
                    <UploadCloud className="w-5 h-5 mr-2" />
                    上传并选中新脚本 (Upload & Select)
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".jmx"
                    onChange={handleNewFileUpload}
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">步骤 3: 选择执行脚本 (Execution Script)</label>
                  <select 
                    value={selectedScript} 
                    onChange={(e) => setSelectedScript(e.target.value)}
                    className="w-full tech-input"
                  >
                    <option value="">-- 请选择服务器上的执行脚本 --</option>
                    {availableScripts.map(script => (
                      <option key={script} value={script}>
                        {script}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-2 p-4 rounded-xl border border-white/5 bg-black/10">
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-3">CSV 文件 (Optional)</label>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">R2 目录</div>
                      <div className="flex items-center text-[10px] font-mono text-slate-500 mb-3 bg-slate-900/50 p-2 rounded border border-slate-800">
                        {csvBrowsePath !== 'csv/' && (
                          <button onClick={navigateCsvUp} className="hover:text-cyan-400 mr-1 flex items-center">
                            .. <ChevronRight className="w-3 h-3 inline" />
                          </button>
                        )}
                        <span className="truncate text-cyan-500">{csvBrowsePath}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                        {csvItems.filter(i => i.isFolder).map((folder) => (
                          <button
                            key={folder.key}
                            onClick={() => enterCsvFolder(folder.key)}
                            className="flex items-center text-xs text-slate-300 hover:text-cyan-300 bg-slate-900/30 hover:bg-cyan-900/20 border border-white/5 hover:border-cyan-500/20 px-3 py-2 rounded-lg transition-colors"
                          >
                            <Folder className="w-4 h-4 mr-2 text-emerald-400/80" />
                            <span className="truncate max-w-[220px]">{folder.name}</span>
                          </button>
                        ))}
                        {csvItems.filter(i => i.isFolder).length === 0 && (
                          <div className="text-xs text-slate-600 border border-dashed border-slate-800 rounded-lg px-3 py-2">
                            当前目录无子文件夹
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => csvFileInputRef.current?.click()}
                          disabled={isCsvUploading}
                          className="flex-1 py-2 border border-dashed border-cyan-500/40 bg-cyan-900/10 hover:bg-cyan-900/30 rounded-lg text-cyan-300 text-xs flex items-center justify-center transition-colors disabled:opacity-50"
                        >
                          <UploadCloud className="w-4 h-4 mr-2" />
                          {isCsvUploading ? '上传中...' : '上传 CSV'}
                        </button>
                        <input
                          type="file"
                          ref={csvFileInputRef}
                          className="hidden"
                          accept=".csv,.txt"
                          onChange={handleCsvUpload}
                        />
                        <button
                          onClick={() => fetchCsvItems(csvBrowsePath)}
                          disabled={isCsvLoading}
                          className="px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-slate-300 hover:text-cyan-300 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${isCsvLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">服务器 CSV 存储目录</div>
                      <input
                        value={csvDirOverride}
                        onChange={(e) => setCsvDirOverride(e.target.value)}
                        className="w-full tech-input mb-3"
                        placeholder="/root/csv"
                      />

                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">选择要下发的 CSV</div>
                      <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                        {csvItems.filter(i => !i.isFolder).map((file) => (
                          <button
                            type="button"
                            key={file.key}
                            onClick={() => toggleCsvSelection(file.key)}
                            className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                              selectedCsvKeys.includes(file.key)
                                ? 'border-cyan-500/40 bg-cyan-900/15'
                                : 'border-white/5 bg-black/10 hover:bg-black/20 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-mono text-slate-200 truncate">{file.name}</div>
                              {selectedCsvKeys.includes(file.key) && <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 truncate">{file.key}</div>
                          </button>
                        ))}
                        {csvItems.filter(i => !i.isFolder).length === 0 && (
                          <div className="text-xs text-slate-600 border border-dashed border-slate-800 rounded-lg px-3 py-2">
                            当前目录无 CSV 文件
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-slate-500 font-mono">
                          Selected CSV: {selectedCsvKeys.length}
                        </div>
                        <button
                          onClick={handleDeployCsv}
                          disabled={selectedCsvKeys.length === 0}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          下发 CSV 到节点
                        </button>
                      </div>

                      {csvDeployResults.length > 0 && (
                        <div className="mt-3 bg-black/10 border border-white/5 rounded-lg p-3">
                          <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">CSV 下发结果</div>
                          <div className="space-y-1">
                            {csvDeployResults.map((r) => (
                              <div key={r.nodeId} className="flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400">{r.ip}</span>
                                <span className={r.command === 'Success' ? 'text-emerald-400' : 'text-red-400'}>{r.command}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {deployResults.length > 0 && (
                  <div className="mt-2">
                    <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">生成的启动命令 (Copy & Run)</label>
                    <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                      {deployResults.map((r) => (
                        <div key={r.nodeId} className="bg-black/20 border border-white/5 rounded-lg p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs text-slate-400 font-mono truncate flex-1">
                              {r.ip}
                            </div>
                            <button
                              onClick={() => navigator.clipboard.writeText(r.command)}
                              className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-cyan-900/30 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/50"
                            >
                              复制命令
                            </button>
                          </div>
                          <div className="mt-2 text-xs font-mono text-slate-200 break-all">
                            {r.command}
                          </div>
                          {r.remote_jmx_path && (
                            <div className="mt-1 text-[10px] font-mono text-slate-500 break-all">
                              {r.remote_jmx_path}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button 
                  onClick={() => setIsDeployModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider rounded transition-colors"
                >
                  取消 (Cancel)
                </button>
                <button 
                  onClick={handleGenerateCommand}
                  disabled={!selectedJmxKey || !selectedScript || isGenerating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  {isGenerating ? '生成中...' : '生成启动命令'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PathItem({ icon, label, value, highlight = false }: { icon: React.ReactNode, label: string, value: string, highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center text-slate-500">
        <span className="w-3 h-3 mr-2 opacity-50">{icon}</span>
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <span className={`text-[10px] font-mono truncate max-w-[120px] ${highlight ? 'text-emerald-400 bg-emerald-400/10 px-1.5 rounded' : 'text-slate-400 group-hover:text-cyan-300'}`}>
        {value}
      </span>
    </div>
  );
}
