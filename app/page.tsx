"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Loader2,
    Upload,
    File,
    X,
    FileText,
    FileCode,
    FileSpreadsheet,
    Zap,
    Wallet,
    LogOut,
    Paperclip,
    Sun,
    Moon,
    Bot,
    Brain,
    ChevronDown,
    Check,
} from "lucide-react";
import { useWallet } from "./walletcontext/WalletContext";
import { useTheme } from "./themecontext/ThemeContext";

// Define interfaces
interface UploadedFile {
    id: number;
    name: string;
    type: string;
    size: number;
    content: string | ArrayBuffer;
    lastModified: number;
}

interface Conversation {
    _id: string;
    prompt: string;
    uploadedFiles: UploadedFile[] | null;
    generatedFiles: { [key: string]: string } | null;
    timestamp: string;
}

interface WalletContext {
    walletAddress: string | null;
    connectWallet: () => void;
    disconnectWallet: () => void;
    connecting: boolean;
}

const HomePage: React.FC = () => {
    const [prompt, setPrompt] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [placeholderText, setPlaceholderText] = useState<string>("");
    const [placeholderIndex, setPlaceholderIndex] = useState<number>(0);
    const [selectedModel, setSelectedModel] = useState<string>("S-1");
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const [selectedClaudeModel, setSelectedClaudeModel] = useState<string>("Claude 4.0 Sonnet");
    const [isClaudeDropdownOpen, setIsClaudeDropdownOpen] = useState<boolean>(false);

    const { walletAddress, connectWallet, disconnectWallet, connecting } = useWallet() as WalletContext;
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const promptRef = useRef<HTMLTextAreaElement>(null);

    // Placeholder texts for typing effect
    const placeholders = [
        "What would you like to build?",
        "Build a meme coin landing page",
        "Build a leaderboard for token holders", 
        "Build a dashboard for community points",
        "Build a to-do app with dark mode",
        "Build a feedback form with emoji reactions"
    ];

    // Typing effect for placeholder
    useEffect(() => {
        const currentPlaceholder = placeholders[placeholderIndex];
        let currentText = "";
        let charIndex = 0;
        
        const typeInterval = setInterval(() => {
            if (charIndex < currentPlaceholder.length) {
                currentText += currentPlaceholder[charIndex];
                setPlaceholderText(currentText);
                charIndex++;
            } else {
                // Pause at end of text
                setTimeout(() => {
                    // Clear text with backspace effect
                    const clearTextInterval = setInterval(() => {
                        currentText = currentText.slice(0, -1);
                        setPlaceholderText(currentText);
                        
                        if (currentText === "") {
                            clearInterval(clearTextInterval);
                            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
                        }
                    }, 50);
                }, 2000);
                clearInterval(typeInterval);
            }
        }, 100);

        return () => clearInterval(typeInterval);
    }, [placeholderIndex]);

    // Initialize or retrieve userId based on wallet address
    useEffect(() => {
        let userId = localStorage.getItem("userId");
        if (!userId && walletAddress) {
            userId = walletAddress;
            localStorage.setItem("userId", userId);
        }
        if (userId) {
            fetchConversations(userId);
        } else {
            setConversations([]);
        }
    }, [walletAddress]);

    const fetchConversations = async (userId: string): Promise<void> => {
        try {
            const response = await fetch(`/api/anthropic?userId=${encodeURIComponent(userId)}`);
            const data: { conversations?: Conversation[]; error?: string } = await response.json();
            if (data.conversations) {
                setConversations(data.conversations);
            } else {
                setError(data.error || "Failed to load conversation history");
            }
        } catch (err) {
            setError("Failed to load conversation history");
        }
    };

    const getFileIcon = (fileType: string): React.ReactElement => {
        if (fileType.startsWith("image/")) return <File className="w-4 h-4" />;
        if (fileType.includes("text/") || fileType.includes("json"))
            return <FileText className="w-4 h-4" />;
        if (
            fileType.includes("javascript") ||
            fileType.includes("typescript") ||
            fileType.includes("python") ||
            fileType.includes("java")
        )
            return <FileCode className="w-4 h-4" />;
        if (
            fileType.includes("spreadsheet") ||
            fileType.includes("excel") ||
            fileType.includes("csv")
        )
            return <FileSpreadsheet className="w-4 h-4" />;
        return <File className="w-4 h-4" />;
    };

    const handleFileUpload = async (files: File[]): Promise<void> => {
        const newFiles: UploadedFile[] = [];

        for (let file of files) {
            if (file.size > 10 * 1024 * 1024) {
                setError(`File "${file.name}" is too large. Maximum size is 10MB.`);
                continue;
            }

            try {
                let content: string | ArrayBuffer;

                if (file.type.startsWith("image/")) {
                    content = await new Promise<string | ArrayBuffer>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            if (e.target && e.target.result) {
                                resolve(e.target.result);
                            }
                        };
                        reader.readAsDataURL(file);
                    });
                } else if (file.type === "application/pdf") {
                    content = "[PDF file - will be processed by AI]";
                } else if (
                    file.type.includes("excel") ||
                    file.type.includes("spreadsheet")
                ) {
                    content = "[Excel file - will be processed by AI]";
                } else {
                    content = await new Promise<string | ArrayBuffer>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            if (e.target && e.target.result) {
                                resolve(e.target.result);
                            }
                        };
                        reader.readAsText(file);
                    });
                }

                newFiles.push({
                    id: Date.now() + Math.random(),
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    content,
                    lastModified: file.lastModified,
                });
            } catch (error) {
                console.error(`Error reading file ${file.name}:`, error);
                setError(`Failed to read file "${file.name}"`);
            }
        }

        const updatedFiles = [...uploadedFiles, ...newFiles];
        setUploadedFiles(updatedFiles);
        sessionStorage.setItem("uploadedFiles", JSON.stringify(updatedFiles));
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileUpload(files);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.relatedTarget as Node;
        if (!e.currentTarget.contains(target)) {
            setIsDragging(false);
        }
    };

    const removeFile = (fileId: number): void => {
        const updatedFiles = uploadedFiles.filter((file) => file.id !== fileId);
        setUploadedFiles(updatedFiles);
        sessionStorage.setItem("uploadedFiles", JSON.stringify(updatedFiles));
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const handleStreamingGenerate = (): void => {
        if (!prompt.trim() && uploadedFiles.length === 0) {
            setError("Please describe what you want to build or upload files to generate code from");
            return;
        }

        // Set loading state
        setIsGenerating(true);

        // Store prompt and files in sessionStorage for the streaming page
        sessionStorage.setItem("currentPrompt", prompt);
        sessionStorage.setItem("currentUploadedFiles", JSON.stringify(uploadedFiles));

        // Navigate to streaming page
        const searchParams = new URLSearchParams();
        searchParams.set('prompt', encodeURIComponent(prompt));
        if (uploadedFiles.length > 0) {
            searchParams.set('uploadedFiles', encodeURIComponent(JSON.stringify(uploadedFiles)));
        }
        
        // Small timeout to show loading state before navigation
        setTimeout(() => {
            router.push(`/streaming?${searchParams.toString()}`);
        }, 500);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleStreamingGenerate();
        }
    };

    const handleModelSelect = (model: string): void => {
        setSelectedModel(model);
        setIsDropdownOpen(false);
    };

    const handleClaudeModelSelect = (model: string): void => {
        setSelectedClaudeModel(model);
        setIsClaudeDropdownOpen(false);
    };

    const examples: string[] = [
        "Build a meme coin landing page",
        "Build a leaderboard for token holders",
        "Build a dashboard for community points",
        "Build a to-do app with dark mode",
        "Build a feedback form with emoji reactions",
        "Start a blank app with React + Tailwind",
    ];

    // Theme-aware class names
    const backgroundClass = theme === 'light' 
        ? 'min-h-screen bg-white text-gray-900 transition-colors duration-300' 
        : 'min-h-screen bg-black text-white transition-colors duration-300';
    
    const backgroundGradient = theme === 'light' 
        ? 'fixed inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-white to-gray-100'
        : 'fixed inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-black to-gray-900';
    
    const gridPattern = theme === 'light' 
        ? 'absolute inset-0 bg-grid-slate-100 opacity-20'
        : 'absolute inset-0 bg-grid-slate-800 opacity-20';
    
    const glowEffect = theme === 'light' 
        ? 'absolute top-1/3 left-1/3 w-[600px] h-[400px] bg-blue-500/10 rounded-full blur-3xl'
        : 'absolute top-1/3 left-1/3 w-[600px] h-[400px] bg-lime-500/10 rounded-full blur-3xl';

    return (
        <>
            <style jsx>{`
                @keyframes borderGlow {
                    0%, 100% { 
                        background-position: 0% 50%;
                        filter: hue-rotate(0deg);
                    }
                    25% { 
                        background-position: 100% 50%;
                        filter: hue-rotate(90deg);
                    }
                    50% { 
                        background-position: 100% 100%;
                        filter: hue-rotate(180deg);
                    }
                    75% { 
                        background-position: 0% 100%;
                        filter: hue-rotate(270deg);
                    }
                }

                @keyframes moveLine {
                    0% {
                        transform: translateX(-100%);
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    90% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateX(100vw);
                        opacity: 0;
                    }
                }

                .animated-line {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: ${theme === 'light' 
                        ? 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, #ec4899, transparent)'
                        : 'linear-gradient(90deg, transparent, #00ff87, #60efff, #ff6b6b, transparent)'
                    };
                    z-index: 1000;
                    animation: moveLine 3s ease-in-out infinite;
                    box-shadow: ${theme === 'light'
                        ? '0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.3), 0 0 30px rgba(236, 72, 153, 0.2)'
                        : '0 0 10px rgba(0, 255, 135, 0.5), 0 0 20px rgba(96, 239, 255, 0.3), 0 0 30px rgba(255, 107, 107, 0.2)'
                    };
                }

                .animated-line::before {
                    content: '';
                    position: absolute;
                    top: -1px;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: inherit;
                    filter: blur(2px);
                    opacity: 0.6;
                }

                .animated-line::after {
                    content: '';
                    position: absolute;
                    top: -2px;
                    left: 0;
                    right: 0;
                    height: 6px;
                    background: inherit;
                    filter: blur(8px);
                    opacity: 0.3;
                }

                .animated-border {
                    position: relative;
                    background: ${theme === 'light' 
                        ? 'rgba(243, 244, 246, 0.8)' 
                        : 'rgba(17, 24, 39, 0.4)'
                    };
                    backdrop-filter: blur(16px);
                    border-radius: 24px;
                    overflow: hidden;
                }

                .animated-border::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    padding: 2px;
                    background: ${theme === 'light'
                        ? 'linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #10b981, #3b82f6)'
                        : 'linear-gradient(45deg, #00ff87, #60efff, #ff6b6b, #ffd93d, #ff6bcb, #00ff87)'
                    };
                    background-size: 400% 400%;
                    border-radius: 24px;
                    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    mask-composite: xor;
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    animation: borderGlow 4s ease-in-out infinite;
                }

                .animated-border::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: ${theme === 'light'
                        ? 'linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1), rgba(245, 158, 11, 0.1), rgba(16, 185, 129, 0.1))'
                        : 'linear-gradient(45deg, rgba(0, 255, 135, 0.1), rgba(96, 239, 255, 0.1), rgba(255, 107, 107, 0.1), rgba(255, 217, 61, 0.1), rgba(255, 107, 203, 0.1))'
                    };
                    background-size: 400% 400%;
                    border-radius: 24px;
                    animation: borderGlow 4s ease-in-out infinite;
                    filter: blur(20px);
                    opacity: 0.3;
                    z-index: -1;
                }

                .glass-button {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
            `}</style>
            
            <div className={backgroundClass} suppressHydrationWarning>
                {/* Animated Line */}
                <div className="animated-line"></div>
                
                {/* Background Effects */}
                <div className={backgroundGradient}>
                    {/* Grid pattern overlay */}
                    <div className={gridPattern}></div>
                    
                    {/* Soft glow effects */}
                    <div className={glowEffect}></div>
                    <div className="absolute bottom-1/3 right-1/3 w-[500px] h-[400px] bg-purple-500/10 rounded-full blur-3xl"></div>
                </div>

                {/* Header */}
                <header className="flex items-center justify-between py-4 px-6 relative z-10">
                    <div className="flex items-center gap-3">
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
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Theme Toggle Button */}
                        <button
                            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                            className="flex items-center justify-center w-10 h-10 glass-button rounded-full text-gray-300 hover:text-lime-400 transition-all duration-300"
                            title="Switch theme"
                        >
                            {theme === 'light' ? (
                                <Moon className="w-4 h-4" />
                            ) : (
                                <Sun className="w-4 h-4" />
                            )}
                        </button>

                        {walletAddress ? (
                            <div className="flex items-center gap-2 glass-button rounded-full px-4 py-2">
                                <Wallet className="w-4 h-4 text-lime-400" />
                                <span className="text-sm font-medium text-gray-300">
                                    {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                                </span>
                                <button
                                    onClick={() => {
                                        disconnectWallet();
                                        localStorage.removeItem("userId");
                                        setConversations([]);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-400 transition-colors ml-1"
                                    title="Disconnect wallet"
                                >
                                    <LogOut className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={connectWallet}
                                disabled={connecting}
                                className="flex items-center gap-2 px-4 py-2 glass-button rounded-full text-gray-300 hover:text-lime-400 disabled:opacity-50 transition-all duration-300 transform hover:scale-[1.02]"
                            >
                                {connecting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Wallet className="w-4 h-4" />
                                )}
                                <span className="text-sm font-medium">
                                    {connecting ? "Connecting..." : "Connect Wallet"}
                                </span>
                            </button>
                        )}
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-4xl mx-auto px-6 py-12 md:py-20 relative z-10">
                    {/* Title Section */}
                    <div className="text-center mb-16 relative">
                        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
                            Build from a <span className="text-lime-400">single prompt</span>
                        </h1>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                            Go from idea to live app in minutes using natural language. Powered by <span className="text-lime-400">$SPIN</span>.
                        </p>
                    </div>

                    {/* Input Area with Animated Border */}
                    <div className="relative mb-8">
                        {/* Main card with animated border */}
                        <div className="animated-border">
                            {/* Prompt Input */}
                            <div className="p-6 relative z-10">
                                <div
                                    className={`relative transition-all duration-300 ${
                                        isDragging
                                            ? "ring-2 ring-lime-400/50 scale-[1.01]"
                                            : ""
                                    }`}
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                >
                                    <textarea
                                        ref={promptRef}
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder=""
                                        className={theme === 'light'
                                            ? "w-full min-h-[100px] p-4 bg-white/50 border border-gray-300/50 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none text-lg transition-all"
                                            : `w-full min-h-[100px] p-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-lime-500/50 resize-none text-lg transition-all ${
                                                isDragging ? "bg-lime-400/5" : ""
                                            }`
                                        }
                                        disabled={isGenerating}
                                    />
                                    
                                    {/* Animated Placeholder Overlay */}
                                    {!prompt && (
                                        <div className={theme === 'light'
                                            ? "absolute top-4 left-4 pointer-events-none text-lg text-gray-500 flex items-center"
                                            : "absolute top-4 left-4 pointer-events-none text-lg text-gray-500 flex items-center"
                                        }>
                                            <span className="typewriter-text">
                                                {placeholderText}
                                            </span>
                                            <span className={theme === 'light'
                                                ? "typewriter-cursor ml-1 animate-pulse text-blue-400"
                                                : "typewriter-cursor ml-1 animate-pulse text-lime-400"
                                            }>|</span>
                                        </div>
                                    )}
                                    
                                    {isDragging && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-lime-400/5 rounded-2xl border-2 border-dashed border-lime-400/30">
                                            <div className="text-lime-400 text-center">
                                                <Upload className="w-8 h-8 mx-auto mb-2" />
                                                <p className="text-sm font-medium">Drop files here</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Quick action buttons */}
                                <div className="flex items-center gap-3 mt-4">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center justify-center w-10 h-10 glass-button rounded-full text-gray-300 hover:text-lime-400 transition-all duration-300"
                                        title="Add files"
                                    >
                                        <Paperclip className="w-4 h-4" />
                                    </button>
                                    
                                    {/* S-1 Model Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className="flex items-center gap-2 px-3 py-2 glass-button rounded-full text-gray-300 hover:text-lime-400 transition-all duration-300"
                                            title="Select S-1 Model"
                                        >
                                            <Bot className="w-4 h-4" />
                                            <span className="text-sm font-medium">{selectedModel}</span>
                                            <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        {/* Dropdown Menu */}
                                        {isDropdownOpen && (
                                            <div className="absolute bottom-full left-0 mb-2 min-w-[250px] glass-button rounded-2xl border border-gray-700/50 shadow-xl z-50">
                                                <div className="p-2">
                                                    <button
                                                        onClick={() => handleModelSelect("S-1")}
                                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-700/30 transition-colors text-left"
                                                    >
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-200">S-1</div>
                                                            <div className="text-xs text-gray-400">Stable & thorough</div>
                                                        </div>
                                                        {selectedModel === "S-1" && (
                                                            <Check className="w-4 h-4 text-lime-400" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleModelSelect("S-1.1")}
                                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-700/30 transition-colors text-left"
                                                    >
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-200">S-1.1</div>
                                                            <div className="text-xs text-gray-400">Fast and Flexible</div>
                                                        </div>
                                                        {selectedModel === "S-1.1" && (
                                                            <Check className="w-4 h-4 text-lime-400" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Claude Model Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsClaudeDropdownOpen(!isClaudeDropdownOpen)}
                                            className="flex items-center gap-2 px-3 py-2 glass-button rounded-full text-gray-300 hover:text-lime-400 transition-all duration-300"
                                            title="Select Claude Model"
                                        >
                                            <Brain className="w-4 h-4" />
                                            <span className="text-sm font-medium">
                                                {selectedClaudeModel === "Claude 4.0 Sonnet" ? "Claude 4.0" : "GPT-5"}
                                            </span>
                                            <ChevronDown className={`w-3 h-3 transition-transform ${isClaudeDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        {/* Claude Dropdown Menu */}
                                        {isClaudeDropdownOpen && (
                                            <div className="absolute bottom-full left-0 mb-2 min-w-[300px] glass-button rounded-2xl border border-gray-700/50 shadow-xl z-50">
                                                <div className="p-2">
                                                    <button
                                                        onClick={() => handleClaudeModelSelect("Claude 4.0 Sonnet")}
                                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-700/30 transition-colors text-left"
                                                    >
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-200">Claude 4.0 Sonnet</div>
                                                            <div className="text-xs text-gray-400">Advanced Anthropic Model</div>
                                                        </div>
                                                        {selectedClaudeModel === "Claude 4.0 Sonnet" && (
                                                            <Check className="w-4 h-4 text-lime-400" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleClaudeModelSelect("GPT-5(Beta)")}
                                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-700/30 transition-colors text-left"
                                                    >
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-200">GPT-5(Beta)</div>
                                                            <div className="text-xs text-gray-400">Newest OpenAI model</div>
                                                        </div>
                                                        {selectedClaudeModel === "GPT-5(Beta)" && (
                                                            <Check className="w-4 h-4 text-lime-400" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Generate button */}
                                <div className="flex justify-end mt-6">
                                    <button
                                        onClick={handleStreamingGenerate}
                                        disabled={(!prompt.trim() && uploadedFiles.length === 0) || isGenerating}
                                        className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-semibold transition-all ${
                                            (!prompt.trim() && uploadedFiles.length === 0) || isGenerating
                                                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                                                : "bg-lime-500 text-black hover:bg-lime-400 shadow-lg hover:shadow-lime-500/25 transform hover:scale-105"
                                        }`}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Generating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-5 h-5" />
                                                <span>Generate App</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 rounded-2xl">
                                        <p className="text-sm text-red-300">{error}</p>
                                    </div>
                                )}
                            </div>

                            {/* Uploaded Files Display */}
                            {uploadedFiles.length > 0 && (
                                <div className="border-t border-gray-800/50 p-4 bg-gray-900/30 relative z-10">
                                    <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                                        <File className="w-4 h-4 text-lime-400" />
                                        Attached Files ({uploadedFiles.length})
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                        {uploadedFiles.map((file) => (
                                            <div
                                                key={file.id}
                                                className="flex items-center justify-between p-2 bg-gray-800/50 rounded-2xl border border-gray-700/30"
                                            >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className="text-gray-400">
                                                        {getFileIcon(file.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-300 truncate">
                                                            {file.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {formatFileSize(file.size)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFile(file.id)}
                                                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Hidden file input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => {
                                if (e.target.files) {
                                    handleFileUpload(Array.from(e.target.files));
                                }
                            }}
                            multiple
                            className="hidden"
                            accept=".txt,.js,.ts,.jsx,.tsx,.json,.py,.java,.csv,.xlsx,.pdf,.jpg,.jpeg,.png,.gif"
                        />
                    </div>

                    {/* Example Templates */}
                    <div className="mt-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {examples.map((example, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setPrompt(example);
                                        promptRef.current?.focus();
                                    }}
                                    className="text-left text-sm p-3 bg-gray-800/40 rounded-2xl hover:bg-gray-700/50 transition-all text-gray-300 hover:text-white border border-gray-700/30 hover:border-lime-500/30"
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent Projects */}
                    {conversations.length > 0 && (
                        <div className="mt-16">
                            <h2 className="text-xl font-semibold text-white mb-4">Recent Projects</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {conversations.slice(0, 4).map((conversation) => (
                                    <div
                                        key={conversation._id}
                                        className="p-3 bg-gray-800/30 rounded-2xl border border-gray-800/50 cursor-pointer hover:bg-gray-700/40 transition-all hover:border-gray-700/50"
                                        onClick={() => {
                                            setPrompt(conversation.prompt);
                                            setUploadedFiles(conversation.uploadedFiles || []);
                                            promptRef.current?.focus();
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">
                                                    {conversation.prompt || "File-based generation"}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(conversation.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                            <span className="text-xs text-gray-400 bg-gray-800/80 px-2 py-1 rounded-full ml-2">
                                                {conversation.generatedFiles
                                                    ? `${Object.keys(conversation.generatedFiles).length} files`
                                                    : "No files"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default HomePage;