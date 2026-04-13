import React, { useRef, useEffect, useState } from 'react';
import { UploadCloud, File, Play, Settings, Save, Server, Activity, AlertCircle, Download, Code, Cpu, FolderPlus, Folder, ChevronRight, Trash2, Cloud } from 'lucide-react';
import { useJmxStore } from '../store/jmxStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ClusterManager } from './ClusterManager';

export function ScriptEditor() {
  const { 
    fileId, 
    filename, 
    threadGroups, 
    environmentVariables,
    csvDataSets,
    isLoading, 
    error,
    uploadJmx, 
    updateThreadGroup, 
    saveThreadGroups,
    addEnvVar,
    updateEnvVar,
    removeEnvVar,
    saveEnvironmentVariables,
    updateCsvDataSet,
    saveCsvDataSets,
    downloadJmx,
    storageItems,
    currentPath,
    fetchStorageItems,
    createFolder,
    deleteStorageItem,
    loadFromCloud,
    setCurrentPath,
    downloadFromCloud
  } = useJmxStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'cluster'>('editor');

  useEffect(() => {
    fetchStorageItems();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadJmx(file);
    }
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const navigateUp = () => {
    if (currentPath === 'jmx/') return;
    const parts = currentPath.split('/');
    // pop the empty string at the end, and the current folder
    parts.pop();
    parts.pop();
    const newPath = parts.join('/') + '/';
    setCurrentPath(newPath);
  };

  const handleSaveAll = async () => {
    await saveThreadGroups();
    await saveEnvironmentVariables();
    await saveCsvDataSets();
    // Use a custom toast or simply alert for now
    alert('保存成功 (Saved successfully to Cloudflare R2)');
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

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 relative overflow-hidden font-sans">
      {/* Background Tech Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      {/* Header */}
      <header className="glass-panel sticky top-0 z-20 border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between relative">
          <div className="flex items-center space-x-3 w-1/3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              <Activity className="text-cyan-400 w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
              JMX GEEK MANAGER
            </h1>
          </div>

          <div className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2 h-full">
            <button 
              onClick={() => setActiveTab('editor')}
              className={`h-full flex items-center text-sm font-bold tracking-widest uppercase transition-all duration-300 ${activeTab === 'editor' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              脚本编辑 (EDITOR)
            </button>
            <button 
              onClick={() => setActiveTab('cluster')}
              className={`h-full flex items-center text-sm font-bold tracking-widest uppercase transition-all duration-300 ${activeTab === 'cluster' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              集群调度 (CLUSTER)
            </button>
          </div>

          <div className="flex items-center space-x-4 w-1/3 justify-end">
            <button 
              className="group relative px-4 py-2 text-sm font-medium rounded-md overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={downloadJmx}
              disabled={!fileId || isLoading || activeTab === 'cluster'}
            >
              <div className="absolute inset-0 bg-emerald-600/20 border border-emerald-500/50 group-hover:bg-emerald-600/40 transition-all rounded-md"></div>
              <div className="relative flex items-center space-x-2 text-emerald-400">
                <Download className="w-4 h-4" />
                <span>下载 JMX (Download)</span>
              </div>
            </button>
            <button 
              className="group relative px-4 py-2 text-sm font-medium rounded-md overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSaveAll}
              disabled={!fileId || isLoading || activeTab === 'cluster'}
            >
              <div className="absolute inset-0 bg-cyan-600/20 border border-cyan-500/50 group-hover:bg-cyan-600/40 transition-all rounded-md"></div>
              <div className="relative flex items-center space-x-2 text-cyan-400">
                <Save className="w-4 h-4" />
                <span>同步至云端 (Sync to R2)</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-8 relative z-10">
        <AnimatePresence mode="wait">
        {activeTab === 'editor' ? (
          <motion.div 
            key="editor-tab"
            className="grid grid-cols-12 gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Column 1: Cloud Storage Manager */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <motion.div variants={itemVariants} className="glass-panel rounded-xl p-5 relative overflow-hidden h-[800px] flex flex-col">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                <Cloud className="w-4 h-4 mr-2 text-emerald-400" />
                云端资源库 (R2 REPOSITORY)
              </h2>
                <button 
                  onClick={() => setIsCreatingFolder(true)}
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              </div>

              {/* Breadcrumb */}
              <div className="flex items-center text-[10px] font-mono text-slate-500 mb-4 bg-slate-900/50 p-2 rounded border border-slate-800">
                {currentPath !== 'jmx/' && (
                  <button onClick={navigateUp} className="hover:text-cyan-400 mr-1 flex items-center">
                    .. <ChevronRight className="w-3 h-3 inline" />
                  </button>
                )}
                <span className="truncate text-cyan-500">{currentPath}</span>
              </div>

              {/* Create Folder Input */}
              {isCreatingFolder && (
                <div className="flex items-center space-x-2 mb-4">
                  <input 
                    type="text" 
                    placeholder="输入文件夹名称" 
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="tech-input flex-1 text-xs"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <button 
                    onClick={handleCreateFolder}
                    className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 px-2 py-1 rounded text-xs hover:bg-emerald-600/40"
                  >
                    确认
                  </button>
                  <button 
                    onClick={() => setIsCreatingFolder(false)}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* File List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {storageItems.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-xs text-slate-600 border border-dashed border-slate-800 rounded">
                    空目录 (Empty directory)
                  </div>
                )}
                {storageItems.map((item, idx) => (
                  <div 
                      key={idx} 
                      className="group relative flex items-center justify-between p-3 bg-slate-900/30 hover:bg-cyan-900/20 rounded-lg cursor-pointer transition-all duration-300 border border-white/5 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                      onClick={() => {
                      if (item.isFolder) {
                        setCurrentPath(item.key);
                      } else if (item.name.endsWith('.jmx')) {
                        loadFromCloud(item.key);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden pr-2">
                      {item.isFolder ? (
                        <Folder className="w-5 h-5 text-emerald-500/80 flex-shrink-0" />
                      ) : (
                        <File className="w-5 h-5 text-cyan-500/80 flex-shrink-0" />
                      )}
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium text-slate-200 truncate select-none group-hover:text-cyan-300 transition-colors">
                          {item.name.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/, '')}
                        </span>
                        {!item.isFolder && (
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                            {item.name.match(/^[0-9a-f]{8}/)?.[0] || 'uploaded'} • {(item.size / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 p-1 rounded-md border border-white/5 backdrop-blur-sm">
                        {!item.isFolder && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFromCloud(item.key);
                            }}
                            className="text-slate-400 hover:text-emerald-400 p-1.5 rounded hover:bg-emerald-400/10 transition-colors"
                            title="直接下载 (Direct Download)"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteStorageItem(item.key);
                          }}
                          className="text-slate-400 hover:text-red-400 p-1.5 rounded hover:bg-red-400/10 transition-colors"
                          title="删除 (Delete)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                  </div>
                ))}
              </div>

              {/* Upload Button */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-cyan-900/30 hover:bg-cyan-800/40 border border-cyan-800 text-cyan-400 text-xs py-2 rounded transition-colors flex items-center justify-center"
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  上传脚本至当前目录 (Upload JMX Here)
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".jmx"
                  onChange={handleFileChange}
                />
              </div>
            </motion.div>
          </div>

          {/* Middle Column: Current File & Env */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            
            {/* Upload/Current File Card */}
            <motion.div variants={itemVariants} className="glass-panel rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-indigo-500"></div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                <Code className="w-4 h-4 mr-2 text-cyan-400" />
                当前工作脚本 (ACTIVE SCRIPT)
              </h2>
              
              {!fileId ? (
                <div 
                  className="border border-dashed border-slate-700 bg-slate-900/50 rounded-lg p-8 text-center hover:bg-slate-800/80 hover:border-cyan-500/50 transition-all cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-cyan-400 mx-auto mb-3 transition-colors" />
                  <p className="text-sm text-slate-300 font-medium">请从左侧云端仓库选择文件</p>
                  <p className="text-xs text-slate-500 mt-1">或者点击/拖拽直接上传到此</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".jmx"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="bg-cyan-950/30 border border-cyan-900/50 rounded-lg p-4 flex items-start justify-between group">
                  <div className="flex items-center space-x-3">
                    <div className="bg-cyan-900/50 p-2 rounded-md border border-cyan-700">
                      <Code className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-cyan-100 truncate w-48">{filename}</p>
                      <p className="text-[10px] text-cyan-500 mt-1 uppercase tracking-wider flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-1.5 animate-pulse"></span>
                        已解析 & 已同步
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] uppercase tracking-wider text-slate-400 hover:text-cyan-400 transition-colors bg-slate-800 px-2 py-1 rounded"
                  >
                    重新上传
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".jmx"
                    onChange={handleFileChange}
                  />
                </div>
              )}
              
              {error && (
                <div className="mt-4 bg-red-950/50 border border-red-900/50 text-red-400 text-xs p-3 rounded flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}
            </motion.div>

            {/* Environment Variables */}
            <motion.div variants={itemVariants} className="glass-panel rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                  <Server className="w-4 h-4 mr-2 text-purple-400" />
                  全局环境变量 (UDV)
                </h2>
                <button 
                  onClick={() => addEnvVar('', '')}
                  className="text-[10px] uppercase tracking-wider text-purple-400 hover:bg-purple-500/10 border border-purple-500/30 px-2 py-1 rounded transition-all"
                >
                  + 新增变量
                </button>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                <AnimatePresence>
                  {environmentVariables.map((env, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center space-x-2 group"
                    >
                      <input 
                        type="text" 
                        placeholder="Key" 
                        value={env.key}
                        onChange={(e) => updateEnvVar(idx, e.target.value, env.value)}
                        className="tech-input flex-1 w-1/3 text-xs font-mono"
                      />
                      <span className="text-slate-600 font-mono">=</span>
                      <input 
                        type="text" 
                        placeholder="Value" 
                        value={env.value}
                        onChange={(e) => updateEnvVar(idx, env.key, e.target.value)}
                        className="tech-input flex-1 w-1/2 text-xs font-mono"
                      />
                      <button 
                        onClick={() => removeEnvVar(idx)}
                        className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {environmentVariables.length === 0 && (
                  <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500">暂无全局变量</p>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-panel rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                  <File className="w-4 h-4 mr-2 text-emerald-400" />
                  CSV 数据文件 (CSV DATA SET)
                </h2>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                <AnimatePresence>
                  {csvDataSets.map((ds) => (
                    <motion.div
                      key={ds.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="bg-black/10 border border-white/5 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-mono text-slate-200 truncate max-w-[240px]">{ds.name}</div>
                        <div className="text-[10px] font-mono text-slate-500 truncate max-w-[220px]">{ds.variableNames || ''}</div>
                      </div>
                      <input
                        type="text"
                        value={ds.filename || ''}
                        onChange={(e) => updateCsvDataSet(ds.name, e.target.value)}
                        className="tech-input w-full mt-2 text-xs font-mono"
                        placeholder="/root/csv/xxx.csv"
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {csvDataSets.length === 0 && (
                  <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500">未检测到 CSV Data Set Config</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Thread Groups */}
          <div className="col-span-12 lg:col-span-6">
            <motion.div variants={itemVariants} className="glass-panel rounded-xl p-6 relative overflow-hidden min-h-[800px]">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-indigo-500"></div>
              
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center">
                  <Cpu className="w-5 h-5 mr-3 text-cyan-400" />
                  线程组参数配置 (THREAD GROUPS)
                </h2>
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/50"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/50"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/50"></span>
                  </div>
                  <span className="text-[10px] text-cyan-500 font-mono bg-cyan-950/50 px-2 py-1 rounded border border-cyan-900">
                    活跃线程组: {threadGroups.filter(t => t.enabled).length} / {threadGroups.length}
                  </span>
                </div>
              </div>

              {threadGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-slate-600">
                  <div className="relative">
                    <Settings className="w-16 h-16 mb-6 opacity-20 animate-[spin_10s_linear_infinite]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
                    </div>
                  </div>
                  <p className="text-sm tracking-widest uppercase">等待解析 JMX 文件</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {threadGroups.map((tg, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`relative rounded-lg p-5 border transition-all duration-300 ${tg.enabled ? 'bg-slate-900/40 border-cyan-900/50 shadow-[0_0_15px_rgba(6,182,212,0.05)]' : 'bg-slate-900/20 border-slate-800/50 opacity-60 grayscale-[50%]'}`}
                    >
                      {/* Top Bar */}
                      <div className="flex items-center justify-between mb-5 w-full">
                        <div className="flex items-center space-x-3 flex-1 overflow-hidden">
                          <h3 className="font-bold text-slate-200 tracking-wide flex items-center truncate text-lg">
                            <span className="text-cyan-500 mr-2">/</span>
                            {tg.name}
                          </h3>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 flex-shrink-0">
                            {tg.type.split('.').pop()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={tg.enabled}
                              onChange={(e) => updateThreadGroup(tg.name, 'enabled', e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"></div>
                            <span className="ml-3 text-xs font-bold uppercase tracking-wider text-slate-400 peer-checked:text-cyan-400 whitespace-nowrap">
                              {tg.enabled ? '已启用 (ONLINE)' : '已停用 (OFFLINE)'}
                            </span>
                          </label>
                        </div>
                      </div>
                      
                      {/* Configuration Grid */}
                      {tg.type.includes('SteppingThreadGroup') ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-6 bg-black/20 p-5 rounded-lg border border-white/5">
                          <ConfigField label="Target Threads" value={tg.num_threads} onChange={(v) => updateThreadGroup(tg.name, 'num_threads', v)} />
                          <ConfigField label="Initial Delay (s)" value={tg.initial_delay} onChange={(v) => updateThreadGroup(tg.name, 'initial_delay', v)} />
                          <ConfigField label="First Burst Start" value={tg.start_users_count} onChange={(v) => updateThreadGroup(tg.name, 'start_users_count', v)} />
                          <ConfigField label="Next Add (Burst)" value={tg.start_users_count_burst} onChange={(v) => updateThreadGroup(tg.name, 'start_users_count_burst', v)} />
                          <ConfigField label="Threads Every (s)" value={tg.start_users_period} onChange={(v) => updateThreadGroup(tg.name, 'start_users_period', v)} />
                          <ConfigField label="Ramp-Up Time (s)" value={tg.ramp_time} onChange={(v) => updateThreadGroup(tg.name, 'ramp_time', v)} />
                          <ConfigField label="Hold Load For (s)" value={tg.flight_time} onChange={(v) => updateThreadGroup(tg.name, 'flight_time', v)} />
                          <ConfigField label="Stop Burst" value={tg.stop_users_count} onChange={(v) => updateThreadGroup(tg.name, 'stop_users_count', v)} />
                          <ConfigField label="Stop Every (s)" value={tg.stop_users_period} onChange={(v) => updateThreadGroup(tg.name, 'stop_users_period', v)} />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6 bg-black/20 p-5 rounded-lg border border-white/5">
                          <ConfigField label="Threads" value={tg.num_threads} onChange={(v) => updateThreadGroup(tg.name, 'num_threads', v)} />
                          <ConfigField label="Ramp-up (s)" value={tg.ramp_time} onChange={(v) => updateThreadGroup(tg.name, 'ramp_time', v)} />
                          <ConfigField label="Loops (-1 = infinite)" value={tg.loops} onChange={(v) => updateThreadGroup(tg.name, 'loops', v)} />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
          </motion.div>
        ) : (
          <motion.div 
            key="cluster-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ClusterManager />
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Global Custom Scrollbar for inner components */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.5); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(6, 182, 212, 0.8); }
      `}} />
    </div>
  );
}

function ConfigField({ label, value, onChange }: { label: string, value: any, onChange: (v: string) => void }) {
  return (
    <div className="group">
      <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5 group-focus-within:text-cyan-400 transition-colors">
        {label}
      </label>
      <input 
        type="text" 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900/80 border-b border-slate-700 text-slate-200 px-2 py-1 text-sm font-mono focus:outline-none focus:border-cyan-500 focus:bg-cyan-950/20 transition-all"
      />
    </div>
  );
}
