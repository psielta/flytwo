using AutoMapper;
using FluentAssertions;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Mappings;

namespace WebApplicationFlytwo.Tests.Mappings;

public class TodoProfileTests
{
    private readonly IMapper _mapper;

    public TodoProfileTests()
    {
        var config = new MapperConfiguration(cfg => cfg.AddProfile<TodoProfile>());
        _mapper = config.CreateMapper();
    }

    [Fact]
    public void AutoMapper_Configuration_CanCreateMapper()
    {
        // Arrange
        var config = new MapperConfiguration(cfg => cfg.AddProfile<TodoProfile>());

        // Act
        var mapper = config.CreateMapper();

        // Assert
        mapper.Should().NotBeNull();
    }

    [Fact]
    public void Map_TodoToTodoDto_MapsAllProperties()
    {
        // Arrange
        var createdAt = DateTime.UtcNow.AddDays(-1);
        var updatedAt = DateTime.UtcNow;
        var todo = new Todo
        {
            Id = 1,
            Title = "Test Title",
            Description = "Test Description",
            IsCompleted = true,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt
        };

        // Act
        var dto = _mapper.Map<TodoDto>(todo);

        // Assert
        dto.Should().NotBeNull();
        dto.Id.Should().Be(todo.Id);
        dto.Title.Should().Be(todo.Title);
        dto.Description.Should().Be(todo.Description);
        dto.IsCompleted.Should().Be(todo.IsCompleted);
        dto.CreatedAt.Should().Be(todo.CreatedAt);
        dto.UpdatedAt.Should().Be(todo.UpdatedAt);
    }

    [Fact]
    public void Map_TodoToTodoDto_WithNullDescription_MapsCorrectly()
    {
        // Arrange
        var todo = new Todo
        {
            Id = 1,
            Title = "Test Title",
            Description = null,
            IsCompleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = null
        };

        // Act
        var dto = _mapper.Map<TodoDto>(todo);

        // Assert
        dto.Should().NotBeNull();
        dto.Description.Should().BeNull();
        dto.UpdatedAt.Should().BeNull();
    }

    [Fact]
    public void Map_CreateTodoRequestToTodo_MapsCorrectly()
    {
        // Arrange
        var request = new CreateTodoRequest
        {
            Title = "New Todo",
            Description = "New Description"
        };

        // Act
        var todo = _mapper.Map<Todo>(request);

        // Assert
        todo.Should().NotBeNull();
        todo.Title.Should().Be(request.Title);
        todo.Description.Should().Be(request.Description);
        todo.Id.Should().Be(0);
        todo.IsCompleted.Should().BeFalse();
    }

    [Fact]
    public void Map_CreateTodoRequestToTodo_WithNullDescription_MapsCorrectly()
    {
        // Arrange
        var request = new CreateTodoRequest
        {
            Title = "New Todo",
            Description = null
        };

        // Act
        var todo = _mapper.Map<Todo>(request);

        // Assert
        todo.Should().NotBeNull();
        todo.Title.Should().Be(request.Title);
        todo.Description.Should().BeNull();
    }

    [Fact]
    public void Map_UpdateTodoRequestToTodo_MapsCorrectly()
    {
        // Arrange
        var request = new UpdateTodoRequest
        {
            Title = "Updated Title",
            Description = "Updated Description",
            IsCompleted = true
        };

        // Act
        var todo = _mapper.Map<Todo>(request);

        // Assert
        todo.Should().NotBeNull();
        todo.Title.Should().Be(request.Title);
        todo.Description.Should().Be(request.Description);
        todo.IsCompleted.Should().Be(request.IsCompleted);
    }

    [Fact]
    public void Map_UpdateTodoRequestToTodo_WithNullDescription_MapsCorrectly()
    {
        // Arrange
        var request = new UpdateTodoRequest
        {
            Title = "Updated Title",
            Description = null,
            IsCompleted = false
        };

        // Act
        var todo = _mapper.Map<Todo>(request);

        // Assert
        todo.Should().NotBeNull();
        todo.Title.Should().Be(request.Title);
        todo.Description.Should().BeNull();
        todo.IsCompleted.Should().BeFalse();
    }

    [Fact]
    public void Map_TodoCollection_ToTodoDtoCollection_MapsCorrectly()
    {
        // Arrange
        var todos = new List<Todo>
        {
            new() { Id = 1, Title = "Todo 1", Description = "Desc 1", IsCompleted = false, CreatedAt = DateTime.UtcNow },
            new() { Id = 2, Title = "Todo 2", Description = "Desc 2", IsCompleted = true, CreatedAt = DateTime.UtcNow },
            new() { Id = 3, Title = "Todo 3", Description = null, IsCompleted = false, CreatedAt = DateTime.UtcNow }
        };

        // Act
        var dtos = _mapper.Map<IEnumerable<TodoDto>>(todos);

        // Assert
        dtos.Should().NotBeNull();
        dtos.Should().HaveCount(3);
        dtos.Select(d => d.Id).Should().BeEquivalentTo(new[] { 1, 2, 3 });
    }
}
