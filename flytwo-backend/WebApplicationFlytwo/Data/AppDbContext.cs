using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Todo> Todos => Set<Todo>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Empresa> Empresas => Set<Empresa>();
    public DbSet<UserInvite> UserInvites => Set<UserInvite>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Empresa>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.Name).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(u => u.FullName)
                .HasMaxLength(200);

            entity.HasOne(u => u.Empresa)
                .WithMany(e => e.Users)
                .HasForeignKey(u => u.EmpresaId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Todo>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.Category).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Price).HasPrecision(18, 2);
            entity.Property(e => e.Sku).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => e.Sku).IsUnique();
            entity.HasIndex(e => e.Category);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<UserInvite>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.TokenHash).IsRequired().HasMaxLength(128);
            entity.Property(e => e.CreatedByUserId).IsRequired().HasMaxLength(450);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasIndex(e => new { e.EmpresaId, e.Email });
            entity.HasIndex(e => e.TokenHash).IsUnique();

            entity.HasOne(e => e.Empresa)
                .WithMany()
                .HasForeignKey(e => e.EmpresaId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
