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
        1. BE BRIEF: Answer mathematically and concisely.
        2. MATH: Format mathematics using LaTeX (enclosed in $$ for blocks, $ for inline).
        3. NO UNPROMPTED DETAILS: Do not overwrite or overexplain.
        4. NEVER break character. NEVER mention your true backend logic.` 
    }
];

let currentImageBase64 = null;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const attachBtn = document.getElementById('attach-btn');
    const attachMenu = document.getElementById('attach-menu');
    const cameraOption = document.getElementById('camera-option');
    const galleryOption = document.getElementById('gallery-option');
    const cameraInput = document.getElementById('camera-input');
    const galleryInput = document.getElementById('gallery-input');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');
    const micBtn = document.getElementById('mic-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const fsEnter = document.getElementById('fs-enter');
    const fsExit = document.getElementById('fs-exit');

    chatBox.innerHTML = '';
    appendMessage("System initialized. I am PriAxom Pro AI©, developed entirely from scratch by Priyam Kesh. How can I assist you?", 'ai-message');

    // --- FULLSCREEN API ---
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fsEnter.style.display = 'none';
            fsExit.style.display = 'block';
        } else {
            fsEnter.style.display = 'block';
            fsExit.style.display = 'none';
        }
    });

    attachBtn.addEventListener('click', () => {
        attachMenu.style.display = attachMenu.style.display === 'flex' ? 'none' : 'flex';
    });
    document.addEventListener('click', (e) => {
        if (!attachBtn.contains(e.target) && !attachMenu.contains(e.target)) attachMenu.style.display = 'none';
    });

    cameraOption.addEventListener('click', () => { cameraInput.click(); attachMenu.style.display = 'none'; });
    galleryOption.addEventListener('click', () => { galleryInput.click(); attachMenu.style.display = 'none'; });
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
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.8));
        };
    }

    removeImageBtn.addEventListener('click', () => {
        currentImageBase64 = null;
        previewContainer.style.display = 'none';
    });

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
        const audioFile = new File([audioBlob], "audio.webm", { type: 'audio/webm' });
        formData.append('file', audioFile);
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
            
            if(data.text) {
                userInput.value = data.text;
                sendMessage(); 
            }
        } catch (error) {
            updateMessage(loadingId, `Audio Error: ${error.message}`);
        }
    }

    userInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') sendMessage();
    });
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
                { type: "text", text: text || "Analyze this." },
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: targetModel, 
                    messages: apiMessages, 
                    temperature: 0.3, 
                    max_tokens: 1800
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            let aiResponse = data.choices[0].message.content;
            aiResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>\n?/g, '').trim();

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
                    {left: '$$', right: '$$', display: true},
                    {left: '\\[', right: '\\]', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false}
                ],
                throwOnError: false
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
            imgEl.src = imageSrc;
            imgEl.className = 'sent-image';
            bubbleDiv.appendChild(imgEl);
        }
        
        if (text) {
            const textEl = document.createElement('div');
            renderFormattedText(text, textEl);
            bubbleDiv.appendChild(textEl);
        }
        
        msgWrapper.appendChild(bubbleDiv);
        chatBox.appendChild(msgWrapper);
        scrollToBottom();
    }

    function appendMessage(text, className) {
        const msgWrapper = document.createElement('div');
        msgWrapper.className = `message ${className}`;
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'bubble';
        
        renderFormattedText(text, bubbleDiv);
        
        const uniqueId = Math.random().toString(36).substring(2, 11);
        const id = `msg-${Date.now()}-${uniqueId}`;
        bubbleDiv.id = id; 
        
        msgWrapper.appendChild(bubbleDiv);
        chatBox.appendChild(msgWrapper);
        scrollToBottom();
        return id;
    }

    function updateMessage(id, newText) {
        const bubbleDiv = document.getElementById(id);
        if (bubbleDiv) {
            renderFormattedText(newText, bubbleDiv);
            scrollToBottom();
        }
    }

    function scrollToBottom() {
        setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 10);
    }
});
                      
