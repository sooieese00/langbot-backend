const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
//const connectDB = require('./config/db');
//const userRoutes = require('./routes/userRoutes');
const openaiRoutes = require('./routes/openaiRoutes');
const youtubeRoutes = require('./routes/youtubeRoutes')
//const playhtRoutes = require('./routes/playhtRoutes');
const azureRoutes = require('./routes/azureRoutes');
require('dotenv').config();

// 환경 변수 설정
dotenv.config();

// MongoDB 연결
//connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 기본 라우트 설정 예시
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// 사용자 라우트
//app.use('/api/users', userRoutes);

// OpenAI 라우트
app.use('/api/openai', openaiRoutes);

// PlayHT 라우트
//app.use('/api/playht', playhtRoutes);

// youtube 라우트
app.use('/api/youtube', youtubeRoutes);

// azure 라우트
const getSubscriptionKey = require('./middleware/azureEnv');
app.use('/api/azure', azureRoutes);
app.get('/api/azure/key', getSubscriptionKey);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
