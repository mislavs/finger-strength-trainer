using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TindeqTrainer.Domain.Services;
using TindeqTrainer.Infrastructure.Bluetooth;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Infrastructure;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite(configuration.GetConnectionString("DefaultConnection")));

        var useMockBle = bool.TryParse(configuration["UseMockBle"], out var useMockSetting) && useMockSetting;
        if (useMockBle)
        {
            services.AddSingleton<IProgressorService, MockProgressorService>();
        }
        else
        {
            services.AddSingleton<IProgressorService, ProgressorService>();
        }

        return services;
    }
}
