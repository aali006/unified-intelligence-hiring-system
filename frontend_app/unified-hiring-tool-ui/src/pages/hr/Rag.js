
// import React, { useState, useRef, useEffect } from 'react';
// import './Rag.css';

// const RagChat = () => {
//     // 1. Start with an empty array for a clean slate
//     const [threads, setThreads] = useState([]);
//     const [activeThreadId, setActiveThreadId] = useState(null);
//     const [messages, setMessages] = useState([]);
//     const [input, setInput] = useState('');
//     const [loading, setLoading] = useState(false);
//     const chatEndRef = useRef(null);

//     const scrollToBottom = () => {
//         chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
//     };

//     useEffect(() => {
//         scrollToBottom();
//     }, [messages]);

//     const handleSend = async () => {
//         if (!input.trim()) return;

//         // If user starts typing but hasn't created a thread yet, create one automatically
//         if (!activeThreadId) {
//             createNewChat(input.substring(0, 20) + "...");
//         }

//         const userMessage = { sender: 'user', text: input };
//         setMessages(prev => [...prev, userMessage]);
//         const currentInput = input;
//         setInput('');
//         setLoading(true);

//         try {
//             const response = await fetch('http://localhost:8080/hr-chat/', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ query: currentInput }),
//             });
//             const data = await response.json();
//             setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
//         } catch (error) {
//             setMessages(prev => [...prev, { sender: 'bot', text: "Error connecting to backend." }]);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const createNewChat = (title = 'New Conversation') => {
//         const newId = Date.now();
//         const newThread = { id: newId, title: title };
//         setThreads([newThread, ...threads]);
//         setActiveThreadId(newId);
//         setMessages([]); // Clear chat for the new thread
//     };

//     return (
//         <div className="rag-layout">
//             {/* --- SIDEBAR --- */}
//             <div className="chat-sidebar">
//                 <button className="new-chat-btn" onClick={() => createNewChat()}>
//                     + New Chat
//                 </button>
//                 <div className="thread-list">
//                     {threads.length === 0 ? (
//                         <p className="no-threads">No recent chats</p>
//                     ) : (
//                         threads.map(thread => (
//                             <div 
//                                 key={thread.id} 
//                                 className={`thread-item ${activeThreadId === thread.id ? 'active' : ''}`}
//                                 onClick={() => setActiveThreadId(thread.id)}
//                             >
//                                 <span className="thread-icon">💬</span>
//                                 <div className="thread-info">
//                                     <p className="thread-title">{thread.title}</p>
//                                 </div>
//                             </div>
//                         ))
//                     )}
//                 </div>
//             </div>

//             {/* --- MAIN CHAT AREA --- */}
//             <div className="chat-main">
//                 <div className="chat-window">
//                     {!activeThreadId ? (
//                         <div className="welcome-screen">
//                             <div className="lion-logo">🦁</div>
//                             <h2>Welcome to HR Intelligence</h2>
//                             <p>Click "New Chat" or just start typing to begin.</p>
//                         </div>
//                     ) : (
//                         <>
//                             {messages.map((msg, index) => (
//                                 <div key={index} className={`message-bubble ${msg.sender}`}>
//                                     <div className="avatar">{msg.sender === 'user' ? 'HR' : '🦁'}</div>
//                                     <div className="message-text">{msg.text}</div>
//                                 </div>
//                             ))}
//                             {loading && (
//                                 <div className="message-bubble bot thinking">
//                                     <div className="avatar">🦁</div>
//                                     <div className="message-text italic">Searching database...</div>
//                                 </div>
//                             )}
//                         </>
//                     )}
//                     <div ref={chatEndRef} />
//                 </div>

//                 <div className="input-container">
//                     <div className="input-wrapper">
//                         <input 
//                             value={input} 
//                             onChange={(e) => setInput(e.target.value)}
//                             onKeyPress={(e) => e.key === 'Enter' && handleSend()}
//                             placeholder="Ask about your candidates..."
//                         />
//                         <button onClick={handleSend} disabled={loading} className="send-btn">
//                             Send
//                         </button>
//                     </div>
//                     <p className="disclaimer">AI may provide inaccurate info. Verify candidate details.</p>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default RagChat;


import React, { useState, useRef, useEffect } from 'react';
import './Rag.css';

const RagChat = () => {
    const [threads, setThreads] = useState([]);
    const [activeThreadId, setActiveThreadId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef(null);

    // 1. Define User Email (Crucial for fetching correct history)
    const user = JSON.parse(localStorage.getItem('user'));
    const userEmail = user?.email || "admin@company.com";

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 2. Load the Sidebar Threads on startup
    useEffect(() => {
        const fetchThreads = async () => {
            try {
                const res = await fetch(`http://localhost:8080/hr/threads/${userEmail}`);
                const data = await res.json();
                if (Array.isArray(data)) setThreads(data);
            } catch (err) {
                console.error("Failed to fetch threads", err);
            }
        };
        fetchThreads();
    }, [userEmail]);

    // 3. Load Messages when a sidebar item is clicked
    useEffect(() => {
        if (activeThreadId && !activeThreadId.toString().startsWith('temp_')) {
            const loadMessages = async () => {
                try {
                    const res = await fetch(`http://localhost:8080/hr/chat-history/${activeThreadId}`);
                    const data = await res.json();
                    setMessages(data);
                } catch (err) {
                    console.error("Failed to load history", err);
                }
            };
            loadMessages();
        }
    }, [activeThreadId]);

    // const handleSend = async () => {
    //     if (!input.trim()) return;

    //     // If no thread is selected, we create a temporary ID to start
    //     let threadIdToSend = activeThreadId;
    //     if (!threadIdToSend) {
    //         threadIdToSend = `temp_${Date.now()}`;
    //         setActiveThreadId(threadIdToSend);
    //     }

    //     const userMessage = { sender: 'user', text: input };
    //     setMessages(prev => [...prev, userMessage]);
    //     const currentInput = input;
    //     setInput('');
    //     setLoading(true);
        
    //     try {
    //         const response = await fetch('http://localhost:8080/hr-chat/', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ 
    //                 query: currentInput, 
    //                 thread_id: threadIdToSend.toString().startsWith('temp_') ? null : threadIdToSend, 
    //                 user_email: userEmail 
    //             }),
    //         });
    //         const data = await response.json();

    //         // If the backend generated a real UUID for a new thread, update our state
    //         if (threadIdToSend.toString().startsWith('temp_')) {
    //             setActiveThreadId(data.thread_id);
    //             // Refresh sidebar to show the new thread title
    //             const resThreads = await fetch(`http://localhost:8080/hr/threads/${userEmail}`);
    //             const updatedThreads = await resThreads.json();
    //             setThreads(updatedThreads);
    //         }
            
    //         setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
    //     } catch (error) {
    //         console.error("Chat failed", error);
    //         setMessages(prev => [...prev, { sender: 'bot', text: "Connection error. Is the backend running?" }]);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    const currentInput = input;
    
    // 1. Setup the UI for the new exchange
    setMessages(prev => [...prev, userMessage, { sender: 'bot', text: '' }]);
    setInput('');
    setLoading(true);

    try {
        const response = await fetch('http://localhost:8080/hr-chat/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: currentInput, 
                thread_id: activeThreadId, 
                user_email: userEmail 
            }),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // 2. We use a simple string that we update in each iteration
        let accumulated = ""; 

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulated += chunk;

            // 3. To fix the ESLint warning, we capture the CURRENT state 
            // of 'accumulated' into a local constant for the setter.
            const currentChunk = accumulated; 
            
            setMessages(prev => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (lastIndex >= 0) {
                    newMessages[lastIndex] = { 
                        ...newMessages[lastIndex], 
                        text: currentChunk 
                    };
                }
                return newMessages;
            });
        }

        const headerThreadId = response.headers.get("X-Thread-Id");
        if (!activeThreadId && headerThreadId) {
            setActiveThreadId(headerThreadId);
        }

    } catch (error) {
        console.error("Streaming error:", error);
    } finally {
        setLoading(false);
    }
};

    const createNewChat = () => {
        setActiveThreadId(null);
        setMessages([]);
    };

    return (
        <div className="rag-layout">
            <div className="chat-sidebar">
                <button className="new-chat-btn" onClick={createNewChat}>
                    + New Chat
                </button>
                <div className="thread-list">
                    {threads.length === 0 ? (
                        <p className="no-threads">No recent chats</p>
                    ) : (
                        threads.map(thread => (
                            <div 
                                key={thread.id} 
                                className={`thread-item ${activeThreadId === thread.id ? 'active' : ''}`}
                                onClick={() => setActiveThreadId(thread.id)}
                            >
                                <span className="thread-icon">💬</span>
                                <div className="thread-info">
                                    <p className="thread-title">{thread.title}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="chat-main">
                <div className="chat-window">
                    {(!activeThreadId && messages.length === 0) ? (
                        <div className="welcome-screen">
                            <div className="lion-logo">🦁</div>
                            <h2>Welcome to HR Intelligence</h2>
                            <p>Just start typing to begin a new session.</p>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, index) => (
                                <div key={index} className={`message-bubble ${msg.sender}`}>
                                    <div className="avatar">{msg.sender === 'user' ? 'HR' : '🦁'}</div>
                                    <div className="message-text">{msg.text}</div>
                                </div>
                            ))}
                            {loading && (
                                <div className="message-bubble bot thinking">
                                    <div className="avatar">🦁</div>
                                    <div className="message-text italic">Searching database...</div>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="input-container">
                    <div className="input-wrapper">
                        <input 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about your candidates..."
                        />
                        <button onClick={handleSend} disabled={loading} className="send-btn">
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RagChat;