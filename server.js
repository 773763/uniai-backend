require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs'); 
const commonData = require('./data');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// JSON Files
const DB_CONTRIBUTIONS = 'contributions.json';
const DB_NOTICES = 'notices.json';
const DB_STATS = 'stats.json';
const DB_REPORTS = 'reports.json';

// Ensure Files Exist
[DB_CONTRIBUTIONS, DB_NOTICES, DB_STATS, DB_REPORTS].forEach(file => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify([], null, 2));
});

// 1. Structure API
app.get('/api/structure', (req, res) => {
    const structure = {
        universities: [{
            id: 'BTU', name: 'Bikaner Technical University (BTU)',
            degrees: [{
                id: 'BTech', name: 'B.Tech',
                branches: [
                    { id: 'CSE', name: 'Computer Science', sems: [1,2,3,4,5,6,7,8] },
                    { id: 'CYBER', name: 'Cyber Security', sems: [1,2,3,4,5,6,7,8] }, 
                    { id: 'IT', name: 'Information Technology', sems: [1,2,3,4,5,6,7,8] },
                    { id: 'Civil', name: 'Civil Engineering', sems: [1,2,3,4,5,6,7,8] },
                    { id: 'Mechanical', name: 'Mechanical', sems: [1,2,3,4,5,6,7,8] },
                    { id: 'Electrical', name: 'Electrical (EE)', sems: [1,2,3,4,5,6,7,8] },
                    { id: 'ECE', name: 'Electronics (ECE)', sems: [1,2,3,4,5,6,7,8] }
                ]
            }]
        }]
    };
    res.json(structure);
});

// 2. File Fetch API
app.post('/api/files', (req, res) => {
    if (!req.body) return res.json([]);
    const { sem, branch } = req.body;
    let filesToSend = [];

    if (sem == 1 || sem == 2 || sem === '1' || sem === '2') {
        if (sem == 1 || sem === '1') {
            filesToSend.push(
                { name: "📂 Sem 1 Content (Part 1)", fileName: "sem1_part1", url: commonData.sem1.folder_1, isExternal: true },
                { name: "📂 Sem 1 Content (Part 2)", fileName: "sem1_part2", url: commonData.sem1.folder_2, isExternal: true }
            );
        } else {
            filesToSend.push({ name: "📂 Sem 2 Full Content", fileName: "sem2_full", url: commonData.sem2.folder, isExternal: true });
        }
    } 
    else if (branch && ['CSE', 'IT', 'CYBER'].includes(branch)) {
        if (sem == 3 || sem === '3') {
            const sem3Data = commonData.cs_it_cyber.sem3;
            if (sem3Data) {
                for (const [subjectName, link] of Object.entries(sem3Data)) {
                    filesToSend.push({ name: `📘 ${subjectName}`, fileName: subjectName.replace(/\s/g, '_'), url: link, isExternal: true });
                }
            }
        } else {
            filesToSend.push({ name: "⚠️ Content Coming Soon", fileName: "empty", url: "", isExternal: false });
        }
    }
    else {
        filesToSend.push({ name: "⚠️ Branch Content Not Added Yet", fileName: "empty", url: "", isExternal: false });
    }
    res.json(filesToSend);
});

// 3. Contribution API
app.post('/api/contribute', (req, res) => {
    const { subject, link, note, studentName } = req.body;
    if (!subject || !link) return res.status(400).json({ message: "Missing fields" });

    const newEntry = { id: Date.now(), studentName: studentName || "Student", subject, link, note: note || "No details", status: 'Pending', date: new Date().toLocaleString() };
    updateJsonFile(DB_CONTRIBUTIONS, (data) => data.push(newEntry), () => res.json(newEntry));
});

app.post('/api/contribute/delete', (req, res) => {
    const { id } = req.body;
    updateJsonFile(DB_CONTRIBUTIONS, (data) => {
        const idx = data.findIndex(i => i.id === id);
        if (idx > -1) data.splice(idx, 1);
    }, () => res.json({ success: true }));
});

// 4. Admin API
app.get('/api/admin/requests', (req, res) => {
    readJsonFile(DB_CONTRIBUTIONS, (data) => res.json(data));
});

app.post('/api/admin/action', (req, res) => {
    const { id, action } = req.body;
    updateJsonFile(DB_CONTRIBUTIONS, (data) => {
        const item = data.find(i => i.id === id);
        if (item) item.status = action;
    }, () => res.json({ success: true }));
});

// 5. NOTICE BOARD API
app.get('/api/notice', (req, res) => {
    readJsonFile(DB_NOTICES, (data) => {
        const latest = data.length > 0 ? data[data.length - 1] : null;
        res.json(latest);
    });
});

app.post('/api/admin/notice', (req, res) => {
    const { message } = req.body;
    const newNotice = { id: Date.now(), message, date: new Date().toLocaleString() };
    updateJsonFile(DB_NOTICES, (data) => data.push(newNotice), () => res.json({ success: true }));
});

// 🔥 Delete Notice API
app.post('/api/admin/notice/delete', (req, res) => {
    // Empty the notices file
    fs.writeFile(DB_NOTICES, JSON.stringify([], null, 2), () => res.json({ success: true }));
});

// 6. ANALYTICS API
app.post('/api/analytics/user', (req, res) => {
    const { degree, branch, sem } = req.body;
    const userEntry = { id: Date.now(), degree, branch, sem, date: new Date().toLocaleString() };
    updateJsonFile(DB_STATS, (data) => data.push(userEntry), () => res.json({ success: true }));
});

app.get('/api/admin/analytics', (req, res) => {
    readJsonFile(DB_STATS, (data) => res.json(data));
});

// 7. REPORT API (Updated for PATH)
app.post('/api/report', (req, res) => {
    const { fileName, url, issue, path } = req.body; // 🔥 Added 'path'
    const report = { id: Date.now(), fileName, url, issue, path: path || "Unknown Path", date: new Date().toLocaleString() };
    updateJsonFile(DB_REPORTS, (data) => data.push(report), () => res.json({ success: true }));
});

app.get('/api/admin/reports', (req, res) => {
    readJsonFile(DB_REPORTS, (data) => res.json(data));
});

// Helpers
function readJsonFile(file, callback) {
    fs.readFile(file, (err, data) => {
        if (err) return callback([]);
        try { callback(JSON.parse(data)); } catch (e) { callback([]); }
    });
}

function updateJsonFile(file, updateFn, callback) {
    fs.readFile(file, (err, data) => {
        let json = [];
        if (!err && data) try { json = JSON.parse(data); } catch (e) {}
        updateFn(json);
        fs.writeFile(file, JSON.stringify(json, null, 2), callback);
    });
}

app.listen(PORT, () => {
    console.log(`\n✅ Server Running on: http://localhost:${PORT}`);
});