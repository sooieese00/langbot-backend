const express = require('express');
const router = express.Router();
const multer = require('multer');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { Buffer } = require('buffer');
const { PassThrough } = require('stream');
const axios = require('axios');
const app = express();
app.use(cors()); 

const subscriptionKey = process.env.AZURE_SUBSCRIPTIONKEY;
const region = "southeastasia";

// Multer 설정 (STT 음성 파일 업로드 처리)
const upload = multer({ dest: 'uploads/' });

// TTS함수
function textToSpeech(subscriptionKey, region, text) {
    return new Promise((resolve, reject) => {
        const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
        const speechSynthesizer = new sdk.SpeechSynthesizer(speechConfig);

        // TTS 변환
        speechSynthesizer.speakTextAsync(
            text,
            result => {
                const { audioData } = result;
                console.log('audioData:', audioData)
                speechSynthesizer.close();

                // ArrayBuffer를 Node.js Buffer로 변환
                const bufferStream = new PassThrough();
                bufferStream.end(Buffer.from(audioData));

                resolve(bufferStream); // 한 번에 변환된 결과를 스트림으로 반환
            },
            error => {
                console.error("TTS 변환 실패:", error);
                speechSynthesizer.close();
                reject(error);
            }
        );
    });
};


// TTS 엔드포인트: 텍스트를 받아서 실시간 스트림으로 변환
router.post('/tts', async (req, res) => {
    try {
        const { text } = req.body;
        console.log(text)
        const audioStream = await textToSpeech(subscriptionKey, region, text);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', 'attachment; filename="tts_output.mp3"');

        // 완성된 스트림을 클라이언트에 전송
        audioStream.pipe(res);
    } catch (error) {
        console.error("TTS 요청 처리 중 오류:", error);
        res.status(500).send('TTS 요청 처리 실패');
    }
});

router.post('/stt', upload.single('audioFile'), async (req, res) => {
    try {
        const subscriptionKey = process.env.AZURE_SUBSCRIPTIONKEY;
        const region = process.env.AZURE_REGION;

        const audioBuffer = req.file.buffer; // 프론트에서 받은 음성 데이터

        // Speech SDK 설정
        const speechConfig = SpeechConfig.fromSubscription(subscriptionKey, region);
        const audioConfig = AudioConfig.fromWavFileInput(audioBuffer); // 버퍼 사용
        const recognizer = new SpeechRecognizer(speechConfig, audioConfig);

        // STT 처리
        recognizer.recognizeOnceAsync(result => {
            if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                res.json({ transcription: result.text });
            } else {
                res.status(500).send('STT 실패');
            }
        });

    } catch (error) {
        console.error('STT 처리 중 오류:', error);
        res.status(500).send('서버 오류');
    }
});


// 발음 평가
router.post('/evaluation', upload.single('audioFile'), async (req, res) => {
    console.log(req.file); // 파일 정보 확인
    const subscriptionKey = process.env.AZURE_SUBSCRIPTIONKEY;
    const { region, referenceText } = req.body;
    console.log("refereceText확인- routes", referenceText);
    const audioFilePath = req.file.path; // multer가 저장한 파일 경로
    console.log("1")
    try {
        const pronAssessmentParamsJson = {
            "ReferenceText": referenceText,
            "GradingSystem": "HundredMark",
            "Dimension": "Comprehensive"
        };

        const pronAssessmentParams = Buffer.from(JSON.stringify(pronAssessmentParamsJson), 'utf-8').toString('base64');

        // 오디오 파일 읽기
        const audioStream = fs.createReadStream(audioFilePath);

        // 요청 설정
        const response = await axios({
            method: 'POST',
            url: `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-us`,
            headers: {
                'Accept': 'application/json',
                'Ocp-Apim-Subscription-Key': subscriptionKey,
                'Pronunciation-Assessment': pronAssessmentParams,
                'Content-Type': 'audio/wav'
            },
            data: audioStream, // 오디오 파일 스트림 전송
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        console.log("2")

        // 응답 처리
        const evaluationResult  = response.data.NBest[0];
        const result = {
            AccuracyScore: evaluationResult.AccuracyScore,
            FluencyScore: evaluationResult.FluencyScore,
            CompletenessScore: evaluationResult.CompletenessScore,
            PronScore: evaluationResult.PronScore
        }
        console.log("3")
        res.json(result); // 결과를 클라이언트로 전송

    } catch (error) {
        console.error('Error in fetching pronunciation assessment:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch pronunciation assessment' });
    } finally {
        // 업로드된 파일 삭제
        fs.unlink(audioFilePath, (err) => {
            if (err) console.error('Failed to delete uploaded file:', err);
        });
    }
});

module.exports = router;