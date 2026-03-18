const API_KEY = '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'; 
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');

let conversationHistory = [
    { 
        role: "system", 
        content: "You are PriAxom AI, an advanced, highly capable AI assistant engineered by Priyam Kesh. You provide precise, accurate, and helpful answers. Format responses cleanly without markdown unless necessary." 
    }
];

window.onload = () => {
    appendMessage("System initialized. I am PriAxom AI, engineered by Priyam Kesh. How can I assist you?", 'ai-msg');
};

function handleKeyPress(event) {
    if (event.key === 'Enter') sendMessage();
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user-msg');
    userInput.value = '';
    
    conversationHistory.push({ role: "user", content: text });
    const loadingId = appendMessage('Processing parameters...', 'ai-msg');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192', 
                messages: conversationHistory,
                temperature: 0.6,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        
        conversationHistory.push({ role: "assistant", content: aiResponse });
        updateMessage(loadingId, aiResponse);
    } catch (error) {
        updateMessage(loadingId, `Connection Error: ${error.message}`);
        console.error('API Error:', error);
    }
}

function appendMessage(text, className) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${className}`;
    msgDiv.innerText = text;
    const id = 'msg-' + Date.now();
    msgDiv.id = id;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
}

function updateMessage(id, newText) {
    const msgDiv = document.getElementById(id);
    if (msgDiv) {
        msgDiv.innerText = newText;
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}
