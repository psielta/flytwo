using Microsoft.EntityFrameworkCore;
using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.Data;

public static class ProductSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.Products.AnyAsync())
        {
            return; // Already seeded
        }

        var categories = new[] { "Electronics", "Clothing", "Books", "Home", "Sports", "Toys", "Food", "Beauty" };
        var random = new Random(42); // Fixed seed for reproducibility

        var products = Enumerable.Range(1, 1000).Select(i => new Product
        {
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
