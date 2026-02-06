# Java Code Editor - Complete Setup Guide

## 🚀 Features
- ✅ **UNLIMITED** Java execution (local server)
- ✅ Real Java compilation and execution
- ✅ Interactive console with Scanner support
- ✅ All Java programs work (if-else, loops, arrays, etc.)
- ✅ Mobile responsive design
- ✅ File & project management
- ✅ Auto-save functionality

---

## 🎯 RECOMMENDED: Local Server Setup (Unlimited & Free)

### Prerequisites:
1. **Install Java JDK** (if not installed):
   - Download: https://www.oracle.com/java/technologies/downloads/
   - Or use OpenJDK: https://adoptium.net/
   - Verify: Open CMD and type `java -version`

### Option A: Node.js Backend (Easiest)

1. **Install Node.js** (if not installed):
   - Download: https://nodejs.org/
   - Verify: `node -v`

2. **Install Dependencies:**
   ```bash
   cd "Java Editor Web"
   npm install
   ```

3. **Start Server:**
   ```bash
   npm start
   ```
   Server will run on: http://localhost:3000

4. **Open Editor:**
   - Open `index.html` in browser
   - Write Java code and click Run
   - ✅ **UNLIMITED executions!**

### Option B: Python Backend (Alternative)

1. **Install Python** (if not installed):
   - Download: https://www.python.org/downloads/
   - Verify: `python --version`

2. **Install Dependencies:**
   ```bash
   pip install flask flask-cors
   ```

3. **Start Server:**
   ```bash
   python server.py
   ```
   Server will run on: http://localhost:5000

4. **Update app.js:**
   - Change port from 3000 to 5000 in line 98

---

## 🌐 Alternative: Online API (Limited)

### JDoodle API (200 calls/day - Free)

1. **Get API Key:**
   - Visit: https://www.jdoodle.com/compiler-api
   - Sign up for free
   - Copy `clientId` and `clientSecret`

2. **Update app.js:**
   - Find line ~115: `clientId: 'your_client_id'`
   - Replace with your credentials

---

## 📱 How to Use

1. **Start local server** (Node.js or Python)
2. **Open `index.html`** in browser
3. **Create project** and files
4. **Write Java code**
5. **Click Run** button
6. **For Scanner programs:**
   - Enter all inputs when prompted
   - Click Submit after each input
   - Program executes with your inputs

---

## 🎯 Execution Priority

1. **Local Server** (unlimited) - Tries first
2. **JDoodle API** (200/day) - Fallback if server not running
3. **Simulation Mode** - Last resort for basic programs

---

## ✅ Supported Java Features

✅ All Java syntax
✅ Scanner input (nextInt, nextLine, nextDouble, etc.)
✅ If-else-if statements
✅ Loops (for, while, do-while)
✅ Arrays and collections
✅ Methods and classes
✅ Exception handling
✅ File I/O
✅ Everything Java supports!

---

## 💡 Tips

- **Unlimited execution**: Use local server
- **Ctrl+S**: Save files
- **Auto-save**: Enabled by default
- **Mobile**: Use bottom navigation
- **Download**: Export your code anytime

---

## 🐛 Troubleshooting

**"Local server not running" error:**
- Make sure you started the server (`npm start` or `python server.py`)
- Check if Java JDK is installed (`java -version`)
- Verify server is running on correct port

**Compilation error:**
- Check Java syntax
- Make sure class name matches filename
- Verify Java JDK is in system PATH

**Input not working:**
- Enter all required inputs
- Press Enter or click Submit
- Check console for errors

---

## 🔥 Why Local Server?

| Feature | Local Server | JDoodle API | Simulation |
|---------|-------------|-------------|------------|
| **Executions** | ♾️ Unlimited | 200/day | Limited |
| **Speed** | ⚡ Fast | 🐢 Slow | ⚡ Fast |
| **Accuracy** | ✅ 100% | ✅ 100% | ❌ 30% |
| **All Programs** | ✅ Yes | ✅ Yes | ❌ No |
| **Internet** | ❌ Not needed | ✅ Required | ❌ Not needed |

---

## 📞 Support

- **JDoodle Docs**: https://docs.jdoodle.com/
- **Monaco Editor**: https://microsoft.github.io/monaco-editor/
- **Node.js**: https://nodejs.org/docs/
- **Python Flask**: https://flask.palletsprojects.com/

---

**Made with ❤️ for Java learners**
