using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.VisualStudio.Shell;
using Microsoft.Web.WebView2.WinForms;

namespace NPZVsix.Source
{
    public class ToolWindowPanel : ToolWindowPane
    {
        private WebView2 _webView;

        public ToolWindowPanel() : base(null)
        {
            this.Caption = "NPZ Panel";
            var control = new UserControl();
            _webView = new WebView2 { Dock = DockStyle.Fill };
            control.Controls.Add(_webView);
            this.Content = control;
            InitializeAsync();
        }

        private async void InitializeAsync()
        {
            try
            {
                await _webView.EnsureCoreWebView2Async();
                var path = System.IO.Path.Combine(System.AppDomain.CurrentDomain.BaseDirectory, "resources", "panel.html");
                _webView.CoreWebView2.Navigate(new Uri(path).AbsoluteUri);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to initialize WebView2: " + ex.Message);
            }
        }
    }
}
