using System.Buffers.Binary;
using System.Text;
using TindeqTrainer.Domain.ValueObjects;

namespace TindeqTrainer.Infrastructure.Bluetooth;

public static class NotificationParser
{
    public static (byte ResponseCode, byte[] Payload) ParseTlv(ReadOnlySpan<byte> data)
    {
        if (data.Length < 2)
        {
            return (0x00, []);
        }

        var responseCode = data[0];
        var declaredPayloadLength = data[1];
        var availablePayloadLength = data.Length - 2;
        if (declaredPayloadLength <= 0 || declaredPayloadLength > availablePayloadLength)
        {
            return (responseCode, []);
        }

        return (responseCode, data.Slice(2, declaredPayloadLength).ToArray());
    }

    public static ForceSample[] ParseWeightSamples(ReadOnlySpan<byte> payload)
    {
        if (payload.IsEmpty)
        {
            return [];
        }

        var samples = new List<ForceSample>(payload.Length / 8);
        for (var i = 0; i + 8 <= payload.Length; i += 8)
        {
            var weightBits = BinaryPrimitives.ReadInt32LittleEndian(payload.Slice(i, 4));
            var weightKg = BitConverter.Int32BitsToSingle(weightBits);
            var timestampMicroseconds = BinaryPrimitives.ReadUInt32LittleEndian(payload.Slice(i + 4, 4));
            var timestampSeconds = timestampMicroseconds / 1_000_000d;
            samples.Add(new ForceSample(weightKg, timestampSeconds));
        }

        return [.. samples];
    }

    public static float ParseBatteryVoltage(ReadOnlySpan<byte> payload)
    {
        if (payload.Length < 4)
        {
            throw new InvalidOperationException("Battery response payload must contain at least 4 bytes.");
        }

        var millivolts = BinaryPrimitives.ReadUInt32LittleEndian(payload.Slice(0, 4));
        return millivolts / 1_000f;
    }

    public static string ParseFirmwareVersion(ReadOnlySpan<byte> payload)
    {
        if (payload.IsEmpty)
        {
            return string.Empty;
        }

        return Encoding.UTF8.GetString(payload);
    }
}
