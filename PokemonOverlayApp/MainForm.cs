using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace PokemonOverlayApp;

public sealed class MainForm : Form
{
    private readonly WebView2 _webView;

    public MainForm()
    {
        Text = "PokeOverlay - Desktop";
        Width = 1366;
        Height = 820;
        StartPosition = FormStartPosition.CenterScreen;

        _webView = new WebView2 { Dock = DockStyle.Fill };
        Controls.Add(_webView);

        Load += OnLoadAsync;
    }

    private async void OnLoadAsync(object? sender, EventArgs e)
    {
        try
        {
            await _webView.EnsureCoreWebView2Async();

            var root = Path.Combine(AppContext.BaseDirectory, "wwwroot");
            _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "appassets.local",
                root,
                CoreWebView2HostResourceAccessKind.Allow);

            _webView.Source = new Uri("https://appassets.local/login.html");
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"Impossible de démarrer l'application : {ex.Message}",
                "Erreur",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
        }
    }
}
