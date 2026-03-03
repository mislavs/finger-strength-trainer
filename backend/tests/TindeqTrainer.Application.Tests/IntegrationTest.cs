using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Tests;

public class IntegrationTest(IntegrationTestFactory factory) : IAsyncLifetime
{
    private readonly Func<ValueTask> _resetDatabase = factory.ResetDatabase;

    protected AppDbContext DbContext => factory.DbContext;

    protected async Task Insert<T>(T entity)
        where T : class
    {
        await DbContext.AddAsync(entity);
        await DbContext.SaveChangesAsync();
    }

    protected async Task InsertMany<T>(IEnumerable<T> entities)
        where T : class
    {
        await DbContext.AddRangeAsync(entities);
        await DbContext.SaveChangesAsync();
    }

    public ValueTask InitializeAsync()
    {
        return ValueTask.CompletedTask;
    }

    public ValueTask DisposeAsync()
    {
        return _resetDatabase();
    }
}
