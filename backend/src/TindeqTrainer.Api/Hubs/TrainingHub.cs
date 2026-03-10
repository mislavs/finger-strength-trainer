using Microsoft.AspNetCore.SignalR;
using TindeqTrainer.Application.Services;
using TindeqTrainer.Domain.Services;

namespace TindeqTrainer.Api.Hubs;

public class TrainingHub(
    IProgressorService _progressorService,
    LiveStreamService _liveStreamService) : Hub
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
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
        }

        await Clients.All.SendAsync("DeviceStatus", BuildDeviceStatus(), ct);
    }

    public Task CancelConnect()
    {
        _progressorService.CancelConnect();
        return Task.CompletedTask;
    }

    public async Task Disconnect()
    {
        await _progressorService.DisconnectAsync();
        await Clients.All.SendAsync("DeviceStatus", BuildDeviceStatus(), Context.ConnectionAborted);
    }

    public async Task Tare()
    {
        await _progressorService.TareAsync(Context.ConnectionAborted);
    }

    public async Task StartLiveStream()
    {
        await _liveStreamService.StartAsync(Context.ConnectionAborted);
    }

    public async Task StopLiveStream()
    {
        await _liveStreamService.StopAsync(Context.ConnectionAborted);
    }

    public async Task<Guid> SaveLiveStream()
    {
        return await _liveStreamService.SaveAsync(Context.ConnectionAborted);
    }

    public Task DiscardLiveStream()
    {
        _liveStreamService.Discard();
        return Task.CompletedTask;
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
