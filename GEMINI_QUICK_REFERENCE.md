# 🚀 Gemini CLI - Quick Reference

## For Any New Project (30 seconds)

```powershell
# Step 1: Go to project
cd "C:\Path\To\Your\Project"

# Step 2: Initialize & Start (one command!)
start-gemini
```

**Done!** Gemini is running with YOLO mode enabled.

---

## For Already Initialized Projects (1 second)

```powershell
cd "C:\Path\To\Your\Project"
gw
```

That's it!

---

## All Available Commands

| Command | Description | Time |
|---------|-------------|------|
| `start-gemini` | Setup + start Gemini | 30s |
| `init-gemini` | Just setup (no start) | 5s |
| `gemini-work` | Start Gemini | 3s |
| `gw` | Quick alias for `gemini-work` | 3s |

---

## Your Workflow

**Hour 1: Project A**
```powershell
cd ProjectA
start-gemini   # Setup + start
```

**Hour 2: Project B**
```powershell
cd ProjectB
start-gemini   # Setup + start
```

**Hour 3: Back to Project A**
```powershell
cd ProjectA
gw            # Just start (already initialized)
```

---

## Settings (Already Configured)

✅ Approval Mode: YOLO (auto-approves all changes)  
✅ Skip Trust: Yes (no trust prompts)  
✅ Sandbox: Disabled (no Docker path issues)  
✅ Global Config: `$HOME\.geminirc` (applies to all projects)  

---

## Need to Reset a Project?

```powershell
cd YourProject
rm .geminirc          # Delete project config
init-gemini           # Recreate with defaults
```

---

**That's all you need to know!** Copy this somewhere handy. 📌
