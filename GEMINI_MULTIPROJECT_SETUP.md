# 🌍 Global Gemini CLI - Multi-Project Setup

## ✅ What's Been Configured

### 1. **Global Configuration** 
   - Location: `$HOME\.geminirc` (your user home directory)
   - Applies to: **ALL projects automatically**
   - Settings: YOLO mode globally enabled

### 2. **PowerShell Functions** (Available in ALL terminals)
   - `init-gemini` - Initialize a project (run once per project)
   - `gemini-work` - Start Gemini in YOLO mode
   - `gw` - Quick alias for `gemini-work`
   - `start-gemini` - Combined setup + start

---

## 🚀 How to Use (For Every Project)

### **Scenario 1: Switching to a New Project**

```powershell
# 1. Navigate to your project
cd C:\Projects\MyProject

# 2. Initialize it (one-time setup, ~5 seconds)
init-gemini

# 3. Start Gemini
gemini-work
```

### **Scenario 2: Quick Setup + Start (Recommended)**

```powershell
cd C:\Projects\MyProject
start-gemini
```

This does both steps at once!

### **Scenario 3: Project Already Initialized**

```powershell
cd C:\Projects\MyProject
gemini-work
```

Just run this - no setup needed if already initialized!

---

## 📋 What Each Function Does

| Function | What It Does | When to Use |
|----------|-------------|------------|
| `init-gemini` | Creates `.geminirc` in current project with YOLO settings | First time in a project |
| `gemini-work` | Launches Gemini in YOLO mode | Every time you want to start Gemini |
| `gw` | Shorthand for `gemini-work` | Quick access (type `gw` instead of full name) |
| `start-gemini` | Initializes project AND launches Gemini | One-liner setup + start |

---

## 🔄 Typical Workflow

### **Hour 1: Project A**
```powershell
cd "C:\Users\Asus\OneDrive\LLM_Projects\Saathi AI APK"
start-gemini
```
✅ Initialized + Gemini running

### **Hour 2: Switch to Project B**
```powershell
cd "C:\SomeOtherProject"
start-gemini
```
✅ Done! Works instantly

### **Hour 3: Back to Project A**
```powershell
cd "C:\Users\Asus\OneDrive\LLM_Projects\Saathi AI APK"
gw
```
✅ Already initialized, just start Gemini

---

## ✨ Key Features

✅ **Global Config**: No need to recreate files for every project  
✅ **One-Command Setup**: `start-gemini` does everything  
✅ **Auto-Approval**: YOLO mode on by default globally  
✅ **Project-Level Overrides**: Each project can have its own `.geminirc` if needed  
✅ **Quick Aliases**: `gw` is faster than typing `gemini-work`  

---

## 📁 File Structure

```
$HOME\                           (Your user directory)
├── .geminirc                    (Global config - applies to ALL projects)
└── OneDrive\LLM_Projects\
    ├── Saathi AI APK\
    │   └── .geminirc            (Project-specific override, optional)
    ├── Project B\
    │   └── .geminirc            (Project-specific override, optional)
    └── Project C\
        └── .geminirc            (Project-specific override, optional)
```

---

## 🎯 How It Works

1. **PowerShell loads** → Global `$PROFILE` runs
2. **Functions defined** → `init-gemini`, `gemini-work`, etc. are available
3. **You cd to project** → Working directory changes
4. **You run `start-gemini`** → Creates `.geminirc` in that project
5. **Gemini starts** → Uses both global + local config
6. **YOLO mode active** → Auto-approves everything

---

## ⚙️ Manual Config (If Needed)

If you ever want to manually create the config:

```powershell
cd C:\YourProject

# Create minimal config
@"
{
  "approvalMode": "yolo",
  "skipTrust": true,
  "enableSandbox": false
}
"@ | Out-File .geminirc -Encoding UTF8
```

---

## 🔧 Testing It Out

### **Test on Current Project**
```powershell
init-gemini
ls .geminirc              # Should show the file created
gw                        # Start Gemini
```

### **Test on Another Project**
```powershell
cd "C:\SomeOtherPath"
start-gemini              # Setup + start in one go
```

---

## 💡 Pro Tips

- **Fastest way**: Type `gw` instead of `gemini-work` 
- **One-liner**: `start-gemini` does both steps
- **Check status**: `cat .geminirc` to see project config
- **Change settings**: Edit `.geminirc` in project or `$HOME\.geminirc` globally

---

## 🎯 Summary

**Before (Old Way):**
- Switch projects → Create files → Start Gemini (slow, repetitive)

**Now (New Way):**
- Switch projects → `start-gemini` → Done! (30 seconds)

**For Already Initialized Projects:**
- `gw` → Done! (instant)

---

**You're all set!** Next time you switch projects, just run `start-gemini` and you're good to go. 🚀
