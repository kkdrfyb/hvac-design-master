Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectRoot = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = projectRoot
shell.Environment("PROCESS")("HIDE_WINDOWS") = "1"
shell.Environment("PROCESS")("SKIP_ENV_UPDATE") = "1"

shell.Run "cmd /c """ & projectRoot & "\start_all.bat""", 0, False
