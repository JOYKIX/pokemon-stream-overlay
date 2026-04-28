using System.Security.Cryptography;
using System.Text;

namespace PokemonOverlayApp.Services;

public static class SecurityService
{
    public static string Hash(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes);
    }

    public static string HashEditKey(string channel, string editKey) => Hash($"{channel.Trim().ToLowerInvariant()}::{editKey.Trim()}");

    public static string GenerateRecoveryKey()
    {
        Span<byte> bytes = stackalloc byte[8];
        RandomNumberGenerator.Fill(bytes);
        var raw = Convert.ToHexString(bytes);
        return string.Join('-', Enumerable.Range(0, 4).Select(i => raw.Substring(i * 4, 4)));
    }

    public static string HashRecoveryKey(string recoveryKey) => Hash($"recovery::{recoveryKey.Replace("-", string.Empty).Trim().ToUpperInvariant()}");
}
