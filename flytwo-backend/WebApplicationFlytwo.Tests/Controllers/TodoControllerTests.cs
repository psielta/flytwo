using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using WebApplicationFlytwo.Controllers;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Tests.Fixtures;

namespace WebApplicationFlytwo.Tests.Controllers;

public class TodoControllerTests : IClassFixture<TestFixture>
{
    private readonly TestFixture _fixture;

    public TodoControllerTests(TestFixture fixture)
    {
        _fixture = fixture;
    }

    #region GetAll Tests

    [Fact]
    public async Task GetAll_ReturnsAllTodos_OrderedByCreatedAtDescending()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var baseDate = DateTime.UtcNow;
        context.Todos.AddRange(
            new Todo { Id = 1, Title = "First", CreatedAt = baseDate.AddMinutes(-10) },
            new Todo { Id = 2, Title = "Second", CreatedAt = baseDate.AddMinutes(-5) },
            new Todo { Id = 3, Title = "Third", CreatedAt = baseDate }
        );
        await context.SaveChangesAsync();

        var controller = new TodoController(context, mapper, logger.Object);

        // Act
        var result = await controller.GetAll();

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        var todos = okResult!.Value as IEnumerable<TodoDto>;
        todos.Should().NotBeNull();
        todos.Should().HaveCount(3);
        todos!.First().Title.Should().Be("Third");
        todos!.Last().Title.Should().Be("First");
    }

    [Fact]
    public async Task GetAll_WhenNoTodos_ReturnsEmptyList()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var controller = new TodoController(context, mapper, logger.Object);

        // Act
        var result = await controller.GetAll();

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        var todos = okResult!.Value as IEnumerable<TodoDto>;
        todos.Should().NotBeNull();
        todos.Should().BeEmpty();
    }

    #endregion

    #region GetById Tests

    [Fact]
    public async Task GetById_WithValidId_ReturnsTodo()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var todo = new Todo
        {
            Id = 1,
            Title = "Test Todo",
            Description = "Test Description",
            IsCompleted = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Todos.Add(todo);
        await context.SaveChangesAsync();

        var controller = new TodoController(context, mapper, logger.Object);

        // Act
        var result = await controller.GetById(1);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        var returnedTodo = okResult!.Value as TodoDto;
        returnedTodo.Should().NotBeNull();
        returnedTodo!.Id.Should().Be(1);
        returnedTodo.Title.Should().Be("Test Todo");
        returnedTodo.Description.Should().Be("Test Description");
    }

    [Fact]
    public async Task GetById_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var controller = new TodoController(context, mapper, logger.Object);

        // Act
        var result = await controller.GetById(999);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    #endregion

    #region Create Tests

    [Fact]
    public async Task Create_WithValidRequest_ReturnsCreatedTodo()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var controller = new TodoController(context, mapper, logger.Object);
        var request = new CreateTodoRequest
        {
            Title = "New Todo",
            Description = "New Description"
        };

        // Act
        var result = await controller.Create(request);

        // Assert
        result.Result.Should().BeOfType<CreatedAtActionResult>();
        var createdResult = result.Result as CreatedAtActionResult;
        createdResult!.StatusCode.Should().Be(201);
        var createdTodo = createdResult.Value as TodoDto;
        createdTodo.Should().NotBeNull();
        createdTodo!.Title.Should().Be("New Todo");
        createdTodo.Description.Should().Be("New Description");
    }

    [Fact]
    public async Task Create_SetsCreatedAtToUtcNow()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var controller = new TodoController(context, mapper, logger.Object);
        var request = new CreateTodoRequest { Title = "New Todo" };
        var beforeCreate = DateTime.UtcNow;

        // Act
        var result = await controller.Create(request);

        // Assert
        var afterCreate = DateTime.UtcNow;
        var createdResult = result.Result as CreatedAtActionResult;
        var createdTodo = createdResult!.Value as TodoDto;
        createdTodo!.CreatedAt.Should().BeOnOrAfter(beforeCreate);
        createdTodo.CreatedAt.Should().BeOnOrBefore(afterCreate);
    }

    [Fact]
    public async Task Create_SetsIsCompletedToFalse()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var controller = new TodoController(context, mapper, logger.Object);
        var request = new CreateTodoRequest { Title = "New Todo" };

        // Act
        var result = await controller.Create(request);

        // Assert
        var createdResult = result.Result as CreatedAtActionResult;
        var createdTodo = createdResult!.Value as TodoDto;
        createdTodo!.IsCompleted.Should().BeFalse();
    }

    [Fact]
    public async Task Create_ReturnsCorrectLocationHeader()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var controller = new TodoController(context, mapper, logger.Object);
        var request = new CreateTodoRequest { Title = "New Todo" };

        // Act
        var result = await controller.Create(request);

        // Assert
        var createdResult = result.Result as CreatedAtActionResult;
        createdResult!.ActionName.Should().Be(nameof(TodoController.GetById));
        createdResult.RouteValues.Should().ContainKey("id");
    }

    [Fact]
    public async Task Create_PersistsTodoToDatabase()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var controller = new TodoController(context, mapper, logger.Object);
        var request = new CreateTodoRequest
        {
            Title = "Persisted Todo",
            Description = "Should be in database"
        };

        // Act
        await controller.Create(request);

        // Assert
        var todoInDb = context.Todos.FirstOrDefault(t => t.Title == "Persisted Todo");
        todoInDb.Should().NotBeNull();
        todoInDb!.Description.Should().Be("Should be in database");
    }

    #endregion

    #region Update Tests

    [Fact]
    public async Task Update_WithValidRequest_ReturnsUpdatedTodo()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var todo = new Todo
        {
            Id = 1,
            Title = "Original Title",
            Description = "Original Description",
            IsCompleted = false,
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };
        context.Todos.Add(todo);
        await context.SaveChangesAsync();

        var controller = new TodoController(context, mapper, logger.Object);
        var request = new UpdateTodoRequest
        {
            Title = "Updated Title",
            Description = "Updated Description",
            IsCompleted = true
        };

        // Act
        var result = await controller.Update(1, request);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        var updatedTodo = okResult!.Value as TodoDto;
        updatedTodo.Should().NotBeNull();
        updatedTodo!.Title.Should().Be("Updated Title");
        updatedTodo.Description.Should().Be("Updated Description");
        updatedTodo.IsCompleted.Should().BeTrue();
    }

    [Fact]
    public async Task Update_SetsUpdatedAtToUtcNow()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var todo = new Todo
        {
            Id = 1,
            Title = "Original Title",
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = null
        };
        context.Todos.Add(todo);
        await context.SaveChangesAsync();

        var controller = new TodoController(context, mapper, logger.Object);
        var request = new UpdateTodoRequest { Title = "Updated Title", IsCompleted = false };
        var beforeUpdate = DateTime.UtcNow;

        // Act
        var result = await controller.Update(1, request);

        // Assert
        var afterUpdate = DateTime.UtcNow;
        var okResult = result.Result as OkObjectResult;
        var updatedTodo = okResult!.Value as TodoDto;
        updatedTodo!.UpdatedAt.Should().NotBeNull();
        updatedTodo.UpdatedAt!.Value.Should().BeOnOrAfter(beforeUpdate);
        updatedTodo.UpdatedAt.Value.Should().BeOnOrBefore(afterUpdate);
    }

    [Fact]
    public async Task Update_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var controller = new TodoController(context, mapper, logger.Object);
        var request = new UpdateTodoRequest { Title = "Updated Title", IsCompleted = false };

        // Act
        var result = await controller.Update(999, request);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Update_PreservesCreatedAt()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var originalCreatedAt = DateTime.UtcNow.AddDays(-5);
        var todo = new Todo
        {
            Id = 1,
            Title = "Original Title",
            CreatedAt = originalCreatedAt
        };
        context.Todos.Add(todo);
        await context.SaveChangesAsync();

        var controller = new TodoController(context, mapper, logger.Object);
        var request = new UpdateTodoRequest { Title = "Updated Title", IsCompleted = true };

        // Act
        var result = await controller.Update(1, request);

        // Assert
        var okResult = result.Result as OkObjectResult;
        var updatedTodo = okResult!.Value as TodoDto;
        updatedTodo!.CreatedAt.Should().Be(originalCreatedAt);
    }

    [Fact]
    public async Task Update_PersistsChangesToDatabase()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var todo = new Todo
        {
            Id = 1,
            Title = "Original Title",
            IsCompleted = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Todos.Add(todo);
        await context.SaveChangesAsync();

        var controller = new TodoController(context, mapper, logger.Object);
        var request = new UpdateTodoRequest
        {
            Title = "Persisted Update",
            IsCompleted = true
        };

        // Act
        await controller.Update(1, request);

        // Assert
        var todoInDb = context.Todos.Find(1);
        todoInDb!.Title.Should().Be("Persisted Update");
        todoInDb.IsCompleted.Should().BeTrue();
    }

    #endregion

    #region Delete Tests

    [Fact]
    public async Task Delete_WithValidId_ReturnsNoContent()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var todo = new Todo
        {
            Id = 1,
            Title = "To Delete",
            CreatedAt = DateTime.UtcNow
        };
        context.Todos.Add(todo);
        await context.SaveChangesAsync();

        var controller = new TodoController(context, mapper, logger.Object);

        // Act
        var result = await controller.Delete(1);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Delete_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var controller = new TodoController(context, mapper, logger.Object);

        // Act
        var result = await controller.Delete(999);

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Delete_RemovesTodoFromDatabase()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        var todo = new Todo
        {
            Id = 1,
            Title = "To Delete",
            CreatedAt = DateTime.UtcNow
        };
        context.Todos.Add(todo);
        await context.SaveChangesAsync();

        var controller = new TodoController(context, mapper, logger.Object);

        // Act
        await controller.Delete(1);

        // Assert
        var todoInDb = context.Todos.Find(1);
        todoInDb.Should().BeNull();
    }

    [Fact]
    public async Task Delete_DoesNotAffectOtherTodos()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var mapper = _fixture.CreateMapper();
        var logger = _fixture.CreateLogger<TodoController>();

        context.Todos.AddRange(
            new Todo { Id = 1, Title = "Todo 1", CreatedAt = DateTime.UtcNow },
            new Todo { Id = 2, Title = "Todo 2", CreatedAt = DateTime.UtcNow },
            new Todo { Id = 3, Title = "Todo 3", CreatedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        var controller = new TodoController(context, mapper, logger.Object);

        // Act
        await controller.Delete(2);

        // Assert
        context.Todos.Should().HaveCount(2);
        context.Todos.Find(1).Should().NotBeNull();
        context.Todos.Find(3).Should().NotBeNull();
        context.Todos.Find(2).Should().BeNull();
    }

    #endregion
}
