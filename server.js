// --- 1. Import ไลบรารีที่จำเป็น ---
const express = require('express');
const cors = require('cors');

// --- 2. สร้าง Application หลัก ---
const app = express();
const port = 3000;

// --- 3. ตั้งค่า Middleware ---

// ** แทนที่ app.use(cors()); ด้วยโค้ดนี้ **
const corsOptions = {
  origin: 'https://do-or-does-client.vercel.app', // << ใส่ URL ของ Vercel Frontend ของคุณตรงนี้!
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
app.use(cors(corsOptions));
// ****************************************

app.use(express.json()); 
// ... โค้ดที่เหลือเหมือนเดิม ...
app.use(express.json()); 

// --- 4. คลังข้อมูลสำหรับสร้างคำถาม ---
const verbs = [
    { v: "like", s_v: "likes", r: "cartoons" }, { v: "eat", s_v: "eats", r: "apples" },
    { v: "play", s_v: "plays", r: "football" }, { v: "read", s_v: "reads", r: "books" },
    { v: "sing", s_v: "sings", r: "songs" }, { v: "study", s_v: "studies", r: "English" },
    { v: "drive", s_v: "drives", r: "cars" }, { v: "cook", s_v: "cooks", r: "dinner" },
    { v: "watch", s_v: "watches", r: "movies" }, { v: "write", s_v: "writes", r: "letters" }
];
const subjects = ["I", "You", "We", "They", "He", "She", "a cat", "My friends", "Lisa", "David"];

// --- 5. หน่วยความจำสำหรับเก็บเซสชันเกมทั้งหมด ---
let gameSessions = {};

// --- 6. สร้าง API Endpoints ---

    app.get('/wake-up', (req, res) => {
    res.status(200).send({ status: 'awake' });
});

// Endpoint สำหรับเริ่มเกมใหม่
app.post('/start-game', (req, res) => {
    const { playerName } = req.body; 

    if (!playerName || playerName.trim() === '') {
        return res.status(400).json({ message: 'กรุณาส่งชื่อผู้เล่น (playerName)' });
    }

    const gameId = `game_${Date.now()}`;
    gameSessions[gameId] = {
        score: 0, playerName: playerName.trim(), currentQuestionNumber: 1, totalQuestions: 30, // <== อัปเดตเป็น 30
        currentCorrectAnswer: null, lastQuestionTimestamp: Date.now()
    };
    
    const randomVerb = verbs[Math.floor(Math.random() * verbs.length)];
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    let displaySubject = (randomSubject !== 'I' && randomSubject !== 'Lisa' && randomSubject !== 'David') ? randomSubject.toLowerCase() : randomSubject;
    const correctAnswer = (['He', 'She', 'a cat', 'Lisa', 'David'].includes(randomSubject)) ? 'Does' : 'Do';
    const questionText = `___ ${displaySubject} ${randomVerb.v} ${randomVerb.r}?`;
    
    const statementVerb = (correctAnswer === 'Do') ? randomVerb.v : randomVerb.s_v;
    const statementText = `${randomSubject} ${statementVerb} ${randomVerb.r}.`;
    
    gameSessions[gameId].currentCorrectAnswer = correctAnswer;
    
    res.json({
        gameId: gameId,
        questionText: questionText,
        currentStatement: statementText,
        score: 0,
        questionNumber: 1,
        totalQuestions: 30 // <== อัปเดตเป็น 30
    });
});

// Endpoint สำหรับส่งและตรวจคำตอบ
app.post('/submit-answer', (req, res) => {
    const { gameId, playerChoice } = req.body;
    const session = gameSessions[gameId];

    if (!session) {
        return res.status(404).json({ message: 'ไม่พบเซสชันเกมนี้' });
    }
    
    const timeLimit = 10000; // <== อัปเดตเป็น 10 วินาที
    const timeTaken = Date.now() - session.lastQuestionTimestamp;

    if (timeTaken > timeLimit) {
        delete gameSessions[gameId];
        return res.status(408).json({ 
            isGameOver: true, 
            message: `หมดเวลา! คุณใช้เวลาไป ${Math.round(timeTaken / 1000)} วินาที` 
        });
    }

    let result = 'incorrect';
    let message = `ผิดจ้า! คำตอบที่ถูกคือ "${session.currentCorrectAnswer}"`;

    if (playerChoice === session.currentCorrectAnswer) {
        session.score += 1;
        result = 'correct';
        message = 'เก่งมาก! ถูกต้องนะคร้าบ';
    }
    
    if (session.currentQuestionNumber >= session.totalQuestions) {
        const finalScore = session.score;
        const playerName = session.playerName;
        const endMessage = `เยี่ยมมาก ${playerName}! คุณทำภารกิจสำเร็จแล้ว`;
        delete gameSessions[gameId];
        return res.json({
            isGameOver: true,
            result: result,
            message: endMessage,
            playerName: playerName, // << ส่ง playerName กลับไปด้วย
            finalScore: finalScore,
            totalQuestions: 30 // <== อัปเดตเป็น 30
        });
    }

    session.currentQuestionNumber += 1;
    
    const randomVerb = verbs[Math.floor(Math.random() * verbs.length)];
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    let displaySubject = (randomSubject !== 'I' && randomSubject !== 'Lisa' && randomSubject !== 'David') ? randomSubject.toLowerCase() : randomSubject;
    const nextCorrectAnswer = (['He', 'She', 'a cat', 'Lisa', 'David'].includes(randomSubject)) ? 'Does' : 'Do';
    const nextQuestionText = `___ ${displaySubject} ${randomVerb.v} ${randomVerb.r}?`;
        
    const nextStatementVerb = (nextCorrectAnswer === 'Do') ? randomVerb.v : randomVerb.s_v;
    const nextStatementText = `${randomSubject} ${nextStatementVerb} ${randomVerb.r}.`;
    
    session.currentCorrectAnswer = nextCorrectAnswer;
    session.lastQuestionTimestamp = Date.now();

    res.json({
        isGameOver: false,
        result: result,
        message: message,
        newScore: session.score,
        questionNumber: session.currentQuestionNumber,
        totalQuestions: 30, // <== อัปเดตเป็น 30
        nextQuestionText: nextQuestionText,
        currentStatement: nextStatementText
    });
});

// --- 7. เปิด Server รอรับการเชื่อมต่อ ---
app.listen(port, () => {
    console.log(`Server กำลังรอรับสายที่ http://localhost:${port}`);
});