namespace WebApplicationFlytwo.Entities;

public class Todo
{
    public int Id { get; set; }
    public Guid EmpresaId { get; set; }
    public Empresa Empresa { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
