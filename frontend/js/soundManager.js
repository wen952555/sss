// frontend/js/soundManager.js

let soundEnabled = true; // 默认开启音效
const sounds = {}; // 存储HTMLAudioElement对象

// 在main.js中初始化时，会从localStorage加载设置并更新此状态
export function initSoundManager(initialSoundSetting = true) {
    soundEnabled = initialSoundSetting;
    // 预加载或获取audio元素引用
    sounds.deal = document.getElementById('dealSound');
    sounds.click = document.getElementById('clickSound');
    sounds.win = document.getElementById('winSound');
    sounds.lose = document.getElementById('loseSound');
    sounds.error = document.getElementById('errorSound');
    // 确保所有audio元素都存在
    for (const key in sounds) {
        if (!sounds[key]) {
            console.warn(`Sound element for '${key}' not found.`);
        }
    }
}

export function playSound(soundName) {
    if (!soundEnabled) return;

    const sound = sounds[soundName];
    if (sound && sound.play) {
        sound.currentTime = 0; // 从头播放
        sound.play().catch(error => {
            // 用户可能需要与页面交互后才能播放音频
            // console.warn(`Could not play sound '${soundName}':`, error.message);
        });
    } else {
        console.warn(`Sound '${soundName}' not found or not playable.`);
    }
}

export function toggleSound(isEnabled) {
    soundEnabled = isEnabled;
}

export function isSoundEnabled() {
    return soundEnabled;
}
