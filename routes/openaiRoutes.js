const express = require('express');
const router = express.Router();
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL_OPENAI = 'https://api.openai.com/v1/chat/completions';

// OpenAI API 요청 함수
const getChatResponse = async (prompt) => {
    try {
        const response = await axios.post(
            BASE_URL_OPENAI,
            {
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 4000,
                n: 1,
                stop: null,
                temperature: 0.7,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                },
            }
        );
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error fetching chat response:', error);
        throw error;
    }
};

// 학습 표현 가져오기
router.post('/expressions/:videoId', async (req, res) => {
    const { captions, expressionLevel, expressionNumber } = req.body;
    console.log("학습표현 가져오기 시작")
    try {
        const prompt = `
현재 나는 영어 유튜브 영상에서 나온 표현들로 영어를 공부하고 있어.
너는 나의 영어 회화공부를 도와주는 AI 영어 튜터야.
내가 공부하고 있는 유튜브 영상의 스크립트를 하단에 보내줄게.
실생활 활용도가 높은 표현들 중, ${expressionLevel}의 난이도에 해당하는 표현 ${expressionNumber}개를 아래 조건에 맞춰 스크립트에서 뽑아줘.
1. 표현은 문장이 아닌, 단어나 격언, 구문 등 사전에 나오는 형태로 알려줘.
2. 뜻도 마찬가지로 사전에 나오는 형태로 알려줘.
4. 표현은 ${expressionNumber}개가 정확히 되도록 신경 써.
4. 각 표현의 뜻과 원본 문장, 중요한 포인트, 네가 작성한 새로운 예문과 그 뜻 하나씩 작성해.주요 포인트에서는 새로운 내용이 아니면 표현 뜻 설명은 반복하지 마.
5. 난이도별 설명은 아래와 같아. 난이도별로 표현의 수준이 다르도록 신경 써.
    - basic : FCAT Level 1
    - intermediate : FCAT Level 2 
    - advanced : FCAT Level 3
    - proficient : FCAT Level 4, 5

출력할 데이터 형식:
1. 영어표현
영어표현 뜻: ᄋᄋᄋ  
원본 문장: ᄋᄋᄋ  
원본 문장 해석:ᄋᄋᄋ 
중요한 포인트: ᄋᄋᄋ
새로운 예문: ᄋᄋᄋ 
새로운 예문 해석: ᄋᄋᄋ

2. 영어표현
영어표현 뜻: ᄋᄋᄋ  
원본 문장: ᄋᄋᄋᄋ 
원본 문장 해석:ᄋᄋᄋ 
중요한 포인트: ᄋᄋᄋ 
새로운 예문: ᄋᄋᄋ
새로운 예문 해석: ᄋᄋᄋ


스크립트: ${captions}
        `;

        const response = await getChatResponse(prompt);
        const expressions = parseLearningExpressions(response);

        res.send({ expressions });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send('Server error');
    }
});

const parseLearningExpressions = (text) => {
    if (!text) return [];
    
    const expressionBlocks = text.trim().split(/\n\n+/).filter(block => block.trim() !== '');
    return expressionBlocks.map(block => {
        const lines = block.split('\n').map(line => line.trim());
        const expressionLine = lines[0] || '';
        const expressionMeaning = lines[1] || '';
        const originalSentence = lines[2] || '';
        const meaning = lines[3] || '';
        const importantPoint = lines[4] || '';
        const newExampleText = lines[5] || '';
        const newExampleTranslation = lines[6] || '';
        
        const title = expressionLine.replace(/^\d*\.\s*영어\s*표현\s*:/, '').trim();
        const newExample = newExampleText.replace(/^새로운\s*예문\s*:\s*/, '').trim();

        return {
            title: title,
            expressionMeaning: expressionMeaning.replace('영어표현 뜻:', ''),
            originalSentence: originalSentence.replace('원본 문장:', '').trim(),
            meaning: meaning.replace('원본 문장 해석:', '').trim(),
            importantPoint: importantPoint.replace('중요한 포인트:', '').trim(),
            newExample: newExample.replace('새로운 예문', '').trim(),
            newExampleTranslation: newExampleTranslation.replace('새로운 예문 해석: ', '').trim(),
        };
    });
};

// 퀴즈 생성
router.post('/expressionQuiz', async (req, res) => {
    const { expressions, quizNumber } = req.body;
    const expressionsText = expressions.map(exp => `${exp.title}: ${exp.meaning}`).join('\n');

    try {
        const prompt = `
너는 AI 영어 튜터야. 내가 공부한 영어 표현을 하단에서 보내줄게. 
이 정보를 바탕으로 내가 공부한 내용을 복습할 수 있는 ${quizNumber}개의 한국어 표현과 영어 답을 만들어줘. 
형식은 아래에 제시해줄게. 

출력할 데이터 형식:
1. 한국어 표현 :  ᄋᄋᄋ
영어 답 : ᄋᄋᄋ

2. 한국어 표현 :  ᄋᄋᄋ
영어 답 : ᄋᄋᄋ

학습한 영어 표현:${expressionsText}
`;

        const quizResponse = await getChatResponse(prompt);
        const quiz = parseQuiz(quizResponse);
        res.send({ quiz });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send('Server error');
    }
});

const parseQuiz = (text) => {
    if (!text) return [];

    text = text.replace(/^출력할\s*데이터\s*형식\s*:/, '').trim();
    const expressionBlocks = text.trim().split(/\n(?=\d+\.\s*한국어\s*표현)/).filter(block => block.trim() !== '');
    return expressionBlocks.map(block => {
        const lines = block.split('\n').map(line => line.trim());
        const questionLine = lines[0] || '';
        const answerLine = lines[1] || '';

        const question = questionLine.replace(/^\d+\.\s*한국어\s*표현\s*:\s*/, '').trim();
        const answer = answerLine.replace(/^영어\s*답\s*:\s*/, '').trim();

        return { question, answer };
    });
};

router.post('/feedback', async (req, res) => {
    const { question, userAnswer, captions } = req.body;
    
    try {
        const prompt = 
`현재 나는 부족한 회화 실력을 높이기 위해서 내가 좋아하는 유튜브 영상에서 나온 표현으로 공부하고 있어. 너는 내가 푼 유튜브 영상에 대한 영어 퀴즈를 채점해주는 AI 영어 튜터야.
내가 공부하고 있는 유튜브 영상의 스크립트를 하단에서 보내줄게.
퀴즈는 한국말을 영어로 바꿔 쓰는 형식이었어.
문제는 "${question}"였고, 나는 이 문제에 대해서 "${userAnswer}"라고 답을 적었어.
내 답에 대한 피드백을 100자 이상으로 자세히 제공해줘. 
이 문제에 대한 모범답안을 적어주고, 스크립트 상에서 관련된 원본문장도 찾아줘. 
유사표현은 3가지를 '/'로 구분해서 제공해줘.
문제에 대해서 의미상, 문법상 답이 정확하게 맞으면 스크립트 상의 표현에 상관없이 정답여부에 정답입니다라고 출력해주고, 대신 피드백을 더욱 자세하게 재공해줘. 
다만, 스크립트 상의 문맥과 맞지 않으면 오답처리를 해주고 그 이유를 함께 피드백으로 제공해줘.


정답여부: 정답입니다/오답입니다
피드백: ㅇㅇㅇ
유사표현 제안: ㅇㅇㅇ / ㅇㅇㅇ / ㅇㅇㅇ
모범답안: ㅇㅇㅇ
원본문장: ㅇㅇㅇ

스크립트: ${captions}`
;

        const feedbackResponse = await getChatResponse(prompt);
        
        // feedback 파싱은 한 번만 호출되도록 최적화
        const feedback = parseFeedback(feedbackResponse);
        
        // 응답을 한 번만 보냄
        res.send({
            result: feedback.checking,
            description: feedback.description,
            example: feedback.example,
            correctAnswer : feedback.correctAnswer,
            sentence: feedback.sentence
        });
    } catch (error) {
        console.error("Error:", error);
        // 이미 응답이 전송되지 않은 경우에만 에러 응답을 보냄
        if (!res.headersSent) {
            res.status(500).send({ error: 'Server error', message: error.message });
        }
    }
});


const parseFeedback = (text) => {
    if (!text) return { checking: '', description: '',  example: '' , correctAnswer: '', sentence: ''};
  
    const feedback = {
        checking: '',
        description: '',
        example: '',
        correctAnswer : '',
        sentence: ''
    };
  
    // 정규식을 사용하여 각 항목을 파싱, 단어 사이의 공백을 유연하게 처리
    const checkingMatch = text.match(/정답\s*여부\s*:\s*(.*)/);
    const descriptionMatch= text.match(/피드백\s*:\s*(.*)/);
    const exampleMatch = text.match(/유사\s*표현\s*제안\s*:\s*(.*)/);
    const correctAnswerMatch = text.match(/모범\s*답안\s*:\s*(.*)/);
    const sentenceMatch = text.match(/원본\s*문장\s*:\s*(.*)/);

    // 파싱된 내용을 feedback 객체에 저장
    if (checkingMatch) feedback.checking = checkingMatch[1].trim();
    if (descriptionMatch) feedback.description = descriptionMatch[1].trim();
    if (exampleMatch) feedback.example = exampleMatch[1].trim();
    if (correctAnswerMatch) feedback.correctAnswer = correctAnswerMatch[1].trim();
    if (sentenceMatch) feedback.sentence = sentenceMatch[1].trim();
    return feedback;
  };

router.post('/captions', async (req, res) => {
    const { captions } = req.body;

    try {
        const prompt = `
현재 나는 부족한 회화 실력을 높이기 위해서 내가 좋아하는 유튜브 영상에서 나온 표현으로 공부하고 있어. 
영상의 스크립트를 다운받았는데, 유튜브 자동생성 기능으로 받아온 영어자막이라, 
스펠링이 틀리기도 하고, 비슷한 발음을 가진 다른 단어로 나오는 부분도 있고, &nbsp등 컴퓨터 기호가 포함되어 있는 부분도 있어서 
이걸로 공부하기가 힘들어. 
내가 공부하고 있는 유튜브 영상의 스크립트를 하단에서 보내줄게.
이 스크립트를 구성하고 있는 모든 단어들이 정확한 스펠링과 문맥을 이루고 있도록, 문장의 끝에 정확하게 마침표가 찍어져있도록, 
컴퓨터 기호 등은 없도록 수정해서 제공해줘. 
다른 부연설명이나 텍스트는 주지 말고 딱 스크립트 그 자체만 줘. 


스크립트: ${captions}
`;

        // OpenAI API에 요청하여 응답을 받음 (openai service)
        let fixedcaption = await getChatResponse(prompt);
        fixedcaption = fixedcaption.replace(/수정된|스크립트|:/g, "").trim();
        
        res.send({fixedcaption})
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send('Server error');
    }});

module.exports = router;