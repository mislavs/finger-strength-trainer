using Microsoft.AspNetCore.SignalR;
using TindeqTrainer.Application.Services;
using TindeqTrainer.Domain.Services;

namespace TindeqTrainer.Api.Hubs;

public class TrainingHub(
    IProgressorService _progressorService,
    LiveStreamService _liveStreamService,
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

    public async Task StartLiveStream()
    {
        try
        {
            await _liveStreamService.StartAsync(Context.ConnectionAborted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Hub method {Method} failed", nameof(StartLiveStream));
            throw;
        }
    }

    public async Task StopLiveStream()
    {
        try
        {
            await _liveStreamService.StopAsync(Context.ConnectionAborted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Hub method {Method} failed", nameof(StopLiveStream));
            throw;
        }
    }

    public async Task<Guid> SaveLiveStream()
    {
        try
        {
            return await _liveStreamService.SaveAsync(Context.ConnectionAborted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Hub method {Method} failed", nameof(SaveLiveStream));
            throw;
        }
    }

    public Task DiscardLiveStream()
    {
        try
        {
            _liveStreamService.Discard();
            return Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Hub method {Method} failed", nameof(DiscardLiveStream));
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
