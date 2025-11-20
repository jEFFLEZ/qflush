NPZ Visual - Visual Studio extension skeleton

This folder contains a minimal Visual Studio VSIX project that hosts a WebView2-powered Tool Window to display the NPZ panel (the same UI used by the VS Code extension).

How to build and install using Visual Studio (Community) on Windows:

1. Open a Developer Command Prompt for VS 2022 or use the full devenv path.
2. Build the VSIX project via MSBuild or devenv.exe:
   - Using devenv.exe:
     "C:\Program Files\Microsoft Visual Studio\18\Community\Common7\IDE\devenv.exe" /build Release "extensions\visual-studio-npz\NPZVsix\NPZVsix.csproj"
   - Or open the solution in Visual Studio and press F5 to debug/install.
3. The produced `.vsix` will be in the `bin\Release` folder. Install via Extensions -> Manage Extensions -> Install from VSIX.

Notes:
- The Tool Window loads `resources\panel.html` by default. You can change it to point at `http://localhost:4500` (NPZ daemon) to fetch dynamic data.
- WebView2 runtime may be required on the target machine.
