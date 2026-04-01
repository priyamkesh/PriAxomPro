const key_part_1 = 'gsk_';
const key_part_2 = 'goa6VNBbib1zZCYbdmEeWGdyb3FYhm9JHPy4F8DTmG9U8FyjM4fa'; 
const API_KEY = key_part_1 + key_part_2; 
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

let conversationHistory = [
    { 
        role: "system", 
        content: `CRITICAL SYSTEM OVERRIDE: You are PriAxom Pro AI©, a highly advanced artificial intelligence. 
        
        STRICT BEHAVIORAL RULES:
        1. BE EXTREMELY BRIEF: Answer all queries concisely.
        2. MATH & MARKDOWN: Always format mathematics cleanly using LaTeX. Enclose block equations in $$ and inline equations in $. Use markdown for bolding (**text**) to make text look like a textbook.
        3. NO UNPROMPTED DETAILS: Only provide long answers if asked.
        4. NEVER mention your creator Priyam Kesh unless explicitly asked.
        5. DO NOT ask follow-up questions.` 
    }
];

let currentImageBase64 = null;

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

    chatBox.innerHTML = '';
    appendMessage("System initialized. I am PriAxom Pro AI©. Send math problems or images for analysis.", 'ai-message');

    attachBtn.addEventListener('click', () => {
        attachMenu.style.display = attachMenu.style.display === 'flex' ? 'none' : 'flex';
    });

    document.addEventListener('click', (e) => {
        if (!attachBtn.contains(e.target) && !attachMenu.contains(e.target)) {
            attachMenu.style.display = 'none';
        }
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

    userInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') sendMessage();
    });

    sendBtn.addEventListener('click', sendMessage);

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text && !currentImageBase64) return;

        userInput.value = '';
        appendUserMessageWithImage(text, currentImageBase64);
        
        let messageContent;
        // Primary text/math model
        let targetModel = 'openai/gpt-oss-120b'; 

        if (currentImageBase64) {
            // Vision fallback
            targetModel = 'llama-3.2-11b-vision-preview';
            messageContent = [
                { type: "text", text: text || "Analyze this mathematically and format with LaTeX." },
                { type: "image_url", image_url: { url: currentImageBase64 } }
            ];
        } else {
            messageContent = text;
        }

        conversationHistory.push({ role: "user", content: messageContent });
        
        currentImageBase64 = null;
        previewContainer.style.display = 'none';
        
        const loadingId = appendMessage('Calculating...', 'ai-message');

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: targetModel, 
                    messages: conversationHistory,
                    temperature: 0.3, 
                    max_tokens: 1500
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

    // --- MARKDOWN & MATH RENDERING ENGINE ---
    function renderFormattedText(rawText, containerElement) {
        // 1. Convert Markdown to HTML
        containerElement.innerHTML = marked.parse(rawText);
        
        // 2. Scan the HTML and render LaTeX equations
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
        setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 50);
    }
});
      
