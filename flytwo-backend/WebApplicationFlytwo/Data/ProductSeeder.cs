using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.Data;

public static class ProductSeeder
{
    public static async Task SeedAsync(AppDbContext context, IConfiguration configuration)
    {
        var companyName = configuration["SeedAdmin:CompanyName"] ?? "FlyTwo";

        var company = await context.Empresas
            .OrderBy(e => e.CreatedAt)
            .FirstOrDefaultAsync(e => e.Name.ToLower() == companyName.ToLower());

        if (company is null)
        {
            company = new Empresa
            {
                Id = Guid.NewGuid(),
                Name = companyName,
                CreatedAt = DateTime.UtcNow
            };

            context.Empresas.Add(company);
            await context.SaveChangesAsync();
        }

        // Backfill legacy data (pre-multitenancy)
        var orphanProducts = await context.Products.Where(p => p.EmpresaId == null).ToListAsync();
        if (orphanProducts.Count > 0)
        {
            foreach (var product in orphanProducts)
            {
                product.EmpresaId = company.Id;
            }

            await context.SaveChangesAsync();
        }

        var orphanTodos = await context.Todos.Where(t => t.EmpresaId == null).ToListAsync();
        if (orphanTodos.Count > 0)
        {
            foreach (var todo in orphanTodos)
            {
                todo.EmpresaId = company.Id;
            }

            await context.SaveChangesAsync();
        }

        if (await context.Products.AnyAsync())
            return; // Already seeded (or already had data)

        var categories = new[] { "Electronics", "Clothing", "Books", "Home", "Sports", "Toys", "Food", "Beauty" };
        var random = new Random(42); // Fixed seed for reproducibility

        var products = Enumerable.Range(1, 1000).Select(i => new Product
        {
            EmpresaId = company.Id,
            Name = $"Product {i:D4}",
            Description = $"This is a detailed description for product {i}. It contains all the relevant information about the product features, specifications, and usage guidelines.",
            Category = categories[random.Next(categories.Length)],
            Price = Math.Round((decimal)(random.NextDouble() * 1000 + 1), 2),
            StockQuantity = random.Next(0, 500),
            Sku = $"SKU-{i:D6}",
            IsActive = random.Next(10) > 1, // 90% active
            CreatedAt = DateTime.UtcNow.AddDays(-random.Next(365))
        }).ToList();

        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();
    }
}
