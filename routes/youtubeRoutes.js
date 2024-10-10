const express = require('express');
const axios = require('axios');
const { YoutubeTranscript } = require('youtube-transcript');
const dotenv = require('dotenv');
dotenv.config();
const router = express.Router();

router.post('/apicaptions/:videoId', async(req, res) => {
    const { videoId } = req.params; // videoId를 요청 본문에서 받음

    try {
        console.log("controller에서 시작");
        // 서비스 함수 호출
        const captions = await fetchCaptionsFromApi(videoId);
        console.log("controller에서 응답 받음 로그");
        res.json({ captions }); // 자막을 JSON 형태로 응답
    } catch (error) {
        console.error('controller오류3', error);
        res.status(500).send('Server error');
    }
});

const fetchCaptionsFromApi = async (videoId) => {
    console.log(typeof YoutubeTranscript.fetchTranscript);
    try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, { languages: ['en'] });
        console.log("service에서 시작", transcript);

        // 자막과 시간 정보를 함께 저장
        const captionsWithTime = transcript.map(entry => ({
            text: entry.text,
            startTime: entry.offset, // 시작 시간 (초 단위)
            duration: entry.duration // 지속 시간 (초 단위)
        }));

        // 자막 텍스트만 추출하여 하나의 문자열로 결합
        const captionsText = transcript.map(entry => entry.text).join(' ');
        console.log("youtubeService에서 출력\n", "captionsText:\n", captionsText, "withTime:\n", captionsWithTime);
        return {
            captions: captionsText, // 자막 텍스트
            captionsWithTime: captionsWithTime // 자막과 시간 정보
        };
    } catch (error) {
        console.error('Error fetching captions:', error.message);
        throw new Error(`Failed to fetch captions for videoId ${videoId}: ${error.message}`);
    }
};

module.exports = router;
