using System;
using System.ComponentModel.Design;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using Microsoft.VisualStudio.Shell;
using Task = System.Threading.Tasks.Task;

namespace Qflush.Funesterie.VS
{
    [PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
    [InstalledProductRegistration("QFLUSH Studio", "Funesterie orchestrator integration", "1.0")]
    [ProvideMenuResource("Menus.ctmenu", 1)]
    [Guid(PackageGuidString)]
    public sealed class QflushPackage : AsyncPackage
    {
        public const string PackageGuidString = "D4B8D8D2-9C3C-4C69-9C44-FAF5F8E0AB12";
        private const int CommandId = 0x0100;
        private static readonly Guid CommandSet = new Guid("F88B7D26-3E2D-4B91-9E38-0CF8CB5A3344");

        protected override async Task InitializeAsync(
            CancellationToken cancellationToken,
            IProgress<ServiceProgressData> progress)
        {
            await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);

            if (await GetServiceAsync(typeof(IMenuCommandService)) is OleMenuCommandService mcs)
            {
                var cmdId = new CommandID(CommandSet, CommandId);
                var menuItem = new MenuCommand(OnQflushCommand, cmdId);
                mcs.AddCommand(menuItem);
            }
        }

        private void OnQflushCommand(object sender, EventArgs e)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "npx.cmd",
                    Arguments = "@funeste38/qflush start --verbose",
                    UseShellExecute = false,
                    CreateNoWindow = false,
                    WorkingDirectory = @"D:\qflush"
                };
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                VsShellUtilities.ShowMessageBox(
                    this,
                    $"Erreur lors du lancement de QFLUSH : {ex.Message}",
                    "QFLUSH Studio",
                    OLEMSGICON.OLEMSGICON_CRITICAL,
                    OLEMSGBUTTON.OLEMSGBUTTON_OK,
                    OLEMSGDEFBUTTON.OLEMSGBUTTON_FIRST);
            }
        }
    }
}
