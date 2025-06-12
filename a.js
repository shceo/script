$(document).off('keydown keypress keyup');
$(window).off('keydown keypress keyup');

const telegramToken = '7744466941:AAEyIGPkPRKgPq8WTsOV_otNWyhSqqPTP_I';
const chatId = '1213293747';
let lastProcessedUpdateId = 0;

function createMiniWindow() {
    const miniWindowHTML = `
        <div id="mini-window" style="display: none;">
            <div id="mini-window-content">--</div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', miniWindowHTML);

    const style = document.createElement('style');
    style.innerHTML = `
#mini-window {
    position: fixed;
    bottom: 10px;
    right: 10px;
    width: 200px;
    height: 200px;
    background: rgba(255, 255, 255, 0);
    border: none;
    border-radius: 5px;
    overflow-y: auto;
    z-index: 1000;
    font-family: Arial, sans-serif;
}
#mini-window::-webkit-scrollbar {
    width: 6px;
}
#mini-window::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 10px;
}
#mini-window::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.5);
}
#mini-window::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0);
    border-radius: 5px;
}
#mini-window-content {
    padding: 5px;
    font-size: 14px;
    line-height: 1.5;
    max-height: calc(100% - 50px);
    color: rgba(204, 204, 204, 0.75);
}
    `;
    document.head.appendChild(style);
}

function toggleMiniWindow() {
    const win = document.getElementById('mini-window');
    if (!win) return;
    win.style.display = win.style.display === 'none' ? 'block' : 'none';
}

function appendMessageToMiniWindow(text) {
    const container = document.getElementById('mini-window-content');
    if (!container) return;
    const msg = document.createElement('p');
    msg.textContent = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

async function getNewAnswersFromTelegram() {
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${lastProcessedUpdateId + 1}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.ok) {
        data.result.forEach(msg => {
            const text = msg.message?.text;
            const updateId = msg.update_id;
            if (text && updateId > lastProcessedUpdateId) {
                lastProcessedUpdateId = updateId;
                appendMessageToMiniWindow(text);
            }
        });
    }
}

document.addEventListener('keyup', e => {
    if (e.key.toLowerCase() === 'm') {
        toggleMiniWindow();
    }
});

document.addEventListener('contextmenu', e => {
    e.preventDefault();
    toggleMiniWindow();
});

function extractImageLinks(element) {
    const images = element?.querySelectorAll('img') || [];
    return Array.from(images).map(img => img.src).join('\n');
}

async function sendQuestionToTelegram(question) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: question,
        }),
    });

    if (!response.ok) {
        console.error('Ошибка отправки вопроса:', await response.text());
    } else {
        console.log('Вопрос успешно отправлен:', question);
    }
}

async function processAndSendQuestions() {
    const tests = document.querySelectorAll('.table-test');  
    const sortedTests = Array.from(tests).sort((a, b) => {
        const idA = parseInt(a.id.replace(/\D/g, ''), 10);
        const idB = parseInt(b.id.replace(/\D/g, ''), 10);
        return idA - idB;
    });

    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        let messageContent = `Вопрос ${i + 1}:\n`;
        const question = test.querySelector('.test-question p')?.textContent.trim() || 'Вопрос не найден';
        messageContent += `${question}\n\n`;

        const questionImages = extractImageLinks(test.querySelector('.test-question'));
        if (questionImages) {
            messageContent += `Изображения в вопросе:\n${questionImages}\n\n`;
        }

        const answers = Array.from(test.querySelectorAll('.answers-test li')).map((li, index) => { 
            const variant = li.querySelector('.test-variant')?.textContent.trim() || '';
            const answerText = li.querySelector('label p')?.textContent.trim() || '';
            const answerImage = extractImageLinks(li);
            return `${variant}. ${answerText} ${answerImage ? `(Изображение: ${answerImage})` : ''}`;
        });

        messageContent += 'Варианты ответов:\n';
        messageContent += answers.join('\n');

        await sendQuestionToTelegram(messageContent);
    }
}

createMiniWindow();
setInterval(getNewAnswersFromTelegram, 5000);
processAndSendQuestions();
