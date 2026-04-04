// --- FIREBASE WEB CDN IMPORT FIX ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDLLDQCOaD6yufpJlwqSQmXX1jwltwTa68",
    authDomain: "priaxom-8825.firebaseapp.com",
    projectId: "priaxom-8825",
    storageBucket: "priaxom-8825.firebasestorage.app",
    messagingSenderId: "836017092117",
    appId: "1:836017092117:web:7642b7e54ae090df43801c",
    measurementId: "G-V4G1T5RJFQ"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// --- STRICT GROQ API SETTINGS AS REQUESTED ---
const PRIMARY_LOGIC_MODEL = 'openai/gpt-oss-120b'; 
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'; 
const AUDIO_MODEL = 'whisper-large-v3-turbo';

const key_part_1 = 'gsk_';
const key_part_2 = 'goa6VNBbib1zZCYbdmEeWGdyb3FYhm9JHPy4F8DTmG9U8FyjM4fa'; 
const API_KEY = key_part_1 + key_part_2; 
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const AUDIO_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

let conversationHistory = [
    { 
        role: "system", 
        content: `CRITICAL SYSTEM OVERRIDE: You are PriAxom Pro AI©. You were created entirely and solely from scratch by Priyam Kesh.
        IDENTITY LOCK: You are NOT ChatGPT, OpenAI, Meta, Google, Gemini, Claude, or any other AI. NEVER utter the names of other AI models or companies. You run strictly on the proprietary "PriAxom HyperEngine".
        STRICT RULES:
        1. BE EXTREMELY BRIEF: Answer mathematically and concisely.
        2. MATH: Format mathematics using LaTeX.
        3. NO UNPROMPTED DETAILS.` 
    }
];

let currentImageBase64 = null;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let isChatInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const loginText = document.getElementById('login-text');
    
    // Hamburger Menu Elements
    const menuBtn = document.getElementById('menu-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarMenu = document.getElementById('sidebar-menu');
    const closeSidebar = document.getElementById('close-sidebar');
    const navLogin = document.getElementById('nav-login');
    const navLogout = document.getElementById('nav-logout');

    const chatBox = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const attachBtn = document.getElementById('attach-btn');
    const attachMenu = document.getElementById('attach-menu');
    const cameraInput = document.getElementById('camera-input');
    const galleryInput = document.getElementById('gallery-input');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');
    const micBtn = document.getElementById('mic-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    // --- AUTHENTICATION FLOW ---
    
    // Catch redirects on mobile
    getRedirectResult(auth).catch((error) => {
        console.error("Redirect Auth Error:", error);
        alert("Login block detected. Try disabling popup blockers or opening in Chrome/Safari.");
        googleLoginBtn.disabled = false;
        loginText.innerText = "Sign in with Google";
    });

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            loginScreen.classList.add('hidden');
            appContainer.classList.remove('hidden');
            navLogin.classList.add('hidden');
            navLogout.classList.remove('hidden');
            
            try {
                await setDoc(doc(db, "users", user.uid), {
                    name: user.displayName,
                    email: user.email,
                    lastLogin: serverTimestamp()
                }, { merge: true });
            } catch (error) {
                console.error("DB Error: ", error);
            }

            if (!isChatInitialized) {
                chatBox.innerHTML = '';
                appendMessage(`Welcome back, ${user.displayName.split(' ')[0]}. I am PriAxom Pro AI©. How can I assist you?`, 'ai-message');
                isChatInitialized = true;
            }
        } else {
            loginScreen.classList.remove('hidden');
            appContainer.classList.add('hidden');
            navLogin.classList.remove('hidden');
            navLogout.classList.add('hidden');
            isChatInitialized = false;
            googleLoginBtn.disabled = false;
            loginText.innerText = "Sign in with Google";
        }
    });

    const triggerLogin = () => {
        googleLoginBtn.disabled = true;
        loginText.innerText = "Connecting...";
        
        // We use redirect because mobile browsers block popups from Github Pages
        signInWithRedirect(auth, provider).catch(err => {
            console.error(err);
            alert("Error: " + err.message);
            googleLoginBtn.disabled = false;
            loginText.innerText = "Sign in with Google";
        });
    };

    googleLoginBtn.addEventListener('click', triggerLogin);
    navLogin.addEventListener('click', triggerLogin);

    navLogout.addEventListener('click', () => {
        signOut(auth);
        closeMenu();
    });

    // --- SIDEBAR MENU LOGIC ---
    function openMenu() {
        sidebarOverlay.classList.remove('hidden');
        sidebarMenu.classList.add('open');
    }
    function closeMenu() {
        sidebarOverlay.classList.add('hidden');
        sidebarMenu.classList.remove('open');
    }
    menuBtn.addEventListener('click', openMenu);
    closeSidebar.addEventListener('click', closeMenu);
    sidebarOverlay.addEventListener('click', closeMenu);

    // --- FULLSCREEN API ---
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.warn(err));
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    });

    document.addEventListener('fullscreenchange', () => {
        const fsEnter = document.getElementById('fs-enter');
        const fsExit = document.getElementById('fs-exit');
        if (document.fullscreenElement) {
            fsEnter.style.display = 'none'; fsExit.style.display = 'block';
        } else {
            fsEnter.style.display = 'block'; fsExit.style.display = 'none';
        }
    });

    // --- ATTACHMENTS ---
    attachBtn.addEventListener('click', () => {
        attachMenu.style.display = attachMenu.style.display === 'flex' ? 'none' : 'flex';
    });
    document.addEventListener('click', (e) => {
        if (!attachBtn.contains(e.target) && !attachMenu.contains(e.target)) attachMenu.style.display = 'none';
    });

    document.getElementById('camera-option').addEventListener('click', () => { cameraInput.click(); attachMenu.style.display = 'none'; });
    document.getElementById('gallery-option').addEventListener('click', () => { galleryInput.click(); attachMenu.style.display = 'none'; });
    
    cameraInput.addEventListener('change', handleImageUpload);
    galleryInput.addEventListener('change', handleImageUpload);

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            compressImage(e.target.result, 1024, function(compressedBase64) {
                currentImageBase64 = compressedBase64;
                imagePreview.src = currentImageBase64;
                previewContainer.style.display = 'block';
                scrollToBottom();
            });
        };
        reader.readAsDataURL(file);
        event.target.value = ''; 
    }

    function compressImage(base64, maxWidth, callback) {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let width = img.width; let height = img.height;
            if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
            canvas.width = width; canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.8));
        };
    }

    removeImageBtn.addEventListener('click', () => { currentImageBase64 = null; previewContainer.style.display = 'none'; });

    // --- WHISPER MIC ---
    micBtn.addEventListener('click', async () => {
        if (isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            micBtn.classList.remove('recording');
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = event => { audioChunks.push(event.data); };
                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    audioChunks = [];
                    await transcribeAudio(audioBlob);
                };
                mediaRecorder.start();
                isRecording = true;
                micBtn.classList.add('recording');
            } catch (err) {
                console.error("Mic error:", err);
                alert("Microphone access denied.");
            }
        }
    });

    async function transcribeAudio(audioBlob) {
        const loadingId = appendMessage('Listening via Whisper...', 'ai-message');
        const formData = new FormData();
        formData.append('file', new File([audioBlob], "audio.webm", { type: 'audio/webm' }));
        formData.append('model', AUDIO_MODEL);

        try {
            const response = await fetch(AUDIO_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${API_KEY}` },
                body: formData
            });
            if (!response.ok) throw new Error("Transcription failed");
            const data = await response.json();
            document.getElementById(loadingId).parentElement.remove();
            if(data.text) { userInput.value = data.text; sendMessage(); }
        } catch (error) {
            updateMessage(loadingId, `Audio Error: ${error.message}`);
        }
    }

    // --- CHAT LOGIC ---
    userInput.addEventListener('keypress', function(event) { if (event.key === 'Enter') sendMessage(); });
    sendBtn.addEventListener('click', sendMessage);

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text && !currentImageBase64) return;

        userInput.value = '';
        let targetModel = PRIMARY_LOGIC_MODEL; 
        let messageContent;
        
        appendUserMessageWithImage(text, currentImageBase64);
        
        if (currentImageBase64) {
            targetModel = VISION_MODEL; 
            messageContent = [
                { type: "text", text: text || "Solve this mathematically." },
                { type: "image_url", image_url: { url: currentImageBase64 } }
            ];
        } else {
            messageContent = text;
        }

        conversationHistory.push({ role: "user", content: messageContent });
        currentImageBase64 = null;
        previewContainer.style.display = 'none';
        
        const loadingId = appendMessage('Processing...', 'ai-message');

        let apiMessages = conversationHistory.map(msg => {
            if (targetModel === PRIMARY_LOGIC_MODEL && Array.isArray(msg.content)) {
                const textObj = msg.content.find(item => item.type === 'text');
                return { role: msg.role, content: textObj ? textObj.text : "[Image analyzed in previous turn]" };
            }
            return msg;
        });

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
                body: JSON.stringify({ model: targetModel, messages: apiMessages, temperature: 0.3, max_tokens: 1800 })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            let aiResponse = data.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>\n?/g, '').trim();

            conversationHistory.push({ role: "assistant", content: aiResponse });
            updateMessage(loadingId, aiResponse);
        } catch (error) {
            updateMessage(loadingId, `Connection Error: ${error.message}`);
        }
    }

    function renderFormattedText(rawText, containerElement) {
        containerElement.innerHTML = marked.parse(rawText);
        if (window.renderMathInElement) {
            renderMathInElement(containerElement, {
                delimiters: [
                    {left: '$$', right: '$$', display: true}, {left: '\\[', right: '\\]', display: true},
                    {left: '$', right: '$', display: false}, {left: '\\(', right: '\\)', display: false}
                ], throwOnError: false
            });
        }
    }

    function appendUserMessageWithImage(text, imageSrc) {
        const msgWrapper = document.createElement('div');
        msgWrapper.className = `message user-message`;
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'bubble';

        if (imageSrc) {
            const imgEl = document.createElement('img');
            imgEl.src = imageSrc; imgEl.className = 'sent-image'; bubbleDiv.appendChild(imgEl);
        }
        if (text) {
            const textEl = document.createElement('div');
            renderFormattedText(text, textEl); bubbleDiv.appendChild(textEl);
        }
        
        msgWrapper.appendChild(bubbleDiv); chatBox.appendChild(msgWrapper); scrollToBottom();
    }

    function appendMessage(text, className) {
        const msgWrapper = document.createElement('div');
        msgWrapper.className = `message ${className}`;
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'bubble';
        
        renderFormattedText(text, bubbleDiv);
        bubbleDiv.id = `msg-${Date.now()}`;
        
        msgWrapper.appendChild(bubbleDiv); chatBox.appendChild(msgWrapper); scrollToBottom();
        return bubbleDiv.id;
    }

    function updateMessage(id, newText) {
        const bubbleDiv = document.getElementById(id);
        if (bubbleDiv) { renderFormattedText(newText, bubbleDiv); scrollToBottom(); }
    }

    function scrollToBottom() { setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 10); }
});
                                                        
