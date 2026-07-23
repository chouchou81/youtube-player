(() => {
    "use strict";

    const api = window.YouTubePlayerApi;
    const input = document.querySelector("#youtubeUrl");
    const status = document.querySelector("#status");
    const volume = document.querySelector("#volume");
    const volumeValue = document.querySelector("#volumeValue");
    const favoritesList = document.querySelector("#favoritesList");
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

    function requestFavoriteChange(type, url) {
        if (window.parent === window) {
            status.textContent = "즐겨찾기 수정은 home.html에서 실행할 때 사용할 수 있습니다.";
            return;
        }
        window.parent.postMessage({ type, url }, "*");
        status.textContent = "GitHub에 저장 중…";
    }

    function addFavorite() {
        const url = input.value.trim();
        if (!api.videoId(url)) {
            status.textContent = "먼저 올바른 YouTube 주소를 입력하세요.";
            input.focus();
            return;
        }
        requestFavoriteChange("youtube-favorites:add", url);
    }

    function renderFavorites(favorites) {
        if (!Array.isArray(favorites) || !favorites.length) {
            favoritesList.innerHTML = '<p class="favorites-empty">등록된 영상이 없습니다.</p>';
            return;
        }

        favoritesList.innerHTML = favorites.map((favorite) => {
            const url = String(favorite?.url || "");
            const id = api.videoId(url) || "YouTube";
            return `<div class="favorite-item">
                <button class="favorite-play" type="button" data-favorite-play="${url.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}">${id}</button>
                <button class="favorite-remove" type="button" data-favorite-remove="${url.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}" aria-label="${id} 삭제">×</button>
            </div>`;
        }).join("");
    }

    function handleFavoriteClick(event) {
        const playButton = event.target.closest("[data-favorite-play]");
        if (playButton) {
            input.value = playButton.dataset.favoritePlay;
            document.querySelector("#playerForm").requestSubmit();
            return;
        }

        const removeButton = event.target.closest("[data-favorite-remove]");
        if (removeButton) {
            requestFavoriteChange("youtube-favorites:remove", removeButton.dataset.favoriteRemove);
        }
    }

    function handleParentMessage(event) {
        if (event.source !== window.parent || !event.data || typeof event.data !== "object") return;

        if (event.data.type === "youtube-favorites:sync") {
            renderFavorites(event.data.favorites);
            if (event.data.saved) status.textContent = "즐겨찾기를 GitHub에 저장했습니다.";
        } else if (event.data.type === "youtube-favorites:error") {
            status.textContent = event.data.message || "즐겨찾기 처리에 실패했습니다.";
        }
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
    document.querySelector("#favoriteAddButton").addEventListener("click", addFavorite);
    favoritesList.addEventListener("click", handleFavoriteClick);
    volume.addEventListener("input", changeVolume);
    window.addEventListener("message", handleParentMessage);

    if (window.parent !== window) {
        window.parent.postMessage({ type: "youtube-favorites:request" }, "*");
    } else {
        fetch("./data/favorites.json", { cache: "no-store" })
            .then((response) => response.ok ? response.json() : [])
            .then(renderFavorites)
            .catch(() => renderFavorites([]));
    }

    api.load()
        .then(createPlayer)
        .catch(() => {
            status.textContent = "YouTube API를 불러오지 못했습니다.";
        });
})();
