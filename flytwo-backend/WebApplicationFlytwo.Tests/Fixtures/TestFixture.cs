using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using WebApplicationFlytwo.Data;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Mappings;
using ZiggyCreatures.Caching.Fusion;

namespace WebApplicationFlytwo.Tests.Fixtures;

public class TestFixture : IDisposable
{
    public AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    public IMapper CreateMapper()
    {
        var config = new MapperConfiguration(cfg =>
        {
            cfg.AddProfile<TodoProfile>();
            cfg.AddProfile<ProductProfile>();
        });
        return config.CreateMapper();
    }

    public IFusionCache CreateCache()
    {
        return new FusionCache(new FusionCacheOptions());
    }

    public Mock<ILogger<T>> CreateLogger<T>()
    {
        return new Mock<ILogger<T>>();
    }

    public static Todo CreateTodo(int id = 1, string title = "Test Todo", string? description = null, bool isCompleted = false)
    {
        return new Todo
        {
            Id = id,
            Title = title,
            Description = description,
            IsCompleted = isCompleted,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = null
        };
    }

    public static List<Todo> CreateTodos(int count)
    {
        var todos = new List<Todo>();
        var baseDate = DateTime.UtcNow;

        for (int i = 1; i <= count; i++)
        {
            todos.Add(new Todo
            {
                Id = i,
                Title = $"Todo {i}",
                Description = $"Description {i}",
                IsCompleted = i % 2 == 0,
                CreatedAt = baseDate.AddMinutes(-i),
                UpdatedAt = null
            });
        }

        return todos;
    }

    public static Product CreateProduct(int id = 1, string name = "Test Product", string category = "Electronics", decimal price = 99.99m)
    {
        return new Product
        {
            Id = id,
            Name = name,
            Description = $"Description for {name}",
            Category = category,
            Price = price,
            StockQuantity = 100,
            Sku = $"SKU-{id:D6}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = null
        };
    }

    public static List<Product> CreateProducts(int count)
    {
        var products = new List<Product>();
        var categories = new[] { "Electronics", "Clothing", "Books", "Home" };
        var baseDate = DateTime.UtcNow;

        for (int i = 1; i <= count; i++)
        {
            products.Add(new Product
            {
                Id = i,
                Name = $"Product {i}",
                Description = $"Description {i}",
                Category = categories[(i - 1) % categories.Length],
                Price = 10.00m + i,
                StockQuantity = i * 10,
                Sku = $"SKU-{i:D6}",
                IsActive = i % 5 != 0, // 80% active
                CreatedAt = baseDate.AddMinutes(-i),
                UpdatedAt = null
            });
        }

        return products;
    }

    public void Dispose()
    {
        GC.SuppressFinalize(this);
    }
}
