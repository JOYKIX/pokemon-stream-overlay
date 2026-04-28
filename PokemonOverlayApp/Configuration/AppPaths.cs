using System;
using System.IO;

namespace PokemonOverlayApp.Configuration;

public static class AppPaths
{
    public static string RootDirectory => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "PokemonOverlayDesktop");
    public static string StateFilePath => Path.Combine(RootDirectory, "state.json");
    public static string ObsExportPath => Path.Combine(RootDirectory, "obs-overlay.txt");
}
