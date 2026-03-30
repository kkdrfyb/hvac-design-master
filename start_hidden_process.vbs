Set shell = CreateObject("WScript.Shell")

If WScript.Arguments.Count < 2 Then
  WScript.Quit 1
End If

workingDir = WScript.Arguments(0)
exePath = WScript.Arguments(1)
args = ""

For i = 2 To WScript.Arguments.Count - 1
  args = args & " " & WScript.Arguments(i)
Next

shell.CurrentDirectory = workingDir
shell.Run """" & exePath & """" & args, 0, False
