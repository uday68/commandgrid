import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import Draggable from "react-draggable";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { 
  FileText, AlertCircle, Sparkles, ScrollText, 
  X, Search, Upload, Send, Archive, History, 
  MessageSquare, ChevronLeft, ChevronRight, 
  FolderPlus, Folder, Download, Share2, MoreVertical 
} from "lucide-react";

// Create a portal root for modals if it doesn't exist
const createModalRoot = () => {
  const modalRoot = document.createElement('div');
  modalRoot.id = 'file-viewer-modal-root';
  modalRoot.style.position = 'fixed';
  modalRoot.style.top = '0';
  modalRoot.style.left = '0';
  modalRoot.style.width = '100vw';
  modalRoot.style.height = '100vh';
  modalRoot.style.pointerEvents = 'none';
  modalRoot.style.zIndex = '1000';
  document.body.appendChild(modalRoot);
  return modalRoot;
};

if (!document.getElementById('file-viewer-modal-root')) {
  createModalRoot();
}

const FileViewer = ({ theme = "light", font = "font-sans", onClose }) => {
  const { t } = useTranslation();

  // States
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolder, setCurrentFolder] = useState("All Files");
  const [sortOption, setSortOption] = useState("name");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("content");
  const [summary, setSummary] = useState("");
  const [enhancedContent, setEnhancedContent] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [archiveOption, setArchiveOption] = useState("new");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showFileActions, setShowFileActions] = useState(false);

  // Themes
  const themes = {
    light: {
      bg: "bg-gray-50",
      card: "bg-white",
      text: "text-gray-800",
      header: "bg-white",
      border: "border-gray-200",
      button: "bg-blue-600 hover:bg-blue-700 text-white",
      buttonSecondary: "bg-gray-100 hover:bg-gray-200 text-gray-800",
      highlight: "bg-blue-50",
    },
    dark: {
      bg: "bg-gray-900",
      card: "bg-gray-800",
      text: "text-gray-100",
      header: "bg-gray-900",
      border: "border-gray-700",
      button: "bg-blue-500 hover:bg-blue-600 text-white",
      buttonSecondary: "bg-gray-700 hover:bg-gray-600 text-gray-100",
      highlight: "bg-gray-700",
    },
    blue: {
      bg: "bg-blue-50",
      card: "bg-white",
      text: "text-blue-900",
      header: "bg-blue-100",
      border: "border-blue-200",
      button: "bg-blue-700 hover:bg-blue-800 text-white",
      buttonSecondary: "bg-blue-100 hover:bg-blue-200 text-blue-800",
      highlight: "bg-blue-100",
    },
  };
  const currentTheme = themes[theme] || themes.light;

  // Fetch files
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:5000/api/files", {
          params: { folder: currentFolder }
        });
        setFiles(response.data.files);
      } catch (err) {
        console.error("Error fetching files:", err);
        setError("Failed to load files");
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [currentFolder]);

  // Filter and sort files
  const filteredFiles = files
    .filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOption === "name") return a.name.localeCompare(b.name);
      if (sortOption === "date") return new Date(b.lastModified) - new Date(a.lastModified);
      if (sortOption === "size") return b.size - a.size;
      return 0;
    });

  // File handlers
  const handleFileOpen = (file) => {
    setSelectedFile(file);
    setIsModalOpen(true);
    setActiveTab("content");
    resetFileStates();
  };

  const resetFileStates = () => {
    setSummary("");
    setEnhancedContent("");
    setChatMessages([]);
    setHistory([]);
    setError("");
  };

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId) 
        : [...prev, fileId]
    );
  };

  // API functions
  const generateSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.post("http://localhost:5000/api/summarize", {
        text: selectedFile.content,
        max_length: 150,
      });
      setSummary(response.data.summary);
      setActiveTab("summary");
    } catch (err) {
      console.error(err);
      setError("Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const enhanceContent = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.post("http://localhost:5000/api/enhance", {
        text: selectedFile.content,
        mode: "professional",
      });
      setEnhancedContent(response.data.enhanced_text);
      setActiveTab("enhance");
    } catch (err) {
      console.error(err);
      setError("Content enhancement failed");
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!newChatMessage.trim()) return;
    
    const userMsg = { sender: "You", text: newChatMessage, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setNewChatMessage("");
    
    try {
      setLoading(true);
      const response = await axios.post("http://localhost:5000/api/chat", {
        fileId: selectedFile.id,
        message: newChatMessage,
        history: chatMessages
      });
      
      const aiMsg = { 
        sender: "AI Assistant", 
        text: response.data.reply,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setError("Failed to get AI response");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.post("http://localhost:5000/api/archive", {
        fileIds: selectedFiles.length ? selectedFiles : [selectedFile.id],
        archiveOption,
      });
      alert(response.data.message || "Files archived successfully");
      const filesResponse = await axios.get("http://localhost:5000/api/files");
      setFiles(filesResponse.data.files);
      setSelectedFiles([]);
    } catch (err) {
      console.error(err);
      setError("Archiving failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(
        `http://localhost:5000/api/history/${selectedFile.id}`
      );
      setHistory(response.data.history);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch history");
    } finally {
      setLoading(false);
    }
  };

  const handleSendFile = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.post("http://localhost:5000/api/send", {
        fileIds: selectedFiles.length ? selectedFiles : [selectedFile.id],
        recipient,
        message,
      });
      alert(response.data.message || "Files sent successfully");
      setRecipient("");
      setMessage("");
    } catch (err) {
      console.error(err);
      setError("Failed to send files");
    } finally {
      setLoading(false);
    }
  };

  const downloadFiles = async () => {
    try {
      setLoading(true);
      const fileIds = selectedFiles.length ? selectedFiles : [selectedFile.id];
      
      if (fileIds.length > 1) {
        const response = await axios.post("http://localhost:5000/api/download-multiple", {
          fileIds
        }, { responseType: 'blob' });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'files.zip');
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const file = files.find(f => f.id === fileIds[0]);
        const response = await axios.get(
          `http://localhost:5000/api/download/${fileIds[0]}`, 
          { responseType: 'blob' }
        );
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', file.name);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      console.error(err);
      setError("Download failed");
    } finally {
      setLoading(false);
    }
  };

  // Dropzone
  const onDrop = useCallback((acceptedFiles) => {
    const uploadFiles = async () => {
      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append("files", file);
      });
      
      try {
        setLoading(true);
        await axios.post("http://localhost:5000/api/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const response = await axios.get("http://localhost:5000/api/files");
        setFiles(response.data.files);
      } catch (err) {
        console.error("Upload error:", err);
        setError("File upload failed");
      } finally {
        setLoading(false);
      }
    };
    uploadFiles();
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  // Modal component
  const Modal = ({ children, onClose: closeModal }) => {
    const modalRoot = document.getElementById('file-viewer-modal-root');
    if (!modalRoot) return null;
    
    return ReactDOM.createPortal(
      <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 1001 }}>
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
          onClick={closeModal}
          style={{ zIndex: 1001 }}
        ></div>
        <Draggable handle=".modal-header" bounds="parent">
          <div 
            className={`relative ${font} w-full max-w-5xl`}
            style={{ zIndex: 1002 }}
          >
            {children}
          </div>
        </Draggable>
      </div>,
      modalRoot
    );
  };

  // Folder navigation
  const folders = ["All Files", "Documents", "Images", "Archives", "Shared"];
  
  return (
    <div 
      className={`${currentTheme.bg} ${currentTheme.text} ${font} min-h-screen`}
      style={{ position: 'relative', zIndex: 100 }}
    >
      {/* Main container */}
      <div 
        className={`${currentTheme.card} rounded-xl shadow-lg p-6 mx-auto max-w-7xl`} 
        style={{ width: '90%', position: 'relative', zIndex: 100 }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center">
            <button 
              onClick={onClose} 
              className="mr-4 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className={`text-3xl font-bold flex items-center ${currentTheme.text}`}>
              <FileText className="mr-3 text-blue-600" />
              {t('fileViewer.documentRepository')}
            </h1>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 ${currentTheme.buttonSecondary}`}
            >
              {viewMode === "grid" ? t('fileViewer.listView') : t('fileViewer.gridView')}
            </button>
            <button
              onClick={downloadFiles}
              disabled={!selectedFile && selectedFiles.length === 0}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 ${currentTheme.buttonSecondary} disabled:opacity-50`}
            >
              <Download size={16} /> {t('fileViewer.download')}
            </button>
            <button
              onClick={() => setShowFileActions(!showFileActions)}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 ${currentTheme.buttonSecondary}`}
            >
              <MoreVertical size={16} /> {t('fileViewer.actions')}
            </button>
          </div>
        </div>

        {/* Folder navigation */}
        <div className="flex overflow-x-auto mb-6 pb-2 scrollbar-hide">
          {folders.map(folder => (
            <button
              key={folder}
              onClick={() => setCurrentFolder(folder)}
              className={`px-4 py-2 rounded-full mr-2 whitespace-nowrap ${currentFolder === folder 
                ? `${currentTheme.button} text-white` 
                : `${currentTheme.buttonSecondary}`}`}
            >
              {folder === "All Files" ? <Folder className="inline mr-2" size={16} /> : null}
              {folder === "Documents" ? <FileText className="inline mr-2" size={16} /> : null}
              {t(`fileViewer.folders.${folder.toLowerCase().replace(/\s+/g, '_')}`)}
            </button>
          ))}
        </div>

        {/* Search and filter bar */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('fileViewer.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 pr-4 py-2 border rounded-lg w-full ${currentTheme.border} ${currentTheme.text} ${currentTheme.bg}`}
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className={`p-2 border rounded-lg ${currentTheme.border} ${currentTheme.text} ${currentTheme.bg}`}
            >
              <option value="name">{t('fileViewer.sortByName')}</option>
              <option value="date">{t('fileViewer.sortByDate')}</option>
              <option value="size">{t('fileViewer.sortBySize')}</option>
            </select>
            
            <div {...getRootProps()} className="cursor-pointer">
              <input {...getInputProps()} />
              <button className={`px-4 py-2 rounded-lg flex items-center gap-2 ${currentTheme.button}`}>
                <Upload size={16} /> {t('fileViewer.upload')}
              </button>
            </div>
          </div>
        </div>

        {/* File actions dropdown */}
        {showFileActions && (
          <div className={`mb-4 p-3 rounded-lg shadow-md ${currentTheme.card} border ${currentTheme.border}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={handleArchive}
                disabled={!selectedFile && selectedFiles.length === 0}
                className={`p-2 rounded flex flex-col items-center gap-1 ${currentTheme.buttonSecondary} disabled:opacity-50`}
              >
                <Archive size={20} />
                <span>{t('fileViewer.archive')}</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("send");
                  setIsModalOpen(true);
                }}
                disabled={!selectedFile && selectedFiles.length === 0}
                className={`p-2 rounded flex flex-col items-center gap-1 ${currentTheme.buttonSecondary} disabled:opacity-50`}
              >
                <Send size={20} />
                <span>{t('fileViewer.share')}</span>
              </button>
              <button
                onClick={downloadFiles}
                disabled={!selectedFile && selectedFiles.length === 0}
                className={`p-2 rounded flex flex-col items-center gap-1 ${currentTheme.buttonSecondary} disabled:opacity-50`}
              >
                <Download size={20} />
                <span>{t('fileViewer.download')}</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("history");
                  setIsModalOpen(true);
                  fetchHistory();
                }}
                disabled={!selectedFile}
                className={`p-2 rounded flex flex-col items-center gap-1 ${currentTheme.buttonSecondary} disabled:opacity-50`}
              >
                <History size={20} />
                <span>{t('fileViewer.history')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Drag & Drop Upload Area */}
        {isDragActive && (
          <div 
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 999 }}
          >
            <div className={`p-8 rounded-xl border-2 border-dashed ${currentTheme.border} bg-white/90 dark:bg-gray-800/90`}>
              <Upload size={48} className="mx-auto mb-4 text-blue-500" />
              <p className="text-xl font-medium text-center">{t('fileViewer.dropFiles')}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>{t('fileViewer.loadingFiles')}</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="mb-4 p-4 rounded-lg flex items-center gap-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <AlertCircle size={20} />
            <div>
              <p className="font-medium">{t('fileViewer.errorLoadingFiles')}</p>
              <p className="text-sm">{error}</p>
            </div>
            <button 
              onClick={() => setError("")} 
              className="ml-auto p-1 rounded-full hover:bg-red-200 dark:hover:bg-red-800/50"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Files display */}
        {!loading && filteredFiles.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleFileOpen(file)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleFileSelection(file.id);
                  }}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${currentTheme.border} border hover:shadow-md relative overflow-hidden ${
                    selectedFiles.includes(file.id) ? `${currentTheme.highlight} ring-2 ring-blue-500` : ""
                  }`}
                >
                  {selectedFiles.includes(file.id) && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${getFileTypeColor(file.type)}`}>
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium truncate ${currentTheme.text}`}>
                        {file.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                      {new Date(file.lastModified).toLocaleDateString()}
                    </span>
                    {file.summary && (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Sparkles size={12} />
                        {t('fileViewer.aiReady')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${currentTheme.border}`}>
                  <tr>
                    <th className="p-3 text-left w-8"></th>
                    <th className="p-3 text-left">{t('fileViewer.name')}</th>
                    <th className="p-3 text-left">{t('fileViewer.type')}</th>
                    <th className="p-3 text-left">{t('fileViewer.size')}</th>
                    <th className="p-3 text-left">{t('fileViewer.modified')}</th>
                    <th className="p-3 text-left">{t('fileViewer.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => (
                    <tr 
                      key={file.id} 
                      className={`border-b ${currentTheme.border} hover:${currentTheme.highlight} ${
                        selectedFiles.includes(file.id) ? currentTheme.highlight : ""
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td 
                        className="p-3 font-medium cursor-pointer"
                        onClick={() => handleFileOpen(file)}
                      >
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.type, "text-blue-500")}
                          <span>{file.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-500 dark:text-gray-400">
                        {file.type}
                      </td>
                      <td className="p-3 text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="p-3 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(file.lastModified).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleFileOpen(file)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                            title={t('fileViewer.preview')}
                          >
                            <FileText size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(file);
                              downloadFiles();
                            }}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                            title={t('fileViewer.download')}
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(file);
                              setActiveTab("send");
                              setIsModalOpen(true);
                            }}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                            title={t('fileViewer.share')}
                          >
                            <Share2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : !loading ? (
          <div className={`text-center p-8 rounded-lg border-2 border-dashed ${currentTheme.border}`}>
            <FolderPlus size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-1">{t('fileViewer.noFilesFound')}</h3>
            <p className="text-gray-500 mb-4">{t('fileViewer.uploadOrChangeSearch')}</p>
            <div {...getRootProps()} className="inline-block cursor-pointer">
              <input {...getInputProps()} />
              <button className={`px-4 py-2 rounded-lg flex items-center gap-2 mx-auto ${currentTheme.button}`}>
                <Upload size={16} /> {t('fileViewer.uploadFiles')}
              </button>
            </div>
          </div>
        ) : null}

        {/* Selected files counter */}
        {selectedFiles.length > 0 && (
          <div 
            className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 p-3 rounded-full shadow-lg ${currentTheme.button} flex items-center gap-3`}
            style={{ zIndex: 998 }}
          >
            <span className="text-white">{selectedFiles.length} {t('fileViewer.selected')}</span>
            <button 
              onClick={() => setSelectedFiles([])} 
              className="p-1 rounded-full hover:bg-blue-700"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        )}

        {/* Modal for file actions */}
        {isModalOpen && selectedFile && (
          <Modal onClose={() => setIsModalOpen(false)}>
            <div className={`rounded-xl w-full max-h-[90vh] shadow-lg flex flex-col ${currentTheme.card} border ${currentTheme.border}`}>
              {/* Modal Header */}
              <div className="modal-header flex justify-between items-center p-4 border-b cursor-move">
                <div className="flex items-center gap-3">
                  {getFileIcon(selectedFile.type, "text-blue-500")}
                  <h2 className="text-xl font-semibold truncate max-w-xs">
                    {selectedFile.name}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadFiles()}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                    title={t('fileViewer.download')}
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b overflow-x-auto scrollbar-hide">
                {[
                  { id: "content", icon: <FileText size={16} />, label: t('fileViewer.tabs.content') },
                  { id: "summary", icon: <Sparkles size={16} />, label: t('fileViewer.tabs.summary') },
                  { id: "enhance", icon: <Sparkles size={16} />, label: t('fileViewer.tabs.enhance') },
                  { id: "chat", icon: <MessageSquare size={16} />, label: t('fileViewer.tabs.chat') },
                  { id: "archive", icon: <Archive size={16} />, label: t('fileViewer.tabs.archive') },
                  { id: "history", icon: <History size={16} />, label: t('fileViewer.tabs.history') },
                  { id: "send", icon: <Send size={16} />, label: t('fileViewer.tabs.send') },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === "history") fetchHistory();
                    }}
                    className={`px-4 py-3 flex items-center gap-2 whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? `border-b-2 font-medium ${currentTheme.button} border-blue-500 text-blue-600 dark:text-blue-400`
                        : `text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700`
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Modal Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {error && (
                  <div className="mb-4 p-3 rounded-lg flex items-center gap-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    <AlertCircle size={18} />
                    <div className="flex-1">{error}</div>
                    <button 
                      onClick={() => setError("")} 
                      className="p-1 rounded-full hover:bg-red-200 dark:hover:bg-red-800/50"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {activeTab === "content" && (
                  <div>
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-lg font-medium">{t('fileViewer.fileContent')}</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={generateSummary}
                          className={`px-3 py-1.5 rounded flex items-center gap-2 ${currentTheme.buttonSecondary}`}
                          aria-label={t('fileViewer.summarize')}
                        >
                          <Sparkles size={14} /> {t('fileViewer.summarize')}
                        </button>
                        <button
                          onClick={enhanceContent}
                          className={`px-3 py-1.5 rounded flex items-center gap-2 ${currentTheme.buttonSecondary}`}
                          aria-label={t('fileViewer.enhance')}
                        >
                          <Sparkles size={14} /> {t('fileViewer.enhance')}
                        </button>
                      </div>
                    </div>
                    <div className={`p-4 rounded-lg ${currentTheme.bg} border ${currentTheme.border}`}>
                      <pre className="whitespace-pre-wrap font-sans">{selectedFile.content}</pre>
                    </div>
                  </div>
                )}

                {activeTab === "summary" && (
                  <div>
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-lg font-medium">{t('fileViewer.aiSummary')}</h3>
                      {!summary && (
                        <button
                          onClick={generateSummary}
                          disabled={loading}
                          className={`px-3 py-1.5 rounded flex items-center gap-2 ${currentTheme.button}`}
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              {t('fileViewer.generating')}
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} /> {t('fileViewer.generate')}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {summary ? (
                      <div className={`p-4 rounded-lg ${currentTheme.bg} border ${currentTheme.border}`}>
                        <p className="whitespace-pre-wrap">{summary}</p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Sparkles size={48} className="mx-auto mb-4 text-yellow-500" />
                        <h4 className="text-lg font-medium mb-2">{t('fileViewer.noSummary')}</h4>
                        <p className="text-gray-500 mb-4">{t('fileViewer.clickToGenerateSummary')}</p>
                        <button
                          onClick={generateSummary}
                          disabled={loading}
                          className={`px-6 py-2 rounded flex items-center gap-2 mx-auto ${currentTheme.button}`}
                        >
                          <Sparkles size={16} /> {t('fileViewer.generateSummary')}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "enhance" && (
                  <div>
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-lg font-medium">{t('fileViewer.enhancedContent')}</h3>
                      {!enhancedContent && (
                        <button
                          onClick={enhanceContent}
                          disabled={loading}
                          className={`px-3 py-1.5 rounded flex items-center gap-2 ${currentTheme.button}`}
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              {t('fileViewer.enhancing')}
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} /> {t('fileViewer.enhance')}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {enhancedContent ? (
                      <div className={`p-4 rounded-lg ${currentTheme.bg} border ${currentTheme.border}`}>
                        <p className="whitespace-pre-wrap">{enhancedContent}</p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Sparkles size={48} className="mx-auto mb-4 text-purple-500" />
                        <h4 className="text-lg font-medium mb-2">{t('fileViewer.noEnhancedContent')}</h4>
                        <p className="text-gray-500 mb-4">{t('fileViewer.clickToEnhanceContent')}</p>
                        <button
                          onClick={enhanceContent}
                          disabled={loading}
                          className={`px-6 py-2 rounded flex items-center gap-2 mx-auto ${currentTheme.button}`}
                        >
                          <Sparkles size={16} /> {t('fileViewer.enhanceContent')}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "chat" && (
                  <div className="flex flex-col h-96">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium">{t('fileViewer.chatWithAI')}</h3>
                      <p className="text-sm text-gray-500">{t('fileViewer.askQuestions')}</p>
                    </div>
                    
                    <div className="flex-1 mb-4 overflow-y-auto space-y-4">
                      {chatMessages.length > 0 ? (
                        chatMessages.map((msg, index) => (
                          <div 
                            key={index} 
                            className={`p-3 rounded-lg ${
                              msg.sender === "You" 
                                ? "bg-blue-100 dark:bg-blue-900/30 ml-auto max-w-3/4" 
                                : "bg-gray-100 dark:bg-gray-700 mr-auto max-w-3/4"
                            }`}
                          >
                            <div className="font-medium mb-1">{msg.sender}</div>
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <MessageSquare size={48} className="mx-auto mb-4 text-blue-500" />
                          <h4 className="text-lg font-medium mb-2">{t('fileViewer.noMessages')}</h4>
                          <p className="text-gray-500">{t('fileViewer.startConversation')}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t('fileViewer.typeQuestion')}
                        value={newChatMessage}
                        onChange={(e) => setNewChatMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                        className="flex-1 p-2 border rounded-lg"
                        disabled={loading}
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={loading || !newChatMessage.trim()}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${currentTheme.button} disabled:opacity-50`}
                      >
                        {loading ? (
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <Send size={16} />
                        )}
                        {t('fileViewer.send')}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "archive" && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">{t('fileViewer.archiveOptions')}</h3>
                    
                    <div className="mb-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          id="newArchive"
                          name="archiveOption"
                          value="new"
                          checked={archiveOption === "new"}
                          onChange={() => setArchiveOption("new")}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="newArchive" className="block">
                          <div className="font-medium">{t('fileViewer.createNewArchive')}</div>
                          <p className="text-sm text-gray-500">{t('fileViewer.packageIntoNewZip')}</p>
                        </label>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          id="existingArchive"
                          name="archiveOption"
                          value="existing"
                          checked={archiveOption === "existing"}
                          onChange={() => setArchiveOption("existing")}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="existingArchive" className="block">
                          <div className="font-medium">{t('fileViewer.addToExistingArchive')}</div>
                          <p className="text-sm text-gray-500">{t('fileViewer.appendToExistingZip')}</p>
                        </label>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleArchive}
                      disabled={loading}
                      className={`px-6 py-2 rounded-lg flex items-center gap-2 ${currentTheme.button}`}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t('fileViewer.processing')}
                        </>
                      ) : (
                        <>
                          <Archive size={16} /> {t('fileViewer.archiveFile')}
                        </>
                      )}
                    </button>
                  </div>
                )}

                {activeTab === "history" && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">{t('fileViewer.fileHistory')}</h3>
                    
                    {loading ? (
                      <div className="text-center py-8">
                        <svg className="animate-spin mx-auto h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-2">{t('fileViewer.loadingHistory')}</p>
                      </div>
                    ) : history.length > 0 ? (
                      <div className="space-y-3">
                        {history.map((item, index) => (
                          <div 
                            key={index} 
                            className={`p-3 rounded-lg border ${currentTheme.border} ${
                              item.action.includes("created") ? "bg-green-50 dark:bg-green-900/20" :
                              item.action.includes("modified") ? "bg-blue-50 dark:bg-blue-900/20" :
                              item.action.includes("deleted") ? "bg-red-50 dark:bg-red-900/20" :
                              currentTheme.bg
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{item.action}</div>
                                {item.user && (
                                  <div className="text-sm text-gray-500">{t('fileViewer.byUser', { user: item.user })}</div>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 whitespace-nowrap">
                                {new Date(item.timestamp).toLocaleString()}
                              </div>
                            </div>
                            {item.notes && (
                              <div className="mt-2 text-sm p-2 bg-white/50 dark:bg-black/20 rounded">
                                {item.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <History size={48} className="mx-auto mb-4 text-gray-400" />
                        <h4 className="text-lg font-medium mb-2">{t('fileViewer.noHistory')}</h4>
                        <p className="text-gray-500">{t('fileViewer.noRecordedHistory')}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "send" && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">{t('fileViewer.sendFile')}</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-1 font-medium">{t('fileViewer.recipient')}</label>
                        <input
                          type="email"
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          className="w-full p-2 border rounded-lg"
                          placeholder={t('fileViewer.recipientPlaceholder')}
                        />
                      </div>
                      
                      <div>
                        <label className="block mb-1 font-medium">{t('fileViewer.message')}</label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className="w-full p-2 border rounded-lg"
                          rows="4"
                          placeholder={t('fileViewer.messagePlaceholder')}
                        ></textarea>
                      </div>
                      
                      <div className={`p-3 rounded-lg ${currentTheme.bg} border ${currentTheme.border}`}>
                        <div className="flex items-center gap-3">
                          {getFileIcon(selectedFile.type, "text-blue-500")}
                          <div>
                            <div className="font-medium">{selectedFile.name}</div>
                            <div className="text-sm text-gray-500">
                              {formatFileSize(selectedFile.size)} • {selectedFile.type}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleSendFile}
                        disabled={loading || !recipient.trim()}
                        className={`px-6 py-2 rounded-lg flex items-center gap-2 ${currentTheme.button} disabled:opacity-50`}
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('fileViewer.sending')}
                          </>
                        ) : (
                          <>
                            <Send size={16} /> {t('fileViewer.sendFile')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

// Helper functions
function getFileIcon(fileType, className = "") {
  const type = fileType?.toLowerCase() || "";
  
  if (type.includes("pdf")) return <FileText className={className} />;
  if (type.includes("word")) return <FileText className={className} />;
  if (type.includes("excel")) return <FileText className={className} />;
  if (type.includes("powerpoint")) return <FileText className={className} />;
  if (type.includes("image")) return <FileText className={className} />;
  if (type.includes("zip") || type.includes("archive")) return <Archive className={className} />;
  
  return <FileText className={className} />;
}

function getFileTypeColor(fileType) {
  const type = fileType?.toLowerCase() || "";
  
  if (type.includes("pdf")) return "bg-red-100 text-red-600";
  if (type.includes("word")) return "bg-blue-100 text-blue-600";
  if (type.includes("excel")) return "bg-green-100 text-green-600";
  if (type.includes("powerpoint")) return "bg-orange-100 text-orange-600";
  if (type.includes("image")) return "bg-purple-100 text-purple-600";
  if (type.includes("zip") || type.includes("archive")) return "bg-yellow-100 text-yellow-600";
  
  return "bg-gray-100 text-gray-600";
}

function formatFileSize(bytes) {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default FileViewer;