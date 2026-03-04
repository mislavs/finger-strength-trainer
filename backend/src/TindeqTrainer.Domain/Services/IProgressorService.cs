using TindeqTrainer.Domain.ValueObjects;

namespace TindeqTrainer.Domain.Services;

public interface IProgressorService : IAsyncDisposable
{
    bool IsConnected { get; }

    string? DeviceName { get; }

    float? BatteryVoltage { get; }

    string? FirmwareVersion { get; }

    Task ConnectAsync(CancellationToken cancellationToken = default);

    Task DisconnectAsync();

    Task TareAsync(CancellationToken cancellationToken = default);

    Task StartMeasurementAsync(CancellationToken cancellationToken = default);

    Task StopMeasurementAsync(CancellationToken cancellationToken = default);

    Task<float> GetBatteryVoltageAsync(CancellationToken cancellationToken = default);

    Task<string> GetFirmwareVersionAsync(CancellationToken cancellationToken = default);

    event Action<ForceSample[]>? SamplesReceived;

    event Action<bool>? ConnectionStatusChanged;
}
