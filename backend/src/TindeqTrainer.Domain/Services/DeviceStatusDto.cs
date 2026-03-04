namespace TindeqTrainer.Domain.Services;

public sealed record DeviceStatusDto(
    bool IsConnected,
    string? DeviceName,
    float? BatteryVoltage,
    string? FirmwareVersion);
