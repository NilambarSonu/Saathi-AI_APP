# ✅ Global Gemini Multi-Project Setup - COMPLETE

## What's Configured

### ✅ Global Configuration (Applies to ALL Projects)
- **Location**: `C:\Users\Asus\.geminirc`
- **Settings**: 
  ```json
  {
    "approvalMode": "yolo",
    "skipTrust": true,
    "enableSandbox": false
  }
  ```
- **Effect**: YOLO mode enabled globally for every project

### ✅ PowerShell Functions (Available in ALL terminals)
- **Profile Location**: `C:\Users\Asus\OneDrive\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`
- **Functions**:
  - `init-gemini` - Initialize a project (creates `.geminirc`)
  - `gemini-work` - Start Gemini in YOLO mode
  - `gw` - Quick alias for `gemini-work`
  - `start-gemini` - Combined setup + start

---

## 🚀 How to Use - Next Time You Switch Projects

### **First Time in a Project** (30 seconds)
```powershell
cd "C:\Path\To\Your\Project"
start-gemini
```

This:
1. ✅ Creates `.geminirc` in the project
2. ✅ Starts Gemini in YOLO mode
3. ✅ Auto-approves all changes

### **For Already Initialized Projects** (1 second)
```powershell
cd "C:\Path\To\Your\Project"
gw
```

Just runs Gemini - no setup needed!

---

## 📋 Available Commands Reference

### `start-gemini`
```powershell
cd MyProject
start-gemini
```
**Does**: Initializes project + starts Gemini in one command  
**Time**: ~30 seconds  
**Best for**: New projects you haven't used Gemini in yet

### `init-gemini`
```powershell
cd MyProject
init-gemini
```
**Does**: Creates `.geminirc` in project (sets up YOLO mode)  
**Time**: ~5 seconds  
**Best for**: Setting up a project before you start working

### `gemini-work`
```powershell
cd MyProject
gemini-work
```
**Does**: Starts Gemini (assumes project is already initialized)  
**Time**: ~3 seconds  
**Best for**: Projects you've already set up

### `gw`
```powershell
cd MyProject
gw
```
**Does**: Same as `gemini-work` (shorter alias)  
**Time**: ~3 seconds  
**Best for**: Quick access, less typing

---

## 📊 Typical Workflow Throughout Your Day

### **9:00 AM - Project A (First Time)**
```powershell
cd "C:\LLM_Projects\Saathi AI APK"
start-gemini
# ✅ Project initialized + Gemini running
```

### **10:30 AM - Switch to Project B (First Time)**
```powershell
cd "D:\Work\Project B"
start-gemini
# ✅ Project initialized + Gemini running
```

### **12:00 PM - Back to Project A (Already Initialized)**
```powershell
cd "C:\LLM_Projects\Saathi AI APK"
gw
# ✅ Gemini running instantly
```

### **1:00 PM - Switch to Project C (First Time)**
```powershell
cd "C:\AnotherProject\Project C"
start-gemini
# ✅ Project initialized + Gemini running
```

### **2:00 PM - Back to Project B (Already Initialized)**
```powershell
cd "D:\Work\Project B"
gw
# ✅ Gemini running instantly
```

---

## 🎯 How It All Works Together

1. **PowerShell starts** → Profile loads → Functions available
2. **You cd to a project** → Working directory changes
3. **You run `start-gemini`** → Creates `.geminirc` in that project
4. **Gemini reads configs**:
   - Global: `$HOME\.geminirc` (YOLO mode globally)
   - Local: `ProjectFolder\.geminirc` (project-specific overrides)
5. **Gemini starts** → YOLO mode active → No approvals needed
6. **You work** → Everything auto-executes

---

## 📁 File Structure After Setup

```
C:\Users\Asus\                          (Your home directory)
└── .geminirc                           (Global config - applies to ALL projects)

C:\LLM_Projects\
├── Saathi AI APK\
│   └── .geminirc                       (Project-specific config)
├── Project B\
│   └── .geminirc                       (Project-specific config)
└── Project C\
    └── .geminirc                       (Project-specific config)

D:\Work\
└── Project B\
    └── .geminirc                       (Project-specific config)
```

Each project has its own `.geminirc`, but they all inherit from the global config.

---

## ✨ Key Benefits

| Benefit | Before | After |
|---------|--------|-------|
| Setup per project | Manual (slow) | Automatic (30s) |
| Switching projects | 5+ minutes | ~30 seconds |
| Already initialized | Still slow | ~1 second with `gw` |
| YOLO mode | Manual config | Always on |
| Consistency | Hodgepodge | Uniform across all projects |

---

## 🔧 If You Ever Need to Reset

### Reset a Specific Project
```powershell
cd MyProject
rm .geminirc              # Delete project config
init-gemini              # Recreate with defaults
```

### Reset Global Config
```powershell
rm "$env:USERPROFILE\.geminirc"    # Delete global config
# Then create a new one with the JSON above
```

---

## 📝 Next Steps

### **Option 1: Test It Now** (Recommended)
```powershell
# Close all PowerShell terminals completely
# Open a NEW PowerShell terminal
cd "C:\LLM_Projects\Saathi AI APK"
gw    # Should start Gemini with YOLO mode
```

### **Option 2: Create a Test Project**
```powershell
mkdir "C:\TestGeminiProject"
cd "C:\TestGeminiProject"
start-gemini    # Setup + start in one go
```

---

## 🎓 Understanding the Setup

- **Global `.geminirc`**: Applied automatically to all projects
- **Project `.geminirc`**: Allows per-project customization (if needed)
- **PowerShell Functions**: Quick shortcuts to common tasks
- **YOLO Mode**: Always enabled - no approvals needed
- **One-Command Setup**: `start-gemini` does everything

---

## 💡 Pro Tips

✅ **Use `gw` instead of `gemini-work`** - faster to type  
✅ **Use `start-gemini` for new projects** - setup + start in one go  
✅ **Use `gw` for initialized projects** - super fast  
✅ **Check status**: `cat .geminirc` to see project config  
✅ **Check global**: `cat "$env:USERPROFILE\.geminirc"` to see global config  

---

## 🚀 You're All Set!

From now on, switching projects is as simple as:

```powershell
cd ProjectName
start-gemini     # First time
gw               # Already initialized
```

**That's it!** No more manual setup, no more hodgepodge of different configurations. 🎉

---

**Created**: May 5, 2026  
**Status**: ✅ Ready for multi-project development
