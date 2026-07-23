(() => {
    "use strict";

    const api = window.YouTubePlayerApi;
    const input = document.querySelector("#youtubeUrl");
    const status = document.querySelector("#status");
    const volume = document.querySelector("#volume");
    const volumeValue = document.querySelector("#volumeValue");
    let player = null;
    let playerReady = false;

    function applyVolume() {
        const level = Math.max(0, Math.min(100, Number(volume.value) || 0));
        volumeValue.textContent = `${level}%`;

        if (!playerReady || !player) return;
        player.setVolume(level);
        if (level === 0) player.mute();
        else player.unMute();
    }

    function changeVolume() {
        localStorage.setItem("youtube-player-volume", volume.value);
        applyVolume();
    }

    function play(event) {
        event.preventDefault();
        const id = api.videoId(input.value);

        if (!id) {
            status.textContent = "올바른 YouTube 영상 주소를 입력하세요.";
            input.focus();
            return;
        }

        if (!playerReady || !player) {
            status.textContent = "플레이어를 준비 중입니다. 잠시 후 다시 눌러주세요.";
            return;
        }

        localStorage.setItem("youtube-player-url", input.value.trim());
        player.loadVideoById(id);
        applyVolume();
        player.playVideo();
        status.textContent = "재생을 시작합니다.";
    }

    function stop() {
        player?.stopVideo();
        status.textContent = "재생이 정지되었습니다.";
    }

    function createPlayer(YT) {
        player = new YT.Player("youtubePlayer", {
            width: "200",
            height: "200",
            playerVars: {
                autoplay: 0,
                controls: 0,
                playsinline: 1,
                origin: location.origin
            },
            events: {
                onReady() {
                    playerReady = true;
                    applyVolume();
                    status.textContent = "재생할 주소를 입력하세요.";
                },
                onStateChange(event) {
                    if (event.data === YT.PlayerState.PLAYING) {
                        applyVolume();
                        status.textContent = `재생 중 · 볼륨 ${volume.value}%`;
                    } else if (event.data === YT.PlayerState.PAUSED) {
                        status.textContent = "일시정지됨";
                    } else if (event.data === YT.PlayerState.ENDED) {
                        status.textContent = "재생이 끝났습니다.";
                    }
                },
                onError(event) {
                    status.textContent = api.errorMessage(event.data);
                }
            }
        });
    }

    function restoreSettings() {
        input.value = localStorage.getItem("youtube-player-url") || "";

        const savedVolumeText = localStorage.getItem("youtube-player-volume");
        const savedVolume = Number(savedVolumeText);
        if (savedVolumeText !== null && Number.isFinite(savedVolume)) {
            volume.value = String(Math.max(0, Math.min(100, savedVolume)));
        }
        applyVolume();
    }

    restoreSettings();
    document.querySelector("#playerForm").addEventListener("submit", play);
    document.querySelector("#stopButton").addEventListener("click", stop);
    volume.addEventListener("input", changeVolume);

    api.load()
        .then(createPlayer)
        .catch(() => {
            status.textContent = "YouTube API를 불러오지 못했습니다.";
        });
})();
