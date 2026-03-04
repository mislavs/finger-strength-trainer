using TindeqTrainer.Domain.Constants;
using TindeqTrainer.Domain.Services;
using TindeqTrainer.Domain.ValueObjects;
using Windows.Devices.Bluetooth;
using Windows.Devices.Bluetooth.Advertisement;
using Windows.Devices.Bluetooth.GenericAttributeProfile;
using Windows.Foundation;
using Windows.Storage.Streams;

namespace TindeqTrainer.Infrastructure.Bluetooth;

public sealed class ProgressorService : IProgressorService
{
    private const byte CommandResponseCode = 0x00;
    private const byte WeightResponseCode = 0x01;
    private const string DeviceNamePrefix = "Progressor";
    private static readonly TimeSpan DefaultScanTimeout = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan CommandResponseTimeout = TimeSpan.FromSeconds(5);

    private readonly SemaphoreSlim _connectionLock = new(1, 1);
    private readonly SemaphoreSlim _commandLock = new(1, 1);
    private readonly object _responseLock = new();

    private BluetoothLEDevice? _device;
    private GattDeviceService? _service;
    private GattCharacteristic? _dataPointCharacteristic;
    private GattCharacteristic? _controlPointCharacteristic;
    private TaskCompletionSource<byte[]>? _commandResponseTcs;
    private bool _disposed;

    public bool IsConnected { get; private set; }

    public string? DeviceName { get; private set; }

    public float? BatteryVoltage { get; private set; }

    public string? FirmwareVersion { get; private set; }

    public event Action<ForceSample[]>? SamplesReceived;

    public event Action<bool>? ConnectionStatusChanged;

    public async Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();

        await _connectionLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (IsConnected)
            {
                return;
            }

            var bluetoothAddress = await ScanForDeviceAddressAsync(DefaultScanTimeout, cancellationToken).ConfigureAwait(false);
            await ConnectCoreAsync(bluetoothAddress, cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _connectionLock.Release();
        }
    }

    public async Task DisconnectAsync()
    {
        if (_disposed)
        {
            return;
        }

        await _connectionLock.WaitAsync().ConfigureAwait(false);
        try
        {
            await DisconnectCoreAsync().ConfigureAwait(false);
        }
        finally
        {
            _connectionLock.Release();
        }
    }

    public Task TareAsync(CancellationToken cancellationToken = default)
    {
        return SendCommandAsync(ProgressorCommands.Tare, cancellationToken);
    }

    public Task StartMeasurementAsync(CancellationToken cancellationToken = default)
    {
        return SendCommandAsync(ProgressorCommands.StartMeasurement, cancellationToken);
    }

    public Task StopMeasurementAsync(CancellationToken cancellationToken = default)
    {
        return SendCommandAsync(ProgressorCommands.StopMeasurement, cancellationToken);
    }

    public async Task<float> GetBatteryVoltageAsync(CancellationToken cancellationToken = default)
    {
        var payload = await SendCommandAndWaitForResponseAsync(ProgressorCommands.SampleBattery, cancellationToken)
            .ConfigureAwait(false);
        var voltage = NotificationParser.ParseBatteryVoltage(payload);
        BatteryVoltage = voltage;
        return voltage;
    }

    public async Task<string> GetFirmwareVersionAsync(CancellationToken cancellationToken = default)
    {
        var payload = await SendCommandAndWaitForResponseAsync(ProgressorCommands.GetAppVersion, cancellationToken)
            .ConfigureAwait(false);
        var firmwareVersion = NotificationParser.ParseFirmwareVersion(payload);
        FirmwareVersion = firmwareVersion;
        return firmwareVersion;
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return;
        }

        await DisconnectAsync().ConfigureAwait(false);
        _disposed = true;

        _connectionLock.Dispose();
        _commandLock.Dispose();
        GC.SuppressFinalize(this);
    }

    private async Task<ulong> ScanForDeviceAddressAsync(TimeSpan timeout, CancellationToken cancellationToken)
    {
        if (timeout <= TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(timeout), "Scan timeout must be greater than zero.");
        }

        using var timeoutCts = new CancellationTokenSource(timeout);
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);
        var addressTaskSource = new TaskCompletionSource<ulong>(TaskCreationOptions.RunContinuationsAsynchronously);

        TypedEventHandler<BluetoothLEAdvertisementWatcher, BluetoothLEAdvertisementReceivedEventArgs>? onReceived = null;
        onReceived = (_, args) =>
        {
            var localName = args.Advertisement.LocalName;
            if (string.IsNullOrWhiteSpace(localName) ||
                !localName.StartsWith(DeviceNamePrefix, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            addressTaskSource.TrySetResult(args.BluetoothAddress);
        };

        var watcher = new BluetoothLEAdvertisementWatcher
        {
            ScanningMode = BluetoothLEScanningMode.Active
        };
        watcher.Received += onReceived;
        watcher.Start();

        using var cancellationRegistration = linkedCts.Token.Register(() =>
            addressTaskSource.TrySetCanceled(linkedCts.Token));

        try
        {
            return await addressTaskSource.Task.ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException("No Tindeq Progressor device found within the scan timeout.");
        }
        finally
        {
            watcher.Stop();
            watcher.Received -= onReceived;
        }
    }

    private async Task ConnectCoreAsync(ulong bluetoothAddress, CancellationToken cancellationToken)
    {
        _device = await BluetoothLEDevice.FromBluetoothAddressAsync(bluetoothAddress)
            .AsTask(cancellationToken)
            .ConfigureAwait(false)
            ?? throw new InvalidOperationException("Failed to create Bluetooth device from the discovered address.");
        _device.ConnectionStatusChanged += OnConnectionStatusChanged;
        DeviceName = _device.Name;

        try
        {
            var serviceUuid = new Guid(ProgressorUuids.Service);
            var serviceResult = await _device.GetGattServicesForUuidAsync(serviceUuid, BluetoothCacheMode.Uncached)
                .AsTask(cancellationToken)
                .ConfigureAwait(false);
            EnsureGattSuccess(serviceResult.Status, "Failed to resolve the Progressor GATT service.");
            _service = serviceResult.Services.Count > 0
                ? serviceResult.Services[0]
                : throw new InvalidOperationException("Progressor GATT service was not found on the device.");

            var dataPointUuid = new Guid(ProgressorUuids.DataPoint);
            var dataPointResult = await _service.GetCharacteristicsForUuidAsync(dataPointUuid, BluetoothCacheMode.Uncached)
                .AsTask(cancellationToken)
                .ConfigureAwait(false);
            EnsureGattSuccess(dataPointResult.Status, "Failed to resolve the Data Point characteristic.");
            _dataPointCharacteristic = dataPointResult.Characteristics.Count > 0
                ? dataPointResult.Characteristics[0]
                : throw new InvalidOperationException("Data Point characteristic was not found on the device.");

            var controlPointUuid = new Guid(ProgressorUuids.ControlPoint);
            var controlPointResult = await _service
                .GetCharacteristicsForUuidAsync(controlPointUuid, BluetoothCacheMode.Uncached)
                .AsTask(cancellationToken)
                .ConfigureAwait(false);
            EnsureGattSuccess(controlPointResult.Status, "Failed to resolve the Control Point characteristic.");
            _controlPointCharacteristic = controlPointResult.Characteristics.Count > 0
                ? controlPointResult.Characteristics[0]
                : throw new InvalidOperationException("Control Point characteristic was not found on the device.");

            _dataPointCharacteristic.ValueChanged += OnDataPointValueChanged;
            var cccdStatus = await _dataPointCharacteristic
                .WriteClientCharacteristicConfigurationDescriptorAsync(
                    GattClientCharacteristicConfigurationDescriptorValue.Notify)
                .AsTask(cancellationToken)
                .ConfigureAwait(false);
            EnsureGattSuccess(cccdStatus, "Failed to enable notifications on the Data Point characteristic.");

            IsConnected = true;
            ConnectionStatusChanged?.Invoke(true);
        }
        catch
        {
            await DisconnectCoreAsync().ConfigureAwait(false);
            throw;
        }
    }

    private async Task DisconnectCoreAsync()
    {
        var wasConnected = IsConnected;

        lock (_responseLock)
        {
            _commandResponseTcs?.TrySetCanceled();
            _commandResponseTcs = null;
        }

        if (_dataPointCharacteristic is not null)
        {
            try
            {
                await _dataPointCharacteristic
                    .WriteClientCharacteristicConfigurationDescriptorAsync(
                        GattClientCharacteristicConfigurationDescriptorValue.None)
                    .AsTask()
                    .ConfigureAwait(false);
            }
            catch
            {
                // Best effort cleanup while disconnecting.
            }

            _dataPointCharacteristic.ValueChanged -= OnDataPointValueChanged;
        }

        if (_device is not null)
        {
            _device.ConnectionStatusChanged -= OnConnectionStatusChanged;
        }

        _controlPointCharacteristic = null;
        _dataPointCharacteristic = null;
        _service?.Dispose();
        _service = null;
        _device?.Dispose();
        _device = null;

        IsConnected = false;
        DeviceName = null;
        BatteryVoltage = null;
        FirmwareVersion = null;

        if (wasConnected)
        {
            ConnectionStatusChanged?.Invoke(false);
        }
    }

    private async Task SendCommandAsync(byte opcode, CancellationToken cancellationToken)
    {
        ThrowIfDisposed();
        await _commandLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await WriteCommandAsync(opcode, cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _commandLock.Release();
        }
    }

    private async Task<byte[]> SendCommandAndWaitForResponseAsync(byte opcode, CancellationToken cancellationToken)
    {
        ThrowIfDisposed();
        await _commandLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var responseTaskSource = new TaskCompletionSource<byte[]>(TaskCreationOptions.RunContinuationsAsynchronously);
            lock (_responseLock)
            {
                if (_commandResponseTcs is not null)
                {
                    throw new InvalidOperationException("A command response is already pending.");
                }

                _commandResponseTcs = responseTaskSource;
            }

            try
            {
                await WriteCommandAsync(opcode, cancellationToken).ConfigureAwait(false);

                using var timeoutCts = new CancellationTokenSource(CommandResponseTimeout);
                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);
                using var cancellationRegistration = linkedCts.Token.Register(() =>
                    responseTaskSource.TrySetCanceled(linkedCts.Token));

                try
                {
                    return await responseTaskSource.Task.ConfigureAwait(false);
                }
                catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
                {
                    throw new TimeoutException($"Timed out waiting for response to command 0x{opcode:X2}.");
                }
            }
            finally
            {
                lock (_responseLock)
                {
                    if (ReferenceEquals(_commandResponseTcs, responseTaskSource))
                    {
                        _commandResponseTcs = null;
                    }
                }
            }
        }
        finally
        {
            _commandLock.Release();
        }
    }

    private async Task WriteCommandAsync(byte opcode, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (_controlPointCharacteristic is null)
        {
            throw new InvalidOperationException("Cannot send command before connecting to the Progressor.");
        }

        using var writer = new DataWriter();
        writer.WriteByte(opcode);
        var status = await _controlPointCharacteristic
            .WriteValueAsync(writer.DetachBuffer(), GattWriteOption.WriteWithResponse)
            .AsTask(cancellationToken)
            .ConfigureAwait(false);
        EnsureGattSuccess(status, $"Failed to send command opcode 0x{opcode:X2}.");
    }

    private static void EnsureGattSuccess(GattCommunicationStatus status, string message)
    {
        if (status != GattCommunicationStatus.Success)
        {
            throw new InvalidOperationException($"{message} Status: {status}.");
        }
    }

    private void OnConnectionStatusChanged(BluetoothLEDevice sender, object args)
    {
        if (sender.ConnectionStatus == BluetoothConnectionStatus.Disconnected)
        {
            _ = HandleUnexpectedDisconnectAsync();
        }
    }

    private async Task HandleUnexpectedDisconnectAsync()
    {
        if (_disposed)
        {
            return;
        }

        await _connectionLock.WaitAsync().ConfigureAwait(false);
        try
        {
            await DisconnectCoreAsync().ConfigureAwait(false);
        }
        finally
        {
            _connectionLock.Release();
        }
    }

    private void OnDataPointValueChanged(GattCharacteristic sender, GattValueChangedEventArgs args)
    {
        var data = new byte[args.CharacteristicValue.Length];
        DataReader.FromBuffer(args.CharacteristicValue).ReadBytes(data);

        var (responseCode, payload) = NotificationParser.ParseTlv(data);
        switch (responseCode)
        {
            case WeightResponseCode:
            {
                var samples = NotificationParser.ParseWeightSamples(payload);
                if (samples.Length > 0)
                {
                    SamplesReceived?.Invoke(samples);
                }

                break;
            }
            case CommandResponseCode:
            {
                TaskCompletionSource<byte[]>? pendingResponse;
                lock (_responseLock)
                {
                    pendingResponse = _commandResponseTcs;
                }

                pendingResponse?.TrySetResult(payload);
                break;
            }
        }
    }

    private void ThrowIfDisposed()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
    }
}
