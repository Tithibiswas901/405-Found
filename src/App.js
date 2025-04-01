// App.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import WavyBackground from "./WavyBackground";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  FiSend,
  FiMic,
  FiSettings,
  FiX,
  FiMenu,
  FiImage,
  FiDownload,
  FiCopy,
  FiShare2,
  FiRefreshCw,
  FiHelpCircle,
  FiStar,
  FiBookmark,
  FiFileText,
  FiArrowUp,
  FiTrash2,
  FiEdit,
  FiMoon,
  FiSun,
  FiPaperclip,
  FiGlobe,
  FiSave,
  FiFilter,
  FiClock,
  FiPlus,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  vs,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useMediaQuery from "@mui/material/useMediaQuery";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import { jsPDF } from "jspdf";

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI("AIzaSyAIF08Blw1WtLmZkzZfW9Z40Y_lb_eKbio");

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [model, setModel] = useState("gemini-2.0-flash");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [theme, setTheme] = useState("dark");
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [imageUpload, setImageUpload] = useState(null);
  const [fileUploads, setFileUploads] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [language, setLanguage] = useState("en");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [filterApplied, setFilterApplied] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    bookmarked: false,
    timeRange: "all",
  });
  const [contextWindow, setContextWindow] = useState(10);
  const [suggestedResponses, setSuggestedResponses] = useState([]);
  const [apiStatus, setApiStatus] = useState("ready"); // "ready", "limited", "error"

  // Queue for API requests
  const [requestQueue, setRequestQueue] = useState([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Apply theme to document element when it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    // Also store the preference in localStorage for persistence
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Load saved theme preference on initial render
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Load conversations from local storage when the app starts
  useEffect(() => {
    const savedConversations = localStorage.getItem("conversations");
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        setConversations(parsed);

        // If there was an active conversation, try to restore it
        const lastActiveId = localStorage.getItem("lastActiveConversationId");
        if (lastActiveId) {
          const activeConversation = parsed.find((c) => c.id === lastActiveId);
          if (activeConversation) {
            setCurrentConversationId(lastActiveId);
            setMessages(activeConversation.messages || []);
          }
        }
      } catch (error) {
        console.error("Error loading saved conversations:", error);
        toast.error("Could not load saved conversations");
      }
    }
  }, []);

  // Update the active conversation in storage when messages change
  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      const updatedConversations = conversations.map((conv) =>
        conv.id === currentConversationId
          ? { ...conv, messages: messages }
          : conv
      );

      setConversations(updatedConversations);
      localStorage.setItem(
        "conversations",
        JSON.stringify(updatedConversations)
      );
      localStorage.setItem("lastActiveConversationId", currentConversationId);
    }
  }, [messages, currentConversationId]);

  const processRequestQueue = useCallback(async () => {
    if (isProcessingQueue || requestQueue.length === 0) return;

    setIsProcessingQueue(true);
    const request = requestQueue[0];

    try {
      await request.execute();
    } catch (error) {
      console.error("Error processing queued request:", error);
      request.reject(error);
    } finally {
      // Remove the processed request
      setRequestQueue((queue) => queue.slice(1));

      // Add a small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsProcessingQueue(false);

      // Process next request if available
      if (requestQueue.length > 1) {
        processRequestQueue();
      }
    }
  }, [requestQueue, isProcessingQueue]);

  // Effect to watch the queue and process requests
  useEffect(() => {
    if (requestQueue.length > 0 && !isProcessingQueue) {
      processRequestQueue();
    }
  }, [requestQueue, isProcessingQueue, processRequestQueue]);

  // Function to add a request to the queue
  const queueGeminiRequest = (requestFunction) => {
    return new Promise((resolve, reject) => {
      const request = {
        execute: async () => {
          try {
            const result = await requestFunction();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        reject,
      };

      setRequestQueue((queue) => [...queue, request]);
    });
  };

  const callGeminiWithRetry = async (callFunction, maxRetries = 3) => {
    let retries = 0;
    let delay = 1000; // Start with 1 second delay

    while (retries < maxRetries) {
      try {
        return await callFunction();
      } catch (error) {
        if (
          error.message?.includes("Too many requests") ||
          error.message?.includes("429") ||
          error.message?.includes("resource exhausted")
        ) {
          // Increase retries and calculate exponential backoff
          retries++;
          if (retries >= maxRetries) {
            throw error; // Max retries reached, propagate the error
          }

          // Log the backoff
          console.log(
            `Rate limited by Gemini API. Retrying in ${delay / 1000}s...`
          );
          toast.info(`API busy. Retrying in ${delay / 1000}s...`);

          // Wait for the delay period
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Exponential backoff: double delay each time (1s, 2s, 4s)
          delay *= 2;
        } else {
          // For other errors, don't retry
          throw error;
        }
      }
    }
  };

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto scroll to the latest message when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check for mobile viewport
  const isMobile = useMediaQuery("(max-width:767px)");
  const isTablet = useMediaQuery("(min-width:768px) and (max-width:1023px)");

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() && !imageUpload && !fileUploads.length) return;

    // If no conversation exists, create a new one
    if (!currentConversationId) {
      createNewConversation();
    }

    // Build content with attachments
    let content = inputValue;
    const attachments = [];

    if (imageUpload) {
      attachments.push({ type: "image", url: imageUpload });
    }

    if (fileUploads.length > 0) {
      fileUploads.forEach((file) => {
        attachments.push({ type: "file", name: file.name, url: file.url });
      });
    }

    // Add user message to the chat
    const userMessage = {
      role: "user",
      content,
      timestamp: new Date().toISOString(),
      attachments,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setImageUpload(null);
    setFileUploads([]);
    setIsLoading(true);
    setSuggestedResponses([]);

    try {
      // Call the Gemini API with retry logic
      await callGeminiWithRetry(async () => {
        const generativeModel = genAI.getGenerativeModel({ model });

        // Only use the most recent messages for context to avoid token limits
        const recentMessages = messages.slice(-contextWindow);

        // Format the chat history for the API
        const history = recentMessages.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        }));

        // Create a chat session
        const chat = generativeModel.startChat({
          history,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        });

        // Send the message and get response
        const result = await chat.sendMessage(content);
        const response = await result.response;
        const text = await response.text(); // Fix: Await the text response

        // Add the AI response to the chat
        const newMessage = {
          role: "assistant",
          content: text,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, newMessage]);
      });
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again later.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = () => {
    const newId = Date.now().toString();
    const newConversation = {
      id: newId,
      title: "New Conversation",
      timestamp: new Date().toISOString(),
      messages: [],
    };

    const updatedConversations = [newConversation, ...conversations];
    setConversations(updatedConversations);
    setCurrentConversationId(newId);
    setMessages([]);
    setSidebarOpen(false);

    // Save to local storage
    localStorage.setItem("conversations", JSON.stringify(updatedConversations));
    localStorage.setItem("lastActiveConversationId", newId);

    return newId;
  };

  const loadConversation = (id) => {
    const conversation = conversations.find((conv) => conv.id === id);
    if (conversation) {
      setMessages(conversation.messages || []);
      setCurrentConversationId(id);
      setSidebarOpen(false);

      // Update last active conversation
      localStorage.setItem("lastActiveConversationId", id);
    }
  };

  const deleteConversation = (id, e) => {
    if (e) e.stopPropagation();

    const updatedConversations = conversations.filter((conv) => conv.id !== id);
    setConversations(updatedConversations);

    // Update localStorage
    localStorage.setItem("conversations", JSON.stringify(updatedConversations));

    if (id === currentConversationId) {
      setMessages([]);
      setCurrentConversationId(null);
      localStorage.removeItem("lastActiveConversationId");
    }
  };

  const clearAllConversations = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all conversations? This cannot be undone."
      )
    ) {
      setConversations([]);
      setMessages([]);
      setCurrentConversationId(null);

      // Clear from local storage
      localStorage.removeItem("conversations");
      localStorage.removeItem("lastActiveConversationId");

      toast.success("All conversations cleared");
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const startVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      toast.error("Speech recognition not supported in your browser");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    // Set language for speech recognition
    recognition.lang = language === "en" ? "en-US" : language;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join("");

      setInputValue(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      toast.error(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
    setShowActionMenu(null);
  };

  const shareConversation = (messageIndex) => {
    const message = messages[messageIndex];
    if (navigator.share) {
      navigator
        .share({
          title: "Gemini Chat Conversation",
          text: message.content,
        })
        .catch((err) => {
          console.error("Error sharing:", err);
          copyToClipboard(message.content);
        });
    } else {
      copyToClipboard(message.content);
    }
    setShowActionMenu(null);
  };

  const downloadConversation = (format = "txt") => {
    // Build the conversation text
    const conversationText = messages
      .map((msg, i) => `(${i + 1}) ${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");

    if (format === "md") {
      // Download as Markdown
      const blob = new Blob([conversationText], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "chat-history.md";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    if (format === "pdf") {
      // Download as PDF
      const pdfContent = conversationText || "No conversation available.";
      const doc = new jsPDF();
      doc.text(pdfContent, 10, 10);
      doc.save("chat-history.pdf");
      return;
    }

    // Default to text format
    const blob = new Blob([conversationText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "chat-history.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const regenerateResponse = async (index) => {
    if (isLoading) return;

    // Find the last user message before this assistant message
    const userMessageIndex = messages
      .slice(0, index)
      .map((m) => m.role)
      .lastIndexOf("user");
    if (userMessageIndex === -1) return;

    const userInput = messages[userMessageIndex].content;

    // Remove all messages after the user message
    const newMessages = messages.slice(0, userMessageIndex + 1);
    setMessages(newMessages);
    setIsLoading(true);
    setShowActionMenu(null);

    try {
      const generativeModel = genAI.getGenerativeModel({ model });

      const history = newMessages.slice(0, userMessageIndex).map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

      const chat = generativeModel.startChat({
        history,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      });

      const result = await chat.sendMessage(userInput);
      const response = await result.response;
      const text = response.text();

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: text,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error regenerating response:", error);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBookmark = (index) => {
    const updatedMessages = [...messages];
    updatedMessages[index] = {
      ...updatedMessages[index],
      bookmarked: !updatedMessages[index].bookmarked,
    };
    setMessages(updatedMessages);
    setShowActionMenu(null);

    toast.success(
      updatedMessages[index].bookmarked
        ? "Message bookmarked"
        : "Bookmark removed"
    );
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Process each file
    const newUploads = files.map((file) => {
      // Create URL for image preview
      const url = URL.createObjectURL(file);

      return {
        name: file.name,
        size: file.size,
        type: file.type,
        url: url,
      };
    });

    setFileUploads((prev) => [...prev, ...newUploads]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index) => {
    const newFiles = [...fileUploads];

    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(newFiles[index].url);

    newFiles.splice(index, 1);
    setFileUploads(newFiles);
  };

  const removeImage = () => {
    setImageUpload(null);
  };

  const startEditTitle = () => {
    const conversation = conversations.find(
      (c) => c.id === currentConversationId
    );
    if (conversation) {
      setEditTitleValue(conversation.title);
      setIsEditingTitle(true);
    }
  };

  const saveEditTitle = () => {
    if (!editTitleValue.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    const updatedConversations = conversations.map((conv) =>
      conv.id === currentConversationId
        ? { ...conv, title: editTitleValue.trim() }
        : conv
    );

    setConversations(updatedConversations);
    localStorage.setItem("conversations", JSON.stringify(updatedConversations));
    setIsEditingTitle(false);
    toast.success("Title updated");
  };

  const cancelEditTitle = () => {
    setIsEditingTitle(false);
  };

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const applyFilter = (options) => {
    setFilterOptions(options);
    setFilterApplied(true);
  };

  const clearFilter = () => {
    setFilterOptions({
      bookmarked: false,
      timeRange: "all",
    });
    setFilterApplied(false);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getFilteredMessages = () => {
    if (!filterApplied) return messages;

    let filtered = [...messages];

    if (filterOptions.bookmarked) {
      filtered = filtered.filter((msg) => msg.bookmarked);
    }

    if (filterOptions.timeRange !== "all") {
      const now = new Date();
      let cutoff = new Date();

      switch (filterOptions.timeRange) {
        case "today":
          cutoff.setHours(0, 0, 0, 0);
          break;
        case "week":
          cutoff.setDate(now.getDate() - 7);
          break;
        case "month":
          cutoff.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }

      filtered = filtered.filter((msg) => new Date(msg.timestamp) >= cutoff);
    }

    return filtered;
  };

  // Get the current conversation
  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  // Helper function to get conversation summary for display
  const getConversationSummary = (conversation) => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return "Empty conversation";
    }

    // Get the first user message for the summary
    const firstUserMessage = conversation.messages.find(
      (msg) => msg.role === "user"
    );
    if (firstUserMessage) {
      // Truncate long messages
      return firstUserMessage.content.length > 60
        ? firstUserMessage.content.substring(0, 60) + "..."
        : firstUserMessage.content;
    }

    return "Conversation";
  };

  // Custom renderer for code blocks in markdown
  const components = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <div className="code-block-container">
          <div className="code-block-header">
            <span>{match[1]}</span>
            <button
              className="code-copy-button"
              onClick={() =>
                copyToClipboard(String(children).replace(/\n$/, ""))
              }
            >
              <FiCopy size={14} />
            </button>
          </div>
          <SyntaxHighlighter
            style={theme === "dark" ? vscDarkPlus : vs}
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  // Make sure iOS detection is defined for SwipeableDrawer
  const iOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Render conversation items with summaries
  const renderConversationItems = () => {
    return conversations.map((conv) => (
      <motion.div
        key={conv.id}
        className={`conversation-item ${
          conv.id === currentConversationId ? "active" : ""
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => loadConversation(conv.id)}
      >
        <div className="conversation-info">
          <span className="conversation-title">
            {conv.title || "New Conversation"}
          </span>
          <span className="conversation-preview">
            {getConversationSummary(conv)}
          </span>
          <span className="conversation-date">
            {new Date(conv.timestamp).toLocaleDateString()}
          </span>
        </div>
        <div className="conversation-actions">
          <button
            className="edit-conversation-btn"
            onClick={(e) => {
              e.stopPropagation();
              loadConversation(conv.id);
              startEditTitle();
            }}
            title="Edit title"
          >
            <FiEdit size={14} />
          </button>
          <button
            className="delete-conversation-btn"
            onClick={(e) => deleteConversation(conv.id, e)}
            title="Delete conversation"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </motion.div>
    ));
  };

  // Use either swipeable drawer for mobile or regular sidebar
  const renderSidebar = () => {
    console.log("Rendering sidebar, sidebarOpen:", sidebarOpen); // Keep this for debugging
    const sidebarContent = (
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Gemini Chat</h2>
          <div className="sidebar-header-actions">
            <button
              className="icon-button new-chat-icon"
              onClick={createNewConversation}
              title="New Chat"
            >
              <FiPlus size={18} />
            </button>
            <button
              className="icon-button"
              onClick={() => setSidebarOpen(false)}
            >
              <FiX />
            </button>
          </div>
        </div>
        <motion.button
          className="new-chat-button"
          onClick={createNewConversation}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <FiPlus className="button-icon" size={16} />
          New Chat
        </motion.button>

        <div className="conversations-container">
          <div className="conversations-header">
            <h3>Recent Conversations</h3>
            {conversations.length > 0 && (
              <button
                className="clear-all-button"
                onClick={clearAllConversations}
                title="Clear all conversations"
              >
                <FiTrash2 size={16} />
              </button>
            )}
          </div>

          {conversations.length === 0 ? (
            <p className="no-conversations">No conversations yet</p>
          ) : (
            <div className="conversations-list">
              {renderConversationItems()}
            </div>
          )}
        </div>

        <div className="sidebar-options">
          <motion.button
            className="sidebar-option"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSettingsOpen(true);
              setSidebarOpen(false);
            }}
          >
            <FiSettings /> Settings
          </motion.button>
          <motion.button
            className="sidebar-option"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <FiSun /> : <FiMoon />}{" "}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </motion.button>
          <motion.button
            className="sidebar-option"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setHelpOpen(true);
              setSidebarOpen(false);
            }}
          >
            <FiHelpCircle /> Help & FAQ
          </motion.button>
        </div>
      </div>
    );

    if (isMobile) {
      return (
        <SwipeableDrawer
          anchor="left"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpen={() => setSidebarOpen(true)}
          className="mobile-drawer"
          disableBackdropTransition={!iOS}
          disableDiscovery={iOS}
          swipeAreaWidth={30}
        >
          {sidebarContent}
        </SwipeableDrawer>
      );
    }

    return (
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            className="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          >
            <motion.div
              className="sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {sidebarContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Add this effect after your other useEffect hooks
  useEffect(() => {
    function handleClickOutside(event) {
      const dropdown = document.getElementById("downloadOptions");
      if (
        dropdown &&
        dropdown.classList.contains("show") &&
        !event.target.closest(".download-dropdown")
      ) {
        dropdown.classList.remove("show");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      className={`app-container ${isMobile ? "mobile" : ""} ${
        isTablet ? "tablet" : ""
      }`}
    >
      {/* Make sure WavyBackground is the first component */}
      <WavyBackground />

      {/* Toast Container */}
      <ToastContainer
        position={isMobile ? "bottom-center" : "top-right"}
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme}
      />

      {/* Sidebar */}
      {renderSidebar()}

      {/* Settings Modal */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            className="settings-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSettingsOpen(false)}
          >
            <motion.div
              className="settings-content"
              initial={{ scale: 0.8, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="settings-header">
                <h2>Settings</h2>
                <button
                  className="icon-button"
                  onClick={() => setSettingsOpen(false)}
                >
                  <FiX />
                </button>
              </div>
              <div className="settings-body">
                {/* Settings for model, temperature, max tokens */}
                {/* ...existing code... */}
                <div className="setting-item">
                  <label>Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
                <div className="setting-item setting-toggle">
                  <label>Auto-scroll to latest message</label>
                  <div className="toggle-switch">
                    <input type="checkbox" id="auto-scroll" defaultChecked />
                    <label htmlFor="auto-scroll"></label>
                  </div>
                </div>
              </div>
              <div className="settings-footer">
                <button
                  className="secondary-button"
                  onClick={() => setSettingsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  onClick={() => {
                    setSettingsOpen(false);
                    toast.success("Settings saved successfully");
                  }}
                >
                  Save Settings
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {helpOpen && (
          <motion.div
            className="help-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setHelpOpen(false)}
          >
            <motion.div
              className="help-content"
              initial={{ scale: 0.8, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="help-header">
                <h2>Help & FAQ</h2>
                <button
                  className="icon-button"
                  onClick={() => setHelpOpen(false)}
                >
                  <FiX />
                </button>
              </div>
              <div className="help-body">
                {/* Help content */}
                {/* ...existing code... */}
              </div>
              <div className="help-footer">
                <button
                  className="primary-button"
                  onClick={() => setHelpOpen(false)}
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div
        className={`main-content ${isMobile ? "mobile" : ""} ${
          isTablet ? "tablet" : ""
        }`}
      >
        <motion.div
          className="chat-header"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <button
            className="icon-button menu-button"
            onClick={() => {
              console.log("Menu button clicked, current state:", sidebarOpen);
              setSidebarOpen(true); // Always set to true on click, instead of toggling
            }}
            aria-label="Open menu"
          >
            <FiMenu />
          </button>
          {currentConversation && currentConversationId ? (
            isEditingTitle ? (
              <div className="edit-title-container">
                <input
                  type="text"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  autoFocus
                  className="edit-title-input"
                />
                <div className="edit-title-actions">
                  <button onClick={saveEditTitle} className="edit-title-save">
                    <FiSave size={16} />
                  </button>
                  <button
                    onClick={cancelEditTitle}
                    className="edit-title-cancel"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <h1 className="conversation-title" onClick={startEditTitle}>
                {currentConversation.title || "New Conversation"}
                <button className="edit-title-btn">
                  <FiEdit size={14} />
                </button>
              </h1>
            )
          ) : (
            <h1>Gemini Chat</h1>
          )}
          <div className="header-actions">
            {filterApplied && (
              <button
                className="filter-badge"
                onClick={clearFilter}
                title="Clear filter"
              >
                <FiFilter /> Filtered
                <FiX size={14} />
              </button>
            )}
            <button
              className="theme-toggle-button"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <FiSun size={16} /> : <FiMoon size={16} />}
            </button>
            <button className="model-badge">
              {model.replace("gemini-", "").toUpperCase()}
            </button>
            <div className="download-dropdown">
              <button
                className="download-button"
                onClick={() =>
                  document
                    .getElementById("downloadOptions")
                    .classList.toggle("show")
                }
                title="Download conversation"
              >
                <FiDownload size={16} /> Download
              </button>
              <div className="download-options" id="downloadOptions">
                <button onClick={() => downloadConversation("txt")}>
                  <FiFileText size={14} /> Text (.txt)
                </button>
                <button onClick={() => downloadConversation("md")}>
                  <FiFileText size={14} /> Markdown (.md)
                </button>
                <button onClick={() => downloadConversation("pdf")}>
                  <FiFileText size={14} /> PDF (.pdf)
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="messages-container" ref={messagesContainerRef}>
          {showScrollTop && (
            <button className="scroll-to-top-button" onClick={scrollToTop}>
              <FiArrowUp />
            </button>
          )}

          {getFilteredMessages().length === 0 ? (
            <motion.div
              className="welcome-screen"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <img
                src="/robot-avatar.svg"
                alt="AI Assistant"
                className="welcome-icon"
              />
              <h2>Welcome to Gemini Chat</h2>
              <p>Ask me anything to get started!</p>
              <div className="suggestion-chips">
                {[
                  "Write a story about...",
                  "Help me solve...",
                  "Explain how to...",
                  "Create code for...",
                  "Analyze this image...",
                  "Summarize this concept...",
                ].map((suggestion, i) => (
                  <motion.button
                    key={i}
                    className="suggestion-chip"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setInputValue(suggestion)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            getFilteredMessages().map((message, index) => (
              <motion.div
                key={index}
                className={`message ${
                  message.role === "user" ? "user-message" : "ai-message"
                } ${message.bookmarked ? "bookmarked" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="message-avatar">
                  {message.role === "user" ? "You" : "AI"}
                </div>
                <div className="message-bubble">
                  <div className="message-header">
                    <span className="message-sender">
                      {message.role === "user" ? "You" : "Gemini AI"}
                    </span>
                    <span className="message-time">
                      {message.timestamp && formatTimestamp(message.timestamp)}
                    </span>
                  </div>

                  <div className="message-content">
                    {message.attachments &&
                      message.attachments
                        .filter((att) => att.type === "image")
                        .map((image, idx) => (
                          <div key={idx} className="message-image-container">
                            <img
                              src={image.url}
                              alt="Attached"
                              className="message-image"
                            />
                          </div>
                        ))}

                    {message.attachments &&
                      message.attachments.filter((att) => att.type === "file")
                        .length > 0 && (
                        <div className="message-files">
                          {message.attachments
                            .filter((att) => att.type === "file")
                            .map((file, idx) => (
                              <div key={idx} className="file-attachment">
                                <FiFileText />
                                <span>{file.name}</span>
                              </div>
                            ))}
                        </div>
                      )}

                    <ReactMarkdown components={components}>
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  <div className="message-actions">
                    {message.role === "assistant" && (
                      <>
                        <motion.button
                          className="message-action-button"
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => copyToClipboard(message.content)}
                          title="Copy to clipboard"
                        >
                          <FiCopy size={16} />
                        </motion.button>
                        <motion.button
                          className="message-action-button"
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleBookmark(index)}
                          title={
                            message.bookmarked
                              ? "Remove bookmark"
                              : "Bookmark message"
                          }
                        >
                          <FiBookmark
                            size={16}
                            color={message.bookmarked ? "#4b7bec" : undefined}
                          />
                        </motion.button>
                        <motion.button
                          className="message-action-button"
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => regenerateResponse(index)}
                          title="Regenerate response"
                        >
                          <FiRefreshCw size={16} />
                        </motion.button>
                        <motion.button
                          className="message-action-button"
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => shareConversation(index)}
                          title="Share response"
                        >
                          <FiShare2 size={16} />
                        </motion.button>
                        <motion.div className="message-rating">
                          <motion.button
                            className="rating-button"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            title="Rate message"
                          >
                            <FiStar size={16} />
                          </motion.button>
                        </motion.div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}

          {isLoading && (
            <motion.div
              className="message ai-message"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="message-avatar">AI</div>
              <div className="message-bubble">
                <div className="message-content typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Suggested Response Chips */}
          {!isLoading && suggestedResponses.length > 0 && (
            <motion.div
              className="suggested-responses-container"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="suggested-responses-label">
                Suggested follow-ups:
              </div>
              <div className="suggested-responses">
                {suggestedResponses.map((response, index) => (
                  <motion.button
                    key={index}
                    className="suggested-response"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setInputValue(response);
                      textareaRef.current.focus();
                    }}
                  >
                    {response}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* File Upload Preview Area */}
        {(imageUpload || fileUploads.length > 0) && (
          <div className="file-previews-container">
            {imageUpload && (
              <div className="image-preview">
                <img src={imageUpload} alt="Preview" />
                <button className="remove-image-btn" onClick={removeImage}>
                  <FiX />
                </button>
              </div>
            )}

            {fileUploads.length > 0 && (
              <div className="file-uploads-list">
                {fileUploads.map((file, index) => (
                  <div key={index} className="file-upload-item">
                    <FiFileText />
                    <span>{file.name}</span>
                    <button
                      className="remove-file-btn"
                      onClick={() => removeFile(index)}
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <motion.form
          onSubmit={handleSubmit}
          className="input-form"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="input-container">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="input-actions">
              <motion.button
                type="button"
                className="icon-button upload-button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => fileInputRef.current.click()}
              >
                <FiImage />
              </motion.button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleFileUpload}
              />

              <motion.button
                type="button"
                className={`icon-button mic-button ${
                  isListening ? "listening" : ""
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={startVoiceInput}
              >
                <FiMic />
                {isListening && <span className="listening-indicator"></span>}
              </motion.button>

              <motion.button
                type="submit"
                className="icon-button send-button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={isLoading || (!inputValue.trim() && !imageUpload)}
              >
                <FiSend />
              </motion.button>
            </div>
          </div>
        </motion.form>
      </div>
    </div>
  );
}

export default App;
