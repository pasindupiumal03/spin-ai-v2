"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, FileText, Code } from "lucide-react";
import { useTheme } from "../app/themecontext/ThemeContext";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { 
  oneDark, 
  oneLight,
  vscDarkPlus,
  vs
} from "react-syntax-highlighter/dist/esm/styles/prism";

interface StreamingCodeDisplayProps {
  files: { [key: string]: string };
  streamingSpeed?: number;
  onAllFilesComplete?: () => void;
}

export function MultiFileStreamingDisplay({
  files,
  streamingSpeed = 10,
  onAllFilesComplete,
}: StreamingCodeDisplayProps) {
  const [displayedFiles, setDisplayedFiles] = useState<{
    [key: string]: string;
  }>({});
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const { theme } = useTheme();
  const fileNames = Object.keys(files);
  const router = useRouter();
  const streamingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasNavigatedRef = useRef(false);

  // Reset streaming state when files change
  const filesString = JSON.stringify(files);
  useEffect(() => {
    setDisplayedFiles({});
    setCurrentFileIndex(0);
    setCurrentCharIndex(0);
    setIsComplete(false);
    hasNavigatedRef.current = false;
  }, [filesString]);

  useEffect(() => {
    if (fileNames.length === 0) return;

    const currentFileName = fileNames[currentFileIndex];
    const currentFileContent = files[currentFileName] || "";

    if (currentCharIndex < currentFileContent.length) {
      streamingTimerRef.current = setTimeout(() => {
        setDisplayedFiles((prev) => ({
          ...prev,
          [currentFileName]: currentFileContent.slice(0, currentCharIndex + 1),
        }));
        setCurrentCharIndex((prev) => prev + 1);
      }, streamingSpeed);

      return () => {
        if (streamingTimerRef.current) {
          clearTimeout(streamingTimerRef.current);
          streamingTimerRef.current = null;
        }
      };
    } else if (currentFileIndex < fileNames.length - 1) {
      // Move to next file
      setCurrentFileIndex((prev) => prev + 1);
      setCurrentCharIndex(0);
    } else if (!isComplete && !hasNavigatedRef.current) {
      // All files complete - trigger completion and navigation
      setIsComplete(true);
      hasNavigatedRef.current = true;

      // Call the optional completion callback
      onAllFilesComplete?.();

      // Navigate to workspace immediately after completion
      router.push("/workspace");
    }
  }, [
    files,
    currentFileIndex,
    currentCharIndex,
    fileNames,
    streamingSpeed,
    onAllFilesComplete,
    isComplete,
    router,
  ]);

  // Cleanup function to clear all timers
  useEffect(() => {
    return () => {
      if (streamingTimerRef.current) {
        clearTimeout(streamingTimerRef.current);
      }
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const copyToClipboard = async (content: string, fileName: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(fileName);

      // Clear any existing copy timer before setting a new one
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }

      copyTimerRef.current = setTimeout(() => {
        setCopiedFile(null);
        copyTimerRef.current = null;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const getLanguage = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "tsx":
        return "tsx";
      case "jsx":
        return "jsx";
      case "ts":
        return "typescript";
      case "js":
        return "javascript";
      case "css":
        return "css";
      case "scss":
      case "sass":
        return "scss";
      case "html":
        return "html";
      case "json":
        return "json";
      case "md":
        return "markdown";
      case "py":
        return "python";
      case "java":
        return "java";
      case "php":
        return "php";
      case "go":
        return "go";
      case "rust":
        return "rust";
      case "cpp":
      case "cc":
        return "cpp";
      case "c":
        return "c";
      case "sql":
        return "sql";
      case "yaml":
      case "yml":
        return "yaml";
      case "xml":
        return "xml";
      default:
        return "text";
    }
  };

  const getSyntaxHighlighterStyle = () => {
    if (theme === 'light') {
      return vs; // Light theme
    } else {
      return vscDarkPlus; // Dark theme - VS Code style
    }
  };

  if (fileNames.length === 0) {
    return (
      <div className={`text-center py-8 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
        No files to display
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fileNames.map((fileName, index) => {
        const displayedContent = displayedFiles[fileName] || "";
        const isCurrentFile = index === currentFileIndex;
        const isFileComplete =
          displayedContent.length === (files[fileName]?.length || 0);

        return (
          <div
            key={fileName}
            className={`rounded-lg border overflow-hidden ${
              theme === 'light' 
                ? 'bg-white border-gray-200' 
                : 'bg-gray-900 border-gray-800'
            }`}
          >
            <div className={`flex items-center justify-between px-4 py-3 border-b ${
              theme === 'light'
                ? 'bg-gray-50 border-gray-200'
                : 'bg-gray-800 border-gray-700'
            }`}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isFileComplete
                        ? "bg-green-500"
                        : isCurrentFile
                        ? "bg-yellow-500 animate-pulse"
                        : "bg-gray-600"
                    }`}
                  />
                  <FileText className={`w-4 h-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    {fileName}
                  </span>
                </div>
              </div>

              <button
                onClick={() => copyToClipboard(files[fileName] || "", fileName)}
                className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors rounded ${
                  theme === 'light'
                    ? 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {copiedFile === fileName ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              {displayedContent.trim() ? (
                <SyntaxHighlighter
                  language={getLanguage(fileName)}
                  style={getSyntaxHighlighterStyle()}
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: theme === 'light' ? '#f9fafb' : '#111827',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                    }
                  }}
                >
                  {displayedContent + (isCurrentFile && !isFileComplete ? '|' : '')}
                </SyntaxHighlighter>
              ) : (
                <pre className={`p-4 text-sm overflow-x-auto min-h-[3rem] flex items-center ${
                  theme === 'light'
                    ? 'text-gray-800 bg-gray-50'
                    : 'text-gray-300 bg-gray-900'
                }`}>
                  <code className={`language-${getLanguage(fileName)}`}>
                    {isCurrentFile && !isFileComplete && (
                      <span className={`animate-pulse ${theme === 'light' ? 'text-blue-500' : 'text-lime-400'}`}>|</span>
                    )}
                  </code>
                </pre>
              )}
            </div>
          </div>
        );
      })}

      {isComplete && (
        <div className="text-center py-4">
          <div className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg ${
            theme === 'light'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-green-900/50 border-green-700 text-green-400'
          }`}>
            <Check className="w-4 h-4" />
            <span className="text-sm">
              All files generated successfully! Redirecting to workspace...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
