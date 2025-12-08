using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using WebApplicationFlytwo.Data;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Mappings;

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
        var config = new MapperConfiguration(cfg => cfg.AddProfile<TodoProfile>());
        return config.CreateMapper();
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

    public void Dispose()
    {
        GC.SuppressFinalize(this);
    }
}
