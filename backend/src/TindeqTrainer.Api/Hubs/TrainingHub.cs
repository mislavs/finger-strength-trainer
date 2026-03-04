using Microsoft.AspNetCore.SignalR;
using TindeqTrainer.Domain.Services;

namespace TindeqTrainer.Api.Hubs;

public class TrainingHub(
    IProgressorService _progressorService,
    ILogger<TrainingHub> _logger) : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("DeviceStatus", BuildDeviceStatus(), Context.ConnectionAborted);
        await base.OnConnectedAsync();
    }

    public async Task Connect()
    {
        var ct = Context.ConnectionAborted;

        try
        {
            await _progressorService.ConnectAsync(ct);
            await _progressorService.GetBatteryVoltageAsync(ct);
            await _progressorService.GetFirmwareVersionAsync(ct);

            await Clients.All.SendAsync("DeviceStatus", BuildDeviceStatus(), ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Hub method {Method} failed", nameof(Connect));
            throw;
        }
    }

    public async Task Disconnect()
    {
        try
        {
            await _progressorService.DisconnectAsync();
            await Clients.All.SendAsync("DeviceStatus", BuildDeviceStatus(), Context.ConnectionAborted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Hub method {Method} failed", nameof(Disconnect));
            throw;
        }
    }

    public async Task Tare()
    {
        try
        {
            await _progressorService.TareAsync(Context.ConnectionAborted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Hub method {Method} failed", nameof(Tare));
            throw;
        }
    }

    private DeviceStatusDto BuildDeviceStatus()
    {
        return new DeviceStatusDto(
            _progressorService.IsConnected,
            _progressorService.DeviceName,
            _progressorService.BatteryVoltage,
            _progressorService.FirmwareVersion);
    }
}
