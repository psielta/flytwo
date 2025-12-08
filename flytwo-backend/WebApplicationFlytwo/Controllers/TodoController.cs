using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Swashbuckle.AspNetCore.Annotations;
using WebApplicationFlytwo.Data;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TodoController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<TodoController> _logger;

    public TodoController(AppDbContext context, IMapper mapper, ILogger<TodoController> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    [HttpGet]
    [SwaggerOperation(Summary = "Get all todos")]
    [ProducesResponseType(typeof(IEnumerable<TodoDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<TodoDto>>> GetAll()
    {
        _logger.LogInformation("Getting all todos");
        var todos = await _context.Todos.OrderByDescending(t => t.CreatedAt).ToListAsync();
        return Ok(_mapper.Map<IEnumerable<TodoDto>>(todos));
    }

    [HttpGet("{id}")]
    [SwaggerOperation(Summary = "Get todo by id")]
    [ProducesResponseType(typeof(TodoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TodoDto>> GetById(int id)
    {
        _logger.LogInformation("Getting todo with id {Id}", id);
        var todo = await _context.Todos.FindAsync(id);

        if (todo == null)
        {
            _logger.LogWarning("Todo with id {Id} not found", id);
            return NotFound();
        }

        return Ok(_mapper.Map<TodoDto>(todo));
    }

    [HttpPost]
    [SwaggerOperation(Summary = "Create a new todo")]
    [ProducesResponseType(typeof(TodoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TodoDto>> Create([FromBody] CreateTodoRequest request)
    {
        _logger.LogInformation("Creating new todo with title: {Title}", request.Title);

        var todo = _mapper.Map<Todo>(request);
        todo.CreatedAt = DateTime.UtcNow;

        _context.Todos.Add(todo);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created todo with id {Id}", todo.Id);
        return CreatedAtAction(nameof(GetById), new { id = todo.Id }, _mapper.Map<TodoDto>(todo));
    }

    [HttpPut("{id}")]
    [SwaggerOperation(Summary = "Update an existing todo")]
    [ProducesResponseType(typeof(TodoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TodoDto>> Update(int id, [FromBody] UpdateTodoRequest request)
    {
        _logger.LogInformation("Updating todo with id {Id}", id);

        var todo = await _context.Todos.FindAsync(id);

        if (todo == null)
        {
            _logger.LogWarning("Todo with id {Id} not found for update", id);
            return NotFound();
        }

        todo.Title = request.Title;
        todo.Description = request.Description;
        todo.IsCompleted = request.IsCompleted;
        todo.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated todo with id {Id}", id);
        return Ok(_mapper.Map<TodoDto>(todo));
    }

    [HttpDelete("{id}")]
    [SwaggerOperation(Summary = "Delete a todo")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        _logger.LogInformation("Deleting todo with id {Id}", id);

        var todo = await _context.Todos.FindAsync(id);

        if (todo == null)
        {
            _logger.LogWarning("Todo with id {Id} not found for deletion", id);
            return NotFound();
        }

        _context.Todos.Remove(todo);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted todo with id {Id}", id);
        return NoContent();
    }
}
