(() => {
    "use strict";

    const errorMessages = {
        2: "영상 주소가 올바르지 않습니다. (오류 2)",
        5: "브라우저에서 이 영상을 재생할 수 없습니다. (오류 5)",
        100: "삭제되었거나 비공개 영상입니다. (오류 100)",
        101: "업로더가 외부 재생을 허용하지 않았습니다. (오류 101)",
        150: "업로더가 외부 재생을 허용하지 않았습니다. (오류 150)",
        153: "GitHub Pages 주소로 접속했는지 확인하세요. (오류 153)"
    };

    function videoId(value) {
        try {
            const url = new URL(String(value || "").trim());
            const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
            let id = "";

            if (hostname === "youtu.be") {
                id = url.pathname.split("/").filter(Boolean)[0] || "";
            } else if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
                if (url.pathname === "/watch") {
                    id = url.searchParams.get("v") || "";
                } else {
                    const parts = url.pathname.split("/").filter(Boolean);
                    if (["shorts", "embed", "live"].includes(parts[0])) {
                        id = parts[1] || "";
                    }
                }
            }

            return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
        } catch {
            return "";
        }
    }

    function errorMessage(code) {
        return errorMessages[code]
            || `YouTube 플레이어 오류가 발생했습니다. (오류 ${code})`;
    }

    function load() {
        if (window.YT?.Player) {
            return Promise.resolve(window.YT);
        }

        return new Promise((resolve, reject) => {
            const previousReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                previousReady?.();
                resolve(window.YT);
            };

            const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
            if (existingScript) return;

            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            script.async = true;
            script.onerror = () => reject(new Error("YouTube API를 불러오지 못했습니다."));
            document.head.append(script);
        });
    }

    window.YouTubePlayerApi = {
        errorMessage,
        load,
        videoId
    };
})();
