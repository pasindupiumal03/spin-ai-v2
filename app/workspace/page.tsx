"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackFileExplorer,
  SandpackConsole,
  SandpackTests,
  OpenInCodeSandboxButton,
} from "@codesandbox/sandpack-react";
import {
  Code,
  Eye,
  Terminal,
  TestTube,
  Download,
  ArrowLeft,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  Settings,
  MoreVertical,
  Zap,
  Upload,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileChange {
  path: string;
  status: "new" | "updated" | "deleted";
}

interface PromptHistoryEntry {
  prompt: string;
  files: FileChange[];
  fullState: { [key: string]: string };
}

const WorkspacePage = () => {
  const [files, setFiles] = useState<{ [key: string]: string }>({});
  const [activeView, setActiveView] = useState<"code" | "preview">("code");
  const [previewMode, setPreviewMode] = useState<"code" | "ui">("ui");
  const [theme, setTheme] = useState("dark");
  const [showTests, setShowTests] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [chatError, setChatError] = useState("");
  const [isChatGenerating, setIsChatGenerating] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [isInitialGeneration, setIsInitialGeneration] = useState(false);
  const [generatedFilesList, setGeneratedFilesList] = useState<string[]>([]);
  const [changedFiles, setChangedFiles] = useState<FileChange[]>([]);
  const [promptFileHistory, setPromptFileHistory] = useState<
    PromptHistoryEntry[]
  >([]);
  const [generationStatus, setGenerationStatus] = useState<
    "idle" | "generating" | "complete" | "error"
  >("idle");
  const [generationError, setGenerationError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streamedFiles, setStreamedFiles] = useState<{ [key: string]: string }>(
    {}
  );
  const [isStreaming, setIsStreaming] = useState(false);

  const router = useRouter();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const generationPollingRef = useRef<NodeJS.Timeout | null>(null);
  const streamControllerRef = useRef<AbortController | null>(null);

  const exportProjectAsZip = async () => {
    if (Object.keys(files).length === 0) return;

    setIsExporting(true);
    try {
      const zip = new JSZip();

      Object.entries(files).forEach(([filePath, content]) => {
        if (!content && !filePath.endsWith("/")) return;
        if (filePath.endsWith("/")) {
          zip.folder(filePath);
          return;
        }
        zip.file(filePath, content);
      });

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "project-export.zip");
    } catch (error) {
      console.error("Error exporting project:", error);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const generationRequest = sessionStorage.getItem("generationRequest");
    const existingFiles = sessionStorage.getItem("generatedFiles");
    const storedPrompt = sessionStorage.getItem("originalPrompt");
    const generationComplete = sessionStorage.getItem("generationComplete");
    const generationErrorStored = sessionStorage.getItem("generationError");
    const storedChangedFiles = sessionStorage.getItem("changedFiles");
    const storedPromptFileHistory = sessionStorage.getItem("promptFileHistory");
    const storedConversationId = sessionStorage.getItem("conversationId");

    if (generationRequest && !existingFiles) {
      const request = JSON.parse(generationRequest);
      setOriginalPrompt(request.prompt || "");
      setIsInitialGeneration(true);
      setGenerationStatus("generating");
      setIsGeneratingResponse(true);
      startPollingForCompletion();
    } else if (existingFiles && storedPrompt) {
      const parsedFiles = JSON.parse(existingFiles);
      setFiles(parsedFiles);
      setOriginalPrompt(storedPrompt);
      setGenerationStatus("complete");
      const fileNames = Object.keys(parsedFiles);
      setGeneratedFilesList(fileNames);
      if (storedChangedFiles) {
        setChangedFiles(JSON.parse(storedChangedFiles));
      }
      if (storedPromptFileHistory) {
        const parsedHistory = JSON.parse(storedPromptFileHistory);
        setPromptFileHistory(parsedHistory);
        setChatHistory(
          parsedHistory
            .map((entry: PromptHistoryEntry) => entry.prompt)
            .filter((p: string) => p !== storedPrompt)
        );
      } else if (fileNames.length > 0) {
        setPromptFileHistory([
          {
            prompt: storedPrompt,
            files: fileNames.map((path) => ({ path, status: "new" as const })),
            fullState: parsedFiles,
          },
        ]);
      }
      if (storedConversationId) {
        setConversationId(storedConversationId);
      }
    } else if (generationErrorStored) {
      const error = JSON.parse(generationErrorStored);
      setGenerationError(error.error);
      setGenerationStatus("error");
      setOriginalPrompt(storedPrompt || "");
    } else {
      router.push("/");
      return;
    }

    setIsLoading(false);
  }, [router]);

  const startPollingForCompletion = () => {
    generationPollingRef.current = setInterval(() => {
      checkGenerationStatus();
    }, 1000);
  };

  const checkGenerationStatus = () => {
    const generatedFiles = sessionStorage.getItem("generatedFiles");
    const generationComplete = sessionStorage.getItem("generationComplete");
    const generationError = sessionStorage.getItem("generationError");
    const storedConversationId = sessionStorage.getItem("conversationId");

    if (generationError) {
      const error = JSON.parse(generationError);
      setGenerationError(error.error);
      setGenerationStatus("error");
      setIsGeneratingResponse(false);
      setIsInitialGeneration(false);

      if (generationPollingRef.current) {
        clearInterval(generationPollingRef.current);
        generationPollingRef.current = null;
      }

      sessionStorage.removeItem("generationError");
      sessionStorage.removeItem("generationRequest");
    } else if (generatedFiles && generationComplete) {
      const files = JSON.parse(generatedFiles);
      setFiles(files);
      setGenerationStatus("complete");
      setIsGeneratingResponse(false);
      setIsInitialGeneration(false);

      const fileNames = Object.keys(files);
      animateFilesList(fileNames);

      const storedPrompt = sessionStorage.getItem("originalPrompt") || "";
      setPromptFileHistory([
        {
          prompt: storedPrompt,
          files: fileNames.map((path) => ({ path, status: "new" as const })),
          fullState: files,
        },
      ]);
      sessionStorage.setItem(
        "promptFileHistory",
        JSON.stringify([
          {
            prompt: storedPrompt,
            files: fileNames.map((path) => ({ path, status: "new" as const })),
            fullState: files,
          },
        ])
      );
      if (storedConversationId) {
        setConversationId(storedConversationId);
      }

      if (generationPollingRef.current) {
        clearInterval(generationPollingRef.current);
        generationPollingRef.current = null;
      }

      sessionStorage.removeItem("generationComplete");
      sessionStorage.removeItem("generationRequest");
    }
  };

  const animateFilesList = (fileNames: string[]) => {
    setGeneratedFilesList([]);
    fileNames.forEach((fileName, index) => {
      setTimeout(() => {
        setGeneratedFilesList((prev) => [...prev, fileName]);
      }, index * 300);
    });
  };

  useEffect(() => {
    return () => {
      if (generationPollingRef.current) {
        clearInterval(generationPollingRef.current);
      }
      if (streamControllerRef.current) {
        streamControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, promptFileHistory]);

  const handleNewPrompt = () => {
    sessionStorage.removeItem("generatedFiles");
    sessionStorage.removeItem("originalPrompt");
    sessionStorage.removeItem("uploadedFiles");
    sessionStorage.removeItem("generationRequest");
    sessionStorage.removeItem("generationComplete");
    sessionStorage.removeItem("generationError");
    sessionStorage.removeItem("changedFiles");
    sessionStorage.removeItem("promptFileHistory");
    sessionStorage.removeItem("conversationId");
    setChangedFiles([]);
    setPromptFileHistory([]);
    setConversationId(null);
    router.push("/");
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPrompt.trim()) {
      setChatError("Please enter a prompt to modify the code");
      return;
    }

    setIsChatGenerating(true);
    setChatError("");
    setChatHistory([...chatHistory, chatPrompt]);
    setIsStreaming(true);
    setStreamedFiles({});
    const controller = new AbortController();
    streamControllerRef.current = controller;

    try {
      const prevFiles = { ...files };
      const response = await fetch("/api/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: chatPrompt,
          existingFiles: files,
          streaming: true,
          userId: "anonymous",
          conversationId: conversationId || undefined,
          isIterativeUpdate: true,
        }),
        signal: controller.signal,
      });

      if (!response.body) {
        throw new Error("No stream body received");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "file" && parsed.fileName && parsed.content) {
                setStreamedFiles((prev) => ({
                  ...prev,
                  [parsed.fileName]: parsed.content,
                }));
                setGeneratedFilesList((prev) => {
                  if (!prev.includes(parsed.fileName)) {
                    return [...prev, parsed.fileName];
                  }
                  return prev;
                });
                setChangedFiles((prev) => {
                  const existingChange = prev.find(
                    (c) => c.path === parsed.fileName
                  );
                  if (!existingChange) {
                    return [
                      ...prev,
                      {
                        path: parsed.fileName,
                        status: parsed.changeType || "new",
                      },
                    ];
                  }
                  return prev;
                });
              } else if (parsed.type === "complete") {
                setFiles(parsed.fullFiles || prevFiles);
                setChangedFiles(parsed.changedFiles || []);
                setPromptFileHistory((prev) => {
                  const updatedHistory = [
                    ...prev,
                    {
                      prompt: chatPrompt,
                      files: parsed.changedFiles || [],
                      fullState: parsed.fullFiles || prevFiles,
                    },
                  ];
                  sessionStorage.setItem(
                    "promptFileHistory",
                    JSON.stringify(updatedHistory)
                  );
                  return updatedHistory;
                });
                sessionStorage.setItem(
                  "generatedFiles",
                  JSON.stringify(parsed.fullFiles || prevFiles)
                );
                sessionStorage.setItem(
                  "changedFiles",
                  JSON.stringify(parsed.changedFiles || [])
                );
                if (parsed.conversationId) {
                  setConversationId(parsed.conversationId);
                  sessionStorage.setItem(
                    "conversationId",
                    parsed.conversationId
                  );
                }
                setChatPrompt("");
                setIsStreaming(false);
              } else if (parsed.type === "error") {
                throw new Error(parsed.error || "Streaming error occurred");
              }
            } catch (error) {
              console.error("Error parsing stream data:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error updating code:", error);
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message: string }).message
          : String(error);
      setChatError(
        errorMessage.includes("truncate") || errorMessage.includes("max_tokens")
          ? "Response too large. Try a simpler prompt or try again later."
          : errorMessage.includes("529")
          ? "Anthropic API is temporarily unavailable. Please try again later."
          : `Failed to update code: ${errorMessage}`
      );
      setIsStreaming(false);
    } finally {
      setIsChatGenerating(false);
      streamControllerRef.current = null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-black border-b border-gray-800 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Refresh page"
          >
            <img
              src="/logo.png"
              alt="Spin Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-semibold">Spin</span>
          </button>

          {originalPrompt && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-900 rounded-lg">
              <div className="text-sm text-gray-400 max-w-md truncate">
                "{originalPrompt}"
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleNewPrompt}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            New Prompt
          </button>
          <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Chat */}
        <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">AI</span>
              </div>
              <div>
                <h3 className="font-medium">Prompt History</h3>
              </div>
            </div>
          </div>

          {/* Prompt History and File Changes */}
          <div className="flex-1 p-4 overflow-y-auto" ref={chatContainerRef}>
            {promptFileHistory.length > 0 ? (
              promptFileHistory.map((entry, index) => (
                <div key={index} className="mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center">
                      <span className="text-xs text-black">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-300 mb-2">
                        {entry.prompt || "Initial Project Generation"}
                      </div>
                      {entry.files.length > 0 && (
                        <div className="space-y-1">
                          {entry.files.map((file, fileIndex) => (
                            <div
                              key={file.path}
                              className="text-xs text-gray-400 flex items-center gap-2 animate-fadeIn"
                              style={{ animationDelay: `${fileIndex * 0.1}s` }}
                            >
                              <div className="w-1 h-1 bg-lime-400 rounded-full"></div>
                              <span className="truncate">{file.path}</span>
                              <span
                                className={cn(
                                  "ml-2 px-2 py-0.5 text-xs font-medium rounded-full",
                                  file.status === "updated"
                                    ? "bg-green-500/20 text-green-400"
                                    : file.status === "new"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-red-500/20 text-red-400"
                                )}
                              >
                                {file.status.charAt(0).toUpperCase() +
                                  file.status.slice(1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 text-sm">
                No prompt history available
              </div>
            )}
            {isStreaming && Object.keys(streamedFiles).length > 0 && (
              <div className="mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center">
                    <span className="text-xs text-black">
                      {promptFileHistory.length + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-300 mb-2">
                      {chatPrompt}
                    </div>
                    <div className="space-y-1">
                      {Object.keys(streamedFiles).map((filePath, index) => (
                        <div
                          key={filePath}
                          className="text-xs text-gray-400 flex items-center gap-2 animate-fadeIn"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="w-1 h-1 bg-lime-400 rounded-full"></div>
                          <span className="truncate">{filePath}</span>
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">
                            Streaming
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input - Only show after generation is complete */}
          {generationStatus === "complete" && (
            <div className="p-4 border-t border-gray-800">
              <form onSubmit={handleChatSubmit} className="space-y-3">
                <div className="relative">
                  <textarea
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                    placeholder="Describe changes to make..."
                    className="w-full h-20 p-3 bg-gray-800 border border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all placeholder-gray-500 text-white text-sm"
                    disabled={isChatGenerating}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-gray-400" />
                    <Sparkles className="w-4 h-4 text-lime-400" />
                    <Zap className="w-4 h-4 text-gray-400" />
                  </div>

                  <button
                    type="submit"
                    disabled={isChatGenerating || !chatPrompt.trim()}
                    className="px-4 py-2 bg-lime-400 text-black rounded-lg hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    {isChatGenerating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {isChatGenerating ? "Updating..." : "Update"}
                  </button>
                </div>
              </form>

              {chatError && (
                <div className="mt-3 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  {chatError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Tabs */}
          <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-6">
            <button
              onClick={() => setActiveView("code")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm",
                activeView === "code"
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <Code className="w-4 h-4" />
              Code
            </button>

            <button
              onClick={() => setActiveView("preview")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm",
                activeView === "preview"
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>

            <div className="flex-1"></div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                <Terminal className="w-4 h-4" />
                Toggle Terminal
              </button>
              <button
                onClick={exportProjectAsZip}
                disabled={isExporting || Object.keys(files).length === 0}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors",
                  isExporting || Object.keys(files).length === 0
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Sync & Export
                  </>
                )}
              </button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {generationStatus === "generating" ? (
              <div className="flex-1 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <RefreshCw className="w-8 h-8 text-lime-400 animate-spin" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">
                    Spin is working on your prompt...
                  </h3>
                  <p className="text-gray-500">
                    Creating your application files and setting up the workspace
                  </p>
                </div>
              </div>
            ) : generationStatus === "error" ? (
              <div className="flex-1 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <X className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">
                    Generation Failed
                  </h3>
                  <p className="text-gray-500 mb-4">{generationError}</p>
                  <button
                    onClick={handleNewPrompt}
                    className="px-4 py-2 bg-lime-400 text-black rounded-lg hover:bg-lime-300 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : Object.keys(files).length > 0 ? (
              <SandpackProvider
                template="react"
                files={files}
                theme="dark"
                options={{
                  visibleFiles: Object.keys(files),
                  activeFile: Object.keys(files)[0] || "/App.js",
                  autorun: true,
                  autoReload: true,
                  recompileMode: "delayed",
                  recompileDelay: 500,
                }}
                customSetup={{
                  dependencies: {
                    react: "^18.2.0",
                    "react-dom": "^18.2.0",
                    "react-scripts": "^5.0.1",
                  },
                }}
              >
                {activeView === "code" && (
                  <div className="flex h-[calc(100vh-112px)]">
                    {/* File Explorer */}
                    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
                      <div className="p-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
                        <h3 className="text-sm font-medium text-gray-300">
                          Files
                        </h3>
                        <div className="flex items-center gap-1">
                          <button className="p-1 text-gray-400 hover:text-white transition-colors">
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <SandpackFileExplorer autoHiddenFiles />
                      </div>
                    </div>

                    {/* Code Editor */}
                    <div className="flex-1 flex flex-col min-w-0">
                      <SandpackCodeEditor
                        showTabs
                        showLineNumbers
                        showInlineErrors
                        wrapContent
                        style={{
                          height: "100%",
                          width: "100%",
                          fontSize: "14px",
                          lineHeight: "1.5",
                        }}
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}

                {activeView === "preview" && (
                  <div className="flex-1 flex flex-col h-full">
                    <div className="flex-1 h-full">
                      <SandpackPreview
                        showOpenInCodeSandbox={true}
                        showRefreshButton={true}
                        showNavigator={true}
                        style={{
                          height: "100%",
                          width: "100%",
                          minHeight: "calc(100vh - 112px)",
                        }}
                      />
                    </div>
                  </div>
                )}
              </SandpackProvider>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <Code className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">
                    No files available
                  </h3>
                  <p className="text-gray-500">
                    Start a new generation to see your code here
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default WorkspacePage;
