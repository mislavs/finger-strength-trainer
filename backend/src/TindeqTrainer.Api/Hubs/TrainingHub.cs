using Microsoft.AspNetCore.SignalR;
using TindeqTrainer.Domain.Services;

namespace TindeqTrainer.Api.Hubs;

public class TrainingHub(IProgressorService _progressorService) : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("DeviceStatus", BuildDeviceStatus(), Context.ConnectionAborted);
        await base.OnConnectedAsync();
    }

    public async Task Connect(CancellationToken cancellationToken = default)
    {
        await _progressorService.ConnectAsync(cancellationToken);
        await _progressorService.GetBatteryVoltageAsync(cancellationToken);
        await _progressorService.GetFirmwareVersionAsync(cancellationToken);

        await Clients.All.SendAsync("DeviceStatus", BuildDeviceStatus(), cancellationToken);
    }

    public async Task Disconnect(CancellationToken cancellationToken = default)
    {
        await _progressorService.DisconnectAsync();
        await Clients.All.SendAsync("DeviceStatus", BuildDeviceStatus(), cancellationToken);
    }

    public Task Tare(CancellationToken cancellationToken = default)
    {
        return _progressorService.TareAsync(cancellationToken);
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
