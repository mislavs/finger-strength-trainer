using Microsoft.AspNetCore.SignalR;
using TindeqTrainer.Application.Services;
using TindeqTrainer.Domain.Services;

namespace TindeqTrainer.Api.Hubs;

public class TrainingHub(
    IProgressorService _progressorService,
    LiveStreamService _liveStreamService,
    RepeaterStreamService _repeaterStreamService,
    BleConnectionMonitor _connectionMonitor) : Hub
{
    public override async Task OnConnectedAsync()
    {
        var cancellationToken = Context.ConnectionAborted;
        await Clients.Caller.SendAsync("DeviceStatus", BuildDeviceStatus(), cancellationToken);
        await Clients.Caller.SendAsync("ForceStreamStateChanged", IsForceStreamActive(), cancellationToken);
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
        if (IsForceStreamActive())
        {
            throw new HubException("Cannot tare while a force stream is active.");
        }

        await _progressorService.TareAsync(Context.ConnectionAborted);
    }

    public async Task StartLiveStream()
    {
        if (_repeaterStreamService.IsStreaming)
        {
            throw new HubException("Stop the repeater stream before starting a live stream.");
        }

        await _liveStreamService.StartAsync(Context.ConnectionAborted);
    }

    public async Task StopLiveStream()
    {
        await _liveStreamService.StopAsync(Context.ConnectionAborted);
    }

    public async Task StartRepeaterStream()
    {
        if (_liveStreamService.IsStreaming)
        {
            throw new HubException("Stop the live stream before starting repeater force streaming.");
        }

        await _repeaterStreamService.StartAsync(Context.ConnectionAborted);
    }

    public async Task StopRepeaterStream()
    {
        if (!_repeaterStreamService.IsStreaming)
        {
            return;
        }

        await _repeaterStreamService.StopAsync(Context.ConnectionAborted);
    }

    private DeviceStatusDto BuildDeviceStatus()
    {
        return new DeviceStatusDto(
            _progressorService.IsConnected,
            _progressorService.DeviceName,
            _progressorService.BatteryVoltage,
            _progressorService.FirmwareVersion);
    }

    private bool IsForceStreamActive()
    {
        return _liveStreamService.IsStreaming || _repeaterStreamService.IsStreaming;
    }
}
