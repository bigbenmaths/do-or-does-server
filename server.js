// Filename: server.js (for Don't or Doesn't)

const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// *** สำคัญ: เราจะใช้ Origin แบบ wildcard (*) ไปก่อนเพื่อการทดสอบ ***
// *** เมื่อ Frontend Deploy เสร็จแล้วค่อยกลับมาแก้เป็น URL จริง ***
app.use(cors()); 
app.use(express.json()); 

// --- [MODIFIED] คลังข้อมูลสำหรับ "Don't or Doesn't" ---
const femaleNames=["Lisa","Mary","Anna","Sophia","Olivia","Emma"];
const maleNames=["David","John","Michael","James","William","Robert"];
const singularAnimals=["a cat","a dog","a bird","a rabbit","an elephant","a lion"];
const pluralAnimals=["cats","dogs","birds","rabbits","elephants","lions","monkeys","tigers"];
const verbs=[{v:"like",r:"cartoons"},{v:"eat",r:"apples"},{v:"play",r:"football"},{v:"read",r:"books"},{v:"sing",r:"songs"},{v:"study",r:"English"},{v:"drive",r:"cars"},{v:"cook",r:"dinner"},{v:"watch",r:"movies"},{v:"write",r:"letters"}];

// Function to get a random element from an array
function getRandomElement(t){return t[Math.floor(Math.random()*t.length)]}

// --- [NEW] ฟังก์ชันสำหรับสร้างคำถาม "Don't or Doesn't" ---
function generateNewQuestion() {
    let subject;
    // This logic mimics the original game's question distribution
    const randomType = Math.random();
    if (randomType < 0.25) {
        subject = getRandomElement(["I","You","We","They","He","She","It"]);
    } else if (randomType < 0.5) {
        subject = getRandomElement(femaleNames.concat(maleNames));
    } else if (randomType < 0.75) {
        subject = getRandomElement(singularAnimals.concat(pluralAnimals));
    } else {
        subject = getRandomElement(["My brother and I", "You and your sister", `${getRandomElement(femaleNames)} and ${getRandomElement(maleNames)}`]);
    }

    const verb = getRandomElement(verbs);
    
    // Determine the correct answer
    const isSingularThirdPerson = ["He", "She", "It"].includes(subject) || femaleNames.includes(subject) || maleNames.includes(subject) || singularAnimals.includes(subject);
    const correctAnswer = isSingularThirdPerson ? "doesn't" : "don't";

    // Format the question sentence
    let displaySubject = subject.toString();
    if (displaySubject.substring(0,2) !== "a " && displaySubject.substring(0,3) !== "an ") {
        displaySubject = displaySubject.charAt(0).toUpperCase() + displaySubject.slice(1);
    }

    const questionText = `${displaySubject} ___ ${verb.v} ${verb.r}.`;
    
    // For this game, there is no separate statement text.
    const statementText = ""; // We can leave this empty or remove it from the client later.

    return { questionText, statementText, correctAnswer };
}


let gameSessions = {};

app.get('/wake-up', (req, res) => res.status(200).send({ status: 'awake' }));

app.post('/start-game', (req, res) => {
    const { playerName } = req.body; 
    if (!playerName || !playerName.trim()) return res.status(400).json({ message: 'Player name is required' });

    const gameId = `game_${Date.now()}`;
    const { questionText, statementText, correctAnswer } = generateNewQuestion();

    gameSessions[gameId] = {
        score: 0, playerName: playerName.trim(), currentQuestionNumber: 1, totalQuestions: 30,
        currentCorrectAnswer: correctAnswer, lastQuestionTimestamp: Date.now()
    };
    
    res.json({
        gameId: gameId, questionText: questionText, currentStatement: statementText,
        score: 0, questionNumber: 1, totalQuestions: 30
    });
});

app.post('/submit-answer', (req, res) => {
    const { gameId, playerChoice } = req.body;
    const session = gameSessions[gameId];
    if (!session) return res.status(404).json({ message: 'Game session not found' });
    
    // ... (The rest of the submit-answer logic is almost identical) ...
    // ... You can copy it from the old server.js, just make sure ...
    // ... the correctAnswer is "don't" or "doesn't" ...
    // ... and the generateNewQuestion() call is correct. ...
    
    // For completeness, here is the full submit-answer logic
    const timeLimit = 10000;
    const timeTaken = Date.now() - session.lastQuestionTimestamp;
    if (timeTaken > timeLimit) { /* ... Time up logic ... */ }

    let result = 'incorrect';
    let message = `ผิดจ้า! คำตอบที่ถูกคือ "${session.currentCorrectAnswer}"`;
    if (playerChoice === session.currentCorrectAnswer) {
        session.score += 1;
        result = 'correct';
        message = 'เก่งมาก!';
    }
    
    if (session.currentQuestionNumber >= session.totalQuestions) {
        // ... Game Over logic ...
        const finalScore = session.score;
        const playerName = session.playerName;
        const endMessage = `เยี่ยมมาก ${playerName}!`;
        delete gameSessions[gameId];
        return res.json({
            isGameOver: true, result: result, message: endMessage,
            playerName: playerName, finalScore: finalScore, totalQuestions: 30
        });
    }

    session.currentQuestionNumber += 1;
    const { questionText, statementText, correctAnswer: nextCorrectAnswer } = generateNewQuestion();
    
    session.currentCorrectAnswer = nextCorrectAnswer;
    session.lastQuestionTimestamp = Date.now();

    res.json({
        isGameOver: false, result: result, message: message, newScore: session.score,
        questionNumber: session.currentQuestionNumber, totalQuestions: 30,
        nextQuestionText: questionText, currentStatement: statementText
    });
});


app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});