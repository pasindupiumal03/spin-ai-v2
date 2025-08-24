"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Zap } from "lucide-react";
import { MultiFileStreamingDisplay } from "../../components/StreamingCodeDisplay";
import { useTheme } from "../themecontext/ThemeContext";

interface UploadedFile {
  id: number;
  name: string;
  type: string;
  size: number;
  content: string | ArrayBuffer;
  lastModified: number;
}

const StreamingPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const [generatedFiles, setGeneratedFiles] = useState<{ [key: string]: string }>({});
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Use ref to track if generation has already started
  const generationStartedRef = useRef<boolean>(false);

  const getThemeClasses = () => {
    return theme === "light"
      ? "min-h-screen bg-white text-gray-900 relative overflow-hidden"
      : "min-h-screen bg-black text-white relative overflow-hidden";
  };

  // Load data from URL params or sessionStorage and start generation once
  useEffect(() => {
    // Prevent duplicate generation calls
    if (generationStartedRef.current) {
      return;
    }

    let finalPrompt = "";
    let finalFiles: UploadedFile[] = [];

    // Priority 1: URL parameters (most recent/authoritative)
    const promptParam = searchParams.get("prompt");
    const filesParam = searchParams.get("uploadedFiles");

    if (promptParam) {
      finalPrompt = decodeURIComponent(promptParam);
      setPrompt(finalPrompt);
    }

    if (filesParam) {
      try {
        const parsedFiles = JSON.parse(decodeURIComponent(filesParam));
        finalFiles = parsedFiles;
        setUploadedFiles(parsedFiles);
      } catch (e) {
        console.error("Error parsing uploaded files from URL:", e);
      }
    }

    // Priority 2: SessionStorage (fallback if URL params not available)
    if (!finalPrompt) {
      const storedPrompt = sessionStorage.getItem("currentPrompt");
      if (storedPrompt) {
        finalPrompt = storedPrompt;
        setPrompt(finalPrompt);
      }
    }

    if (finalFiles.length === 0) {
      const storedFiles = sessionStorage.getItem("currentUploadedFiles");
      if (storedFiles) {
        try {
          const parsedStoredFiles = JSON.parse(storedFiles);
          finalFiles = parsedStoredFiles;
          setUploadedFiles(parsedStoredFiles);
        } catch (e) {
          console.error("Error parsing stored files:", e);
        }
      }
    }

    // Start generation only once if we have a prompt
    if (finalPrompt && !generationStartedRef.current) {
      generationStartedRef.current = true;
      console.log("Starting generation with prompt:", finalPrompt);
      handleStreamingGenerate(finalPrompt, finalFiles);
    } else if (!finalPrompt) {
      // No prompt available, redirect back
      setError("No prompt provided");
      setIsGenerating(false);
    }
  }, [searchParams]);

  const handleStreamingGenerate = async (currentPrompt: string, files: UploadedFile[] = []): Promise<void> => {
    if (!currentPrompt.trim()) {
      setError("Please enter a prompt");
      setIsGenerating(false);
      return;
    }

    setError("");
    setIsGenerating(true);
    setGeneratedFiles({});

    const userId = localStorage.getItem("userId") || "anonymous";

    try {
      const requestBody = {
        prompt: currentPrompt,
        existingFiles: null,
        uploadedFiles: files.length > 0 ? files : null,
        streaming: true,
        userId,
      };

      console.log("Making API request with body:", requestBody);
      const response = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body received");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data: {
                  type: string;
                  message?: string;
                  content?: string;
                  fileName?: string;
                  fileIndex?: number;
                  totalFiles?: number;
                  conversationId?: string;
                  userId?: string;
                  error?: string;
                } = JSON.parse(line.slice(6));

                switch (data.type) {
                  case "status":
                    // Could show status updates here
                    break;

                  case "progress":
                    // Could show progress indicators here
                    break;

                  case "file":
                    if (data.fileName && data.content && typeof data.fileName === "string") {
                      const fileName: string = data.fileName;
                      setGeneratedFiles((prev) => ({
                        ...prev,
                        [fileName]: data.content as string,
                      }));
                    }
                    break;

                  case "complete":
                    // Store generated files in sessionStorage for workspace
                    setGeneratedFiles((currentFiles) => {
                      sessionStorage.setItem("generatedFiles", JSON.stringify(currentFiles));
                      sessionStorage.setItem("originalPrompt", currentPrompt);
                      sessionStorage.setItem("uploadedFiles", JSON.stringify(files));
                      return currentFiles;
                    });
                    break;

                  case "error":
                    throw new Error(data.error || "Unknown error");
                }
              } catch (parseError) {
                console.log("Non-JSON SSE data:", line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error: unknown) {
      console.error("Error in streaming generation:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(
        errorMessage.includes("truncate") || errorMessage.includes("max_tokens")
          ? "Response too large. Try a simpler prompt or try again later."
          : errorMessage.includes("529")
            ? "Anthropic API is temporarily unavailable. Please try again later."
            : `Failed to generate code: ${errorMessage}`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAllFilesComplete = (): void => {
    // Navigate to workspace after streaming completes
    setTimeout(() => {
      router.push("/workspace");
    }, 1500);
  };

  const handleBack = (): void => {
    router.push("/");
  };

  return (
    <div className={getThemeClasses()}>
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {theme === "light" ? (
          <>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-3xl"></div>
          </>
        ) : (
          <>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-lime-500/5 to-purple-500/5 rounded-full blur-3xl"></div>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-6 relative z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:scale-105"
            title="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Spin Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-semibold">Spin</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2 rounded-lg ${
              theme === "light" ? "bg-blue-100 text-blue-800" : "bg-gray-800/50 text-lime-400"
            } backdrop-blur-sm border ${theme === "light" ? "border-blue-200" : "border-gray-700/50"}`}
          >
            <div className="flex items-center gap-2">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Generating...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-medium">Generation Complete</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        {/* Prompt Display */}
        {prompt && (
          <div
            className={`mb-8 p-6 rounded-xl border backdrop-blur-sm ${
              theme === "light" ? "bg-gray-50/80 border-gray-200" : "bg-gray-900/50 border-gray-800/50"
            }`}
          >
            <h2 className={`text-lg font-semibold mb-2 ${theme === "light" ? "text-gray-800" : "text-white"}`}>
              Generating App
            </h2>
            <p className={theme === "light" ? "text-gray-600" : "text-gray-300"}>{`"${prompt}"`}</p>
            {uploadedFiles.length > 0 && (
              <div className="mt-4">
                <p
                  className={`text-sm font-medium mb-2 ${theme === "light" ? "text-gray-700" : "text-gray-400"}`}
                >
                  With {uploadedFiles.length} attached file{uploadedFiles.length > 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file) => (
                    <span
                      key={file.id}
                      className={`px-2 py-1 text-xs rounded ${
                        theme === "light" ? "bg-blue-100 text-blue-700" : "bg-gray-800 text-gray-300"
                      }`}
                    >
                      {file.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/30 border border-red-700/50 rounded-xl backdrop-blur-sm">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={handleBack}
              className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
            >
              Go back to try again
            </button>
          </div>
        )}

        {/* Streaming Code Display */}
        {Object.keys(generatedFiles).length > 0 && (
          <div className="mb-8">
            <MultiFileStreamingDisplay
              key={JSON.stringify(Object.keys(generatedFiles))}
              files={generatedFiles}
              streamingSpeed={10}
              onAllFilesComplete={handleAllFilesComplete}
            />
          </div>
        )}

        {/* Loading State */}
        {isGenerating && Object.keys(generatedFiles).length === 0 && (
          <div
            className={`text-center py-12 rounded-xl border backdrop-blur-sm ${
              theme === "light" ? "bg-gray-50/80 border-gray-200" : "bg-gray-900/50 border-gray-800/50"
            }`}
          >
            <Loader2
              className={`w-8 h-8 animate-spin mx-auto mb-4 ${theme === "light" ? "text-blue-600" : "text-lime-400"}`}
            />
            <p className={theme === "light" ? "text-gray-600" : "text-gray-400"}>Starting code generation...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamingPage;