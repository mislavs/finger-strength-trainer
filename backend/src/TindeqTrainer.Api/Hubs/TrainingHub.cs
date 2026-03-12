using Microsoft.AspNetCore.SignalR;
using TindeqTrainer.Application.Services;
using TindeqTrainer.Domain.Services;

namespace TindeqTrainer.Api.Hubs;

public class TrainingHub(
    IProgressorService _progressorService,
    LiveStreamService _liveStreamService,
    BleConnectionMonitor _connectionMonitor) : Hub
{
    public override async Task OnConnectedAsync()
    {
        var cancellationToken = Context.ConnectionAborted;
        await Clients.Caller.SendAsync("DeviceStatus", BuildDeviceStatus(), cancellationToken);
        if (_connectionMonitor.IsReconnecting)
        {
            await Clients.Caller.SendAsync("ConnectionLost", cancellationToken);
        }

        await base.OnConnectedAsync();
    }

    public async Task Connect()
    {
        var ct = Context.ConnectionAborted;
        _connectionMonitor.CancelReconnection();

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
        _connectionMonitor.PrepareIntentionalDisconnect();
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
